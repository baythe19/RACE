# 50 — Test Case Catalogue

**Purpose:** give the team an executable checklist that can be run by one person with a laptop, a seeded DB, and (for app cases) one Android device + one iPhone or emulator.

---

## 0. How to execute

### 0.1 Environment setup
```bash
# backend
cd backend
cp .env.example .env            # then set MONGODB_URI, JWT_* (>=32 chars), MC_* if testing SMS
npm install
npm run lint                    # typecheck (must exit 0)
npm run seed:fresh              # reset + seed demo data
npm run dev                     # API on :3000

# customer app
cd "customer application" && npm install
EXPO_PUBLIC_API_URL=http://<host-ip>:3000 npx expo start

# partner app
cd "mobile application" && npm install
# IMPORTANT for real-data testing (BUG-01):
EXPO_PUBLIC_UI_PREVIEW_MODE=false EXPO_PUBLIC_API_URL=http://<host-ip>:3000 npx expo start

# admin web
cd race-admin && npm install
cd apps/admin-web && npm run dev     # :3001
```

### 0.2 Baseline audit script (the only existing end-to-end net)
```bash
cd backend && npm run seed:fresh && npx tsx src/scripts/comprehensive-audit.ts
```
Expected: completes with a summary of created/verified entities. **Not run in this audit — needs a live Mongo [X].**

### 0.3 Conventions
- **Type:** P=positive, N=negative, S=security, I=integration (cross-surface).
- Every API case assumes `Authorization: Bearer <accessToken>` unless stated.
- Device cases assume a fresh install unless stated.

---

## A. Backend — auth & OTP

| ID | Type | Scenario | Steps | Expected |
|----|------|----------|-------|----------|
| TC-AUTH-01 | P | Send OTP for new customer | `POST /api/v1/auth/send-otp {mobileNumber, role:'customer'}` | 200, `isExistingUser:false`, `onboardingRequired:true`; in dev also `devOtp` |
| TC-AUTH-02 | P | Verify OTP returns tokens | `POST /auth/verify-otp {mobileNumber, otp, role:'customer'}` | 200, access+refresh, `user.role:'customer'`, `onboardingRequired:true` |
| TC-AUTH-03 | N | Wrong OTP | verify with `000000` | 400 `Invalid OTP`, `mobileAttempts` **not** incremented in dev (documented behaviour — production guard only) |
| TC-AUTH-04 | S | Verify attempts cap | production: 6 wrong OTPs | 429 `Maximum OTP verification attempts exceeded` |
| TC-AUTH-05 | N | Expired OTP | wait `OTP_EXPIRY_SECONDS`, then verify | 400 `OTP expired…` |
| TC-AUTH-06 | N | Reuse consumed OTP after window | verify twice after expiry window passes | 400 (idempotent path only inside the window) |
| TC-AUTH-07 | S | Resend cap (production) | 4 × send-otp within an hour | 429 `Maximum OTP resend attempts exceeded` |
| TC-AUTH-08 | S | Role lock | verify as `customer`, then send-otp with `role:'driver'` for the same verified number | 409 with the "registered as a customer" message |
| TC-AUTH-09 | P | Unverified number may switch role | abandon signup, then send-otp with another role | 200 and role switches (`ensureUserRole`) |
| TC-AUTH-10 | N | Suspended account | set `accountStatus:'SUSPENDED'`, send-otp | 403 `Your account has been suspended…` |
| TC-AUTH-11 | P | Refresh rotation | `POST /auth/refresh-token` | 200 with new pair; **the old refresh token is now rejected** |
| TC-AUTH-12 | S | Reuse rotated refresh token | call refresh with the old token | 401 `Refresh token expired or revoked` |
| TC-AUTH-13 | P | Vendor-driver credential login | `POST /auth/driver-login {loginId,password}` | 200 tokens; role `driver` |
| TC-AUTH-14 | N | Vendor driver via OTP | send-otp for a vendor-driver number with `role:'driver'` | 409 "belongs to a vendor driver… use Login ID" |
| TC-AUTH-15 | S | Driver login with SUSPENDED/REJECTED driver | `driver-login` | 403 `Your driver account is not active` |
| TC-AUTH-16 | S | Invalid mobile format | `{mobileNumber:'12345'}` | 400 validation message |
| TC-AUTH-17 | S | Rate limit auth | 21 requests / 15 min from one IP (prod config) | 429 `Too many authentication attempts` |
| TC-AUTH-18 | N | Missing Bearer header on protected route | `GET /api/v1/profile` without token | 401 `Missing or invalid authorization header` |
| TC-AUTH-19 | S | Expired access token | wait > `JWT_ACCESS_EXPIRES_IN` | 401 `Invalid or expired access token` |
| TC-AUTH-20 | S | Admin token used as user token (BUG-14) | call `GET /api/v1/profile` with an **admin** access token | **Currently 200 with `sub='race-platform-admin'`** → this is the bug to confirm; expected after fix: 401 |

