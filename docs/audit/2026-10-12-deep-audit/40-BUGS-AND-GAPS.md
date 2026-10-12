# 40 — Bugs & Gaps Register

Severity: 🔴 **S1 blocker** (blocks real users / security) · 🟠 **S2 major** (wrong behaviour, money, trust) · 🟡 **S3 minor** (polish, ops) · ⚪ **Gap** (not a bug, missing capability).
Every row has evidence. Nothing was fixed in this audit.

---

## 1. S1 — Blockers

| ID | Title | Evidence | Impact |
|----|-------|----------|--------|
| BUG-01 | **Partner app ships mock data by default** — `UI_PREVIEW_MODE` is `true` unless `EXPO_PUBLIC_UI_PREVIEW_MODE=false`; 40 fallback sites in 15 service files return fake jobs/offers/earnings/vendor data when the API fails | `mobile application/src/constants/preview.ts:6-7`; `services/driver/driverApi.ts:71,89,106,125`; `services/vendor/vendorApi.ts:30,47,64,78,92` | Production build can show fabricated jobs and earnings; failures are invisible; a driver may trust fake earnings |
| BUG-02 | **Uploaded KYC documents are publicly readable** — local fallback writes to `<cwd>/uploads` served by `express.static` with no auth; GCS objects are stored as public `storage.googleapis.com/<bucket>/<path>` URLs | `backend/src/app.ts:32`; `backend/src/storage/src/index.ts:117-125, 68-72` | Aadhaar/PAN/licence/selfie disclosure; no revocation |
| BUG-03 | **Socket.IO accepts unauthenticated clients and joins any booking room** — `booking:track {bookingId}` and `driver:join {driverId}` have no token check | `backend/src/services/src/socket.ts:17-36` | Live customer/driver location and status leak to anyone who can reach the API |
| BUG-04 | **Admin login is a hardcoded plaintext credential with a working default** (`admin@raceservice.com` / `Admin@123`) and no rate limiter on the admin login route | `config/hardcoded-admin.ts:24-28`; `services/src/admin/adminAuth.ts:30-33`; `controller/src/admin/adminAuthRoutes.ts:15` vs `authRoutes.ts:15` | Full platform takeover if env is unset/weak |
| BUG-05 | **Self-driver KYC never reaches storage** — registration sends `url: <local device uri>`, and no upload endpoint exists for self-drivers | `mobile application/src/screens/partner/registration/driver/DriverReviewScreen.tsx:86-90`; only `POST /vendor/drivers/:id/upload-document` exists | Driver approval is impossible without manual data capture |
| BUG-06 | **QR "scan" cannot function** — no camera library installed and no camera API used anywhere in the customer app | `customer application/package.json` (no expo-camera/barcode-scanner); grep for `CameraView`/`BarCodeScanner` → only `ImagePicker` in `DocumentUpload.tsx:80` | The emergency-QR product (5 screens) is decorative |

## 2. S2 — Major

