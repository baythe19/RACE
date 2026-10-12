# 22 — Admin Web Audit (`race-admin/`)

**Stack:** Vite + React + TypeScript, Turbo monorepo, Zustand + TanStack Query · 127 files · ~11.4k LOC · port 3001
**Structure:** `apps/admin-web` (pages/hooks/stores/components/guards) + packages `api`, `ui`, `types`, `constants`, `config`, `utils`.
**Verdict:** well-architected, **but wired to roughly half of the admin API**. The UI cannot view the documents it approves, cannot show audit logs, cannot manage admins, and its numbers are computed across three booking collections.

---

## 1. Page & route inventory [V]

| Route | Page file | Real content | Notes |
|-------|-----------|--------------|-------|
| `/login` | `LoginPage` (80) | ✅ | email+password against hardcoded admin |
| `/dashboard` | `DashboardPage` (5) → `dashboard-page-content` | ✅ | metric cards + charts (`dashboard-charts`, 224) |
| `/bookings`, `/bookings/:id` | `BookingsPage` (20), `BookingDetailPage` (16) → `booking-list` (324) + `booking-detail-content` (348) | ✅ | assign vendor/driver, status change; **no cancel call**, no create |
| `/customers`, `/customers/:id` | 20 / 13 → `customer-list` (234), `customer-detail-content` (226) | ✅ | list, detail, status change, CSV export, cities filter |
| `/vendors`, `/vendors/:id` | 20 / 13 → `vendor-list` (289), `vendor-detail-content` (**670**) | ✅ | approve/reject/suspend, documents review (PATCH), fleet drivers/vehicles, assign drivers |
| `/drivers`, `/drivers/available`, `/drivers/:id` | 20 / 56 / 9 → `driver-list` (313), `driver-detail-content` (342) | ✅ | approve/reject, document review, availability list |
| `/financial` | 20 → `financial-content` (216) | ⚠️ | transactions list + summary; **backed by the stub payment ledger** |
| `/reports` | 20 → `reports-content` (287) + `chart-card` | ⚠️ | Revenue trend / Top services / Monthly comparison — over booking collections that include demo rows |
| `/subscriptions` | 20 | ⚠️ | overview + plan **list only** |
| `/settings` | 20 → `settings-content` (386) | ⚠️ | GET/PUT settings; large surface for what the backend supports |
| `/notifications` | 20 | ✅ | list, unread count, mark read/all |
| `/profile` | 14 → `profile-content` (262) | ⚠️ | platform-admin profile; edit rights unclear (admin identity is env-based) |
| `/admin-users` | route exists | ❌ | **no admin API is called** — page cannot manage admins |
| `*` | not-found | ✅ | |

Guards: `protected-route.tsx` + `permission-guard.tsx` ✅ — routes are permission-gated (RBAC enum defined in the backend and mirrored in `packages/utils/src/permissions.ts`, with a unit test).

State: Zustand (`auth`, `dashboard`, `layout`, `theme`) + React Query hooks per domain (20 hooks) ✅ modern, consistent.

## 2. Finding AD-1 (HIGH) — the admin UI is wired to ~half the API