## B. Backend — profile, vehicles, saved data

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-PROF-01 | P | `GET /profile` customer | 200, no `driverProfile` key |
| TC-PROF-02 | P | `GET /profile` driver | 200 with `driverProfile {status, driverCode, documents[], statusHistory[], submittedAt}`, **no `loginId`/`passwordHash`** |
| TC-PROF-03 | P | `PUT /profile/complete` valid | 200, `isProfileCompleted` true for a fully filled profile |
| TC-PROF-04 | N | `PUT /profile/complete` bad pincode | 400 `address.pincode` |
| TC-PROF-05 | N | `PUT /profile` empty body | 400 `At least one profile field is required` |
| TC-PROF-06 | S | IDOR: read another user's profile | there is no `userId` param → verify no route accepts one (pass) |
| TC-VEH-01 | P | CRUD vehicle | create→list→get→update→delete all 2xx |
| TC-VEH-02 | N | Create vehicle with another user's data | `customerId` is taken from the token — verify a spoofed `customerId` in the body is ignored |
| TC-VEH-03 | N | Invalid ObjectId | 400 `Invalid vehicle id` |
| TC-VEH-04 | P | `GET /vehicles/:id/verify` (QR target) | 200 metadata for a valid id |
| TC-VEH-05 | S | `GET /api/v1/qr/:id` **without** token (BUG-19) | currently 200 → confirm exposure |
| TC-LOC-01 | P | Saved locations create/list | 2xx |
| TC-LOC-02 | P | Update/delete location | **verify PUT/DELETE wiring** (unconfirmed in the matrix) |
| TC-NOTIF-01 | P | List + mark all read + preferences | 2xx, prefs persist |
| TC-WALLET-01 | P | `GET /profile/wallet` | 200 balance object |

## C. Backend — bookings

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-TOW-01 | P | Create instant towing booking | 201; `towingMode:'instant'` stored |
| TC-TOW-02 | P | Create scheduled booking with future `scheduledAt` | 201 |
| TC-TOW-03 | N | `scheduledAt` in the past | 400 `scheduledAt must be a future date` |
| TC-TOW-04 | N | Missing vehicleId / bad ObjectId | 400 |
| TC-TOW-05 | P | List with status filter + pagination | 200 shaped `{items, meta}` |
| TC-TOW-06 | P | `GET /:id/tracking` | 200 timeline + current status |
| TC-TOW-07 | P | `GET /:id/cancel-preview` | 200 with cancellation fee if applicable |
| TC-TOW-08 | P | `POST /:id/cancel` | 200, status CANCELLED, history appended |
| TC-TOW-09 | S | Cancel **another user's** booking | 403/404, no state change |
| TC-TOW-10 | P | `POST /:id/rating` once | 201 |
| TC-TOW-11 | N | Rate twice | 409/400 (verify duplicate guard) |
| TC-TOW-12 | S | `PATCH /:id/status` as customer | 403 (driver/admin action) |
| TC-TOW-13 | N | Illegal transition (e.g. CREATED → COMPLETED) | 400 from `assertValidStatusTransition` |
| TC-DRB-01 | P | Create driver booking with `driverServiceType:'part_time'` | 201, type stored |
| TC-DRB-02 | N | Invalid `driverServiceType` | 400 |
| TC-DRB-03 | P | Tracking / cancel-preview / cancel / rating | as towing |
| TC-RSD-01 | P | `GET /bookings/roadside/availability` **without** token | 200 availability list |
| TC-RSD-02 | P | `POST /bookings/roadside` | 201 |
| TC-RSD-03 | ⚪ | Fetch a single roadside booking | **no endpoint exists** → record as gap (GAP-29) |
| TC-CMB-01 | P | `GET /bookings` combined list | 200 merging towing+driver (+roadside if present) |
| TC-CMB-02 | N | Invalid query params | 400 |

