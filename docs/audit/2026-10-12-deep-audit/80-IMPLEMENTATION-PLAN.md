# 80 — Implementation Plan (phased, priority-ordered)

**Purpose:** turn this audit into an execution order. Every work item below names **what to change**, **who owns it (POC)**, **exactly which files / endpoints / env it touches (the connection)**, **how to verify it**, and **what "done" means**.
**Baseline:** platform **5.8/10**, launch readiness **3.6/10** (`01-SCORECARD.md`). Evidence for every item: `40-BUGS-AND-GAPS.md` (IDs cited) and the per-surface docs.
**Nothing in this repo was changed by the audit; this plan is the change list.**

---

## 0. How to read this plan

| Symbol | Meaning |
|--------|---------|
| **P0** | Blocking: real users or real money/PII cannot be exposed until this is closed |
| **P1** | Required for a credible pilot with real users |
| **P2** | Required before public launch / scale |
| **P3** | Product backlog — deliberate, schedulable later |
| `dd` | dev-days for one competent developer (not calendar days) |
| `[V]` | verified from code in this audit · `[I]` inferred estimate · `[X]` needs a live environment |

**Estimate basis [I]:** one backend dev, one mobile dev, one admin-web dev, DevOps done by the backend dev until Phase 5.
Calendar ranges assume these run partly in parallel; the phase *order* matters more than the calendar.

### POC (point of contact) legend

| Code | Owns |
|------|------|
| **BE** | Backend/API, models, services, middleware |
| **MOB-C** | Customer app (Expo) |
| **MOB-P** | Partner app (Expo, vendor + driver) |
| **ADM** | Admin web (Vite/Turbo) |
| **OPS** | VM, nginx, PM2, Mongo/Redis, CI, secrets |
| **DATA** | Schema, migrations, indexes, backfills |
| **QA** | Test harness, verification, regression checks |
| **PO** | Client/product decision owner — the only one who can close a product question |

---

## 1. Phase map & gates

| Phase | Theme | Items | Effort | Score target after phase | Gate to leave the phase |
|-------|-------|------:|-------:|--------------------------|--------------------------|
| **0** | Containment (blockers) | 8 | ~6 dd | **≈6.5** | All 4 audit blockers closed with evidence; no default credential, no public KYC, no open socket room, no fake data in a release build |
| **1** | Pilot-ready | 9 | ~14 dd | **≈7.0** | One real user can register → book → get served → pay → rate, on real data, on a device, with admin able to review what it approves |
| **2** | Trust & verification integrity | 6 | ~12 dd | **≈7.4** | An admin who approves a vendor/driver has seen the actual document; every job step is visible/executable in-app |
| **3** | Data integrity | 6 | ~16 dd | **≈7.8** | One booking source of truth for KPIs; every ref resolves; indexes + backups + migration discipline in place |
| **4** | Money, comms, ops-grade deploy | 7 | ~22 dd | **≈8.3** | Real gateway with refunds; OTA/release process; TLS; reversible deploys |
| **5** | Ops & compliance hardening | 6 | ~12 dd | **≈8.7** | CI gates, monitoring, backups proven, log rotation, DPDP/retention policy |
| **6** | Product backlog | 5 | — | — | Scheduled after go-live by the PO |

> Score targets are **[I]** — projections, not measurements. They are computed from the item-level rubric in `01-SCORECARD.md`; each phase's target is revisited at the gate.

---

## 2. Phase 0 — Containment (P0) · ~6 dd

> These eight items are the difference between "demo" and "irresponsible". Nothing else in this plan is worth doing first.

