# 13 — API Connection Matrix (client ⇄ backend)

**Question answered:** *which APIs are open/unused, which are connected, and which client calls can never succeed.*

**Method [O]/[V]:** backend routes were machine-extracted into [`_evidence/backend-route-map.txt`](./_evidence/backend-route-map.txt) (159 endpoints). Client usage was extracted by grepping every `.ts/.tsx` in each app for **literal paths, template paths and endpoint-constant keys**, then reading each service module that owns them. Template-built paths (`${API_ENDPOINTS.x}/cancel`) were resolved by hand.

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

## 5. Orphan endpoints — backend capability no client uses

| Endpoint(s) | Area | Consequence |
|-------------|------|-------------|
| `GET /api/v1/qr/:id`, `GET /api/v1/qr/:id/metadata` | public QR lookup | **Entire QR feature has no consumer** — clients use `/vehicles/:id/verify` instead. Also unauthenticated (SEC-9) |
| `GET /api/v1/services/upcoming` | service catalog | No screen lists "upcoming services" |
| `POST /api/v1/vendor/bookings/:id/verify-trip-otp` | vendor trip start | Vendor cannot start a trip with OTP from the app |
| `GET /api/v1/admin/documents/vendor/:vendorId/:docKey`, `.../driver/:driverId/:docKey` | admin document **viewing** | Admins can approve/reject documents (`PATCH .../documents/...`) but the UI never calls the *view* endpoints — reviewers approve blind unless the detail payload embeds a public URL (which is the SEC-3 problem) |
| `GET /api/v1/admin/activity-logs` | admin audit trail | Activity is logged but never shown |
| `POST/PATCH/DELETE /api/v1/admin/admins` | admin user management | UI has an `/admin-users` route but calls no admin API ⇒ page cannot manage admins; auth is hardcoded anyway (SEC-1) |
| `POST /api/v1/admin/subscriptions/assign`, `POST /api/v1/admin/subscriptions/:id/cancel`, `POST/PATCH /api/v1/admin/subscriptions/plans` | subscription admin | Plans can be listed but not created/edited/assigned from the UI |
| `POST/DELETE /api/v1/admin/bookings`, `POST /api/v1/admin/bookings/:id/cancel`, `POST /api/v1/admin/customers`, `POST /api/v1/admin/vendors`, `POST /api/v1/admin/drivers` | admin create/delete | Creation paths exist server-side, not exposed in UI |
| `PUT/DELETE /api/v1/profile/locations/:id` (and `PUT /profile/payment-methods` sibling delete) | saved data editing | **Unconfirmed** — `savedLocations` is used (4 call sites) but I did not verify PUT/DELETE usage; treat as "verify" before quoting |
| `POST /api/v1/driver/bookings/:id/reject` for **vendor** drivers | — | Used by self-drivers only |

## 6. Client calls that cannot succeed today

| Call | Why it fails | Evidence |
|------|--------------|----------|
| Driver self-registration documents | Payload sends `url` = **local device URI**; the only driver document upload endpoint is `/vendor/drivers/:id/upload-document` (vendor-managed drivers) — self-driver path has no upload route | `DriverReviewScreen.tsx:86-90`; `vendorRoutes.ts:52` |
| `PATCH /api/v1/driver/*` for a **PENDING** driver | `assertDriverApproved` returns 403 for availability, location, job list, offers, accept, reject | `driver.ts:50-57, 110, 120, 165, 229, 311, 330` |
| Vendor app "trip OTP" | Endpoint exists but no screen calls it | `config/api.ts` only |
| Admin document preview | View endpoints unused + public URLs are the only access path | `13-§5`, SEC-3 |
| Any `.populate('driverId'/'vendorId')` (future) | ref points to an unregistered `Driver`/`Vendor` model | `towingBooking.ts:122-123`, DB-1 |

## 7. Connection-health scoring per surface

| Surface | Endpoints available for it | Actually wired | Wiring coverage | Notes |
|---------|---------------------------:|---------------:|----------------:|-------|
| Customer app | ~55 | 47 | **85%** | Missing: roadside detail/tracking, QR lookup, payment truth |
| Partner app | ~31 | 27 | **87%** | Missing: vendor trip-OTP, vendor active-jobs view |
| Admin web | 62 | 32 | **52%** | Missing: document viewing, audit logs, admin users, plan/assign management, create flows |
| **All** | **159** | **106** | **67%** | 15+ endpoints are orphans; several exist only for future features |

### Two-level view

| Capability | If DONE | If NOT done | Today |
|-----------|--------:|------------:|-------|
| Every endpoint has at least one client consumer or is documented as internal | 10 | 3 | **5** |
| Client never calls a non-existent/mismatched route | 10 | 5 | **9** — no dead paths found |
| Auth/role contract matches per surface | 10 | 3 | **8** |
| Admin can exercise the lifecycle it owns (view docs, audit, plans) | 10 | 2 | **3** |
| Partner can complete every job step end-to-end in-app | 10 | 2 | **6** |