## D. Backend — fare, payments, subscriptions, SOS

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-FARE-01 | P | `GET /fare/towing?…` with key configured | 200 distance + fare |
| TC-FARE-02 | N | No `GOOGLE_MAPS_API_KEY` | graceful fallback (no 500) |
| TC-FARE-03 | S | `GET /fare/towing` **without auth** (BUG-18) | currently 200 → confirm public + billed |
| TC-PAY-01 | P | `POST /payments/advance` | 200 with `gatewayReferenceId: 'stub_…'` → **demo behaviour confirmed** |
| TC-PAY-02 | P | `POST /payments/advance/verify` | 200, transaction marked paid |
| TC-PAY-03 | N | Verify with a wrong/random reference | should fail; record actual behaviour |
| TC-PAY-04 | S | `POST /payments/advance` for another user's booking | 403/404 |
| TC-SUB-01 | P | `GET /subscriptions/plans` | 200 plans |
| TC-SUB-02 | P | `POST /subscriptions` (subscribe, stub payment) | 200 active subscription |
| TC-SUB-03 | P | `POST /subscriptions/cancel` | 200 cancelled |
| TC-SUB-04 | N | Subscribe twice | verify guard (define expected) |
| TC-SOS-01 | P | `GET /sos/config` public | 200 numbers |
| TC-SOS-02 | P | `GET /sos/context` + `POST /sos/alert` | 200, alert logged (no dispatch — GAP-05) |
| TC-SOS-03 | S | `POST /sos/alert` with another user's context ids | verify ownership check |

## E. Backend — vendor surface

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-VND-01 | P | Save draft → register vendor | 201, `status:'pending'`, `verificationStage:'document_review'`, history appended |
| TC-VND-02 | P | Upload document (JPG) | 200 with `fileUrl`; **verify the URL requires no auth (BUG-02)** |
| TC-VND-03 | N | Upload a `.exe`/oversized file | 400 |
| TC-VND-04 | S | Upload with `.pdf` MIME but non-PDF bytes (BUG-11) | currently accepted → confirm |
| TC-VND-05 | P | `GET /vendor/status`, `/vendor/profile`, `/vendor/dashboard` | 200 |
| TC-VND-06 | S | Call vendor routes as a **driver** token | 403 `Insufficient permissions` |
| TC-VND-07 | S | Call vendor routes as a **customer** token | 403 |
| TC-VND-08 | P | Create fleet driver → upload driver doc → claim driver → list | 2xx chain |
| TC-VND-09 | N | Create fleet driver with duplicate loginId | 409 duplicate key |
| TC-VND-10 | P | Vehicles CRUD | 2xx |
| TC-VND-11 | P | Booking offers list → approve → assign | 2xx, driver/vehicle recorded |
| TC-VND-12 | P | Trip OTP verify (`POST /vendor/bookings/:id/verify-trip-otp`) | 200 with correct OTP, 400 with wrong (endpoint is **not wired in the app** — BUG-24) |
| TC-VND-13 | S | Approve/assign a booking belonging to another vendor | 403 |
| TC-VND-14 | S | Remove another vendor's driver/vehicle | 403/404 |

