# 82 — MVP: definition, exact scope, build list, connections & acceptance

**Purpose.** `80-IMPLEMENTATION-PLAN.md` answers *"in what order do we raise the score"*. This document answers a different, narrower question:
> **What is the smallest version of RACE that actually works end-to-end — full app, full system, full connections — and exactly what is left to do to reach it?**

**Nothing in this document was implemented.** It is a scope + build list derived from the audit's evidence, with every claim tied to a file, an endpoint or a finding ID from `40-BUGS-AND-GAPS.md`.

**Method legend:** `[V]` re-verified from the working tree while writing this doc · `[V]*` verified in the audit, cited not re-run · `[I]` estimate / inference · `[X]` needs a live environment (DB, device, browser, sandbox) to confirm.

> ### Provenance & drift warning (read before using the numbers)
> - Branch when this doc was written: **`3.5.0-new-driver-screeens`** — the audit header in `00-EXECUTIVE-SUMMARY.md` records `3.0.0-driver-app-development`. **The audit was produced on a different branch than this doc reads.**
> - Partner screens have **uncommitted working-tree edits** from a parallel process, and the set is growing while this doc is written: at 14:11 UTC it was 3 files (~893 changed lines), at **14:41 UTC it was 7 files (641 insertions / 353 deletions)** — `PartnerHomeScreen`, `PartnerJobsScreen`, `VendorAssignJobScreen`, `PartnerAccountScreen`, `account/PartnerBankDetailsScreen`, `account/PartnerEditProfileScreen`, `account/PartnerTripHistoryScreen` `[V]`. `21-PARTNER-APP-AUDIT.md` therefore describes an older revision of those files. Spot-checking the diffs showed UI/layout and navigation-press changes — **no new endpoint or booking-flow wiring** — so the MVP *scope* below holds; line references for those files may drift.
> - The audit's endpoint count reproduces: evidence map **170** registrations vs **171** live `router.<verb>(` in `backend/src/controller/src` (`_evidence/backend-route-map.txt`, re-counted). Treat 171 as correct. `[V]`
> - One correction to `80-IMPLEMENTATION-PLAN.md` found while writing this: item **W-13** claims `GET /api/v1/vendor/bookings` "exists". **It does not.** The vendor router exposes only `/bookings/offers`, `/bookings/:id/approve`, `/bookings/:id/assign`, `/bookings/:id/verify-trip-otp` (`backend/src/controller/src/vendorRoutes.ts:82-99`). `[V]` This doc sizes the missing endpoint explicitly (MVP-12).

---

## 1. What "MVP" means for RACE

RACE is not one product; it is **four surfaces and one API that must agree with each other**. So an MVP cannot be "one screen working". It is:

> **MVP = one real person can register → book → be served → complete → rate, while one real vendor/driver can be onboarded, approved, assigned and paid-for-the-job, and one admin can verify what they approved and see the numbers — on real data, on real devices, against a deployed API, with no fabricated data anywhere.**

That definition has three consequences:

1. **Data truth is part of the MVP, not an upgrade.** Fake jobs (`BUG-01`) or KPIs summing a legacy collection (`BUG-07`) make the MVP a demo, not a version.
2. **Verification is the spine.** If the admin cannot *see* the KYC document, the driver cannot be onboarded for real (`BUG-05`, `BUG-17`), and the whole partner side is decorative.
3. **Money can be labelled, not faked.** A stub gateway is acceptable in an MVP **only** if the UI stops claiming a real payment (`30-UIUX-PAGE-INVENTORY.md §D-3`).

### 1.1 Three MVP tiers (choose one, explicitly)

| Tier | Name | What it proves | Effort `[I]` | Who can see it |
|------|------|----------------|-------------:|----------------|
| **MVP-0** | **Honest demo** | "This is what it will be, and nothing you see is fake." No fabricated data, no public KYC, no open sockets, no default admin credential; documents uploadable and viewable; dead UI removed. | **~14 dd** | Client + investors, on a staging URL |
| **MVP-A** | **Working MVP (recommended)** | All of MVP-0 **plus** a complete, repeatable towing journey with real records, honest KPIs, backups, CI and a smoke suite. | **~29 dd** | Real pilot users (10–50), on production infra |
| **MVP-B** | **Pilot-hardened MVP** | MVP-A **plus** push notifications, background driver location, release/rollback path, minimum monitoring + alerting. | **~38.5 dd** (includes A) | A city-level pilot with a sales motion |

`[I]` Estimate basis: one backend dev, one mobile dev, admin-web and ops carried by those two part-time. `dd` = dev-days, not calendar days. Do not read these as a promise; read them as the shape of the work.

### 1.2 MVP is NOT (deliberately out of scope)

| Not in MVP | Why | Delivered by |
|------------|-----|--------------|
| Real payment gateway, refunds, commissions, payouts | Vendor/KYC onboarding + reconciliation risk; needs the ledger first (`BUG-09`, `BUG-12`) | `80` Phase 4 (W-40…W-42) |
| Multi-admin RBAC, admin user management | Single identity is enough for an MVP; the hardcoded path is closed in Phase 0 | `80` Phase 6 (W-60) |
| Admin live ops map, vendor fleet map | Expensive, non-blocking for a first pilot | `80` Phase 2 (W-22) |
| Push notifications *(MVP-A)* / background location *(MVP-A)* | Polling and foreground location are enough for a small pilot; both are real work | MVP-B, then `80` Phase 2 |
| QR camera scan | 5 decorative screens, no camera library installed (`BUG-06`); needs a product decision, not engineering | Decision in MVP, build later (W-15) |
| i18n (Hindi/Odia), god-screen refactors, ratings moderation, vendor subscriptions | Client marked i18n "later"; refactors carry no user-visible value | `80` Phase 6 |
| Roadside per-booking tracking, invoice/receipt PDFs, offline mode | Real gaps, not MVP-blocking (roadside create works) | `80` Phase 2 (W-23/W-24) |

---

## 2. MVP scope cut-line (from `80`'s phases)

