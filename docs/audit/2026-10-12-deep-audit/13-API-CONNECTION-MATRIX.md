# 13 — API Connection Matrix (client ⇄ backend)

**Question answered:** *which APIs are open/unused, which are connected, and which client calls can never succeed.*

**Method [O]/[V]:** backend routes were machine-extracted into [`_evidence/backend-route-map.txt`](./_evidence/backend-route-map.txt) (171 route registrations / 136 unique paths). Client usage was extracted by grepping every `.ts/.tsx` in each app for **literal paths, template paths and endpoint-constant keys**, then reading each service module that owns them. Template-built paths (`${API_ENDPOINTS.x}/cancel`) were resolved by hand.

> ⚠️ **Template-built paths are the trap in this analysis.** Counting only quoted literals marks 7 endpoints as "unused" that clients actually call (`${API_ENDPOINTS.subscriptions}/cancel`, `${…notifications}/read-all`, `${…notifications}/preferences`, `${…savedLocations}/${id}`, `${…paymentMethods}/${id}`, `${…towingBooking(id)}/rating`, `${…driverBooking(id)}/rating`). The first pass of this matrix made exactly that mistake; `02-§6` records the fix. Every orphan listed below was re-verified by hand against the client service modules.

> One API serves all surfaces (`backend/src/controller/src/index.ts` mounts customer, partner *and* admin routers in the same app). The customer app therefore also calls `/api/v1/driver/*` (self-driver onboarding) and the partner app also calls `/api/v1/vehicles` (customer vehicle endpoints) — both legal on the same JWT.

---

## 1. High-level wiring diagram

```
                     ┌──────────────────────────────────────────────┐
  Customer app ──────┤ /auth /brand /services /profile* /vehicles   │
  (337 files)        │ /bookings/{towing,driver,roadside} /payments  │
                     │ /fare /subscriptions /sos /driver/* (self)   │
                     ├──────────────────────────────────────────────┤
  Partner app  ──────┤ /auth(+driver-login) /vendor/* /driver/*      │
  (244 files)        │ /profile /notifications /vehicles             │
                     ├──────────────────────────────────────────────┤
  Admin web    ──────┤ /admin/auth /admin/dashboard /admin/customers │
  (127 files)        │ /admin/vendors /admin/drivers /admin/bookings │
                     │ /admin/transactions /admin/reports /settings  │
                     │ /admin/notifications /admin/subscriptions     │
                     └──────────────────────────────────────────────┘
                     Express 5 · JWT · Mongo · Socket.IO · Multer→GCS/local
```

## 2. Customer app — what it actually calls [V]

| Domain | Endpoints used | Status |
|--------|---------------|--------|
| Auth | `POST /auth/send-otp`, `/auth/verify-otp`, `/auth/refresh-token` | ✅ live |
| Content | `GET /brand`, `/services`, `/health` | ✅ live |
| Profile | `GET/PUT /profile`, `PUT /profile/complete`, `/profile/wallet` | ✅ live |
| Vehicle | `GET/POST/PUT/DELETE /vehicles`, `GET /vehicles/:id`, `GET /vehicles/:id/verify` | ✅ live |
| Locations / methods / notifications | `/profile/locations`, `/profile/payment-methods`, `/profile/notifications` (+ `/read-all`) | ✅ live |
| Towing booking | create, list, `:id`, tracking, cancel-preview, cancel, rating | ✅ live |
| Driver booking | create, list, `:id`, tracking, cancel-preview, cancel, rating | ✅ live |
| Roadside | `GET /bookings/roadside/availability`, `POST /bookings/roadside` | ✅ create live; **no roadside detail/tracking endpoint exists** |
| Combined bookings | `GET /bookings` | ✅ live |
| Payments (stub) | `/payments/advance`, `/advance/verify`, `/final`, `/final/verify` | ⚠️ succeeds against a stub gateway |
| Fare | `GET /fare/towing`, `/fare/driver` | ✅ live |
| Subscriptions | `GET /subscriptions/plans`, `GET /subscriptions`, `POST /subscriptions`, `POST /subscriptions/cancel` (`subscriptionApi.ts:85`) | ✅ wired |
| SOS | `GET /sos/config`, `/sos/context`, `POST /sos/alert` | ✅ wired (no dispatch beyond logging) |
| Driver self-onboarding | `/driver/register`, `/driver/availability`, `/driver/location`, `/driver/bookings`, `/driver/bookings/active` | ✅ live |

**Not called by the customer app:** `/api/v1/qr/*`, `/api/v1/services/upcoming`, `/api/v1/auth/driver-login`, `/api/v1/vendor/*`, `/api/v1/bookings/*/:id/status` (status transitions are driver/admin actions).

## 3. Partner app — what it actually calls [V]