| ID | Task | Connection (files · endpoints · env) | POC | Effort | Verify | Exit / DoD |
|----|------|--------------------------------------|-----|-------:|--------|-----------|
| **W-01** | **Stop shipping fabricated data**: make preview mode off unless explicitly enabled | `mobile application/src/constants/preview.ts`, `src/config/uiPreviewMode.ts`, 15 service files / 40 fallback sites (BUG-01) · env `EXPO_PUBLIC_UI_PREVIEW_MODE` | MOB-P | 0.5 dd | Grep: no default-true preview constant · build a release bundle and confirm a failed API call surfaces an error state, not fake jobs | A production build shows real errors; mock mode only behind an explicit dev flag |
| **W-02** | **Make KYC documents private**: remove the public `/uploads` static mount, store GCS objects privately and serve via signed URLs | `backend/src/app.ts:32`, `backend/src/storage/src/index.ts:68-72,113-121`, upload middleware (BUG-02, SEC-3) | BE | 1.5 dd | `curl` an uploaded document URL without a token → 401/403; with a signed URL → 200 and expiry honoured | No document is readable without authorization |
| **W-03** | **Authenticate Socket.IO + authorize rooms** | `backend/src/services/src/socket.ts:12-73`, JWT verify + role/ownership check per `booking:<id>` and `driver:<id>` (BUG-03, BUG-15) | BE | 1 dd | Connect with no token → rejected; connect with another user's id → rejected; connect with the owner → receives `driver:location` | Room joins require a valid token and ownership |
| **W-04** | **Replace the hardcoded admin identity**: real admin record/seed with hashed password, no default password, login rate limit + lockout | `backend/src/config/hardcoded-admin.ts:24-28`, `services/src/admin/adminAuth.ts:105-111`, `admin/adminAuthRoutes.ts` (BUG-04, BUG-33, GAP-08) | BE | 1.5 dd | Login with the old default fails; 6 wrong attempts → 429/lockout; password rotation works | No credential in code or docs can log in |
| **W-05** | **Lock CORS down** to known origins (HTTP + socket) | `backend/src/config/env.ts:24`, `app.ts:19-24`, `socket.ts:12-16`, `CORS_ORIGIN` (BUG-15) | BE | 0.5 dd | Request with an unknown `Origin` is rejected; the admin origin works | `CORS_ORIGIN` is required in every environment (no `*`) |
| **W-06** | **Hard-guard mock/OTP escape hatches**: `FORCE_MOCK_OTP`, `MOCK_DATA_MODE` become properly parsed booleans, kill-switch on `NODE_ENV==='production'`, never return the OTP in a response | `backend/src/services/src/otp.ts:120-131`, `config/env.ts` (BUG-10, BUG-13, BUG-32) | BE | 1 dd | Start with `NODE_ENV=production` and each flag set → boot refuses or ignores the flag; OTP absent from responses | Universal OTP `123456` and returned-OTP paths are impossible in production |
| **W-07** | **TLS + stop destructive seeding in the deploy path** | `deploy/gcp-vm-setup.sh:166-191`, `deploy/deploy-admin.sh:44-56`, `deploy/deploy-backend.sh:44-46`, `database/src/seed.ts:76-82` (OPS-1, OPS-2) | OPS | 1 dd | HTTPS response on API + admin host; run the deploy script against a staging DB and confirm **zero** `users` documents are deleted | Deploy cannot delete data; both hostnames serve TLS |
| **W-08** | **Regression guard for W-01…W-07**: add the missing test runner and 4 smoke tests Two `*.test.ts` files exist in `race-admin` that `import … from 'vitest'`, but **`vitest` is not declared in any `package.json` and not installed** in any workspace; `backend/package.json` has **no `test` script** (`02-V-19`, `README §4`, BUG-36) | QA | 1 dd | `npm test` runs and passes in `backend` and `race-admin`; a deliberately broken assertion fails CI | One command proves the four blockers stay closed |

**Phase 0 gate:** a release build of the partner app contains no fabricated data path, documents are private, sockets reject strangers, the admin default credential is dead, and `npm test` passes.

---

## 3. Phase 1 — Pilot-ready (P1) · ~14 dd

