# 10 — Backend API Audit

**Verdict: the strongest layer of the product.** Structure, validation discipline and error handling are genuinely above the level of the two mobile apps. The weak points are concentrated in three places: **admin authentication**, **file storage**, and **realtime authorization**.

---

## 1. Structure [V]

```
backend/src
├── app.ts                 middleware chain (41 lines)
├── index.ts               bootstrap: DB → indexes → cache → HTTP → Socket.IO (44)
├── config/                env, cache, gcs, hardcoded-admin
├── middleware/src/        auth, role, requirePermission, adminAuth, validation, upload, error, logger, rateLimiter
├── controller/src/        thin controllers + *Routes.ts (20 route files + admin/ 13 files)
├── services/src/          business logic (incl. bookings/, admin/ sub-services)
├── models/src/            Mongoose models (26 files)
├── database/src/          indexes.ts, seed scripts
├── storage/src/           upload adapter (GCS with local fallback)
├── scripts/               comprehensive-audit, reset-for-testing, regenerate-vehicle-qrs
└── utils/src/             jwt, otp, sms, errors, apiResponse, asyncHandler, logger, qrCode, password
```

`controller → services → models` direction is respected; there is no `modules/` folder **[V]** (matches `AGENTS.md`).
Layer discipline is consistent except one case: `middleware/src/role.ts` reaches directly into `services/src/userRepository` and `requirePermission.ts` into `services/src/admin/rbac` **[V]** — acceptable, but middleware is no longer purely transport-level.

## 2. Endpoint inventory [O]

Full generated map: [`_evidence/backend-route-map.txt`](./_evidence/backend-route-map.txt)

| Surface | Base path | Endpoint count | Auth |
|---------|-----------|---------------:|------|
| Customer/mobile auth | `/api/v1/auth` | 4 | public + rate limits |
| Brand, services | `/api/v1/brand`, `/api/v1/services` | 3 | public |
| Profile & sub-resources | `/api/v1/profile[/complete|/wallet|/locations|/payment-methods|/notifications]` | 16 | `authMiddleware` |
| Vehicles + QR | `/api/v1/vehicles`, `/api/v1/qr` | 8 | `authMiddleware` (**QR: none**) |
| Bookings (towing / driver / roadside / combined) | `/api/v1/bookings*` | 21 | `authMiddleware` |
| Payments (advance/final + verify) | `/api/v1/payments` | 4 | `authMiddleware` |
| Fare estimation | `/api/v1/fare` | 2 | **public** |
| Subscriptions | `/api/v1/subscriptions` | 4 | `authMiddleware` |
| SOS | `/api/v1/sos` | 3 | mixed (`/config` public, rest auth) |
| Vendor (partner app) | `/api/v1/vendor` | 22 | `authMiddleware` + `requireRole('vendor')` on 17 |
| Driver (partner app) | `/api/v1/driver` | 9 | `authMiddleware` + `requireRole('driver')` |
| Admin | `/api/v1/admin` | 62 | `adminAuthMiddleware` + `requireAdminPermission` |
| Health | `/health` | 1 | public |

**171 route registrations across 136 unique paths** (33 `*Routes.ts` files + 1 inline route in `controller/src/index.ts`) — machine-counted two independent ways that agree. [V]

> ⚠️ *Corrected in self-review (`02-§6`): an earlier draft published "≈159 endpoints". That count came from a mount table that silently skipped 12 routers (`.ts` suffix bug), so every downstream number in `13` was low. The figures below are the corrected ones.*

### Two auth-ordering details worth knowing [V]

- `driverRoutes.ts:21` — `POST /register` sits **before** `router.use(requireRole('driver'))` (L27). Intent confirmed by the file comment: any authenticated user may self-register as a driver. Working as designed, but it means a *customer* token can create a driver record.
- `roadsideBookingRoutes.ts:10` — `GET /availability` is declared before `router.use(authMiddleware)` (L12) → the only public booking-availability endpoint. Intentional (price preview before login) but undocumented.

