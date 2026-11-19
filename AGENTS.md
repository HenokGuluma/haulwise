# AGENTS.md — Cober Freight (repo: haulwise-fullstack)

Working notes for any AI coding agent (Claude Code, Cursor, Copilot, etc.)
picking up this repo across sessions/IDEs. Keep this file up to date as the
project evolves — it's the handoff document between tools and between
sessions, not a one-time snapshot.

## What this is

A real, full-stack freight dispatching platform for a trucking/logistics
business (branded **Cober Freight**; `package.json` name and some old
comments/seed strings still say `edget`/`Edget` — that's the pre-rebrand
internal name, harmless but not the product name). Originally scoped as an
MVP per an internal PRD (see `assets/` for the original brief), it has grown
well past MVP: dynamic roles/permissions, a customer-facing portal, a public
marketing site, PDF invoicing, dashboards, and a self-hosted production
deploy.

Every mutation goes through a real Next.js API route, is validated with Zod,
authorized server-side by permission, and persisted in Postgres. Nothing is
enforced client-side only — the UI's role-based disabling of buttons is a
convenience, not the security boundary.

## Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript, Node 18.18+
- **API:** Next.js Route Handlers under `src/app/api/**` — plain REST, no separate backend process
- **Database:** PostgreSQL via Prisma ORM (`prisma/schema.prisma`, migrations in `prisma/migrations/`)
- **Auth:** Hand-rolled server-side sessions (DB-backed `Session` table, httpOnly cookie) — not NextAuth. Logic lives in `src/lib/auth.ts` + `src/lib/session-cookie.ts`
- **Validation:** Zod schemas for every API input, `src/lib/validation.ts`
- **Styling:** Hand-written CSS design system, `src/app/globals.css` (~1100 lines), no UI framework (no Tailwind/MUI). Fonts self-hosted via `next/font`
- **Charts:** Recharts (`src/components/charts/*`)
- **PDF:** `@react-pdf/renderer` for invoices (`src/app/loads/[id]/invoice`)
- **File storage:** driver abstraction, see below
- **Email:** driver abstraction, see below
- **Package manager:** npm (there's a `package-lock.json`; don't switch to pnpm/yarn)

## Local dev

```bash
npm install
docker compose up -d db          # Postgres only, for local dev
cp .env.example .env             # edit if not using the docker-compose defaults
npm run db:migrate               # prisma migrate dev
npm run db:seed                  # sample data + demo logins (tsx prisma/seed.ts)
npm run dev
```

Demo logins (from seed): `admin@edget.local` / `admin123` (Manager role),
`dispatcher@edget.local` / `dispatch123`. Real production data uses whatever
roles/users are created via the Roles/Users admin UI — the seed script's
`Edget`-branded demo accounts are dev-only.

Other scripts: `npm run typecheck` (tsc --noEmit), `npm run lint`,
`npm run db:studio` (Prisma Studio), `npm run build` / `npm run start`.

## Architecture pattern (the one to follow for new pages)

Each authenticated page is a **Server Component** that:
1. Calls `getSessionUser()` (`src/lib/auth.ts`) and redirects/guards via
   `requireInternalRole` / `requirePagePermission` as needed.
2. Fetches its data directly via Prisma (no API round-trip for the initial
   render).
3. Passes that data as props to a **Client Component** (`"use client"`,
   usually named `*View.tsx` in `src/components/`), which owns local state
   for instant UI feedback and calls the REST API (via
   `src/lib/api-client.ts`) for every mutation.

The API route handlers under `src/app/api/**` are the actual authorization
and validation boundary: every route independently re-checks
`requirePermission(...)` server-side and validates the body with a Zod
schema from `src/lib/validation.ts`, regardless of what the UI already
enforced. When adding a new mutation, always add/extend a Zod schema and a
permission check in the route — never trust the client.

## Directory map