| ID | Task | Connection | POC | Effort | Verify | Exit / DoD |
|----|------|-----------|-----|-------:|--------|-----------|
| **W-10** | **Self-driver document upload** — new authenticated upload endpoint + client switch from local device URIs to uploaded URLs | `POST /api/v1/driver/documents` (new, `controller/src/driverRoutes.ts`), `services/src/driverSelf.ts`, `storage/src/index.ts`; client `screens/partner/registration/driver/DriverReviewScreen.tsx:86-90` (BUG-05) | BE + MOB-P | 2.5 dd | Register a driver on a device, then fetch the stored document from the admin/GCS side: the bytes match the file | Driver KYC is real data in storage, never a `file://` string |
| **W-11** | **Admin document viewer** — make reviewers view before approving | existing orphans `GET /api/v1/admin/documents/{vendor,driver}/:id/:docKey` (already implemented), `race-admin/packages/api/src/services/document.service.ts` (new), vendor/driver detail pages (BUG-17, BUG-26) | ADM | 2 dd | Approve flow now requires an opened document; screenshot of the rendered document in the review modal | An approval that never viewed the document is impossible by UI construction |
| **W-12** | **Self-driver approval gating end-to-end** — approve → driver can go online; reject → honest reason | `services/src/driver.ts:50-57` (`assertDriverApproved`), `/api/v1/driver/*`, partner `DriverVerificationPendingScreen`, `PartnerAppNavigator` gate | BE + MOB-P | 1.5 dd | PENDING driver sees read-only; after admin approval the same account receives offers | Status shown in the app is the status the backend enforces |
| **W-13** | **Vendor supervision of running jobs** (list assigned/in-flight jobs) | **Correction (2026-10-12, later pass): `GET /api/v1/vendor/bookings` does NOT exist** — the vendor router only has `/bookings/offers`, `/bookings/:id/approve`, `/bookings/:id/assign`, `/bookings/:id/verify-trip-otp` (`controller/src/vendorRoutes.ts:82-99`). So this item includes **adding** the list/detail route. Files: `vendorRoutes.ts`, `services/src/vendor.ts`, partner `VendorAssignJobScreen` / new active-jobs screen, new `useVendorJobs` query (GAP-07, BUG-24) | BE + MOB-P | 2.5 dd | A vendor sees a job it assigned, its status changes live-ish, and can complete the **trip-start OTP** step | Vendor can run a job start-to-finish without calling anyone |
| **W-14** | **Fix the driver job cycle gaps found in the audit** — trip-OTP UI, status transitions, offer expiry handling on device | `/api/v1/driver/bookings/:id/{accept,reject,status}`, `bookings/tripOtp.ts`, `driver/useDriverQueries.ts` | MOB-P + BE | 2 dd | Full job run on a physical device (offer → accept → start with OTP → complete) | One complete driver journey verified on a device, not by reading code |
| **W-15** | **Decide + implement the QR story** — either ship a camera scan (`expo-camera`) or remove the decorative scan UI | customer `MyQrScreen.tsx`, `components/qr/*`, `customer application/package.json`, backend `qrRoutes.ts` (BUG-06, BUG-19, GAP-06) | **PO** decides, MOB-C implements | 0.5 dd decision / 2 dd build | If built: scan resolves a real vehicle; if removed: no screen suggests scanning works | No decorative feature claim in the shipped app |
| **W-16** | **Remove dead auth UI** (PIN / forgot / reset / change password with no API) or implement the backend | customer `screens/auth/*`, `backend/src/controller/src/authRoutes.ts` (BUG-21) | MOB-C + BE | 1.5 dd | Grep shows no screen calls a non-existent endpoint; `13-§6` list stays empty | Zero dead client calls (already true) and zero dead screens |
| **W-17** | **Push notifications** (offer/job alerts instead of polling only) | `expo-notifications` + FCM/APNs config, partner `services/notificationService.ts`, customer booking updates (GAP-04) | MOB-P + MOB-C | 3 dd | Background the app, trigger an offer → device receives a notification | Partner learns about a job without the app being open |
| **W-18** | **CI pipeline** — typecheck + tests on every PR, build artifacts on merge | `.github/workflows/ci.yml` (new), `backend` `npm run lint` + tests, both Expo `tsc --noEmit`, admin `tsc -b`, `race-admin` tests (OPS-3, V17) | OPS + QA | 1 dd | Open a PR with a deliberate type error → CI red; merge a clean PR → green | No change reaches `main` without an automated gate |