## 3. Middleware chain [V]

`app.ts:17-31`: `helmet()` → `cors()` → `compression()` → `express.json({limit:'1mb'})` → `urlencoded` → `morgan` → `globalRateLimiter` → `/uploads` static → `/health` → API → `notFoundHandler` → `errorHandler`.

| Middleware | Assessment |
|-----------|------------|
| `helmet()` | ✅ default headers on |
| `cors()` | ⚠️ `origin: '*'` ⇒ `origin: true` (reflects any origin) **with `credentials: true`** — see SEC-4 |
| `express.json` 1 MB | ✅ sane; no `body` parser risk |
| `morgan → logger` | ✅ request logging present |
| `globalRateLimiter` | ✅ 200 req/15 min in production, 1000 in dev |
| `/uploads` static | ❌ serves uploaded KYC files publicly — see SEC-3 |
| `notFoundHandler` | ✅ JSON 404 |
| `errorHandler` (`middleware/src/error.ts`) | ✅ **good**: `AppError` → status, `ZodError` → 400, Mongo 11000 → 409 with field name, Mongoose `ValidationError` → 400, everything else → generic 500 + logged stack (**no stack leak to client**) |
| `validate(schema, part)` (`validation.ts`) | ✅ Zod at every mutating route I sampled; Express 5 read-only `req.query` handled correctly |
| `upload.ts` (multer) | ✅ 10 MB, 1 file, MIME allow-list JPG/PNG/PDF — but MIME-only, no magic bytes (SEC-5) |

## 4. Services layer [V/O]

`services/src` holds ~45 modules. Quality is uneven but the core flows are real:

| Service | State | Notes |
|---------|-------|-------|
| `bookings/*` (create, cancel, assign driver/vendor, trip OTP, distance) | **strong** | status-transition guard `assertValidStatusTransition`, `appendStatusHistory`, driver/vendor assignment with approval checks, fare finalisation written atomically with `COMPLETED` |
| `fare.ts` + `googleMaps.ts` | **real** | Google Distance Matrix used for tow distance; fails soft when key absent (`googleMaps.ts:27`) |
| `otp.ts` | **strong** | MessageCentral server-side verification in prod; mock OTP hard-guarded to non-prod (`otp.ts:150-158`) |
| `auth.ts` | **strong** | one mobile number ⇒ one role, role lock after verification, vendor-driver forced to credential login, account-status blocks |
| `vendor.ts` | **real** | draft → register → documents → admin review; `requireRole('vendor')` on all mutating routes |
| `driver.ts` | **real** | `assertDriverApproved` gate on all 6 job endpoints |
| `bookingPayment.ts` | **stub** | `createGatewayPaymentSession()` returns `stub_<type>_<amount>_<uuid>` (`bookingPayment.ts:35-42`). No Razorpay/Stripe anywhere in the repo |
| `notification.ts`, `eventNotification.ts` | partial | in-app notifications real; SMS only for OTP; email util is a stub |
| `sos.ts` | partial | returns configured phones + logs the alert; no call/SMS dispatch |
| `subscription.ts` | partial | plan CRUD real; payment for plans = same stub |
| `admin/*` (11 services) | **real but single-tenant** | dashboards/reports/finance aggregate Mongo directly; only the hardcoded platform admin can authenticate (SEC-1) |
| `socket.ts` | weak | no handshake auth (SEC-2) |
| `storage/src/index.ts` | works | GCS if configured, else local disk; public URLs (SEC-3) |

## 5. Realtime [V]

`services/src/socket.ts` — Socket.IO on the same HTTP server; rooms `driver:<id>` and `booking:<id>`; events `driver:location`, `booking:status`.
**No token verification on connect, and `booking:track` accepts any `bookingId` from any client** → SEC-2.
Emission is correct where it exists (`emitDriverLocation`, `emitBookingStatusUpdate`).

## 6. Configuration & environment [V]