## F. Backend — driver surface

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-DRV-01 | P | `POST /driver/register` as authenticated customer | 201; `status:'PENDING'` in production, `'APPROVED'` otherwise |
| TC-DRV-02 | S | Any driver route while status is PENDING (availability, location, bookings, offers, accept, reject) | **403** for all six (probing `assertDriverApproved`) |
| TC-DRV-03 | P | After admin approve: availability on | 200 |
| TC-DRV-04 | N | Go offline with an active booking | 400 `Cannot go offline with active booking` |
| TC-DRV-05 | P | `PATCH /driver/location` | 200; customer tracking room receives `driver:location` (needs a socket client — see TC-SEC-02) |
| TC-DRV-06 | P | Offers list excludes own claimed/vendor-routed jobs | verify filtering |
| TC-DRV-07 | P | Accept an open offer | 200, booking assigned, status history appended |
| TC-DRV-08 | I | Two drivers accept simultaneously | one 200, other 409 conflict |
| TC-DRV-09 | N | Accept an expired offer (past `offerExpiresAt`) | 403/409 — confirm the expiry enforcement |
| TC-DRV-10 | P | Status cycle EN_ROUTE → ARRIVED → IN_PROGRESS (trip OTP) → COMPLETED | 2xx each; `finalFare` + `finalFareConfirmedAt` written on completion |
| TC-DRV-11 | N | Start trip with wrong 4-digit OTP | 400, code cleared client-side |
| TC-DRV-12 | S | Update status of a booking not assigned to the driver | 403 `This booking is not assigned to you` |
| TC-DRV-13 | P | Active booking endpoint returns the same booking | 200 |
| TC-DRV-14 | N | `PATCH /driver/availability` as vendor/customer token | 403 |

## G. Backend — admin surface

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-ADM-01 | P | `POST /admin/auth/login` with env credentials | 200 + tokens, activity logged |
| TC-ADM-02 | S | Login with default `Admin@123` when env is **unset** (BUG-04) | currently 200 → confirm; expected after fix: boot failure |
| TC-ADM-03 | S | 50 rapid failed logins | currently unlimited → confirm no 429 |
| TC-ADM-04 | P | `/admin/auth/me`, `/refresh-token` (old refresh invalidated), `/logout` | 2xx |
| TC-ADM-05 | S | Expired/forged admin token | 401 |
| TC-ADM-06 | S | Non-admin user token on `/admin/*` | 401 |
| TC-ADM-07 | S | Admin token with insufficient permission (e.g. finance-only on vendors PATCH) | 403 (RBAC) |
| TC-ADM-08 | P | Dashboard, customers, vendors, drivers, bookings, transactions, reports, settings, notifications | 200 each |
| TC-ADM-09 | I | Dashboard "total bookings" vs seeded data (BUG-07) | **document the delta** — legacy + towing + driver summed |
| TC-ADM-10 | P | Approve vendor + reject vendor | status/stage/history updated |
| TC-ADM-11 | P | PATCH a vendor document status | doc status updated |
| TC-ADM-12 | ⚪ | GET vendor/driver document file | endpoint exists but **UI never calls it** (BUG-17); call it directly and verify the bytes |
| TC-ADM-13 | P | Approve driver → driver can go online (link with TC-DRV-03) | I |
| TC-ADM-14 | P | Assign vendor / assign driver on a booking | booking updated, notifications created |
| TC-ADM-15 | S | `GET /admin/activity-logs` | 200 with entries; **not exposed in UI** (BUG-26) |
| TC-ADM-16 | S | `GET /admin/customers/export/csv` twice | confirm no rate limit/audit entry (SEC-16) |