**Phase 1 gate:** a real person (not a seeded account) registers, books, is served, and rates — on a physical device, with an admin who reviewed their documents.

---

## 4. Phase 2 — Trust, realtime & map integrity (P1) · ~12 dd

| ID | Task | Connection | POC | Effort | Verify | Exit / DoD |
|----|------|-----------|-----|-------:|--------|-----------|
| **W-20** | **Driver background location during a job** | `expo-location` background task + `mobile application/src/hooks/useDriverLocationReporting.ts`, `PATCH /api/v1/driver/location` (GAP-02, BUG-25) | MOB-P | 3 dd | Drive with the screen locked for 5 minutes → `users.currentLocation` keeps updating within the expected interval | A customer sees movement while the driver's phone is locked |
| **W-21** | **Move partner app off polling**: subscribe to `driver:location` / booking status over the (now authenticated) socket | partner `socket.io-client` (dependency present, never imported — `14`), `backend/src/services/src/socket.ts` (PA-6, BUG-25) | MOB-P + BE | 2.5 dd | Offers and job status update without a poll tick; battery/network usage measurably lower than the 8/10/15 s loop | No polling loop drives offer or job freshness |
| **W-22** | **Admin live ops map** (fleet + in-flight jobs) | `@react-google-maps`/Mapbox + `GET /api/v1/admin/drivers/available` + bookings list, `race-admin/apps/admin-web/src/pages` (GAP-01) | ADM | 3 dd | Ops sees active jobs with last-seen position; clicking opens the booking | Admin can answer "where is my fleet right now" without a DB query |
| **W-23** | **Roadside bookings: detail + tracking** so roadside jobs stop being second-class | new `GET /api/v1/bookings/roadside/:id` (+ tracking) in `roadsideBookingRoutes.ts`, customer roadside screens (BUG-29) | BE + MOB-C | 2 dd | A roadside booking can be opened, tracked and cancelled like towing/driver | Every booking type has a detail surface |
| **W-24** | **Ratings & receipts for customers** (data already collected) | `models/src/bookingRatingSchema.ts`, customer booking detail; `GET /bookings/*/:id/rating` (rating writes are wired) (GAP-10, GAP-11) | MOB-C + BE | 2 dd | Customer sees their rating history and can open a receipt for a completed booking | Booking → payment → rating → receipt loop closes for the customer |
| **W-25** | **Observability that a human reads**: structured errors to a tracker + `/health` detail (DB, Redis, provider reachability) | `backend/src/middleware/src/error.ts`, `config/logger.ts`, planned uptime check (OPS-6) | BE | 1.5 dd | Kill MongoDB → `/health` reports degraded; a thrown error appears in the tracker with a request id | The team learns about failures before users report them |

**Phase 2 gate:** every job step is visible/executable in-app, live position works with the screen off, and the admin can see operations in real time.

---

## 5. Phase 3 — Data integrity, the honest-numbers phase (P1/P2) · ~16 dd

