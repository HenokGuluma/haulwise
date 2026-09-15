# Build Plan — Freight Dispatching Platform (Cober Freight–style)

This is a from-scratch build plan for a full-stack freight/trucking
dispatch platform of the same shape as this repo: internal dispatch
tooling + customer portal + public marketing site, single Next.js
codebase, Postgres-backed, server-enforced authorization. It's written
so a team (or an AI coding agent) could follow it to arrive at
architecture equivalent to what's in this repo. Where useful, it
references the actual files here as the reference implementation —
see [AGENTS.md](AGENTS.md) for the as-built writeup of this codebase.

## 1. Goals & scope

**Core problem:** a trucking/logistics business needs to track loads
(shipments) from booking through delivery, assign drivers/equipment
without double-booking, compute pay and revenue correctly, invoice
customers, and give customers visibility into their own shipments —
without spreadsheets.

**In scope (MVP → mature product):**
- Load lifecycle management (create → assign → in-transit → delivered → invoiced)
- Driver & equipment roster with availability/conflict checking
- Dynamic roles & permissions (not a hardcoded admin/user split)
- Customer-facing portal, scoped to each customer's own data
- Document handling (PODs, rate confirmations, driver docs)
- PDF invoicing
- Analytics dashboard (revenue, on-time %, driver utilization)
- Public marketing site
- Two deployment targets: managed (Vercel) and self-hosted (VPS + Docker)