| Domain | Endpoints used | Status |
|--------|---------------|--------|
| Auth | `POST /auth/send-otp`, `/verify-otp`, `/refresh-token`, `/auth/driver-login` | ✅ live |
| Vendor onboarding | `/vendor/draft`, `/register`, `/update`, `/profile`, `/status`, `/dashboard`, `/upload-document`, `/selfie` | ✅ live |
| Vendor fleet | `/vendor/drivers` (GET/POST), `/vendor/drivers/:id` (DELETE), `/drivers/:id/upload-document`, `/drivers/claim` | ✅ live |
| Vendor vehicles | `/vendor/vehicles` (GET/POST), `/vendor/vehicles/:id` (PUT/DELETE) | ✅ live |
| Vendor job flow | `GET /vendor/bookings/offers`, `POST /vendor/bookings/:id/approve`, `/assign` | ✅ live |
| Driver job flow | `GET /driver/bookings/offers`, `/bookings/active`, `PATCH /driver/bookings/:id/status`, `POST /:id/accept`, `/:id/reject`, `/driver/availability`, `/driver/location`, `/driver/register` | ✅ live |
| Shared | `/profile`, `/notifications` (+prefs, read-all, `:id/read`), `/vehicles` (read), `/brand`, `/services` | ✅ live |

**Defined but never called from the partner UI:**
- `vendorBookingVerifyTripOtp` → `POST /vendor/bookings/:id/verify-trip-otp` (`config/api.ts` only) ⇒ the **vendor-side trip-start OTP check is not exposed in any screen** [O].
- `/vendor/bookings/:id/*` flows exist but there is **no vendor screen that lists assigned/active jobs** other than offers — the detail screen (`VendorAssignJobScreen`) covers assign only [V].

## 4. Admin web — what it actually calls [V]

Used: `/admin/auth/{login,refresh-token,logout,me}`, `/admin/dashboard`, `/admin/customers` (+`:id`, `/status`, `/cities`, `/export/csv`), `/admin/vendors` (+`/counts`, `:id`, `/approve`, `/reject`, `/suspend`, `/assign-drivers`, `/drivers/:driverId`, `:id/documents/:docKey` PATCH), `/admin/drivers` (+`/counts`, `/available`, `:id`, `/approve`, `/reject`, `:id/documents/:documentId` PATCH), `/admin/bookings` (+`/counts`, `:id`, `:id/assign-driver`, `:id/assign-vendor`, `PATCH :id/status`), `/admin/vehicles/:id` (PATCH/DELETE), `/admin/transactions` (+`/summary`), `/admin/reports`, `/admin/settings` (GET+PUT), `/admin/subscriptions/overview`, `/admin/subscriptions/plans` (GET), `/admin/notifications` (+unread-count, read-all, `:id/read`).

## 5. Orphan endpoints — backend capability no client uses [V]

**Verified orphans: 17 of 136 paths.** Each one was checked by hand against the client service modules (literal **and** template-concatenated call sites).

| Endpoint(s) | Area | Consequence |
|-------------|------|-------------|
| `GET /api/v1/admin/documents/vendor/:vendorId/:docKey`, `.../driver/:driverId/:docKey` | admin document **viewing** | Admins can approve/reject documents (`PATCH .../documents/...` **is** wired) but the UI never calls the *view* endpoints — reviewers approve blind unless the detail payload embeds a public URL (which is the SEC-3 problem). The single most damaging orphan |
| `GET /api/v1/admin/activity-logs` | admin audit trail | Activity is logged but never shown; `/admin-users`-style admin pages exist but call no admin API |
| `GET/POST /api/v1/admin/admins`, `PATCH/DELETE /api/v1/admin/admins/:id` | admin user management | No UI path manages admins; auth is hardcoded anyway (SEC-1) |
| `POST /api/v1/admin/subscriptions/assign`, `POST /api/v1/admin/subscriptions/:id/cancel`, `PATCH /api/v1/admin/subscriptions/plans/:id` | subscription admin | Plans can be **listed** (`/plans` GET is wired) but not edited/assigned/cancelled from the UI |
| `POST /api/v1/admin/bookings/:id/cancel` | admin booking ops | `booking.service.ts` has no cancel call; admins can re-assign and change status but not cancel |
| `POST /api/v1/admin/auth/forgot-password`, `POST /api/v1/admin/auth/reset-password` | admin recovery | No UI uses them (consistent with the hardcoded credential, SEC-1) |
| `GET /api/v1/qr/:id`, `GET /api/v1/qr/:id/metadata` | public QR lookup | **Entire QR feature has no consumer** — clients only *display* a `raceservice.in/qr/<id>` string and use `/vehicles/:id/verify` for checks. Also unauthenticated (SEC-9) |
| `PATCH /api/v1/bookings/towing/:id/status`, `PATCH /api/v1/bookings/driver/:id/status` | customer-side booking status | Transitions are driven by the driver (`/driver/bookings/:id/status`) and admin (`/admin/bookings/:id/status`) routes; the customer-facing twins have no caller |
| `GET /api/v1/services/upcoming`, `GET /health` | catalog / ops | No screen lists "upcoming services"; `/health` is defined in both apps' `config/api.ts` but never called (it is a probe endpoint, so this is fine — listed for completeness) |