| ID | Task | Connection | POC | Effort | Verify | Exit / DoD |
|----|------|-----------|-----|-------:|--------|-----------|
| **W-30** | **One source of truth for bookings (or explicit read models)** — stop summing three collections with two status vocabularies in KPIs/reports/finance | `models/src/{booking,towingBooking,driverBooking}.ts`, `services/src/admin/adminDashboard.ts:79-81,186-188`, `admin/finance*`, reports (BUG-07) | **PO** decides model, DATA + BE implement | 5–6 dd | Seed a known dataset → dashboard totals, reports and finance all show the same number as the raw collections | KPI numbers are reproducible from one query and survive a reconciliation test |
| **W-31** | **Fix ghost references** — `ref:'Vendor'` / `ref:'Driver'` must point at `User` sub-documents (or be removed) | `booking.ts:144`, `towingBooking.ts:122-123`, `driverBooking.ts`, any `.populate()` use (BUG-08) | DATA + BE | 2 dd | `populate()` on driver/vendor paths returns documents instead of throwing `MissingSchemaError` | No ref points at a non-existent model |
| **W-32** | **Ledger attribution** — `Transaction.bookingId` must reference real bookings of all types | `models/src/transaction.ts:52`, payment/booking services (BUG-09) | BE | 2 dd | A towing and a driver booking each produce a transaction that resolves to its booking | Finance can attribute every rupee to a booking |
| **W-33** | **Indexes for all models + verified query plans** | `database/src/indexes.ts:27-35` (only 12 of 26 models), `syncIndexes()` (BUG-31) | DATA | 1.5 dd | `explain()` on the admin list/aggregate queries shows `IXSCAN` on seeded data (needs a live DB — `[X]` today) | No hot admin query does a `COLLSCAN` |
| **W-34** | **PII at rest** — hash/encrypt stored OTPs, encrypt document references, define retention | `services/src/otp.ts:120-131`, `models/src/userProfileSchema.ts`, storage metadata (BUG-32, SEC) | BE + DATA | 2.5 dd | Inspect an OTP row → no plaintext; an expired OTP is purged | No plaintext OTP or unbounded PII retention |
| **W-35** | **Backups + a rehearsed restore + migration discipline** | `deploy/` scripts (add `backup-*.sh`), `npm run migrate:*` path, staging DB (OPS-5, OPS-7) | OPS + DATA | 2.5 dd | Restore last night's dump into a scratch DB and boot the API against it successfully | Recovery is a tested procedure, not a hope |

**Phase 3 gate:** reconciliation of recorded KPIs against raw data returns zero unexplained variance.

---

## 6. Phase 4 — Money, comms & release-grade deploy (P2) · ~22 dd

| ID | Task | Connection | POC | Effort | Verify | Exit / DoD |
|----|------|-----------|-----|-------:|--------|-----------|
| **W-40** | **Real payment gateway** (order → capture → webhook → refund), replacing the stub while the UI already claims real payments | `services/src/bookingPayment.ts:35-42` (`stub_*` ids), `/api/v1/payments/*`, customer payment screens (BUG-12, GAP-03) | BE + MOB-C | 6–8 dd | Sandbox: pay a booking end-to-end, refund it, and confirm the ledger + booking state match the gateway | Money moves with a real, reconcilable record |
| **W-41** | **Cancellation/refund policy engine** (fees, partial refunds, who reads the preview) | `bookings/*/:id/cancel-preview` (implemented, **no client caller** — `13-§5`), fare + payment services | BE + PO | 3 dd | Each cancel path shows the same fee the backend will charge and the refund follows | Cancel preview is real, wired and matches the ledger |
| **W-42** | **Driver/vendor payouts & settlement** | vendor bank details (exists), new payout model + admin finance screen (GAP-09) | BE + ADM | 4 dd | Compute a payout for a completed week and reconcile it against transactions | Earnings can be paid, not just displayed |
| **W-43** | **SMS/email hardening & cost control** — provider fallback, per-number/IP throttles, fare/Distance-Matrix caching | `services/src/otp.ts`, `services/src/googleMaps.ts:36-`, `fareRoutes.ts:9-10` (BUG-18), `utils/src/email.ts` (stub) | BE | 2.5 dd | Fare endpoint hit 10× returns cached results (no 10 billed calls); OTP throttle blocks the 6th request in a minute | Provider cost cannot be trivially abused |
| **W-44** | **SOS that actually does something** | `services/src/sos.ts` (logs only), `/api/v1/sos/alert`, customer SOS screens (GAP-05) | BE + MOB-C | 2.5 dd | Trigger SOS → configured contacts/emergency number receive the alert and the event is logged with location | SOS has an effect outside the app |
| **W-45** | **Release process** — EAS Update channels, versioning policy, store submission (incl. iOS), rollback | `mobile application/eas.json`, `customer application/eas.json` (no `channel`, Android-only submit — OPS-9), `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md` | OPS + MOB-P + MOB-C | 2 dd | Ship an OTA update to a preview channel, then roll it back | A release can be shipped and reverted without a store cycle |
| **W-46** | **Zero-downtime + reversible deploys** | `deploy/ecosystem.config.cjs` (single fork), `deploy/deploy-backend.sh` (`pm2 restart`) (OPS-4, OPS-1) | OPS | 1.5 dd | Deploy during a `curl` loop → zero failed requests; bad build → rollback in one command | Deploys stop being an outage event |