```
prisma/
  schema.prisma        Source of truth for the data model — read this first for any data question
  migrations/           One folder per migration, timestamp-prefixed
  seed.ts               Sample data + demo logins

src/
  middleware.ts          Edge-runtime cookie-presence check only (fast redirect UX,
                          NOT the security boundary — see comment in the file).
                          PUBLIC_ROUTES there lists unauthenticated-accessible pages.

  lib/
    auth.ts                Sessions, credential verification, permission/role guards
    permissions.ts          PERMISSION_KEYS catalog — the fixed set of grantable permissions
    validation.ts           Zod schemas for all API inputs
    conflicts.ts            Double-booking conflict detection (driver/equipment, DB-backed)
    rate-calc.ts            Authoritative load-rate computation (FLAT/PER_QUINTAL/PER_KM/PER_HOUR)
    driver-pay-calc.ts      Authoritative driver-pay computation (PERCENTAGE/PER_UNIT/FIXED)
    driver-uniqueness.ts    Driver/equipment link rules
    customer-scope.ts       Customer-portal data scoping (isCustomerScoped roles see only their own data)
    demo-scope.ts           Filters seeded isDemo rows unless User.showMockData is set
    storage.ts              File storage driver abstraction (see below)
    mailer.ts               Outbound email driver abstraction (see below)
    prisma.ts               Prisma client singleton
    session-cookie.ts        Cookie name/options shared by middleware + auth.ts
    activity.ts             Load activity/audit-trail helper
    pagination.ts, format.ts, dat.ts, equipment-types.ts, dashboard-period.ts, data-events.ts
    use*.ts                  Client-side data-fetching hooks (useCustomers, useDrivers, useRoles, etc.)

  app/
    (marketing)/            Public landing page only (/); /about and /guide redirect to / — no auth required
    login/, forgot-password/, reset-password/    Auth pages
    (app)/                  Authenticated route group — layout.tsx does the real session check
      dashboard/, board/, loads/, roster/, documents/, customers/, roles/, users/, settings/
    loads/[id]/invoice, loads/[id]/print          Standalone print/PDF views (outside the app shell)
    api/                    REST routes — mirrors the (app) structure; see "Architecture pattern" above

  components/
    ui.tsx                  Shared UI kit (buttons, modals, toasts, form fields, Icon)
    AppShellClient.tsx, Sidebar.tsx, Topbar.tsx, CommandPalette.tsx
    *View.tsx                One per page (BoardView, LoadsView, DashboardView, RosterView,
                              CustomersView, RolesView, UsersView, SettingsView, DocumentsView,
                              plus Customer-portal variants: CustomerBoardView, CustomerDashboardView,
                              CustomerDetailView)
    charts/                  Recharts wrappers
    marketing/               Landing-site nav/footer
    modals/                  One modal per entity form/detail drawer

  types/index.ts            Shared TS types (mirror Prisma models, dates as ISO strings)

deploy/                    Self-hosted production deploy (VPS): README.md walks the whole flow,
                            nginx.conf, backup.sh, env.production.example
docker-compose.yml          Local dev: Postgres only (+ optional --profile app to run the whole stack)
docker-compose.prod.yml     Production: app + Postgres via Docker Compose, Nginx in front (see deploy/)
Dockerfile                  Multi-stage build; retries `next build` a few times (flaky Google Fonts fetch)
```

## Data model highlights (`prisma/schema.prisma`)

- **Roles are dynamic, not a hardcoded enum.** `Role.permissions: String[]`
  is validated against `PERMISSION_KEYS` (`src/lib/permissions.ts`) only at
  write time, by the Roles admin API route. Adding a new permission means
  adding it to `PERMISSION_KEYS`/`PERMISSION_CATALOG` and checking it in the
  relevant route(s) — there's no DB-level enum to migrate.
- **Customer portal logins**: `Role.isCustomerScoped` + `User.customerId`
  generalize what used to be a hardcoded `role === "CUSTOMER"` check. A
  customer-scoped session only ever sees its own `Customer`'s loads/docs
  (`src/lib/customer-scope.ts`), enforced in API routes, not just hidden in
  the UI.
- **Load rate/pay are computed, not just stored.** `Load.rateType` (FLAT /
  PER_QUINTAL / PER_KM / PER_HOUR) drives how `rate` is derived from
  `rateBasisValue` + quantity — see `src/lib/rate-calc.ts`. `Load.driverPayType`
  (PERCENTAGE / PER_UNIT / FIXED) similarly drives `driverPay` — see
  `src/lib/driver-pay-calc.ts`. Both files are authoritative client- and
  server-side; don't duplicate the math elsewhere.
- **Double-booking prevention** is a real DB-backed check
  (`src/lib/conflicts.ts`), enforced at the API layer on assign, indexed via
  `@@index([driverId, pickupTime, deliveryTime])` / equipment equivalent —
  can't be bypassed by any client.
- **Equipment types are admin-manageable** (`EquipmentType` model, managed
  under Roster → Types), not a fixed enum — `code` values follow DAT's
  standard conventions (V, R, F, PO) so a future live DAT Load Board
  integration is a plug-in, not a migration. `ExternalPosting` and
  `Integration` models already exist for this, unused by the UI today.
- **isDemo flag**: seeded sample rows (`Customer`/`Driver`/`Equipment`/`Load`)
  are tagged `isDemo: true` and hidden from real usage unless the viewing
  `User.showMockData` is on (`src/lib/demo-scope.ts`) — demo data never
  leaks into a real account's view by default.
- **Password reset**: `PasswordResetToken` stores only a hash of the token
  (never the raw value, same pattern as `User.passwordHash`); consuming a
  valid token also invalidates the user's existing `Session`s
  (`src/app/api/auth/reset-password`).