| ID | Title | Evidence | Impact |
|----|-------|----------|--------|
| BUG-07 | Admin KPIs/reports sum **three booking collections** with two status vocabularies; seed writes legacy bookings | `services/src/admin/adminDashboard.ts:79-81,186-188`; `adminBookings.ts:299-316`; `models/src/booking.ts` used by 13 files | Wrong business numbers, possibly inflated by demo data |
| BUG-08 | `ref: 'Vendor'` / `ref: 'Driver'` point at **models that do not exist** (vendor/driver are `User` sub-docs) | `booking.ts:144`; `towingBooking.ts:122-123`; `driverBooking.ts:126`; `transaction.ts:50-51`; no `model('Vendor'`/`model('Driver'` anywhere | Any `populate` on these fields throws; ledger can't join to real bookings |
| BUG-09 | `Transaction.bookingId` refs the **legacy** `Booking` model only | `models/src/transaction.ts:52` | Finance cannot attribute new towing/driver bookings |
| BUG-10 | `FORCE_MOCK_OTP=true` (unvalidated raw env) disables the SMS provider in **any** environment, and the dev path **returns the OTP in the API response** | `services/src/otp.ts:28-32, 137-147` | One env flag ⇒ login as any mobile number |
| BUG-11 | Uploads validated by client-supplied MIME only — no magic-byte check, no AV scan, no quota | `middleware/src/upload.ts:8-14`; `storage/src/index.ts:113-121` | Malicious payloads accepted and stored |
| BUG-12 | Payments are a stub (`stub_<type>_<amount>_<uuid>`) while the UI presents real payment flows | `services/src/bookingPayment.ts:35-42` | Money trust; cannot go live |
| BUG-13 | `MOCK_DATA_MODE` uses `z.coerce.boolean()` ⇒ the string `"false"` is **truthy**; universal OTP `123456` then stays enabled (prod additionally guarded by `NODE_ENV`) | `config/env.ts:37`; `services/src/otp.ts:150-158` | Staging/preview can be logged into with `123456` |
| BUG-14 | Admin and user JWTs share the same secrets and the **user** middleware does not reject `tokenType:'admin'` tokens | `services/src/admin/adminJwt.ts:30-34,71-79`; `middleware/src/auth.ts:19-24` | Token confusion; admin token usable where a user token is expected |
| BUG-15 | `CORS_ORIGIN` defaults to `*` ⇒ `origin: true` (reflect any) **with credentials** — also for Socket.IO | `config/env.ts:24`; `app.ts:19-24`; `socket.ts:12-16` | Broadens BUG-03/04 exposure |
| BUG-16 | Driver self-registration payload **fabricates** missing profile data (name, email, licence `OD-0220190012345`, vehicle `OD 02 AB 1234`) and can invent a `mock-driver-token` | `DriverReviewScreen.tsx:94-130, 141-170` | Fake KYC data in production records |
| BUG-17 | Admin can **approve/reject documents it can never view** — the view endpoints are unused by the UI | orphan list in `13-API-CONNECTION-MATRIX.md`; `packages/api/src/services/vendor.service.ts:34` (PATCH only) | Blind verification |
| BUG-18 | `/api/v1/fare/*` is public and calls a **billed** Google Distance Matrix on every request, uncached | `controller/src/fareRoutes.ts:9-10`; `services/src/googleMaps.ts:36-45` | Cost/quota abuse |
| BUG-19 | `/api/v1/qr/:id` + `/:id/metadata` have **no auth** and return vehicle/owner metadata | `controller/src/qrRoutes.ts:9-10` | Owner data enumeration |
| BUG-20 | A customer account can call `POST /api/v1/driver/register` (role escalation path into the driver surface) — the driver approval gate is the only thing standing in the way | `controller/src/driverRoutes.ts:18-21,27` | Needs an explicit product decision + audit trail |

## 3. S3 — Minor / polish

