# 00 — Executive Summary (one page)

**Audit date:** 2026-10-12 · **Branch:** `3.0.0-driver-app-development` · **Code changed:** none (documentation only)
**Scope:** backend API · MongoDB schema · customer app · partner app · admin web · connections between them

---

## The number

| | Score |
|---|---|
| **Platform readiness (weighted)** | **5.8 / 10** — *pilot/demo-ready, **not** launch-ready* |
| **Launch readiness (real users, real money, real KYC)** | **3.6 / 10** |
| Independent cross-check | previous client-spec report scored **57/100**; two methods converging ⇒ the number is honest |
| After the 6 quick wins in `70-ROADMAP-QUICK-WINS.md` (2–4 days) | **≈6.4 / 10** |

## Surface-by-surface

| Surface | Score | One-line verdict |
|---------|------:|------------------|
| Backend API | **6.1** | Best-built layer: layered, validated, gated, graceful errors. Undermined by admin auth, uploads, sockets, zero tests |
| Database | **5.2** | Broad schema, good indexes — but two structural faults: ghost `Vendor`/`Driver` refs, and three booking collections |
| Security | **5.1** | Strong user auth; four blockers around it (mock data, public KYC docs, open sockets, hardcoded admin) |
| Connections | **6.6** | 119 of 136 backend paths (88%) are referenced by a client; no dead client calls; admin uses 46 of its own 57 paths (81%) |
| Maps / realtime | **4.1** | Distance pricing real; customer tracking exists; **no map anywhere in admin**, none in the driver job screen |
| Customer app | **6.3** | Most complete surface; QR scan and PIN/password are decorative; payments stub |
| Partner app | **5.9** | Real vendor + driver flows, good design tokens — but **mock data is ON by default (40 sites)** |
| Admin web | **5.5** | Excellent scaffolding, ~half the API wired; cannot view the documents it approves |

## Four blockers that must be fixed before anyone real touches it (days of work)

| # | Blocker | Evidence |
|---|---------|----------|
| 1 | **Partner app ships fabricated data by default** — `UI_PREVIEW_MODE` true unless env says otherwise; 40 mock fallbacks return fake jobs/earnings on API failure | `mobile application/src/constants/preview.ts:6-7` |
| 2 | **Uploaded KYC documents are publicly readable** — local `/uploads` static mount + public GCS URLs | `backend/src/app.ts:32`, `storage/src/index.ts:68-72` |
| 3 | **Socket.IO has no auth** — any client can join `booking:<id>` and receive live location/status | `backend/src/services/src/socket.ts:17-36` |
| 4 | **Admin credential is hardcoded with a working default and no login rate limit** | `config/hardcoded-admin.ts:24-28`, `admin/…/adminAuthRoutes.ts:15` |

## Three structural faults (weeks, but they decide whether numbers can be trusted)

1. **Three booking collections** (`bookings`, `towingbookings`, `driverbookings`) with two status vocabularies — admin KPIs/reports/finance sum all three (seed data inflates them). → `11-DATABASE-AUDIT.md#3`
2. **Ghost references** — `ref:'Vendor'`/`ref:'Driver'` point at models that do not exist (vendors/drivers are users). Any join crashes; the ledger cannot link to real bookings. → `11-DATABASE-AUDIT.md#2`
3. **Verification integrity** — self-driver documents are sent as local `file://` URIs (unusable), vendors' documents are public, and admins approve documents they cannot view. → BUG-05, BUG-02, BUG-17

## What is genuinely good (protect this)

- Backend layering (`controller → services → models`), Zod validation on essentially every mutation, honest error contract, fail-fast env validation, graceful shutdown.
- User auth: one number = one role, role lock after verification, bcrypt driver passwords, refresh rotation with revocation, suspended-account blocks, provider-side OTP (MessageCentral) with mock OTP hard-guarded to non-prod.
- **Driver approval gating is enforced server-side** on all six job endpoints — not just hidden in the UI.
- The driver job cycle + incoming-offer alert are genuinely well specified (server-provided expiry, conflict handling, step states, read-only fallback).
- Admin RBAC model and route guards are sound (only the identity layer is weak).

## What is missing as product (client-visible)

Real payments/refunds/commissions · working QR scan + SOS dispatch · driver document upload · admin live-ops map · audit-log UI · vendor supervision of running jobs · push notifications · multi-admin with roles.

## What this audit could not verify (stated as limitations, never as passes)

- **No live MongoDB** → the backend's runtime behaviour (seed + `comprehensive-audit.ts`, KPI deltas, index usage) was not executed; `[X]` markers apply.
- **No simulator/emulator/browser** → all app and admin UI statements are code/measurement based, not observed on device.
- **No payment/SMS sandbox** → gateway and real-OTP behaviour unproven end-to-end.

## Recommended next step

Run **Phase 0 (integrity, 2–4 days)** first: the four blockers are each a one-line-to-few-line change and they change the risk profile of everything shown to a client. Then Phase 1 (make verification real) and Phase 2 (data truth) before any payment work.

Full detail: [`01-SCORECARD.md`](./01-SCORECARD.md) · [`40-BUGS-AND-GAPS.md`](./40-BUGS-AND-GAPS.md) · [`50-TEST-CASES.md`](./50-TEST-CASES.md) · [`70-ROADMAP-QUICK-WINS.md`](./70-ROADMAP-QUICK-WINS.md)