Orphaned admin endpoints (no call site anywhere in `packages/api` or `apps/admin-web`), full list in [`13-API-CONNECTION-MATRIX.md`](./13-API-CONNECTION-MATRIX.md#5-orphan-endpoints--backend-capability-no-client-uses):

- **Document viewing**: `GET /admin/documents/vendor/:vendorId/:docKey` and `/driver/:driverId/:docKey` are never called. Reviewers can `PATCH .../documents/:docKey` (approve/reject) but the UI never fetches the file — unless the detail payload exposes a URL (which points at the **public** storage path, SEC-3).
- **Audit trail**: `GET /admin/activity-logs` unused although every admin action is logged.
- **Admin management**: `/admin/admins` CRUD unused; no logged-in admin can be created (auth is hardcoded anyway, SEC-1).
- **Subscription management**: plan create/update, assign, cancel unused → subscriptions page is read-only in practice.
- **Create/delete flows**: `POST /admin/bookings`, `POST /admin/customers`, `POST /admin/vendors`, `POST /admin/drivers`, `POST /admin/bookings/:id/cancel` unused.

**Impact:** operations cannot complete the workflows the backend already implements: verifying KYC by looking at the file, tracing who changed what, or managing more than one admin.

## 3. Finding AD-2 (HIGH) — admin numbers are computed over three booking collections

`adminDashboard.ts:79-81, 186-188` and `adminBookings.ts:299-316` sum **legacy `Booking` + `TowingBooking` + `DriverBooking`**, with two different status vocabularies (`SERVICE_COMPLETED/PAID` vs `COMPLETED/RATED`). Seed data writes legacy bookings. Consequence: KPI cards, booking counts, reports and finance screens can be simultaneously inflated (demo rows) and under-counted (vocabulary mismatch). See [`11-DATABASE-AUDIT.md`](./11-DATABASE-AUDIT.md#3-finding-db-2-high--three-booking-collections-and-admin-sums-all-three).

## 4. Finding AD-3 (MEDIUM) — fabricated display data in the UI

`vendor-detail-content.tsx:226` falls back to a hardcoded `'Bhubaneswar, Odisha'` when `serviceAreas` is empty; similar default patterns appear in the shared data-table/form helpers. Small, but the same class of problem as the partner app's mock mode: an empty field is presented as real data. **[V]**

## 5. Finding AD-4 (MEDIUM) — no operational map, no real-time

Zero map library in the workspace; no socket client. An ops team cannot see where jobs or drivers are, and cannot receive live booking alerts — while the backend already emits `booking:status` / `driver:location` events. **[V]**

## 6. Over-engineering vs under-delivery (the balance question)

| Area | Verdict | Reason |
|------|---------|--------|
| `vendor-detail-content.tsx` (670 lines) | **Over-built** | Fleet + documents + bank + assignment + forms in one component; hard to test, hard to permission-gate per tab |
| `settings-content.tsx` (386) | **Over-built for now** | Rich settings UI, backend stores a single `PlatformSettings` doc; several fields probably have no consumer |
| `reports-content.tsx` (287) + `dashboard-charts` (224) | **Premature** | Beautiful charts over data whose correctness is unproven (AD-2) — polish before truth |
| `profile-content.tsx` (262) | **Over-built** | Editing a platform admin whose identity comes from env vars |
| Document review | **Under-delivered** | Approve/reject without viewing the file |
| Audit log | **Under-delivered** | Logged server-side, invisible in UI |
| Live ops | **Missing** | No map, no realtime |
| Customer/vendor/driver **creation** | **Missing in UI** | Endpoints exist |
| Refunds/commissions/payouts | **Missing** | Finance screen is read-only transactions |

## 7. Scores

| Area | Weight | Score |
|------|-------:|------:|
| Architecture (monorepo, api layer, hooks, guards) | 20% | 9/10 |
| Feature coverage of backend capability | 25% | 4/10 |
| Data correctness of what is shown | 20% | 4/10 |
| Ops usefulness (live map, alerts, audit) | 15% | 2/10 |
| UI consistency & component reuse | 10% | 8/10 |
| Code health (file sizes, duplication) | 10% | 5/10 |
| **Weighted** | 100% | **5.5/10** |

### Two-level view

| Capability | If DONE | If NOT done | Today |
|-----------|--------:|------------:|-------|
| Approve KYC after actually viewing the document | 10 | 0 | **1** |
| Audit trail visible | 10 | 0 | **1** |
| Multi-admin with roles (RBAC enforced end-to-end) | 10 | 2 | **2** |
| KPIs computed over one booking source | 10 | 2 | **2** |
| Live ops map + realtime alerts | 10 | 0 | **1** |
| Clean architecture/scaffolding | 10 | 4 | **9** — done |

## 8. Proposals (not applied)

| # | Proposal | Effort |
|---|----------|--------|
| A1 | Wire document viewing (GET endpoints) into vendor/driver review drawers with signed URLs | S–M |
| A2 | Add an Activity Log page (endpoint already exists) | S |
| A3 | Decide the booking source of truth; make KPI queries single-source and label demo data | M |
| A4 | Add a live ops page (map + open bookings + socket/poll) | M |
| A5 | Split `vendor-detail-content` into tabs/components | M |
| A6 | Either implement or hide the `/admin-users` page until real admin auth exists | S |
| A7 | Remove hardcoded display fallbacks; show "—" for missing values | S |