## H. Customer app (device)

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-CUS-01 | P | First launch → onboarding → mobile number → OTP | Real SMS arrives (or dev toast when provider absent) |
| TC-CUS-02 | N | Wrong OTP | Inline error; resend timer runs |
| TC-CUS-03 | P | Profile completion wizard | `isProfileCompleted` true after submit |
| TC-CUS-04 | P | Add vehicle | Vehicle appears in list and in `GET /vehicles` |
| TC-CUS-05 | N | Add vehicle with invalid pincode/empty required field | Field-level errors |
| TC-CUS-06 | P | Book towing (instant) end-to-end until tracking | Booking created and visible in Bookings |
| TC-CUS-07 | P | Book scheduled towing with a future slot | `scheduledAt` sent; past slot rejected client-side too |
| TC-CUS-08 | P | Book driver hire (part-time) | Booking created with `driverServiceType` |
| TC-CUS-09 | P | Book roadside | Booking created; visible in combined list |
| TC-CUS-10 | ⚪ | Open a roadside booking's live tracking | **No screen/endpoint pair exists** → expected failure to record as gap |
| TC-CUS-11 | P | Cancel preview → cancel towing booking | Fee shown, booking cancelled, list refreshes |
| TC-CUS-12 | P | Rate a completed booking | Rating saved, appears on booking detail |
| TC-CUS-13 | S | Airport-mode / offline: create booking with no network | Clear error, no phantom booking |
| TC-CUS-14 | S | Background the app then reopen during tracking | Returns to correct booking state (no stale stage) |
| TC-CUS-15 | ⚠️ | Advance payment flow | Shows success against the **stub** — verify what the user is told (BUG-12) |
| TC-CUS-16 | ⚠️ | QR scan screen | Records failure to scan (BUG-06) |
| TC-CUS-17 | ⚠️ | Set PIN / forgot password | Confirm no persistence/API (BUG-21) |
| TC-CUS-18 | P | Subscribe to a plan then cancel | Active → cancelled |
| TC-CUS-19 | P | SOS flow | Config numbers and context load; alert returns 200 |
| TC-CUS-20 | P | Notifications: list, mark read | Badge clears after refresh |
| TC-CUS-21 | S | Kill/reopen app while logged in | Session restored without re-OTP; refresh rotation works (no 401 loop) |
| TC-CUS-22 | N | Log out | Tokens cleared; protected screens unreachable |
| TC-CUS-23 | S | "Coming soon" services | Record whether a placeholder screen is reachable (BUG/UX-3) |

## I. Partner app (device)

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-PTR-01 | I | **Run with `EXPO_PUBLIC_UI_PREVIEW_MODE=false`** and stop the backend | Every list shows a real error, **not** mock jobs (BUG-01 regression test) |
| TC-PTR-02 | ⚠️ | Run a build **without** that env var, stop the backend | Mock jobs appear → documents the production risk |
| TC-PTR-03 | P | Vendor company registration → documents → submit | Vendor created `pending`; documents uploaded to storage with **server-side** URLs |
| TC-PTR-04 | S | Open an uploaded document URL in an incognito browser (BUG-02) | Currently loads without auth → confirm leak |
| TC-PTR-05 | P | Vendor dashboard after seeding | Real KPIs from the API |
| TC-PTR-06 | P | Add fleet driver, upload doc, claim driver | Driver appears in list; claim links the record |
| TC-PTR-07 | P | Add/update/delete fleet vehicle | 2xx and list refresh |
| TC-PTR-08 | P | Vendor receives booking offer → approve → assign to driver/vehicle | Offer disappears; assignment visible |
| TC-PTR-09 | ⚪ | Vendor verifies trip-start OTP in-app | **No UI entry point** (BUG-24) |
| TC-PTR-10 | P | Vendor-driver login with login ID + password | Lands on driver dashboard |
| TC-PTR-11 | N | Vendor-driver login with wrong password | Clear error, no crash, rate limit applies |
| TC-PTR-12 | P | Self-driver registration: 4 steps → submit → verification screen | Gate screen shows **pending**, backend `status:PENDING` |
| TC-PTR-13 | I | Admin approves the driver, app polls (60 s) | Gate auto-exits to the tabs |
| TC-PTR-14 | S | While pending, tap "Go to Dashboard (Read only)" | Tabs open, availability locked, no fabricated data |
| TC-PTR-15 | P | Offer alert: wait for expiry | Countdown → expired; Accept disabled |
| TC-PTR-16 | I | Two devices accept the same offer | Second gets the "taken by another partner" conflict |
| TC-PTR-17 | P | Accept → en route → arrived → start with 4-digit OTP → complete | Each step persisted; earnings show **final fare** only after backend confirms |
| TC-PTR-18 | N | Wrong trip OTP | Error, code cleared, driver stays on the same step |
| TC-PTR-19 | S | Turn on flight mode mid-job, then restore | App re-syncs the real stage from the backend |
| TC-PTR-20 | P | Kill app during an active job, reopen | Returns to the active job (AppState resync) |
| TC-PTR-21 | N | Deny location permission | Amber health card with Open settings / Try again; **no silent "Online"** |
| TC-PTR-22 | S | Disable GPS while online | "Turn on device location" health state |
| TC-PTR-23 | I | Background the app during a job for 5 minutes | Customer tracking stops updating → confirms PA-5 |
| TC-PTR-24 | P | Earnings dashboard periods (today/week/month) | Bars reflect only completed jobs with a fare |
| TC-PTR-25 | P | Notifications + preferences | Read/unread + preference persistence |
| TC-PTR-26 | ⚠️ | Driver registration with empty fields | Confirm fabricated defaults are stored (BUG-16) |
| TC-PTR-27 | ⚠️ | Driver registration documents | Confirm stored URLs are `file:///…` (BUG-05) |

