# Cober Freight — Freight Dispatching Platform

A full-stack freight dispatching platform: Next.js 14 (App Router) frontend,
REST API route handlers, PostgreSQL via Prisma, and server-side session auth.
Every mutation goes through a real API route, is validated with Zod, is
authorized server-side by permission, and is persisted in Postgres — the
double-booking conflict check runs as an actual database query
(`src/lib/conflicts.ts`) and is enforced at the API layer, so it can't be
bypassed by any client.

Beyond the original dispatch MVP, this now includes dynamic roles &
permissions, a customer-facing portal, a public marketing site, PDF
invoicing, an analytics dashboard, and a self-hosted production deploy
alongside the Vercel one. See [AGENTS.md](AGENTS.md) for the full
architecture writeup (data model, conventions, deployment details) kept
up to date for anyone (or any AI coding agent) picking this repo up.

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **API:** Next.js Route Handlers (`src/app/api/**`) — plain REST, no separate backend process needed
- **Database:** PostgreSQL via Prisma ORM (`prisma/schema.prisma`)
- **Auth:** Server-side sessions (DB-backed, httpOnly cookies) — not NextAuth, a
  small purpose-built implementation in `src/lib/auth.ts`, so there's no
  black-box dependency between you and the session logic
- **Roles & permissions:** Admin-manageable roles with a fixed, code-owned
  permission catalog (`src/lib/permissions.ts`) — not a hardcoded role enum
- **Validation:** Zod schemas for every API input (`src/lib/validation.ts`)
- **Styling:** Hand-written CSS design system (`src/app/globals.css`), no UI
  framework dependency; fonts self-hosted via `next/font`
- **PDF:** `@react-pdf/renderer` for invoices
- **Charts:** Recharts, for the analytics dashboard

## Getting started

**Prerequisites:** Node.js 18.18+ and Docker (for Postgres), or your own Postgres instance.

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (or point DATABASE_URL at your own instance)
docker compose up -d db

# 3. Configure environment
cp .env.example .env
# edit .env if you're not using the docker-compose defaults

# 4. Create the database schema
npm run db:migrate

# 5. Seed sample data (customers, drivers, equipment, loads, and two logins)
npm run db:seed

# 6. Run it
npm run dev
```

Open http://localhost:3000. Log in with the seeded demo accounts:

- **Manager:** `admin@edget.local` / `admin123`
- **Dispatcher:** `dispatcher@edget.local` / `dispatch123`

(These addresses use the project's pre-rebrand internal name, `edget` — see
[AGENTS.md](AGENTS.md) for context. Real deployments create their own
users/roles via the Users/Roles admin pages.)

### Other useful commands

```bash
npm run typecheck    # tsc --noEmit
npm run lint          # next lint
npm run db:studio    # Prisma Studio — browse/edit the database visually
npm run build         # production build
npm run start         # run the production build
```

### Running the whole thing in Docker (optional)

```bash
docker compose --profile app up --build
```

This builds and runs the Next.js app itself in a container too (see
`Dockerfile`), alongside Postgres. Useful for a production-like smoke test;
for day-to-day development, running Postgres in Docker and `npm run dev` on
the host (as above) is faster to iterate with.

## Project structure

```
prisma/
  schema.prisma       Database schema — the source of truth for the data model
  seed.ts              Sample data + demo logins

src/
  middleware.ts         Route protection (fast cookie check; real auth check is server-side)

  lib/
    auth.ts              Sessions, password verification, permission checks
    permissions.ts        Fixed catalog of grantable permissions (roles are dynamic, DB-backed)
    conflicts.ts          Double-booking conflict detection (server-side, DB-backed)
    rate-calc.ts           Load rate computation (flat / per-quintal / per-km / per-hour)
    driver-pay-calc.ts     Driver pay computation (percentage / per-unit / fixed)
    customer-scope.ts       Customer-portal data scoping
    storage.ts              File storage driver (local / Vercel Blob / S3-stub)
    mailer.ts                Outbound email driver (Resend API / SMTP / console)
    validation.ts         Zod schemas for all API inputs
    prisma.ts              Prisma client singleton
    api-client.ts           Client-side fetch wrapper used by all Client Components

  app/
    (marketing)/           Public landing site, /about, /guide
    login/, forgot-password/, reset-password/    Auth pages
    (app)/                 Authenticated route group
      layout.tsx             Auth check, fetches sidebar counts, renders the shell
      dashboard/ board/ loads/ roster/ documents/ customers/ roles/ users/ settings/
    api/
      auth/                  login, logout, forgot-password, reset-password
      loads/                  list, create, get/update/delete, assign, documents, payments, comments
      drivers/, equipment/, equipment-types/, customers/, billing/, roles/, users/    CRUD + CSV export

  components/
    ui.tsx                 Shared UI kit (buttons, modals, toasts, form fields)
    Sidebar.tsx, Topbar.tsx, CommandPalette.tsx, RouteLine.tsx, LoadCard.tsx
    BoardView.tsx, LoadsView.tsx, DashboardView.tsx, RosterView.tsx, DocumentsView.tsx,
    CustomersView.tsx, RolesView.tsx, UsersView.tsx, SettingsView.tsx
    charts/                 Recharts wrappers for the analytics dashboard
    modals/                 Per-entity form modals and detail drawers

  types/index.ts          Shared TS types (mirror the Prisma models, dates as ISO strings)

deploy/                  Self-hosted VPS deploy (Docker Compose + Nginx) — see deploy/README.md
```

**Pattern used throughout:** each page is a Server Component that fetches its
data directly via Prisma (fast, no API round-trip for the initial load) and
passes it as props to a Client Component, which owns local state for
instant UI updates and calls the REST API for every mutation. The API routes
are the actual authorization and validation boundary — the UI's role-based
disabling of buttons is a convenience, not the security mechanism; every
route re-checks the caller's permission server-side.

## Deployment

Two supported targets:

- **Vercel** — uses the `vercel-blob` storage driver for uploaded documents.
- **Self-hosted VPS** (Docker Compose + Nginx) — see
  [deploy/README.md](deploy/README.md) for the full runbook, including
  backups and migrating existing data from Neon.

## Phase 2 / DAT integration readiness

This schema and API are structured so a live DAT Load Board connection is a
plug-in, not a migration:

- `EquipmentTypeCode` uses DAT's standard codes (V, R, F, PO)
- `ExternalPosting` and `Integration` models exist and are ready, unused by
  the UI today — see `prisma/schema.prisma`
- Internal `LoadStatus` is independent of any external board's status names

## More context

[AGENTS.md](AGENTS.md) has the full architecture writeup — data model
rationale, the pluggable storage/email drivers, both deployment targets in
detail, and conventions to follow when extending this codebase. Keep it
updated alongside significant changes; it's meant to carry context across
tools and sessions, not just this one.