- **Payments ledger**: `Payment` rows are the source of truth for how much
  of a load's `driverPay` has been paid; `Load.payoutStatus` is kept in sync
  as a queryable cache by the payments API so existing filters/CSV/dashboard
  code keeps working off it directly.
- **Money is stored as plain integers** (`rate`, `driverPay`, etc. — "cents-free
  integer USD" per the original comment, now used for ETB) — no `Decimal`
  type in play; be careful about precision if this ever needs sub-unit
  amounts.

## Pluggable drivers (env-var selected, same pattern twice)

- **File storage** (`src/lib/storage.ts`), `STORAGE_DRIVER=local|vercel-blob|s3`:
  - `local` (default): writes to gitignored `./uploads/` — works for dev and
    the self-hosted Docker Compose deploy (volume-mounted), **not** on
    Vercel (no persistent writable disk across invocations).
  - `vercel-blob`: real, functional, backed by `BLOB_READ_WRITE_TOKEN` — what
    Vercel-hosted production uses.
  - `s3`: structurally wired but a **stub** — throws until real S3
    credentials + signed PUT/GET/DELETE are implemented.
- **Outbound email** (`src/lib/mailer.ts`), picked by which env vars are set:
  - `RESEND_API_KEY` set → sends via Resend's HTTP API (preferred over
    Resend's SMTP relay, which has been unreliable for a verified domain).
  - else `SMTP_HOST` (+`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`) set →
    generic SMTP via nodemailer (Gmail app password, Ethio Telecom hosting,
    any provider).
  - else → logs to console instead of sending (safe default for local dev;
    lets the reset-password flow be exercised end-to-end without real
    credentials).

## Deployment

Two live targets:
1. **Vercel** (`.vercel/` present, `vercel.json`-less default config) — uses
   `vercel-blob` storage. Likely the primary/original target.
2. **Self-hosted VPS** (`deploy/`) — Docker Compose (`docker-compose.prod.yml`)
   running the Next.js app + Postgres on one Linux box, Nginx in front doing
   TLS termination (`deploy/nginx.conf`, via certbot), `deploy/backup.sh` for
   pg_dump backups via cron. Full runbook in `deploy/README.md`, including
   how to migrate existing data over from Neon via `pg_dump`/`pg_restore`.
   Domain: `coberbusiness.org` (DNS currently at Yegara). A separate
   `dispatch.coberfreight.com.et` subdomain also exists with its own cert
   (see recent git history) — check current Nginx config before assuming
   which domains are live.

`Dockerfile` retries `next build` up to 5 times because `next/font`'s
build-time Google Fonts fetch has intermittently timed out from that VPS —
if you touch the Dockerfile, keep that retry loop (note the deliberate
`[ "$success" = 1 ]` guard at the end; without it a fully-exhausted retry
loop still exits 0).

## Conventions worth preserving

- **Comments explain WHY, not WHAT** — this codebase already does this well
  (see the extensive schema comments). Match that style: don't add comments
  that just restate the code.
- **No client-side-only enforcement.** Every permission check, validation
  rule, and scoping rule that matters must be re-checked in the API route.
  Treat `src/middleware.ts` and UI disabled-states as UX only.
- **Zod schemas in `src/lib/validation.ts`** are the single place API input
  shapes are defined — don't inline ad-hoc validation in a route.
- **Rate/pay math lives in `rate-calc.ts`/`driver-pay-calc.ts` only** — don't
  recompute `rate` or `driverPay` inline anywhere else.
- Server Component fetches data + Client Component owns mutations is the
  established pattern for every page — follow it for new pages rather than
  introducing client-side data fetching for initial render.
- The product's internal/legacy name `Edget` still appears in
  `package.json`'s `name` field, some code comments, and seed data/demo
  emails (`@edget.local`). This is known cruft from before the rebrand to
  Cober Freight — harmless, but don't be confused by it, and prefer "Cober
  Freight" in anything user-facing you add.

## Known gaps / stubs (don't assume these work)

- `StorageDriver` `s3` option is unimplemented (throws by design).
- `ExternalPosting`/`Integration` (DAT Load Board) models exist but have no
  UI or sync logic — schema-level groundwork only.
- README.md at the repo root is stale (still describes the pre-rebrand
  "Edget" MVP scope and an older, smaller project structure than what
  actually exists now — dynamic roles, customer portal, marketing site,
  and billing/payments are all real but undocumented there). Trust this
  file and the actual code over README.md; consider updating README.md if
  you're touching onboarding docs.

## Where to look for more

- `prisma/schema.prisma` — most authoritative single file for "what data
  exists and why," has extensive inline rationale comments.
- `assets/` — original project brief/PRD and overview docs (pre-dates most
  of what's now built; useful for original intent, not current state).
- `git log` — commit messages here are unusually descriptive and are a
  reliable changelog of *why* things changed (e.g. rebrand, deploy
  migration, rate/pay model evolution). Prefer `git log --oneline` over
  memory for "when/why did X change."