## J. Admin web (browser)

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-AWM-01 | P | Login → dashboard | Metrics render; no console errors |
| TC-AWM-02 | S | Session expiry | Redirect to login, no infinite refresh loop |
| TC-AWM-03 | S | Log in as a low-permission role (if ever created) | Permission-guarded routes/modules hidden |
| TC-AWM-04 | P | Bookings list: filters, pagination, detail drawer | Data matches API response |
| TC-AWM-05 | I | Compare dashboard totals with seeded DB (BUG-07) | Record discrepancy |
| TC-AWM-06 | P | Assign vendor / assign driver from booking | Reflected in API |
| TC-AWM-07 | ⚪ | Cancel a booking from admin | **No UI action** (endpoint exists) |
| TC-AWM-08 | P | Customers list, detail, status change, CSV export | Works; export opens a valid CSV |
| TC-AWM-09 | P | Vendor detail: approve/reject/suspend; fleet tables | Status and history update |
| TC-AWM-10 | ⚠️ | Vendor documents: click approve/reject | Confirm the reviewer **cannot view the file** (BUG-17) |
| TC-AWM-11 | P | Driver detail: approve → driver becomes usable (link TC-PTR-13) | I |
| TC-AWM-12 | ⚠️ | Driver document review | Same viewing gap as vendors |
| TC-AWM-13 | P | Financial page | Transactions render; numbers come from the stub ledger |
| TC-AWM-14 | ⚠️ | Reports page | Charts render; verify the data source caveat |
| TC-AWM-15 | ⚪ | Subscription plans create/edit/assign | **No UI** |
| TC-AWM-16 | ⚪ | Activity log | **No page** (BUG-26) |
| TC-AWM-17 | ⚪ | `/admin-users` page | Renders but cannot manage admins |
| TC-AWM-18 | P | Settings GET/PUT round-trip | Values persist |
| TC-AWM-19 | P | Notifications page | Unread count, mark read |
| TC-AWM-20 | ⚠️ | Vendor with empty serviceAreas | Shows hardcoded "Bhubaneswar, Odisha" (BUG-23) |

