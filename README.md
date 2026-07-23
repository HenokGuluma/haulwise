# Haulwise — Freight Dispatching Platform

A real, full-stack implementation of the MVP: Next.js 14 (App Router) frontend,
REST API route handlers, PostgreSQL via Prisma, and server-side session auth —
built so Phase 2 (the marketplace/automation features in the full PRD) can be
layered on without a rewrite.

This is not the client-only prototype from earlier — every mutation goes
through a real API route, is validated with Zod, is authorized server-side by
role, and is persisted in Postgres. The double-booking conflict check runs as
an actual database query (`src/lib/conflicts.ts`) and is enforced at the API
layer, so it can't be bypassed by any client.

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **API:** Next.js Route Handlers (`src/app/api/**`) — plain REST, no separate backend process needed
- **Database:** PostgreSQL via Prisma ORM (`prisma/schema.prisma`)
- **Auth:** Server-side sessions (DB-backed, httpOnly cookies) — not NextAuth, a
  small purpose-built implementation in `src/lib/auth.ts`, so there's no
  black-box dependency between you and the session logic
- **Validation:** Zod schemas for every API input (`src/lib/validation.ts`)
- **Styling:** Hand-written CSS design system (`src/app/globals.css`), no UI
  framework dependency; fonts self-hosted via `next/font`

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

Open http://localhost:3000. Log in with:

- **Admin:** `admin@haulwise.local` / `admin123`
- **Dispatcher:** `dispatcher@haulwise.local` / `dispatch123`

### Other useful commands

```bash
npm run typecheck    # tsc --noEmit
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
    auth.ts              Sessions, password verification, role checks
    conflicts.ts          Double-booking conflict detection (server-side, DB-backed)
    validation.ts         Zod schemas for all API inputs
    prisma.ts              Prisma client singleton
    format.ts, dat.ts      Shared formatting + DAT equipment-code helpers
    api-client.ts           Client-side fetch wrapper used by all Client Components

  app/
    login/                 Login page + form
    (app)/                 Authenticated route group
      layout.tsx             Auth check, fetches sidebar counts, renders the shell
      dashboard/ board/ loads/ roster/ documents/     One page per view (Server Components)
    api/
      auth/                  login, logout
      loads/                  list, create, get/update/delete, assign, documents
      drivers/, equipment/, customers/, billing/       CRUD + CSV export

  components/
    ui.tsx                 Shared UI kit (buttons, modals, toasts, form fields)
    Sidebar.tsx, Topbar.tsx, RouteLine.tsx, LoadCard.tsx
    BoardView.tsx, LoadsView.tsx, DashboardView.tsx, RosterView.tsx, DocumentsView.tsx
    modals/                 LoadFormModal, AssignModal, LoadDetailDrawer, Driver/EquipmentFormModal

  types/index.ts          Shared TS types (mirror the Prisma models, dates as ISO strings)
```

**Pattern used throughout:** each page is a Server Component that fetches its
data directly via Prisma (fast, no API round-trip for the initial load) and
passes it as props to a Client Component, which owns local state for
instant UI updates and calls the REST API for every mutation. The API routes
are the actual authorization and validation boundary — the UI's role-based
disabling of buttons is a convenience, not the security mechanism; every
Admin-only route re-checks the role server-side.

## Phase 2 / DAT integration readiness

Per the spec, this schema and API are structured so a live DAT Load Board
connection is a plug-in, not a migration:

- `EquipmentTypeCode` uses DAT's standard codes (V, R, F, PO)
- `ExternalPosting` and `Integration` models exist and are ready, unused by
  the UI today — see `prisma/schema.prisma`
- Internal `LoadStatus` is independent of any external board's status names

## An honest note on verification

This code was written and reviewed carefully, but the sandbox this was built
in has no network access — `npm install` couldn't be run, so the app has not
actually been booted end-to-end against a live Next.js dev server or a real
Postgres instance. What *was* done to catch errors before handing this over:

- Every `.ts`/`.tsx` file was syntax-checked individually with esbuild
- Every `@/...` and relative import was checked to resolve to a real file,
  and every named import was checked against that file's actual exports
- Every CSS class referenced in components (including the enum-derived ones,
  like status pill colors) was checked against `globals.css`
- Every hardcoded status/enum string literal in the code was checked against
  the actual Prisma enum values in `schema.prisma`
- Every Prisma field name used in application code was checked against the
  schema

That process did catch and fix real bugs (a stale-closure bug in the drag-and-drop
handler, and a CSS class case mismatch on status pills) — but it's static
analysis, not a substitute for actually running `npm install && npm run dev`
against a real database. Please run the steps above and file/fix anything
that surfaces; I'd rather you know that up front than present this as more
proven than it is.