| ID | Title | Evidence |
|----|-------|----------|
| BUG-21 | Four customer auth screens (PIN, forgot/reset/change password) have **no API** and no backend route exist | grep `api.` → zero hits; `authRoutes.ts` |
| BUG-22 | Duplicate OTP screens, three profile surfaces, four QR artefacts in the customer app | screen inventory |
| BUG-23 | Hardcoded display fallback `'Bhubaneswar, Odisha'` in admin vendor detail | `components/vendors/vendor-detail-content.tsx:226` |
| BUG-24 | Vendor trip-start OTP endpoint exists but no screen calls it | `mobile application/src/config/api.ts` |
| BUG-25 | Partner app has no map on driver job screens and no background location | `DriverDashboardScreen.tsx`, `hooks/useDriverLocationReporting.ts` |
| BUG-26 | Admin has no activity-log page although every admin action is logged | `admin/adminsRoutes.ts:34` |
| BUG-27 | `/admin-users` page exists but calls no admin API (and admin auth is hardcoded) | route list vs API grep |
| BUG-28 | Subscriptions admin is read-only although plan create/assign/cancel endpoints exist | `subscription.service.ts` (GET only) |
| BUG-29 | Roadside bookings cannot be opened/tracked individually (no detail endpoint) | route map |
| BUG-30 | `GET /api/v1/services/upcoming` is orphaned | route map vs client grep |
| BUG-31 | `syncIndexes()` runs for only 12 of 26 models and drops unknown indexes | `database/src/indexes.ts:27-35` |
| BUG-32 | OTP stored in plaintext (`otpLog.mobileOtp`) on the dev/mock path | `services/src/otp.ts:120-131` |
| BUG-33 | `hashPassword` is identity and `resetPassword` throws — no admin recovery path | `services/src/admin/adminAuth.ts:105-111` |
| BUG-34 | Refresh-token reuse detection missing (rotation exists, family revocation does not) | `utils/src/jwt.ts`, `services/src/auth.ts:263-283` |
| BUG-35 | Partner app god-screens (1445 / 1134 / 877 / 411 lines) contain dead persona branches | file inventory |
| BUG-36 | No automated tests on backend or either mobile app (2 admin tests total) | repo-wide test grep |

## 4. Gaps (product capability, not defects)

| ID | Gap | Evidence / note |
|----|-----|-----------------|
| GAP-01 | No live ops map for admin | no map library in `race-admin` |
| GAP-02 | No background/continuous driver location | no task-manager/background location |
| GAP-03 | No real payment gateway, refunds, commissions, payouts | stub gateway; finance page read-only |
| GAP-04 | No push notifications (in-app only) | no expo-notifications/FCM wiring found |
| GAP-05 | SOS does not dispatch (no call/SMS/emergency contact notification) | `sos.ts` logs only |
| GAP-06 | No real QR scan → emergency actions | BUG-06 |
| GAP-07 | Vendor-side job supervision (in-flight jobs) missing | only offers + assign |
| GAP-08 | Multi-admin with RBAC impossible (single hardcoded identity) | SEC-1 |
| GAP-09 | Driver payout/earnings settlement (bank + payout cycle) absent | bank details captured for vendors only |
| GAP-10 | No ratings/reviews screen in admin (data exists on bookings) | `bookingRatingSchema.ts` |
| GAP-11 | No customer-facing invoice/receipt for bookings | none found |
| GAP-12 | No i18n (Hindi/Odia) despite the client spec mentioning it as later | not started (client marked "later") |

## 5. Priority ordering (impact × effort)

| Rank | Items | Why first |
|------|-------|-----------|
| 1 | BUG-01 (mock mode off by default), BUG-02 (document privacy), BUG-03 (socket auth), BUG-04 (admin credential) | Each is a one-to-few-line change with blocker-level impact |
| 2 | BUG-05 + BUG-16 (driver KYC integrity), BUG-17 (document viewing) | Unblocks the core verification business |
| 3 | BUG-07/08/09 (data truth) | Everything reported to the client depends on it |
| 4 | BUG-10/13 (OTP flags), BUG-14 (token separation), BUG-15 (CORS), BUG-18/19 (public endpoints) | Security hardening |
| 5 | BUG-12 (gateway) | Largest single project, needs a vendor decision |
| 6 | GAP-01/02/03/04 | Product expansion |

## 6. What is genuinely healthy (do not break it)

- Backend layering, Zod validation everywhere, error contract, graceful shutdown, env schema fail-fast.
- User auth: role locking, bcrypt driver passwords, refresh rotation, account-status blocks, OTP via provider in production.
- Driver approval gating on every driver endpoint (the API refuses, not just the UI).
- Admin RBAC model + route guards (the model is sound even though only one identity can log in).
- The driver job cycle and offer alert are well-specified (expiry, states, conflict handling).
- Case B/C/D state coverage on the driver dashboard (loading/offline/empty/error/health) is better than the industry average for a v1.