| `80` phase | In MVP? | MVP slice | Left for later |
|-----------|---------|-----------|----------------|
| Phase 0 — Containment | **All of it** | W-01…W-08 verbatim | — |
| Phase 1 — Pilot-ready | **Mostly** | W-10 (driver upload), W-11 (admin viewer), W-12 (approval gating), W-13 (vendor jobs, corrected), W-14 (driver cycle on device), W-16 (dead UI), W-18 (CI) | W-15 build (decision only), W-17 push → MVP-B |
| Phase 2 — Trust & realtime | **Partial** | W-20 background location → MVP-B; W-25 `/health` detail → MVP-B | W-21 socket migration, W-22 admin map, W-23 roadside detail, W-24 receipts |
| Phase 3 — Data integrity | **Partial** | W-30 **minimum** (KPIs stop summing the legacy collection), W-31 ghost refs, W-35 backups | Full booking-model migration, W-32 ledger attribution, W-33 all indexes, W-34 PII-at-rest |
| Phase 4 — Money | **No** | Only the honesty fix: stop labelling stub payments as real (`30-§D-3`) | W-40…W-46 |
| Phase 5 — Ops & compliance | **Partial** | W-50 uptime + log rotation (MVP-B), W-52 rate limits (MVP-0 via W-04) | npm audit sweep, AV scan, DPDP passes, load test |
| Phase 6 — Backlog | **No** | — | — |

---

## 3. Per-surface MVP completeness (what "full app" means, surface by surface)

State today: ✅ works · ⚠️ partial / misleading · ❌ broken or missing · ✂️ exists but should be hidden/removed for MVP.

### 3.1 Customer app (99 screen files `[V]`) — MVP verdict: **closest to ready**

| MVP capability | Today | Blocking finding | Smallest MVP fix | Effort `[I]` |
|----------------|:-----:|------------------|------------------|-------------:|
| OTP login (real, not skipped) | ✅ | — (skip flag defaults off; `60-§2`) | — | — |
| Profile + vehicle add/edit | ✅ | — | — | — |
| Fare estimate | ⚠️ | `BUG-18` public + uncached billed Maps call | auth + cache | (in W-43, MVP-B) |
| Book towing (9-screen flow) | ✅ | — | — | — |
| Book driver (4 types) | ⚠️ | 4 flows differ only by copy; `driverServiceType` is stored but full-time enquiry screen has **no API at all** | hide/merge the dead enquiry screen | MVP-13 |
| Book roadside | ✅ create | no detail/tracking endpoint (`BUG-29`) | leave create-only, label tracking "coming" | MVP-13 |
| Live tracking of a job | ⚠️ | `BUG-03` any client can join `booking:<id>` | socket auth (W-03) | MVP-03 |
| Pay (advance/final) | ⚠️ stub | `BUG-12` UI claims real payment | label as demo in the UI | MVP-14 |
| Rate a completed booking | ✅ | — | — | — |
| PIN / forgot / reset / change password | ✂️ **dead UI** | `BUG-21` no API, no route | delete or hide behind a flag | MVP-13 |
| QR scan ("cannot work") | ✂️ | `BUG-06` no camera lib | **PO decision**, then remove or build | MVP-13 (0.5 dd) |
| "Coming soon"/placeholder screens | ✂️ | reachable from production nav | gate behind a build flag | MVP-13 |

**Customer MVP work: ~2 dd** (all inside MVP-13 / MVP-14), plus the inherited Phase-0 socket fix.

### 3.2 Partner app — vendor persona (vendor-facing subset of the app's 38 screen files `[V]`)

| MVP capability | Today | Blocking finding | Smallest MVP fix | Effort |
|----------------|:-----:|------------------|------------------|-------:|
| Vendor login / OTP / role selection | ✅ | — | — | — |
| Vendor registration wizard + documents | ✅ | `BUG-02` documents publicly readable | private storage + signed URLs | MVP-02 |
| Vendor status / verification view | ✅ | three competing verification designs (`30-§D-1`) | keep one, hide the rest | MVP-13 |
| Fleet drivers + vehicles | ✅ | — | — | — |
| Receive job offers | ✅ | `BUG-01` mock fallback returns fabricated offers when API fails | kill default mock mode | MVP-01 |
| Approve offer / assign | ⚠️ | mock fallback **fabricates a successful CONFIRMED/DRIVER_ASSIGNED response** (`services/vendor/vendorBookingsApi.ts:52-60, 84-92`) and fabricated offers (`:30-31`) `[V]` | same as above | MVP-01 |
| **See assigned/in-flight jobs** | ❌ | **no endpoint exists** `[V]` | add `GET /api/v1/vendor/bookings` + partner list/detail screen | MVP-12 |
| **Trip-start OTP** | ❌ | `vendorBookingVerifyTripOtp` exists in `config/api.ts` only — referenced by **no** service or screen `[V]` | wire it into the vendor job detail | MVP-12 |
| Vendor dashboard numbers | ⚠️ | `vendorService.getDashboardStats` counts the **legacy `BookingModel`** (`backend/src/services/src/vendor.ts:419-471`, query at L444) `[V]` | read only towing+driver bookings | MVP-15 |

**Vendor MVP work: ~4 dd** (MVP-01 + MVP-12 + MVP-15 share).

### 3.3 Partner app — driver persona (4 job screens + 4 registration screens + the pending/gate pair `[V]`)

| MVP capability | Today | Blocking finding | Smallest MVP fix | Effort |
|----------------|:-----:|------------------|------------------|-------:|
| Driver self-registration (4 steps) | ⚠️ | documents sent as `file://` device URIs; no self-driver upload endpoint (`BUG-05`); profile data **fabricated** when missing (`BUG-16`) | upload endpoint + remove fabrication | MVP-08 |
| Driver login by vendor credentials (login ID + password) | ✅ | — | — | — |
| Pending/approved gate | ✅ backend-enforced | UI shows status the backend enforces — keep | — | — |
| Go online/offline + location | ✅ foreground | no background location (`GAP-02`, `BUG-25`) | MVP-B (W-20); MVP-A keeps foreground | — |
| Offers → accept/reject | ✅ | polling loop (8/10/15 s), no push (`GAP-04`) | MVP-B push; MVP-A keeps polling | — |
| Job execution (start → trip OTP → complete) | ⚠️ | step coverage exists; **no map**, ETA absent | verify on device; map deferred | MVP-11 |
| Earnings display | ⚠️ | ledger does not link to new bookings (`BUG-09`) | MVP-A labels earnings as provisional | MVP-14 |

**Driver MVP work: ~4 dd** (MVP-08, MVP-11, part of MVP-14).

### 3.4 Admin web (17 page files `[V]`)