---

## 7. Phase 5 — Ops & compliance hardening (P2) · ~12 dd

| ID | Task | Connection | POC | Effort | Verify | Exit / DoD |
|----|------|-----------|-----|-------:|--------|-----------|
| **W-50** | **Monitoring & alerting** (uptime, error rate, DB/Redis, disk) | uptime check on `/health`, error tracker, log rotation (`ecosystem.config.cjs:19-21`) (OPS-6) | OPS | 2 dd | Kill the API on staging → alert arrives within minutes; logs rotate | A silent outage becomes impossible |
| **W-51** | **Dependency & supply-chain sweep** | `npm audit` in all four trees + both Expo apps; pin/upgrade app-* versions (X7 — never run) | OPS + QA | 1.5 dd | Audit report with zero un-triaged critical/high entries | No known critical CVE ships |
| **W-52** | **Abuse/rate limiting per surface** (OTP, fare, upload, admin login) | `middleware/src/rateLimit*`, `app.ts` chain, admin login route (BUG-04, BUG-18) | BE | 1.5 dd | Each surface throttles at its configured threshold with a clear error | Spending and enumeration attacks are bounded |
| **W-53** | **Upload validation depth** — magic-byte sniffing, AV scan, size/quota per user | `middleware/src/upload.ts:8-14`, `storage/src/index.ts:113-121` (BUG-11) | BE | 2 dd | Upload a `.jpg` renamed from a script → rejected; quota enforced | No file is trusted on MIME alone |
| **W-54** | **DPDP/privacy compliance passes** — consent, retention, export/delete, document access audit | models + admin endpoints, privacy copy in both apps, `admin/activity-logs` (BUG-26) | BE + PO + ADM | 3 dd | A user can request export/delete and it is honoured; every document view is logged | Data handling is documented, consented and auditable |
| **W-55** | **Load & soak test** (X8 — never run) | k6/artillery against staging: booking create, fare, driver status loop, socket joins | QA + OPS | 2 dd | p95 latency and error rate under the target load, no memory growth over 1 hour | Capacity numbers exist instead of opinions |

---

## 8. Phase 6 — Deferred product backlog (P3)

| ID | Item | Why deferred | POC |
|----|------|--------------|-----|
| **W-60** | Multi-admin team management with enforced RBAC (model exists, identity hardcoded) | Phase 0 removes the blocker; real RBAC is a product decision (GAP-08) | BE + PO |
| **W-61** | Ratings/reviews moderation screen in admin | Data exists, low risk (GAP-10) | ADM |
| **W-62** | i18n (Hindi/Odia) | Client marked "later" (GAP-12) | MOB-C + MOB-P |
| **W-63** | Split the god-screens (`DriverDashboardScreen` 1445 lines, `PartnerHomeScreen` 1134, `PartnerVerificationStatusScreen` 877) | Maintainability capex, no user-visible gain (BUG-35) | MOB-P |
| **W-64** | Partner web console (if the client wants desktop ops) | New surface — needs a product spec, and `partnerweb/` is explicitly deleted | PO |