`config/env.ts` — Zod-validated, fails fast (`process.exit(1)`) on invalid env. ✅ Strong pattern.
Issues:

| # | Finding | Evidence |
|---|---------|----------|
| E1 | `ADMIN_PASSWORD` has a **working default** (`Admin@123`) and `ADMIN_EMAIL` defaults to `admin@raceservice.com` | `env.ts:33-35`, `hardcoded-admin.ts:24-28` |
| E2 | `MOCK_DATA_MODE` uses `z.coerce.boolean()` → the string `"false"` coerces to **`true`**; only an empty string disables it | `env.ts:37` (Zod `coerce.boolean` = `Boolean(value)`) |
| E3 | `FORCE_MOCK_OTP` is read straight from `process.env` (bypasses the validated schema) → un-set in `.env.example`, unknown to ops; when `true` even in production the OTP falls back to the dev path **and returns `devOtp` in the API response** | `otp.ts:28-32`, `otp.ts:120` |
| E4 | `CORS_ORIGIN` defaults to `*` | `env.ts:24` |
| E5 | `REDIS_URL` default localhost; production requires Redis (no memory fallback in prod) — correct behaviour, but a hard dependency not stated in the deploy doc | `cache.ts:112-124` |
| E6 | `GCS_*` optional → silent fallback to local disk writes inside the app directory | `storage/src/index.ts:118-130` |

## 7. Scripts & developer experience [V]

`package.json`: `dev`, `build` (`tsc`), `start`, `seed`, `seed:mock`, `seed:fresh`, `seed:demo-drivers`, `seed:reset`, `db:reset`, `regenerate-vehicle-qrs`, `migrate:unified-users`, `reset-test-data`, `lint` (`tsc --noEmit`).
- ✅ `lint` is a real typecheck; I ran it (exit 0).
- ✅ `src/scripts/comprehensive-audit.ts` exists — the intended end-to-end smoke test — but it needs a live Mongo (unavailable here).
- ❌ No test runner configured for the backend at all (no jest/vitest/supertest dev-dependency). "Audit script" is the only regression net.

## 8. Backend score card

| Area | Weight | Score | Evidence summary |
|------|-------:|------:|------------------|
| Layering & structure | 10% | 9/10 | Clean 3-layer, no parallel modules |
| Route/middleware design | 10% | 8/10 | Consistent guards; 2 ordering quirks |
| Input validation | 10% | 9/10 | Zod on virtually every mutation; params validated |
| Error handling | 10% | 9/10 | Typed errors, no leak, duplicate-key handling |
| Auth (user side) | 15% | 8/10 | Role locking, rotation, status blocks |
| Auth (admin side) | 10% | 3/10 | Hardcoded single admin, plaintext compare, no admin rate limit |
| Payments | 10% | 1/10 | Deliberate stub |
| Storage/uploads | 10% | 3/10 | Public URLs, no magic bytes, no AV |
| Realtime | 5% | 3/10 | Works, but unauthenticated rooms |
| Observability | 5% | 6/10 | Morgan + logger; no metrics/tracing/health of deps |
| Testing | 5% | 1/10 | Zero automated tests |
| **Weighted** | 100% | **6.1/10** | |

### Backend: done vs not done (two-level)

| Capability | If DONE (score) | If NOT done (score) | Today |
|-----------|-----------------|---------------------|-------|
| Zod-validated API surface | 10 | 2 | **10** — done |
| Uniform error contract | 10 | 3 | **9** — done |
| Driver approval gating server-side | 10 | 4 | **10** — done |
| OTP provider integration | 10 | 0 | **9** — done, dev OTP risk (SEC-6) |
| Admin auth hardening | 10 | 0 | **2** — hardcoded admin |
| Uploaded-file privacy | 10 | 0 | **2** — public `/uploads` |
| Socket authorization | 10 | 0 | **1** — open rooms |
| Automated tests | 10 | 0 | **0.5** — 2 admin tests only |
| Real payment gateway | 10 | 0 | **1** — stub |