| MVP capability | Today | Blocking finding | Smallest MVP fix | Effort |
|----------------|:-----:|------------------|------------------|-------:|
| Login | ❌ | hardcoded credential, no rate limit (`BUG-04`) | real admin record + lockout | MVP-04 |
| Vendors list / detail / approve / reject | ✅ | — | — | — |
| **View a vendor/driver document** | ❌ | view endpoints exist but are called by **no** UI — reviewers approve blind (`BUG-17`) `[V]*` | document viewer in the review modal | MVP-09 |
| Drivers list / detail / approve / reject | ✅ | same view gap | same | MVP-09 |
| Bookings list / detail / assign driver+vendor / status | ✅ | cannot cancel (endpoint exists, unwired) | optional for MVP | — |
| Dashboard / reports / financial KPIs | ⚠️ | sums three collections, two status vocabularies (`BUG-07`) | single-source queries | MVP-15 |
| Activity log / admin users / plans edit | ✂️ | endpoints exist, no UI (`BUG-26/27/28`) | leave hidden in MVP | — |
| Hardcoded `'Bhubaneswar, Odisha'` fallback | ✂️ | `BUG-23` | show `—` | MVP-13 |

**Admin MVP work: ~2.5 dd** (MVP-04 + MVP-09 + MVP-15 share).

### 3.5 Backend / platform (171 route registrations `[V]`)

| MVP capability | Today | Finding | MVP fix | Effort |
|----------------|:-----:|---------|---------|-------:|
| Layered API, Zod validation, error contract | ✅ | — | — | — |
| User auth, role lock, refresh rotation, driver password login | ✅ | — | — | — |
| Driver approval gating server-side | ✅ | — | — | — |
| Admin auth | ❌ | `BUG-04`, `BUG-33`, `BUG-14` (shared secrets, no token-type check) | MVP-04 + MVP-05/06 | — |
| Document access control | ❌ | `BUG-02` public URLs + public `/uploads` | MVP-02 | — |
| Socket authorization | ❌ | `BUG-03` | MVP-03 | — |
| OTP escape hatches | ⚠️ | `BUG-10`, `BUG-13` (`"false"` is truthy) | MVP-06 | — |
| CORS | ⚠️ | `BUG-15` reflects any origin with credentials | MVP-05 | — |
| Self-driver document upload route | ❌ | `BUG-05` | MVP-08 | — |
| Vendor jobs list route | ❌ | §3.2 (verified absent `[V]`) | MVP-12 | — |
| Tests | ❌ | `BUG-36` zero runnable automated tests repo-wide | MVP-18 | — |

### 3.6 Data (3 booking collections, 26 models)

| MVP capability | Today | Finding | MVP fix | Effort |
|----------------|:-----:|---------|---------|-------:|
| Booking KPIs reproducible from one query | ❌ | `BUG-07` | MVP-15 (write-path unchanged; **read** path honest) | — |
| Refs resolve to real models | ❌ | `BUG-08` `ref:'Vendor'/'Driver'` point at non-existent models | MVP-16 (cheap, blocks any `populate`) | — |
| Ledger links to real bookings | ❌ | `BUG-09` → legacy only | deferred; MVP labels money provisional | — |
| Hot-path indexes | ✅ 12 of 26 models | `BUG-31` | deferred to `80` W-33 | — |
| Backups + rehearsed restore | ❌ | `OPS-5/7` | MVP-17 (**before** any seeding/migration) | — |
| PII at rest | ⚠️ | `BUG-32` plaintext OTP on dev path | deferred (W-34) | — |

### 3.7 Ops / deploy — the "full system" baseline

| MVP capability | Today | Finding | MVP fix | Effort |
|----------------|:-----:|---------|---------|-------:|
| API + admin served over **TLS** | ❌ http:80 / http:3001 | `OPS-2` | MVP-07 | — |
| Deploy does not delete users | ❌ `seed.ts` `deleteMany` runs inside `deploy-backend.sh` | `OPS-1` | MVP-07 (**freeze deploys until fixed**) | — |
| CI gate on PRs | ❌ none | `OPS-3`, `V17` | MVP-18 | — |
| Release/rollback path for both apps | ⚠️ Android-only submit, no channels | `OPS-9` | MVP-20 (MVP-B) | — |
| Backups | ❌ | `OPS-5` | MVP-17 | — |
| Uptime/alerting, log rotation | ❌ | `OPS-6` | MVP-23 (MVP-B) | — |
| Zero-downtime deploy | ❌ single fork + `pm2 restart` | `OPS-4` | deferred (W-46) | — |

---

## 4. The seven MVP journeys — with the exact connections

Each row is *step → actor → screen → client module → endpoint → backend owner*. **Bold = broken today.**

### J1 · Customer onboarding (works today `[V]*`)

| # | Step | Screen | Client module | Endpoint | Backend |
|---|------|--------|---------------|----------|---------|
| 1 | Enter mobile | `screens/auth/MobileNumberScreen` | `services/auth/*` | `POST /api/v1/auth/send-otp` | `services/src/auth.ts` |
| 2 | Verify OTP | `screens/auth/OTPScreen` | same | `POST /api/v1/auth/verify-otp` | `auth.ts` + `otp.ts` |
| 3 | Complete profile | `screens/profile/*` | `services/profile/*` | `PUT /api/v1/profile/complete` | `services/src/profile.ts` |
| 4 | Add vehicle | `screens/vehicles/AddVehicle` | `services/vehicles/*` | `POST /api/v1/vehicles` | `services/src/vehicle.ts` |

**MVP blocker: none.** J1 is the one journey already production-shaped.

### J2 · Book towing and be served

| # | Step | Screen | Endpoint | Status |
|---|------|--------|----------|--------|
| 1 | Pick service + mode | `screens/booking/towing/*` (9 screens) | `GET /api/v1/fare/towing` | ⚠️ public + uncached (`BUG-18`) |
| 2 | Create booking | review screen | `POST /api/v1/bookings/towing` | ✅ (`towingMode` validated/stored) |
| 3 | Advance payment | payment screen | `POST /api/v1/payments/advance` + `/advance/verify` | ⚠️ **stub** (`BUG-12`) |
| 4 | Live tracking | `LiveTrackingScreen` + `LiveTripMap` | socket `booking:<id>` | ❌ unauthenticated rooms (`BUG-03`) |
| 5 | Complete | completion screen | `PATCH /api/v1/driver/bookings/:id/status` (driver side) | ✅ |
| 6 | Rate | rating sheet | `POST /api/v1/bookings/towing/:id/rating` | ✅ |
| 7 | Receipt | — | — | ❌ not built (`GAP-11`) → MVP: show fare breakdown only |

### J3 · Vendor onboarding → approval (the missing spine)