---

## 9. Dependencies & sequencing rules

```
W-01..W-08 (Phase 0)  ──▶ everything else
   W-02 (private docs) ──▶ W-10 (upload) ──▶ W-11 (viewer) ──▶ W-12 (gating)
   W-03 (socket auth)  ──▶ W-21 (subscribe instead of poll)
   W-04 (admin identity)──▶ W-54 (document access audit) , W-52 (login throttle)
   W-18 (CI)           ──▶ Phase 2+ (every later item ships behind tests)
   W-30 (booking model)──▶ W-32 (ledger), W-33 (indexes), reconciliation reports
   W-35 (backups)      ──▶ W-30/W-31/W-34 (any destructive migration)
   W-40 (gateway)      ──▶ W-41 (refunds), W-42 (payouts)
   W-45 (release path) ──▶ public launch
```

| Rule | Reason |
|------|--------|
| Never migrate data (W-30, W-31, W-34) before backups exist (W-35) | The audit found the deploy path already deletes users (`OPS-1`) |
| Never enable real payments before the ledger resolves to bookings (W-32) | Otherwise money is unattributable |
| Never expose KYC before W-02 + W-11 + W-54 | Public documents + blind approval is the audit's #2 blocker |
| Phase 0 items ship **individually**, each with its own test | They are small, high-impact, low-risk |

---

## 10. Environments, secrets & "connection" matrix

Everything the plan needs, and where it lives. Values come from the four tracked example files; **no secret is stored in git** (`02-V-16`).

| Service | Env var(s) | Consumed by | Needed by phase | Notes |
|---------|-----------|-------------|-----------------|-------|
| MongoDB | `MONGODB_URI` | `backend/src/database/src/index.ts` | 0 (already works) | DB name `race-service`; local `mongod` on the VM today |
| Redis | `REDIS_URL` | `backend/src/config/*` | 1 | Token/OTP cache; local on the VM |
| App API base | `EXPO_PUBLIC_API_URL` (mobile), `VITE_API_URL` (admin) | `customer application/src/config/api.ts`, `mobile application/src/config/api.ts`, `race-admin/packages/config/src/index.ts` | 0 | Currently points at a GCP IP; must be the TLS hostname after W-07 |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_*_EXPIRES_IN` | `backend/src/utils/src/jwt.ts` | 0 | Rotate now — separate admin from user secrets (BUG-14) |
| OTP policy | `OTP_EXPIRY_SECONDS`, `OTP_MAX_RESEND_ATTEMPTS`, `OTP_MAX_VERIFY_ATTEMPTS` | `services/src/otp.ts` | 0 | Also gate `FORCE_MOCK_OTP`/`MOCK_DATA_MODE` here (W-06) |
| SMS provider | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `services/src/otp.ts` | 1 | Dev prints OTP to the terminal; production must not |
| Email/SMTP | `SMTP_HOST/PORT/USER/PASS/FROM` | `backend/src/utils/src/email.ts` (**stub**) | 4 | W-43 implements it |
| Storage | `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_KEY_FILE`, `APP_BASE_URL` | `backend/src/storage/src/index.ts` | 0 (W-02 changes semantics) | Private objects + signed URLs; drop the local `/uploads` fallback in prod |
| Maps | `GOOGLE_MAPS_API_KEY` (backend), `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | `services/src/googleMaps.ts`, both apps | 0 | Cache fare calls (W-43); admin map needs its own key (W-22) |
| Admin identity | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | `config/hardcoded-admin.ts` | 0 (removed by W-04) | Must stop being the login mechanism |
| CORS | `CORS_ORIGIN` | `config/env.ts`, `app.ts:19-24`, `socket.ts` | 0 | Required, no `*` (W-05) |
| SOS | `SOS_EMERGENCY_PHONE`, `SOS_SUPPORT_PHONE`, `SOS_AVG_ARRIVAL_MINUTES` | `services/src/sos.ts` | 4 | W-44 makes these actionable |
| UI dev flags | `EXPO_PUBLIC_UI_PREVIEW_MODE`, `EXPO_PUBLIC_SKIP_OTP_AUTH`, `EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW` | prefs/constants in both apps | 0 | Must default **off** in release builds (W-01) |