## K. Cross-surface / integration

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-INT-01 | I | Customer books towing → vendor approves → driver accepts → driver completes → customer rates | Whole chain persists; every surface shows the same status wording (WC-2 in the UX doc) |
| TC-INT-02 | I | Customer books **driver hire** → driver accepts → trip OTP → complete | Same chain for the driver product |
| TC-INT-03 | I | Customer live-tracks while driver moves | Map updates (socket in customer app) — measure latency and background behaviour |
| TC-INT-04 | I | Cancel from customer app mid-job | Vendor + driver see the cancellation; no zombie active job |
| TC-INT-05 | I | Admin suspends a vendor mid-job | Vendor/driver lose access; in-flight job handling recorded |
| TC-INT-06 | I | Driver goes offline with an active job | 400 (server) + clear client message |
| TC-INT-07 | I | Admin approves a PENDING driver who is currently on the gate screen | App unlocks within one poll cycle |
| TC-INT-08 | I | Booking created with `towingMode:'emergency'` | Stored + shown consistently in admin and partner surfaces |
| TC-INT-09 | I | Ratings visible to admin | Confirm the admin side can see ratings (expected gap) |
| TC-INT-10 | I | Same mobile number across three surfaces | Role lock prevents wrong-app login; wrong-app screen shown |

## L. Security & non-functional

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TC-SEC-01 | S | Unauthenticated Socket.IO client joins `booking:<id>` (BUG-03) | **Currently succeeds** → confirm; expected after fix: connection rejected |
| TC-SEC-02 | S | Socket listener receives `driver:location` for a booking it does not own | Currently yes → confirm |
| TC-SEC-03 | S | IDOR sweep: for each `/…/:id` endpoint, use another user's id | All must be 403/404 (record any 200) |
| TC-SEC-04 | S | Upload a polyglot file (PDF header + script) | Must be accepted only after magic-byte validation (post-fix) |
| TC-SEC-05 | S | `CORS_ORIGIN='*'` with credentials from a foreign origin (BUG-15) | record `Access-Control-Allow-Origin` echo |
| TC-SEC-06 | S | Mass-assignment: send `role`, `isVerified`, `isAdmin`, `status` in profile/register bodies | Must be ignored (Zod strips unknowns — verify) |
| TC-SEC-07 | S | SQL/NoSQL injection strings in `?status[$ne]=` | Must be rejected/ignored by Zod enums |
| TC-SEC-08 | S | 1 MB+ JSON body | 413/400, no crash |
| TC-SEC-09 | S | `npm audit --omit=dev` on backend + both apps | Record critical/high counts |
| TC-NFR-01 | P | 100 concurrent fare estimates | Record p50/p95 + Google quota usage |
| TC-NFR-02 | P | Bookings list with 10k rows in `towingbookings` | Record query time; expect index use, not COLLSCAN (`explain`) |
| TC-NFR-03 | P | Admin dashboard load with seeded volume | Record response time for the 3-collection aggregation |
| TC-NFR-04 | P | App cold start (both mobile apps, mid-range Android) | Record TTI; note the 60 s profile poll and 8/10/15 s query polls |
| TC-NFR-05 | P | OTP send latency (real provider) | Record round trip |
| TC-NFR-06 | P | Backend boot with Redis down in production | Must fail fast (no memory fallback) |
| TC-NFR-07 | P | Backend boot with an invalid env (short JWT secret) | Must exit(1) with a clear message |

---

## Summary sheet

| Surface | Cases | Includes |
|---------|------:|----------|
| Backend auth/OTP/profile/vehicles | 27 | 8 security |
| Backend bookings | 20 | 4 negative, 2 security |
| Backend fare/payments/subscriptions/SOS | 16 | 3 security |
| Backend vendor | 14 | 6 security |
| Backend driver | 14 | 4 security |
| Backend admin | 16 | 6 security |
| Customer app | 23 | 4 negative, 2 security |
| Partner app | 27 | 5 negative, 3 security |
| Admin web | 20 | 2 security |
| Integration | 10 | — |
| Security / NFR | 16 | 9 security |
| **Total** | **203** | **~50 security/negative** |

### Cases that should be automated first (highest regression value)
1. TC-AUTH-01…03, 08 (role lock), 11–12 (refresh rotation)
2. TC-DRV-02 (approval gate) and TC-DRV-08 (double-accept conflict)
3. TC-TOW-13 (illegal transition) and TC-TOW-09 (ownership)
4. TC-SEC-01/03 (socket + IDOR sweep)
5. TC-VND-02/04 (upload privacy + validation)
6. TC-ADM-09 (KPI correctness across collections)