**Not an orphan (corrected in self-review — the client calls these by string concatenation):**
`${subscriptions}/cancel`, `${notifications}/read-all`, `${notifications}/preferences` (GET+PATCH), `${savedLocations}/${id}` (PUT+DELETE), `${paymentMethods}/${id}` (DELETE), `${towingBooking(id)}/rating`, `${driverBooking(id)}/rating`. Owner files: `customer application/src/services/subscriptions/subscriptionApi.ts:85`, `…/profile/notificationApi.ts:109,114,123`, `…/profile/locationApi.ts:82,89`, `…/profile/paymentApi.ts:50`, `…/bookings/serviceBookingApi.ts:121-122`.

**Referenced in code but not reachable from any screen:** `POST /api/v1/vendor/bookings/:id/verify-trip-otp` exists in `mobile application/src/config/api.ts` and nowhere else ⇒ the vendor-side trip-start OTP has no UI (a UI gap, not a backend orphan).

## 6. Client calls that cannot succeed today

| Call | Why it fails | Evidence |
|------|--------------|----------|
| Driver self-registration documents | Payload sends `url` = **local device URI**; the only driver document upload endpoint is `/vendor/drivers/:id/upload-document` (vendor-managed drivers) — self-driver path has no upload route | `DriverReviewScreen.tsx:86-90`; `vendorRoutes.ts:52` |
| `PATCH /api/v1/driver/*` for a **PENDING** driver | `assertDriverApproved` returns 403 for availability, location, job list, offers, accept, reject | `driver.ts:50-57, 110, 120, 165, 229, 311, 330` |
| Vendor app "trip OTP" | Endpoint exists but no screen calls it | `config/api.ts` only |
| Admin document preview | View endpoints unused + public URLs are the only access path | `13-§5`, SEC-3 |
| Any `.populate('driverId'/'vendorId')` (future) | ref points to an unregistered `Driver`/`Vendor` model | `towingBooking.ts:122-123`, DB-1 |

## 7. Connection-health scoring per surface (corrected counts)

| Surface | Backend paths in its scope | Referenced in client code | Not referenced | Coverage | Notes |
|---------|---------------------------:|--------------------------:|---------------:|---------:|-------|
| Customer app | 52 (shared + public) | 46 | 6 | **88%** | Missing: QR lookup, `services/upcoming`, customer-side booking-status twins, `/health` |
| Partner app | 27 (vendor + driver) | 27 | 0 | **100%** | Every vendor/driver path is referenced; gap is UI reachability (trip-OTP, active-jobs view), not wiring |
| Admin web | 57 | 46 | 11 | **81%** | Missing: document viewing, audit logs, admin users, plan edit/assign/cancel, booking cancel, password recovery |
| **All** | **136** | **119** | **17** | **88%** | "Referenced" = path appears in client code (constant or call site). A few are constants-only (see §5 note) |

> **Method caveat [V]:** "referenced" counts a path as soon as it appears anywhere in client code — including definition-only entries in `config/api.ts`. A path can therefore be referenced-but-unreachable (the vendor trip-OTP case), which is why §6 lists UI-reachability gaps separately from wiring gaps.

### Two-level view

| Capability | If DONE | If NOT done | Today |
|-----------|--------:|------------:|-------|
| Every endpoint has at least one client consumer or is documented as internal | 10 | 3 | **7** (88% of paths referenced; the 17 orphans above are the deduction) |
| Client never calls a non-existent/mismatched route | 10 | 5 | **9** — no dead paths found |
| Auth/role contract matches per surface | 10 | 3 | **8** |
| Admin can exercise the lifecycle it owns (view docs, audit, plans) | 10 | 2 | **3** |
| Partner can complete every job step end-to-end in-app | 10 | 2 | **6** |
| **Simple average (area score used in `01-SCORECARD.md`)** | — | — | **6.6 / 10** |

> Wiring-coverage roll-up: customer 88%, partner 100%, admin 81%, overall 119/136 = **88%** (path-level).
> First pass of this document reported 85/87/52% and 67% overall against a "159-endpoint" inventory — all four figures were wrong because of the two counting bugs explained at the top of this file. Weighted platform impact of the correction: connections 6.2 → 6.6, platform 5.7 → 5.8.