---

## 11. Verification protocol (applies to every phase)

| # | Check | Command | Must be true |
|---|-------|---------|--------------|
| V-a | Backend types | `cd backend && npm run lint` | exit 0 |
| V-b | Customer app types | `cd "customer application" && npx tsc --noEmit` | exit 0 |
| V-c | Partner app types | `cd "mobile application" && npx tsc --noEmit` | exit 0 |
| V-d | Admin types | `cd race-admin && npx tsc --noEmit -p apps/admin-web/tsconfig.app.json` | exit 0 |
| V-e | Automated tests | `npm test` in `backend` + `race-admin` | green, with at least one **negative** test per fixed blocker |
| V-f | Audit script | `cd backend && npm run seed:fresh && npx tsx src/scripts/comprehensive-audit.ts` | runs against a live DB (`[X]` until a DB is reachable) |
| V-g | End-to-end manual | one real journey per touched surface on a device/browser | observed, not inferred |
| V-h | Deploy safety | deploy against staging, then re-run `V-e` + `V-f` | no data loss, no regression |

**Definition of Done for any work item:** code merged behind CI (W-18) · types clean · at least one test that fails if the fix is reverted · the item's `Verify` column executed and its output pasted into the PR · relevant doc in this audit folder updated.

---

## 12. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R1 | A "quick" production deploy wipes users (`OPS-1`) before W-07 lands | Medium | Severe | Ship W-07 first; until then treat deploy-backend.sh as production-frozen |
| R2 | Booking-model refactor (W-30) breaks admin KPIs and finance | High | High | Freeze KPI dashboards, build a reconciliation script first (W-35), backfill in a staging DB |
| R3 | Payment integration drags (provider onboarding/KYC) | Medium | High | Start provider onboarding in Phase 1 in parallel; keep the stub behind an env flag so the rest of the platform is not blocked |
| R4 | Two parallel workstreams editing the same mobile files (audit found this happening) | High | Medium | One writer per surface; claim the surface in `.cursor/memory/agents-lock.md`; small PRs, CI gate |
| R5 | The 6 unaudited partner screens hide new defects | Medium | Medium | Phase 1 includes a fresh review pass over those screens before pilot |
| R6 | No live DB in the working environment keeps `[X]` items unverified | High | Medium | Stand up a scratch Mongo/Redis for `V-f`; make `seed:fresh` + audit script part of CI |

---

## 13. Do NOT do (from the audit's evidence)

- Do **not** "fix" the audit by re-enabling mock data or skipping assertions to make tests pass.
- Do **not** recreate `customerweb/`, `partnerweb/`, `web application/`, `race-service/` (deleted by decision).
- Do **not** commit to `main`, `release4Aug2026`, `release/13July26`.
- Do **not** build a second OTP/booking/profile module — the repo already has duplicates (BUG-22).
- Do **not** expose KYC or add a public document URL as a shortcut for W-11.
- Do **not** turn on real payments before W-32 (ledger attribution) and W-41 (refunds) exist.

---

## 14. Evidence index

`00` summary · `01` scorecard & rubric · `02` verification log (incl. self-review corrections) · `10` backend · `11` database · `12` security · `13` API connections · `14` maps/realtime · `15` deploy/ops · `20` customer app · `21` partner app · `22` admin web · `30` UI inventory · `40` bugs & gaps (IDs used above) · `50` test cases · `60` client-doc conformance · `70` quick wins · `81` scoring only.