| # | Step | Screen | Endpoint | Status |
|---|------|--------|----------|--------|
| 1 | Business info + address | `registration/vendor/*` | `POST /api/v1/vendor/draft` `/update` | ✅ |
| 2 | Upload KYC | same | `POST /api/v1/vendor/upload-document` | ⚠️ stored **publicly** (`BUG-02`) |
| 3 | Submit | `VendorReviewScreen` | `POST /api/v1/vendor/register` | ✅ |
| 4 | Admin reviews | `pages/vendors/VendorDetailPage` | `GET /api/v1/admin/vendors/:id` | ✅ |
| 5 | Admin **views** document | — | `GET /api/v1/admin/documents/vendor/:vendorId/:docKey` | ❌ **wired in no UI** (`BUG-17`) |
| 6 | Approve / reject | same page | `POST /api/v1/admin/vendors/:id/approve` | ✅ (blind approval) |
| 7 | Vendor sees status | `PartnerVerificationStatusScreen` | `GET /api/v1/vendor/status` | ✅ |

### J4 · Vendor assigns a job

| # | Step | Screen | Endpoint | Status |
|---|------|--------|----------|--------|
| 1 | See offers | `PartnerJobsScreen` → `services/vendor/useVendorBookingsQueries.ts` | `GET /api/v1/vendor/bookings/offers` | ⚠️ mock-fallback fabricates offers `[V]` |
| 2 | Approve with vehicle | `VendorAssignJobScreen` | `POST /api/v1/vendor/bookings/:id/approve` | ⚠️ mock-fallback fabricates success `[V]` |
| 3 | (legacy) assign driver | same | `POST /api/v1/vendor/bookings/:id/assign` | ✅ marked deprecated in code `[V]` |
| 4 | **See assigned/in-flight jobs** | — | **none exists** | ❌ MVP-12 |
| 5 | **Verify trip-start OTP** | — | `POST /api/v1/vendor/bookings/:id/verify-trip-otp` | ❌ constant-only, no caller `[V]` |

### J5 · Driver onboarding → approval → job

| # | Step | Screen | Endpoint | Status |
|---|------|--------|----------|--------|
| 1 | Personal info | `registration/driver/DriverPersonalInfoScreen` | local state | ✅ |
| 2 | Vehicle info | `DriverVehicleInfoScreen` | local state | ✅ |
| 3 | Documents | `DriverDocumentsScreen` → `DriverReviewScreen` | `POST /api/v1/driver/register` with `url: file://…` | ❌ no upload endpoint (`BUG-05`), data fabricated (`BUG-16`) |
| 4 | Submit + pending | `DriverVerificationPendingScreen` | `POST /api/v1/driver/register` | ⚠️ |
| 5 | Admin views + approves | admin Drivers | `GET /api/v1/admin/documents/driver/:driverId/:docKey`, `POST /api/v1/admin/drivers/:id/approve` | ❌ view unwired (`BUG-17`) |
| 6 | Go online | `DriverDashboardScreen` | `PATCH /api/v1/driver/availability`, `/location` | ✅ (403 until approved — correct) |
| 7 | Offer → accept | `DriverOfferAlert` | `GET /api/v1/driver/bookings/offers`, `POST …/:id/accept` | ✅ polling |
| 8 | Execute → complete | `DriverActiveJobScreen` | `PATCH /api/v1/driver/bookings/:id/status` | ⚠️ verify on device (MVP-11) |

### J6 · Admin oversight

| # | Step | Page | Endpoint | Status |
|---|------|------|----------|--------|
| 1 | Login | `LoginPage` | `POST /api/v1/admin/auth/login` | ❌ hardcoded + unlimited attempts (`BUG-04`) |
| 2 | Dashboard | `DashboardPage` | `GET /api/v1/admin/dashboard` | ⚠️ sums 3 collections (`BUG-07`) |
| 3 | Bookings + assign | `bookings/*` | `/admin/bookings`, `/assign-driver`, `/assign-vendor` | ✅ |
| 4 | Verify vendors/drivers | `vendors/*`, `drivers/*` | view + approve | ❌ view missing (`BUG-17`) |
| 5 | Money | `FinancialPage` | `/admin/transactions` | ⚠️ stub ledger (`BUG-12`) |
| 6 | Audit trail | — | `GET /api/v1/admin/activity-logs` | ✂️ endpoint exists, no UI (`BUG-26`) |

### J7 · Money (MVP = honest, not real)

| # | Step | Reality | MVP action |
|---|------|---------|-----------|
| 1 | Advance/final payment | `stub_<type>_<amount>_<uuid>` (`services/src/bookingPayment.ts:35-42`) | label "demo payment" in both apps |
| 2 | Ledger attribution | `Transaction.bookingId` → **legacy** `Booking` only (`BUG-09`) | hide "paid to vendor" claims; finances flagged provisional |
| 3 | Vendor earnings | computed from legacy collection (`vendor.ts:419-471`) `[V]` | same source as MVP-15 so the number at least matches the dashboard |
| 4 | Refunds / payouts / invoices | absent | out of MVP, listed as out-of-scope disclosure (§9) |

---

## 5. Connection contract for the MVP

### 5.1 Wiring coverage today (from `13-§7`, corrected)

| Surface | Paths in scope | Referenced | Coverage | MVP-relevant orphans |
|---------|---------------:|-----------:|---------:|----------------------|
| Customer app | 52 | 46 | **88%** | QR lookup (decision), `services/upcoming`, customer-side status twins, `/health` |
| Partner app | 27 | 27 | **100%** | *unreachable*: vendor trip-OTP (**MVP-12**), no vendor jobs list |
| Admin web | 57 | 46 | **81%** | document **view** (**MVP-09**), activity logs, admin users, plan edit/assign, booking cancel |
| **Total** | **136** | **119** | **88%** | 17 orphans, all hand-verified |

**MVP rule:** every endpoint touched by an MVP journey must have a client consumer **and** a screen that reaches it. Wiring a call that no screen can reach (the current trip-OTP situation) does not count as connected.

### 5.2 Cross-surface contracts the MVP must fix

| # | Contract | Today | MVP action |
|---|----------|-------|-----------|
| C-1 | **Status vocabulary** | same job worded `In progress` / `DRIVER_EN_ROUTE` / `EN_ROUTE` across surfaces (`30-§D-2`) | one shared status→label map, imported by all three surfaces (≤0.5 dd, part of MVP-13) |
| C-2 | **Document access** | admin receives a public URL (`BUG-02`) | single authenticated/signed-URL path used by admin viewer **and** the client (MVP-02 + MVP-09 must ship together) |
| C-3 | **Payment truth** | UI says "Payment successful", backend says stub | one shared `PAYMENTS_ARE_REAL` flag driving the label everywhere (MVP-14) |
| C-4 | **Preview/mock truth** | mock mode ON by default; 40 fallback sites | mock only behind an explicit env flag; API failure must surface an error state (MVP-01) |
| C-5 | **Numbers truth** | 3 collections, 2 vocabularies | admin + vendor + driver reads use the same two booking collections (MVP-15) |