**Explicitly out of scope for v1** (design for later, don't build now):
- Live load-board integration (DAT, Truckstop) — model for it, don't wire it
- Real-time GPS tracking / ELD integration
- Multi-tenant SaaS (this plan is single-company; multi-tenant is a
  larger schema and auth change, treat as a v2 decision)

## 2. Architecture decisions

| Decision | Choice | Why |
|---|---|---|
| Frontend/backend split | One Next.js app (App Router), API as Route Handlers | No separate backend service to deploy/version/auth against; Server Components remove a whole class of "fetch on mount" bugs |
| Database | PostgreSQL + Prisma ORM | Relational data (loads↔drivers↔equipment↔customers) with real foreign keys and conflict queries; Prisma gives migrations + type-safe client |
| Auth | Hand-rolled DB-backed sessions, httpOnly cookie | Full control over session invalidation (e.g. force-logout on password reset) without a black-box library; small enough to own |
| Authorization | Server-enforced permission checks on every mutation, UI disabling is cosmetic only | Client-side checks are trivially bypassed; the API route is the only real boundary |
| Roles | Dynamic, DB-stored role → permission-string-array, validated against a fixed code-owned catalog | Avoids "add a new role = migration" churn; still keeps permissions a closed, typo-proof set |
| Styling | Hand-written CSS design system, no framework | Avoids a heavy dependency + learning curve for a mid-size internal app; trade-off is more manual work than Tailwind/MUI |
| Money | Plain integers (smallest currency unit), no Decimal type | Simpler arithmetic, avoids float precision bugs; revisit if sub-unit precision is ever needed |
| File storage | Driver abstraction (local / cloud blob / S3), selected by env var | Same codebase runs locally, on Vercel (no persistent disk), and self-hosted (persistent volume) without branching app code |
| Email | Driver abstraction (HTTP API / SMTP / console-log fallback) | Same reasoning; console fallback makes email-dependent flows (password reset) testable with zero config |

## 3. Tech stack

- **Framework:** Next.js (App Router), React, TypeScript, Node 18.18+
- **API:** Next.js Route Handlers under `app/api/**` — plain REST, JSON in/out
- **Database:** PostgreSQL, via Prisma ORM (schema + migrations)
- **Auth:** Custom session table + httpOnly cookie, bcrypt password hashing
- **Validation:** Zod — one schema module, imported by every route
- **Styling:** Hand-written CSS, no UI framework; self-hosted fonts
- **Charts:** Recharts
- **PDF generation:** `@react-pdf/renderer`
- **Package manager:** npm (pin one; don't mix lockfiles)
- **Containerization:** Docker + Docker Compose (dev: Postgres only; prod: app + Postgres + Nginx)

## 4. Data model (Prisma)

Core entities and why each exists:

- **Role / User / Session / PasswordResetToken** — auth & access. `Role.permissions: String[]` checked against a code-owned catalog at write time (no DB enum to migrate when permissions change). `Role.isCustomerScoped` + `User.customerId` generalize "this login only sees one customer's data" instead of hardcoding a `CUSTOMER` role.
- **Customer / CustomerContact / CustomerDocument** — the shipper/client side.
- **Driver / DriverDocument** — roster + compliance docs, with a `DriverStatus` enum.
- **EquipmentType / Equipment / EquipmentMaintenanceRecord** — trailers/trucks as admin-manageable types (not a fixed enum), using industry-standard codes (e.g. DAT's V/R/F/PO) so a future load-board integration doesn't require renaming anything.
- **Load** — the central entity: pickup/delivery, assigned driver/equipment, `LoadStatus`, `RateType` (FLAT/PER_UNIT/PER_DISTANCE/PER_HOUR) driving a computed `rate`, `DriverPayType` (PERCENTAGE/PER_UNIT/FIXED) driving a computed `driverPay`, `PayoutStatus`.
- **LoadActivity / LoadComment** — audit trail and internal notes per load.
- **Document** — generic file attachment (POD, rate con, etc.), backed by the storage driver.
- **Payment** — ledger of driver-pay disbursements; `Load.payoutStatus` is a denormalized cache kept in sync by the payments API, not the source of truth.
- **ExternalPosting / Integration** — schema-level placeholders for a future live load-board connection; no logic yet, exists so the eventual integration is additive.

**Rules to bake in from day one** (cheap now, expensive to retrofit):
- Double-booking prevention as a real indexed DB query (`[driverId, pickupTime, deliveryTime]` and the equipment equivalent), enforced in the API route — not just a UI warning.
- Rate/pay computation lives in exactly one module each, called from every place that needs the number (API, PDF, dashboard). Never recompute inline.
- Seed/demo data tagged with a boolean flag and filtered out by default, so a fresh real account never sees fixture data.

## 5. Application structure

```
prisma/
  schema.prisma        Source of truth for the data model
  migrations/           One directory per migration
  seed.ts               Sample data + demo logins

src/
  middleware.ts          Fast cookie-presence redirect only — NOT the security boundary

  lib/
    auth.ts               Sessions, password verification, permission/role guards
    permissions.ts         Fixed catalog of grantable permissions
    validation.ts          Zod schemas for all API inputs
    conflicts.ts           Double-booking conflict detection
    rate-calc.ts            Load rate computation
    driver-pay-calc.ts      Driver pay computation
    customer-scope.ts        Customer-portal data scoping
    storage.ts                File storage driver abstraction
    mailer.ts                  Outbound email driver abstraction
    prisma.ts                   Prisma client singleton
    api-client.ts                Client-side fetch wrapper for mutations

  app/
    (marketing)/            Public site — no auth required
    login/, forgot-password/, reset-password/
    (app)/                  Authenticated route group; layout does the real session check
      dashboard/ board/ loads/ roster/ documents/ customers/ roles/ users/ settings/
    api/                    REST routes mirroring the (app) structure

  components/
    ui.tsx                  Shared UI kit
    *View.tsx                One Client Component per page, owns local state + mutations
    charts/, modals/

  types/                    Shared TS types mirroring Prisma models
```

**Page pattern (the one rule that keeps this maintainable):** every
authenticated page is a Server Component that checks the session,
fetches its own data directly via Prisma, and passes it to a Client
Component that owns local state and calls the REST API for mutations.
The API route re-validates and re-authorizes independently — it never
trusts that the UI already did.

## 6. Build phases

### Phase 0 — Foundations
- Repo scaffold, TypeScript config, CSS design system skeleton
- Prisma schema: User/Role/Session only; auth flow end-to-end (login, logout, session cookie, password hashing)
- Permission catalog + `requirePermission` helper, even before there's much to permission-gate
- Docker Compose for local Postgres

### Phase 1 — Core dispatch MVP
- Customer, Driver, Equipment, Load models + CRUD API routes + Zod validation
- Load board / list views (Server Component + Client Component pattern)
- Assign driver/equipment to a load, with the conflict check enforced server-side
- Rate/pay calculation modules, wired into load create/edit
- Seed script with demo data (flagged, filterable)

### Phase 2 — Roles, documents, customer portal
- Dynamic roles admin UI (create role, check permission boxes, assign to users)
- Document upload/download via the storage driver abstraction
- Customer-scoped login (`isCustomerScoped` role + `customerId`), customer views of their own loads/docs only
- Password reset via the mailer driver abstraction (console driver first, real email later)

### Phase 3 — Money & reporting
- Payments ledger, payout status sync
- PDF invoice generation
- Analytics dashboard (revenue, utilization, on-time %) via Recharts

### Phase 4 — Public surface & polish
- Marketing site (landing, about, guide) as an unauthenticated route group
- CSV export on list views
- Command palette / UX polish

### Phase 5 — Deployment & ops
- Vercel deploy with cloud blob storage driver
- Self-hosted VPS deploy: Docker Compose (app + Postgres) + Nginx + TLS (certbot) + cron'd `pg_dump` backups
- Runbook doc for both targets, including DB migration between environments

### Phase 6 — Integration readiness (build later, design now)
- `ExternalPosting`/`Integration` schema stays in place from Phase 1 onward
- Equipment type codes follow the external load-board's standard vocabulary from day one, so this phase is additive, not a rename/migration

## 7. Non-functional requirements

- **Security boundary is always the API route**, never the UI. Every mutation: Zod-validate input, check permission server-side, then touch the DB.
- **Auditability:** every load-affecting action writes a `LoadActivity` row.
- **No secrets in the repo:** driver credentials (storage, email, DB) come from env vars only; `.env.example` documents required vars without real values.
- **Zero-downtime-ish deploys:** self-hosted target should support `docker compose up -d --build` without a manual DB migration step being forgotten — script it.
- **Demo/sample data never contaminates a real account's view by default.**

## 8. Open decisions to revisit

- Multi-tenancy: current model assumes one company; going multi-tenant means a `Company`/`Org` root on every table and re-scoping every query — decide before it's needed, not after.
- Sub-unit currency precision: integers-only breaks if fractional-cent pricing is ever required.
- `s3` storage driver is currently a stub in the reference implementation — needs real signed PUT/GET/DELETE before use outside `local`/`vercel-blob`.

## 9. Reference

This repo (`haulwise-fullstack`, product name **Cober Freight**) is a
working implementation of everything above. Start there for concrete
code:
- [prisma/schema.prisma](prisma/schema.prisma) — the actual data model
- [AGENTS.md](AGENTS.md) — as-built architecture notes, conventions, and known gaps
- [README.md](README.md) — setup/run instructions
- [deploy/README.md](deploy/README.md) — self-hosted deploy runbook