### 5.3 Environment connections (MVP subset)

| Service | Env var | Consumers | MVP must change? |
|---------|---------|-----------|------------------|
| MongoDB | `MONGODB_URI` | `backend/src/database/src/index.ts` | no (db name `race-service`) |
| Redis | `REDIS_URL` | tokens/OTP cache | confirm it is set in the MVP env (MVP-17) |
| API base | `EXPO_PUBLIC_API_URL`, `VITE_API_URL` | `*/src/config/api.ts`, `race-admin/packages/config` | **yes** → TLS hostname (MVP-07/19) |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (+ admin pair) | `utils/src/jwt.ts`, `admin/adminJwt.ts` | **yes** → separate admin/user secrets (`BUG-14`, MVP-04) |
| CORS | `CORS_ORIGIN` | `app.ts:19-24`, `socket.ts` | **yes** → explicit list, never `*` (MVP-05) |
| Admin identity | `ADMIN_EMAIL/PASSWORD/NAME` | `config/hardcoded-admin.ts` | **removed** by MVP-04 |
| Storage | `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_KEY_FILE`, `APP_BASE_URL` | `storage/src/index.ts` | **yes** → private objects + signed URLs (MVP-02) |
| Maps | `GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | `googleMaps.ts`, both apps | yes-ish → auth + cache on `/fare/*` |
| OTP policy/flags | `OTP_*`, `FORCE_MOCK_OTP`, `MOCK_DATA_MODE` | `services/src/otp.ts`, `config/env.ts` | **yes** → parsed booleans + prod kill-switch (MVP-06) |
| SMS provider | provider credentials | `otp.ts` | must be live for real users |
| UI flags | `EXPO_PUBLIC_UI_PREVIEW_MODE`, `EXPO_PUBLIC_SKIP_OTP_AUTH` | both apps | **yes** → default off (MVP-01) |

---

## 6. MVP work list (ordered, dependency-aware)

Priority: **P0** = must ship before any non-team human uses it · **P1** = required for MVP-A · **P1-B** = required for MVP-B · POC codes as in `80-§0`.

### Block A — Integrity (P0) · 7 dd

| ID | Task | Connection | POC | dd | Verify |
|----|------|-----------|-----|--:|--------|
| MVP-01 | Preview/mock mode opt-in; API failures surface as errors | `constants/preview.ts`, `config/uiPreviewMode.ts`, 40 sites in 15 service files (esp. `services/vendor/vendorBookingsApi.ts`, `services/driver/driverApi.ts`) | MOB-P | 0.5 | Build with the flag unset, kill the API → error state, not fabricated jobs/approvals |
| MVP-02 | Documents private: drop public `/uploads`, private GCS objects, signed URLs | `app.ts:32`, `storage/src/index.ts:68-72,113-121` | BE | 1.5 | `curl` document URL unauthenticated → 401/403; signed URL → 200 then expires |
| MVP-03 | Socket.IO auth + room ownership | `services/src/socket.ts:12-73` | BE | 1.0 | Anonymous connect rejected; other user's `booking:<id>` rejected; owner receives `driver:location` |
| MVP-04 | Real admin identity: seeded record, hashed password, no default, login rate limit + lockout, separate admin JWT secret, reject `tokenType:'admin'` in user middleware | `config/hardcoded-admin.ts`, `admin/adminAuth.ts`, `adminAuthRoutes.ts`, `middleware/src/auth.ts` | BE | 1.5 | Old default fails; 6 wrong attempts → 429; admin token rejected on a user route |
| MVP-05 | Lock CORS to known origins (HTTP + socket) | `config/env.ts:24`, `app.ts:19-24`, `socket.ts:12-16` | BE | 0.5 | Unknown `Origin` rejected; admin origin works |
| MVP-06 | Hard-guard OTP/mock escape hatches (strict boolean parse, prod kill-switch, never return OTP) | `services/src/otp.ts:120-131`, `config/env.ts:37` | BE | 1.0 | `NODE_ENV=production` + flags → boot refuses/ignores; OTP absent from responses |
| MVP-07 | TLS + stop the deploy path deleting users | `deploy/gcp-vm-setup.sh`, `deploy/deploy-backend.sh`, `deploy/deploy-admin.sh`, `database/src/seed.ts:76-82` | OPS | 1.0 | HTTPS on API + admin host; deploy against staging deletes **zero** users |

### Block B — Verification spine (P1) · 6 dd

| ID | Task | Connection | POC | dd | Verify |
|----|------|-----------|-----|--:|--------|
| MVP-08 | Self-driver document upload endpoint + client switches from `file://` to uploaded URLs; stop fabricating profile/KYC data | new `POST /api/v1/driver/documents` (`driverRoutes.ts`, `services/src/driverSelf.ts`, `storage/`), `registration/driver/DriverReviewScreen.tsx:86-130` | BE + MOB-P | 2.5 | Register on a device; the stored bytes equal the file; no fabricated licence/vehicle values |
| MVP-09 | Admin document viewer wired into vendor **and** driver review | orphan endpoints `GET /api/v1/admin/documents/{vendor,driver}/:id/:docKey`, `race-admin/packages/api/src/services`, vendor/driver detail pages | ADM | 2.0 | Approval flow can only be completed after the document is opened; renders in the modal |
| MVP-10 | Approval gating end-to-end (pending = read-only; approved = can go online) | `services/src/driver.ts` `assertDriverApproved`, `/api/v1/driver/*`, `DriverVerificationPendingScreen`, `PartnerAppNavigator` | BE + MOB-P | 1.5 | PENDING driver gets 403 on availability/location; after approval the same account receives offers |

### Block C — Complete & honest journeys (P1) · 7 dd

| ID | Task | Connection | POC | dd | Verify |
|----|------|-----------|-----|--:|--------|
| MVP-11 | Driver job cycle verified on a physical device (offer expiry, statuses, trip OTP, completion) | `driverApi.ts`, `hooks/useDriverQueries.ts`, `DriverActiveJobScreen`, `DriverOfferAlert`, `bookings/tripOtp.ts` | MOB-P | 2.0 | One full job run on a device, screen recorded |
| MVP-12 | **Vendor in-flight jobs**: add `GET /api/v1/vendor/bookings` (+detail) and wire the trip-OTP endpoint into the vendor job screen | `vendorRoutes.ts` (**route missing `[V]`**), `services/src/vendor.ts`, `vendorBookingsApi.ts`, `VendorAssignJobScreen` / new list screen | BE + MOB-P | 2.5 | Vendor sees a job it approved, its live status, and can complete the trip-start OTP |
| MVP-13 | Honesty sweep: hide/remove dead auth UI, placeholder & "coming soon" screens, decorative QR scan, 4 QR artefacts, hardcoded admin fallback text, duplicate verification designs; add the shared status→label map | `customer application/src/screens/auth/*`, `screens/qr/*`, `AppNavigator`, `admin components/vendors/vendor-detail-content.tsx:226`, partner verification screens | MOB-C + MOB-P + ADM | 1.5 | No screen in a release build advertises a capability that does not exist |
| MVP-14 | Money truth: one flag drives the "demo payment" label everywhere; earnings marked provisional; wire cancel-preview so the fee shown equals the fee charged | `bookingPayment.ts:35-42`, both apps' payment screens, `bookings/*/:id/cancel-preview` | MOB-C + BE | 1.0 | No UI claims a real payment; cancel preview matches the resulting state |

### Block D — Numbers you can show (P1) · 4 dd

| ID | Task | Connection | POC | dd | Verify |
|----|------|-----------|-----|--:|--------|
| MVP-15 | KPI de-mixing: dashboard, reports, vendor & driver stats read **only** towing+driver bookings; legacy `Booking` frozen for reads | `admin/adminDashboard.ts:79-81,186-188`, `adminBookings.ts:299-316`, `services/src/vendor.ts:419-471`, customer/driver booking schemas | BE (+DATA) | 2.0 | Seed a known dataset → dashboard == raw collection counts; no demo/legacy inflation |
| MVP-16 | Ghost refs fixed (`ref:'Vendor'/'Driver'` → `User` sub-doc refs or removed) so any future `populate` cannot throw | `models/src/{booking,towingBooking,driverBooking,transaction}.ts` | DATA + BE | 2.0 | `populate('driverId')` returns a document instead of `MissingSchemaError` |

### Block E — System baseline (P1) · 5 dd

| ID | Task | Connection | POC | dd | Verify |
|----|------|-----------|-----|--:|--------|
| MVP-17 | Backups + a rehearsed restore, **before** any seeding/migration | `deploy/` (new `backup-*.sh`), staging DB | OPS | 2.5 | Restore last night's dump into a scratch DB and boot the API against it |
| MVP-18 | Test runner + CI: `npm test` in `backend` and `race-admin`, 4 smoke tests (one negative per P0 blocker), PR gate on typecheck+tests | `backend/package.json`, `race-admin/*`, new `.github/workflows/ci.yml` | QA + OPS | 2.0 | A deliberately broken assertion and a deliberate type error each turn CI red; a clean PR is green |
| MVP-19 | Environment discipline: TLS hostname in both apps, required-secret fail-fast, no `*` origins, documented staging vs prod | `app.config.js`, `race-admin/packages/config`, `config/env.ts` | OPS | 0.5 | Release builds point at the TLS host; boot fails fast on a missing secret |

### Block F — Pilot hardening (P1-B, MVP-B only) · 9.5 dd

| ID | Task | Connection | POC | dd | Verify |
|----|------|-----------|-----|--:|--------|
| MVP-20 | Release & rollback path (EAS channels, versioning, iOS submit, documented rollback) | both `eas.json`, `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md` | OPS | 2.0 | Ship an OTA update to a preview channel, then roll it back |
| MVP-21 | Push notifications for offers/job updates | `expo-notifications` + FCM/APNs, `services/notificationService.ts` | MOB-P + MOB-C | 3.0 | App backgrounded → an offer still reaches the device |
| MVP-22 | Background driver location during an active job | `expo-location` background task, `hooks/useDriverLocationReporting.ts`, `PATCH /api/v1/driver/location` | MOB-P | 3.0 | Screen locked for 5 minutes → `users.currentLocation` keeps updating |
| MVP-23 | Minimum ops visibility: `/health` detail (DB/Redis/provider) + uptime alert + log rotation | `config/logger.ts`, `middleware/src/error.ts`, `deploy/ecosystem.config.cjs:19-21` | BE + OPS | 1.5 | Kill Mongo on staging → `/health` reports degraded and an alert fires within minutes |

### 6.1 Totals & dependency order

| Tier | Blocks | Effort `[I]` |
|------|--------|-------------:|
| **MVP-0** (honest demo) | A + B + MVP-13/14-lite | **~14 dd** |
| **MVP-A** (working MVP) | A + B + C + D + E | **~29 dd** |
| **MVP-B** (pilot-hardened) | MVP-A + F | **~38.5 dd** |

```
MVP-01 ─┬─▶ MVP-10 ─▶ MVP-11 ─▶ MVP-12
MVP-02 ─┴─▶ MVP-08 ─▶ MVP-09            (docs must be private before they can be viewed safely)
MVP-03 ──▶ MVP-11                       (tracking honesty before device verification)
MVP-04 ──▶ MVP-09/13                    (an admin identity must be real before reviews matter)
MVP-06 ──▶ real-user OTP
MVP-07 ──▶ MVP-17/18/19 (deploy safety before any seeding, backups before any migration)
MVP-15 ──▶ client-facing numbers
MVP-16 ──▶ any populate-based feature
MVP-18 ──▶ every later block ships behind a test
```

**Rules:** (1) never migrate or seed before MVP-17; (2) never expose KYC before MVP-02 **and** MVP-09; (3) never claim a real payment before `80` W-40 — label it instead; (4) Block A items ship individually, each with its own negative test.

### 6.2 Definition of Done for MVP

A work item is done when: code is merged behind CI (MVP-18) · typechecks clean in the touched tree · **at least one test fails if the fix is reverted** · the item's `Verify` step was executed and its output pasted into the PR · the relevant audit doc is updated. The **MVP itself** is done when every check in §7 that is marked P0/P1 passes.

---

## 7. MVP acceptance script (run this to call it "working")

**How to run:** 2 people, 1 day, 2 Android devices + 1 iPhone + 1 desktop browser, against a **staging** environment on the MVP build, with: a freshly seeded DB, one brand-new phone number that has never registered, one new vendor, one new driver, and one admin account created in MVP-04 (not the old default). Every check is pass/fail only — "looks fine" is not a result.

### A. Integrity & security (P0 — a single fail blocks the MVP)

| ID | Check | How | Pass criteria |
|----|-------|-----|---------------|
| A-01 | No fabricated partner data | Install the release build with the preview env var **unset**, stop the API, open Home/Jobs | Error or empty state; **no** jobs, earnings, offers or "approved" results appear |
| A-02 | Vendor approve cannot fake success | Same build, API down, tap Approve | Visible failure; no `CONFIRMED` result |
| A-03 | Document URLs require authorization | Copy an uploaded document URL from the DB/admin payload, `curl` it with no token | 401/403; with a valid session or signed URL → 200 and the signature expires |
| A-04 | Public static uploads gone | Request the previous `/uploads/...` path | 404/403 |
| A-05 | Sockets reject anonymous clients | Connect with no token, then with another user's token, then with the owner's | Rejected / rejected / receives `driver:location` |
| A-06 | Admin account is real | Try the old default credential; create/rotate via the new path | Old credential fails; new password works; rotation invalidates old sessions |
| A-07 | Admin login is throttled | 6 wrong attempts | 429/lockout with a clear message; enforced server-side (also with the UI bypassed) |
| A-08 | Admin token is not a user token | Call a user endpoint with an admin token | 401/403 |
| A-09 | CORS is explicit | Request from an unknown `Origin`, then from the admin origin (HTTP and socket) | Unknown rejected; admin origin works |
| A-10 | OTP escape hatches dead in prod | Boot staging with `NODE_ENV=production` and each mock flag set | Boot refuses or ignores; no OTP in any response body; `123456` rejected |
| A-11 | Deploy does not delete data | Note the user count, run the deploy script against staging, re-count | Count unchanged; zero deletions in logs |
| A-12 | TLS on both hosts | Open the API host and admin host over HTTPS; hit plain HTTP | Valid TLS; HTTP redirects or refuses |

### B. Verification spine (P1)

| ID | Check | How | Pass criteria |
|----|-------|-----|---------------|
| B-01 | Driver KYC reaches storage | Register a driver on a device, then fetch the object from storage | Stored bytes match the chosen file; no `file://` string stored |
| B-02 | No fabricated driver profile | Register with a field left blank | Submission is rejected or stored empty — no invented name/licence/vehicle |
| B-03 | Admin can view documents | Open vendor + driver review | The document renders; approval is impossible without opening it |
| B-04 | Vendor docs are private and visible | Same as B-03 for a vendor | Same |
| B-05 | Pending driver is read-only | Log in as a PENDING driver, tap online | Backend 403 with a readable reason; UI shows the same status |
| B-06 | Approval flips the gate | Approve in admin, reload the app | The same account can go online and receives offers |
| B-07 | Rejection is honest | Reject with a reason | The driver sees the reason, not a generic error |
| B-08 | Vendor sees in-flight jobs | Vendor approves a job, reopens app | The job is listed with its current status |
| B-09 | Trip-start OTP works in-app | Raise the OTP on the customer/driver side, enter it as the vendor | Verified via `verify-trip-otp`; wrong OTP rejected |
| B-10 | Duplicate/conflict handling | Two drivers accept the same offer | Exactly one wins; the loser sees a clear message |
| B-11 | Offer expiry | Let an offer expire | It disappears/declines without a manual refresh |

### C. Journeys (P1)

| ID | Check | How | Pass criteria |
|----|-------|-----|---------------|
| C-01 | J1 customer onboarding | New number → OTP → profile → vehicle | Account + vehicle exist in the DB with real values |
| C-02 | J2 booking created | Book towing (instant + scheduled) | Record exists with the chosen `towingMode`, fare and addresses |
| C-03 | J2 fulfilment | Driver accepts → starts → completes | Statuses advance correctly; customer sees them without app restart |
| C-04 | C-03 with screen locked | Lock the phone mid-job | Customer still sees status (foreground is enough for MVP-A) |
| C-05 | J3+J5 onboarding | New vendor **and** new self-driver, end-to-end | Both reach APPROVED state with documents stored and viewed |
| C-06 | J4 vendor assignment | Vendor approves and the driver receives it | Driver's offer shows the assigned vehicle |
| C-07 | J6 admin oversight | Admin dashboard → a booking → the vendor → the document | Every hop resolves; no blank/hardcoded placeholder values |
| C-08 | Roadside | Create a roadside booking | Created and visible in lists (detail/tracking explicitly out of MVP) |
| C-09 | Rating | Complete a job and rate it | Rating persisted and visible |
| C-10 | Offline behaviour | Enable airplane mode mid-flow | Clear error, no silent fake success (this is A-01 under load) |

### D. Numbers (P1)

| ID | Check | How | Pass criteria |
|----|-------|-----|---------------|
| D-01 | Dashboard reconciliation | Seed a known dataset; compare dashboard/reports to raw towing+driver counts | Identical; no legacy/demo inflation |
| D-02 | Vendor earnings source | Compare vendor dashboard totals to the same reconciliations | Consistent (provisional label shown) |
| D-03 | Ghost refs | Run a `populate` on driver/vendor paths | Returns documents, no `MissingSchemaError` |
| D-04 | Payment labelling | Complete any payment in the MVP build | Screen says demo/provisional; no "paid to vendor" claim |
| D-05 | Cancellation | Cancel a booking | The shown fee equals the resulting record |
| D-06 | Timezone/day boundary | Complete a job near local midnight; check "today" counters | Counters agree with local day, not UTC drift |

### E. System (P1-A) / (P1-B)

| ID | Check | How | Pass criteria | Tier |
|----|-------|-----|---------------|------|
| E-01 | CI gate | Open a PR with a deliberate type error, then with a broken assertion, then clean | Red / red / green | P1 |
| E-02 | Backups + restore | Restore last night's dump into a scratch DB, boot the API | Boots and serves the same data | P1 |
| E-03 | Environment fail-fast | Boot with a required secret removed | Refuses to start with a clear message | P1 |
| E-04 | Release rollback | Ship an OTA update to preview, roll it back | Rollback verified on a device | P1-B |
| E-05 | Push notification | Background the partner app, trigger an offer | Notification received | P1-B |
| E-06 | Background location | Lock the screen for 5 minutes during a job | Location keeps updating at the configured interval | P1-B |
| E-07 | Uptime alert | Kill the API on staging | Alert within minutes; `/health` reports degraded | P1-B |

**MVP-A sign-off gate:** A-01…A-12 all pass **and** B, C, D all pass **and** E-01…E-03 pass.
**MVP-B sign-off gate:** MVP-A gate **and** E-04…E-07 pass.

### 7.1 30-minute client demo script (uses only MVP-passing checks)

1. **The honesty proof (3 min).** Turn off the API mid-demo. Nothing reverts to fake data. *(A-01/A-02)*
2. **The customer story (7 min).** New number → OTP → vehicle → instant towing booking → fare → (demo) advance → live status while the driver moves. *(C-01…C-03)*
3. **The verification story (8 min).** Driver registers with a real licence photo → admin opens **that photo** → approves → the driver's phone goes online and receives the offer. *(B-01/B-03/B-05/B-06)*
4. **The vendor story (6 min).** Vendor approves the job with a fleet vehicle → sees the assigned job → verifies the trip-start OTP. *(B-08/B-09/C-06)*
5. **The numbers story (4 min).** Dashboard reconciled live against the raw collections in front of the client. *(D-01)*
6. **The honesty close (2 min).** Show the deliberately-out-of-scope list (§9) and say what each one costs to add.

---

## 8. Cost / risk of skipping an MVP item

| Skipped item | What the client will notice | Severity |
|--------------|----------------------------|---------|
| MVP-01 | A pilot user sees jobs/earnings that do not exist — trust destroyed in one session | 🔴 fatal |
| MVP-02 | Real Aadhaar/PAN photos become publicly readable → legal exposure (DPDP) | 🔴 fatal |
| MVP-03 | Anyone who can reach the API can watch a live trip | 🔴 fatal |
| MVP-04 | Platform takeover via a default credential | 🔴 fatal |
| MVP-08/09 | No driver can be onboarded; every approval is blind | 🔴 blocks the business model |
| MVP-12 | The vendor cannot supervise a running job — the vendor product is half-built | 🟠 |
| MVP-15 | Every number shown to the client is wrong | 🟠 |
| MVP-17 | One bad deploy erases the pilot | 🟠 |
| MVP-18 | Every later change is an unverified manual regression | 🟠 |
| MVP-21/22 | Pilot works, but only while the app is open and in the driver's hands | 🟡 |

## 9. Known-incomplete list — disclose to the client with the MVP

| # | Not in the MVP | What the MVP shows instead | Cost to add |
|---|----------------|---------------------------|-------------|
| 1 | Real payment gateway | Demo-labelled payment + DB record | `80` W-40 · 6–8 dd |
| 2 | Refunds / commissions / payouts / invoices | Nothing claimed; finance marked provisional | W-41/42 · 7 dd |
| 3 | QR camera scan | Scan entry hidden or labelled; QR **display** still works | W-15 · ~2 dd + decision |
| 4 | SOS dispatch beyond logging | Alert recorded; UI does not promise dispatch | W-44 · 2.5 dd |
| 5 | Admin live ops map / fleet map | Lists + last-known location text | W-22 · 3 dd |
| 6 | Push notifications *(MVP-A)* | Polling while the app is open | MVP-21 · 3 dd |
| 7 | Background location *(MVP-A)* | Foreground updates only | MVP-22 · 3 dd |
| 8 | Roadside tracking, receipts, rating moderation | Create + list only | W-23/24 · 4 dd |
| 9 | Multi-admin RBAC, activity-log UI | Single admin account; logs recorded but not shown | W-60/W-26 · 3 dd |
| 10 | i18n (Hindi/Odia) | English only | W-62 · large |
| 11 | Zero-downtime deploys, monitoring depth, load test | Short deploy window; manual checks | W-46/50/55 · 5.5 dd |

---

## 10. Staffing, critical path & calendar `[I]`

| Role | MVP-0 | MVP-A | MVP-B |
|------|------:|------:|------:|
| Backend (BE) | 7 | 13.5 | 14.5 |
| Mobile partner (MOB-P) | 3 | 6 | 11 |
| Mobile customer (MOB-C) | 1 | 1.5 | 2 |
| Admin web (ADM) | 2 | 2.5 | 2.5 |
| Ops (OPS) | 0.5 | 4 | 7 |
| QA | 0.5 | 1 | 1.5 |
| **Total** | **14** | **28.5 ≈ 29** | **38.5** |

(Rows are `[I]` splits of the same block totals; the shared items — MVP-02/08/09/10/12/13/14 — are divided between BE and the client owner, which is why no row alone sums to a block.)

**Critical path:** `MVP-02 → MVP-08 → MVP-09 → MVP-10` (documents) runs in parallel with `MVP-07 → MVP-17 → MVP-18` (deploy safety). Everything else fans out behind them.
**Calendar:** with 1 BE + 1 mobile + part-time admin/ops: **MVP-0 ≈ 1.5 weeks · MVP-A ≈ 4–5 weeks · MVP-B ≈ 6–7 weeks** (includes a ~20% verification buffer and the MVP-A acceptance day). One dev alone: double the backend side.
**Parallel-write hazard:** the audit already caught two writers in the same mobile files (`R4`, and the three uncommitted partner screens right now). One writer per file, claim the surface in `.cursor/memory/agents-lock.md`.

---

## 11. Verification status of *this* document

| Check | Result |
|-------|--------|
| Facts re-verified against the working tree while writing | route registrations 170 map / **171 live**; **no** `GET /vendor/bookings`; `vendorBookingVerifyTripOtp` referenced in `config/api.ts` only; mock-fallback fabrication in `vendorBookingsApi.ts` read directly; `vendorService.getDashboardStats` reads legacy `BookingModel` (L444); 38 partner / 99 customer screen files; 17 admin page files |
| Audit IDs reused without re-running the audit | `BUG-01…36`, `GAP-01…12`, `OPS-1…9`, `SEC-*` → `40-BUGS-AND-GAPS.md`, `15-DEPLOY-OPS-AUDIT.md` |
| Effort figures | `[I]` estimates, sized against `80`'s item granularity; not measured |
| Checks that could NOT run | no live MongoDB (`seed`/`comprehensive-audit`/`explain`), no simulator/emulator/browser, no payment or SMS sandbox, no load test — all acceptance checks in §7 are therefore **planned, not executed** |
| Corrected in this doc | `80-§3 W-13`'s claim that `GET /api/v1/vendor/bookings` exists (§0 provenance note) |
| Source files changed by this doc | **0** — `git status` shows only `docs/audit/2026-10-12-deep-audit/**` + `.agents/state/ACTIVE.md` from this session; the modified files under `mobile application/src/screens/partner/` are the parallel process's, not this doc's |

**One-line summary:** the MVP is not a rewrite — it is **~29 dev-days** on top of what already exists: close four blockers (7 dd), make KYC real and reviewable (6 dd), finish the vendor job loop and the honesty sweep (7 dd), make the numbers true (4 dd), and give it a deploy/backup/CI spine (5 dd). Everything else — real money, maps, push, RBAC, i18n — is a deliberate, disclosable post-MVP decision.
