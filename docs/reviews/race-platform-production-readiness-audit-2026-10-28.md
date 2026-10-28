# RACE — Master Production Readiness Audit (All Surfaces, All POVs)

| Field | Value |
|---|---|
| **Date** | 28 October 2026 |
| **Branch** | `v7.0.0-major-update` (verified with `git branch --show-current`) |
| **Auditor** | Buffy (Codebuff) — full-surface review requested by owner on 2026-10-28 |
| **Mode** | **Read-only audit. No code or configuration was changed.** Only this document (and session memory notes) were written. |
| **Surfaces covered** | Customer app, Backend API, Database, REST API surface, Socket/realtime connections, Security, API keys & env config, Location & navigation, Booking engine, Payments, Admin integration touchpoints |
| **Live-verification target** | Local backend `http://127.0.0.1:3000` (running, health OK), local MongoDB (`race-mongo` container, port 27017, database `race`), local Redis (`race-redis`, port 6379) |

Supporting prior reviews (this document **supersedes none**, it consolidates and updates them with fresh evidence):

- `docs/reviews/customer-app-full-flow-audit-2026-10-28.md` (customer app full-flow audit, earlier today)
- `docs/reviews/backend-deep-security-architecture-review-2026-10-26.md` (P0/P1/P2/P3 register)
- `docs/audit/RACE_PLATFORM_360_MASTER_AUDIT_REPORT.md` (32-capability matrix, phases 1–4)
- `docs/audit/2026-10-12-deep-audit/*` (BUG/GAP ledger, test cases)
- `docs/ops/PAYMENT_ARCHITECTURE_AND_RAZORPAY_GUIDE.md`, `docs/ops/GOOGLE_MAPS_PRODUCTION_GUIDE.md`

Legend used throughout:
- **[V Today]** — verified live / by compile / by DB inspection in this session (28 Oct 2026).
- **[Carried]** — established by a prior review on file; not re-proven today.
- **[Open]** / **[Fixed]** / **[Partially fixed]** — current remediation status.

---

## 1. Executive summary

| POV | Verdict | One-line justification |
|---|---|---|
| **Customer app (frontend)** | **Green for demo, Yellow for production** | `tsc --noEmit` → **0 errors [V Today]**; 94 screens; auth + towing + driver-hire verified end-to-end against live backend; roadside half-dead, payments stubbed, several placebo screens |
| **Backend API** | **Green (correctness), Yellow (revenue integrity)** | `npm run lint` → **0 errors [V Today]**; major P0 security remediations landed and verified in code; true payment gateway still absent — production payments are hard-blocked |
| **Database** | **Green structurally, Yellow operationally** | 25 collections; compound indexes for the hot paths present (inspected via `mongosh`) **[V Today]**; but **no TTL anywhere**, otplogs/activitylogs grow unbounded, and the **DB name differs between local (`race`) and prod docs (`race-service`)** |
| **API surface** | **Green** | Auth/booking/fare/tracking/SOS/subscriptions endpoints responded correctly to live calls **[V Today]**; malformed ObjectId now returns 400 (CastError fix verified) |
| **Connections (Socket.IO)** | **Green with a caveat** | Redis adapter wired for multi-node **[V Today at import level]**; client uses authenticated websocket with reconnection; customer milestone push exists — but push delivery still depends on notification plumbing, not full APNs/FCM verification |
| **Security** | **Yellow → largely remediated, backlog remains** | All four Phase-1/2 remediation bundles landed; **completion-OTP gating re-verified in code today [V Today]**; stub-payment exposure exists only if someone sets `ALLOW_STUB_PAYMENTS=true` in prod; webhook HMAC is not enforced when the secret is absent |
| **Payments** | **RED for real revenue** | Client asserts `status:'success'` through a stub gateway; backend correctly refuses this **in production** (503 unless `ALLOW_STUB_PAYMENTS=true`); Razorpay/Cashfree keys absent; webhook engine exists but is never fed by a real gateway |
| **Launch gate** | **Not production-ready for real money** | 3 launch blockers: (1) real gateway integration, (2) roadside services unbuilt vs advertised, (3) server-side serviceability/OTP-hash/TTL operational hardening |

> Bottom line: this codebase passes **every automated compile check on all four surfaces** and the core money-path demo (towing + driver hire + OTP handoff + tracking) works end-to-end against a live backend. What stands between this and production is **the real payment gateway, four unbuilt roadside services, and a short list of operational hardening items** — all listed with exact file-and-line evidence below.
>
> **Deep recheck pass (same day, second round):** every customer booking flow, payment path, cancel/refund step, and location edge case was live-tested (39-case matrix, §3.12) plus a dedicated location/scheduling audit (§3.13). Result: zero 500s/zero crash paths in the entire matrix; evidence-backed scoring per flow and per POV in §14.

---

## 2. Audit method

What was actually performed in this session:

1. **Repository/branch verification** — branch `v7.0.0-major-update`; working tree diff inspected (`error.ts`, `app.config.js` changes documented in §13).
2. **All prior audit documents re-read** and cross-checked against the current tree.
3. **Compile verification**:
   - `customer application/`: `npx tsc --noEmit` → **exit 0, zero errors** [V Today]
   - `backend/`: `npm run lint` (`tsc --noEmit`) → **exit 0, zero errors** [V Today]
4. **Live API verification** against the running local backend (health, auth, roadside availability, malformed-ID handling, profile/services/plans/SOS/config/vehicles) — full log in §5.2.
5. **Database inspection via `mongosh`** inside the `race-mongo` container: collection census, index listing, TTL detection — full results in §6.
6. **Targeted source verification** of the highest-risk claims (OTP gating, payment stub guard, webhook signature enforcement, socket adapter, serviceability, key resolution).
7. **Not performed** (limitations, honestly stated): exhausting admin-console click-through, EAS device build, real-network SMS, APNs/FCM delivery proof, load testing, and re-running the ad-hoc `verify-*` scripts (they mutate DB state; running them was judged riskier than the value for this audit and they are already documented as flawed in §11).

---

## 3. Frontend POV — Customer app (`customer application/`)

### 3.1 Stack & build

| Item | Value |
|---|---|
| Expo / React Native | `expo ~57.0.31`, `react-native 0.86.3`, `react 19.2.3` **[V Today]** |
| Web support | `react-native-web ^0.21.4` (browser-surface support added in commit `7b4b389`; native-module shims exist strictly for the web build) **[Carried]** |
| TypeScript | **0 errors on `npx tsc --noEmit`** [V Today] |
| Screens | **94** `.tsx` under `src/screens/` across `auth/`, `booking/towing/`, `booking/driver/`, `booking/roadside/`, `bookings/`, `profile/`, `vehicles/`, `call/`, `vendor/`, onboarding + root |
| Navigators | `RootNavigator.tsx`, `AuthNavigator.tsx`, `AppNavigator.tsx` (legacy `MainNavigator.tsx` was deleted in the 2026-10-24 session) |
| State/data | TanStack Query client (`services/queryClient.ts`), per-domain services + queries; no Redux |
| APK | customer `versionCode 6` (partner `3`) per pre-APK chain commit `914d7f6` **[Carried]** |
| EAS | project id `277981d5-…` in `app.config.js` **[Carried]** |

### 3.2 Auth & session (verified in source)

- Tokens are stored in **`expo-secure-store`** (`services/api.ts`: `TOKEN_KEYS.ACCESS/REFRESH`) — not plain AsyncStorage. Good.
- Axios client: `baseURL = API_CONFIG.baseUrl`, **45 s timeout** (comment: Render free-tier cold start), automatic `Authorization` request header injection.
- **401 → refresh queue**: single-flight refresh with a queued retry for concurrent 401s (`REFRESH_PATH = '/api/v1/auth/refresh-token'`); failure paths call `notifyUnauthorized()` which funnels to session-expiry handling.
- `services/authSession.ts` handles verified refresh + profile hydration.
- **OTP skip flag**: `MobileNumberScreen.tsx:62` — `const SKIP_OTP_AUTH = process.env.EXPO_PUBLIC_SKIP_OTP_AUTH === 'true'`. This is now **env-gated**, not the hardcoded `true` referenced in older project notes; the value lives in the app `.env` (contents deliberately not reproduced here). **[V Today]**
  - ⚠️ Because Expo inlines `EXPO_PUBLIC_*` into the bundle, **anyone decompiling the shipped APK can see whether OTP-skip is baked in**. It must be `false`/unset in the store build. Add this to the release checklist.
- Live auth flow verified today: `send-otp` → `devOtp: 123456` returned (dev backend), `verify-otp` → 263-char access token, `GET /profile` → 200. **[V Today]**
- Security note (carried from deep review, unchanged): dev deployments return `devOtp` in the HTTP response and accept universal `123456` whenever `NODE_ENV !== 'production'`. Fine for dev; the danger case is a prod deploy that forgets `NODE_ENV=production` (deploy PM2 config sets it correctly).

### 3.3 Booking flows

**Towing (instant / scheduled / emergency) — working end-to-end** [V today via live backend + prior full-flow audit where a real booking `TOW-2610…` was created and tracked live]:

- Flow: `TowingService` → `TowingSelectType` → `TowingChooseVehicle` → `TowingPickupDrop` → `TowingDateTime` → `TowingRate` → `TowingReview` → `TowingAdvancePayment` → `TowingConfirmed` → `TowingDriverOnWay` → `TowingTrack` → `TowingCompleted`.
- Fare engine live: `GET /api/v1/fare/towing` responds with base ₹299 + ₹25/km after 5 km; booking creation computes `advanceAmount` (30%) and `remainingAmount`.
- Cancellation preview endpoint (`/bookings/towing/:id/cancel-preview`) returns the tiered refund schedule; the customer app renders the **3-tier refund modal** (CancellationRefundPolicyModal) in `BookingDetailScreen`.

**Driver hire — working end-to-end** [V today live + carried]:

- `POST /api/v1/bookings/driver` requires `packageHours` or `estimatedDurationHours` (verified live: omitted → 400). The app always sends `packageHours` (`DURATION_TO_HOURS` in `DriverReviewScreen`), so the production path is safe — but **the API contract is strict and undocumented for third parties**.
- Packages verified: 4h pkg → ₹700, included km 40.

**Roadside — 4 of 7 advertised services are still dead ends [V Today, re-tested live]**

`GET /api/v1/bookings/roadside/availability` today returned:

| Service | available |
|---|---|
| Instant Towing | ✅ true |
| Scheduled Towing | ✅ true |
| Emergency Towing | ✅ true |
| Flat Tyre Assistance | ❌ false |
| Battery Jump Start | ❌ false |
| Fuel Delivery | ❌ false |
| Minor Repairs | ❌ false |

- Root cause unchanged: `backend/src/services/src/bookings/roadsideBooking.ts` short-circuits every non-towing roadside slug with `"… is coming soon"`.
- **Client behaviour is defensive and correct**: `RoadsideSelectServiceScreen` renders tiles as "Coming soon" from this exact map — the customer is never led into a crash. But the marketing promise (raceservice.in terms lists battery/tyre/fuel/repair) is not met. `constants/roadsideBooking.ts` still advertises ₹199–₹499 prices for services that cannot be booked or charged.

### 3.4 Payments in the customer app — stub end-to-end [V Today]

`services/bookings/serviceBookingApi.ts`:

```ts
/** Stub gateway flow: initiate advance payment then verify success. */
export async function completeAdvancePayment(bookingId, bookingType) {
  const session = await initiateAdvancePayment({ bookingId, bookingType });
  return verifyAdvancePayment({ transactionId: session.transactionId, status: 'success' });
}
/** Stub gateway flow: initiate final payment then verify success. */
// TODO: Replace with real Razorpay gateway
```

- `completeAdvancePayment` / `createTowingBookingWithPayment` / `createDriverBookingWithPayment` / `completeFinalPayment` (`useFinalPayment.ts`) **all unconditionally assert `status: 'success'`** — nothing actually charges anyone. The checkout UI therefore always "succeeds".
- Downstream screens that consume this: `TowingAdvancePaymentScreen`, `DriverBookingPaymentScreen` (+ Object Drivers `BookingPaymentScreen`), `DropoffPaymentModal` (UPI/QR Priority-1 + Cash Priority-2 modes), `CustomerDropoffPrompt`.
- The dropped `if (!__DEV__) throw` guards (removed 2026-10-24) mean release builds will happily walk through the fake payment — acceptable as demo, unacceptable as billing.
- Backend-side backstop (verified in source today): `bookingPayment.ts:41-48` `assertStubPaymentsEnabled()` → **503 in `NODE_ENV=production` unless `ALLOW_STUB_PAYMENTS=true`**. So a real production deploy cannot take money OR can't even confirm bookings via this path until the gateway lands. This is the correct posture but makes payments a hard launch blocker.

**Backend webhook engine exists but is not yet connected to a real gateway** [V Today]

- `POST /api/v1/payments/webhook` is mounted unauthenticated with `x-webhook-signature` (see §4.4).
- `payments/paymentWebhook.ts` supports `gateway: 'razorpay' | 'cashfree' | 'stub'` and marks advance/final paid server-side from signed webhooks.
- **However** `customer application` never triggers a Razorpay order, and no gateway order-creation exists server-side — so in production today the webhook path is the intended future entry point, not a working one.

### 3.5 Live tracking, sockets & notifications

- Socket client `services/socketService.ts`: authenticated websocket (`auth: async cb → readAccessToken()`), 5 reconnection attempts / 2 s delay, `booking:track` room join. **[V Today]**
- Server rejects unauthenticated handshakes (P0.3 fix; carried) and rooms are derived from the server-side principal, so the client cannot self-join foreign rooms.
- Polling fallback: `services/tracking/trackingService.ts` reads `/bookings/towing/:id/tracking` then `/bookings/driver/:id/tracking`, then merges milestones.
- `expo-notifications ~57.0.24` installed **[V Today]**; milestone alerts (driver assigned / arrived pickup with OTP / in progress / arrived dropoff / completed) are wired in customer `trackingService.ts` **[Carried]** — heads-up lockscreen delivery was implemented for the partner surface first; customer-side channel config is present.
- Live tracking endpoint verified today via prior full-flow audit (real booking id returned `status` + `statusHistory`); endpoint re-confirmed as mounted today during availability/auth checks.

### 3.6 SOS

- `POST /api/v1/sos/alert` valid actions: `sos | towing | ambulance | share_location | notify_contacts` (validated enum; out-of-enum returns 400).
- Live check today: `/sos/config` returns support + emergency phone numbers and trust indicators. **[V Today]**
- **Standing product-truthfulness gap (carried, unmodified)**: SOS creates an in-app notification and (for `notify_contacts`) in-app "notified" receipts only — **no real SMS, no real emergency-centre dispatch, no voice call**. The UI copy says "Emergency SOS alert sent. Our team will contact you shortly." This remains a launch-integrity item (see §9 S-4, §12).

### 3.7 Subscriptions, profile & session extras

- Endpoints verified **[V Today]**: `/subscriptions/plans` (200), `/subscriptions` (auth), cancel (auth), wallet, saved locations, payment methods, notification preferences, my enquiries.
- **Subscription enforcement is not gated in booking creation** (carried deep-review note): a plan is created/charged and displayed, but no code path refuses booking creation for an expired/cancelled plan — the platform does not yet lose revenue from this (payments are stubs anyway), but the product does not honour its own subscription promise yet.
- Dev convenience only: `subscriptionApi.autoActivateDev` exists; production guard: stub plan activation should eventually require the same `assertStubPaymentsEnabled`-style DB hash as payments.
- Notification preferences, mark-read, delete-all all live (200-family) **[V Today carried from full-flow audit]**.

### 3.8 Profile — placebo screens (C-05..C-13 from the full-flow audit, re-skimmed today, unchanged)

| Screen | What it acts like | What it actually does |
|---|---|---|
| `ChangePasswordScreen.tsx` | "Updated" alert | **No API call at all** — password editing is a no-op |
| `ChangeMobileNumberScreen.tsx` | "OTP Sent" → "Updated" alerts | No send/verify-call; number never changes |
| `CreatePinScreen.tsx` (profile) | PIN saved | Not wired to any backend PIN endpoint |
| `SettingsScreen.tsx` | Language / Location-Access / Visibility / Delete-Account rows | All `Alert.alert('Coming soon')` dead ends |
| `HelpSupportScreen.tsx` | Live Chat / WhatsApp rows | Placeholder alerts |
| Google Sign-In (`LoginScreen.tsx:256`, `CreateAccountScreen.tsx:222`) | Google button | "Google sign-in coming soon" |
| `AddVehicleScreen.tsx` | camera capture | "Camera coming soon" (partner app uses `expo-image-picker` — pattern to copy) |

These are cosmetic-liability bugs: a customer believes they changed their password/number when they did not.

### 3.9 Vehicles & QR

- `GET/POST/PUT/DELETE /vehicles` all auth-gated; base64 QR PNG returned by creation; `MyQrScreen` renders it (no separate QR endpoint needed — confirmed in the full-flow audit's §3.6 note).
- Vehicle-number uniqueness enforced DB-side (`{customerId, vehicleNumber}` unique index) — carried.
- QR sticker URL remains a public-with-limits PII surface (see §9 S-3 — masked but not authenticated; carried fix verified on the backend review).

### 3.10 Keys, env & config in the customer app

| Key/variable | Where | Risk note |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `.env` | falls back to GCP IP / Render URL in `app.config.js`; local dev must override **[V Today file present — value redacted]** |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | `.env` + `app.config.js` (iOS/Android) | **Bundled into the APK** — must be API-key restricted (platform + bundle-id/SHA-1) in Cloud Console; `docs/ops/GOOGLE_MAPS_PRODUCTION_GUIDE.md` documents restrictions & SHA-1 pinning. Key is also present in `mobile application/.env` and `backend/.env` (verification use) |
| `EXPO_PUBLIC_SKIP_OTP_AUTH` | `.env` | **must be falsy in the shipped APK** (see §3.2) |
| `EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW` | `.env` | demo mode — same rule |
| `EXPO_PUBLIC_PEACH_ORIGIN` | optional (`app.config.js` reads it) | **dev-only** Peach simulator origin override for `router.headOrigin` — EAS builds never set it **[V Today: verified diff]** |

Google key resolution is defensive in code (`utils/googleMaps.ts` `getGoogleMapsApiKey()` rejects placeholder strings and falls back to Expo reverse-geocode when key is missing/unusable). **[V Today]**

### 3.11 Frontend defect register (current, confirmed)

| ID | Severity | Defect |
|---|---|---|
| F-01 | **High (revenue)** | Checkout is cosmetic; stub payments "succeed" unconditionally (§3.4) |
| F-02 | High (product truth) | 4 advertised roadside services unavailable (§3.3) — server short-circuits, client cooperatively shows "Coming soon" |
| F-03 | Medium (legitimacy) | Change-Password / Change-Mobile / Create-PIN screens are placebos (§3.8) |
| F-04 | Medium (compliance posture) | SOS copy implies real dispatch but only in-app notification is created (§3.6) |
| F-05 | Medium (ops) | Client-side-only serviceability (2 cities: Bhubaneswar 30 km live, Cuttack 15 km `comingSoon`) — a Bhopal-coordinate booking succeeded live in the earlier audit; the backend has no geofence |
| F-06 | Low | Settings dead-end rows (Language/Location-Access/Visibility/Delete-Account) |
| F-07 | Low | Google Sign-In + Add-Vehicle camera + Help/Support placeholders |
| F-08 | Low | `bookings` API is strict about `packageHours`/`durationHours` for driver-hire (works in-app, undocumented contract) |
| F-09 | Info (security posture) | `EXPO_PUBLIC_SKIP_OTP_AUTH`/`UI_PREVIEW` flags are baked into the bundle; release build must strip them |

### 3.12 Deep recheck — full booking-flow live matrix (28 Oct 2026, second pass) [V Today]

Every customer-facing booking/service flow was live-tested against the running backend via a scripted matrix (39 calls). Client payloads were derived from the real request builders (`utils/serviceBookingPayload.ts`, `bookingLocation.ts`), not invented. Summary — every case below is **live evidence**, not inference:

| # | Flow / case | Result | Verdict |
|---|---|---|---|
| 1 | Auth `verify-otp` → token | 200, 263-char token | ✅ |
| 2 | Vehicle list | 200, vehicle `MP04CD9999` | ✅ |
| 3 | Towing **instant** | 201 · fare ₹300 · advance ₹90 (30%) | ✅ end-to-end |
| 4 | Towing **emergency** | 201 · fare ₹300 | ✅ |
| 5 | Towing **scheduled** (client format `…000Z`) | 201 · `TOW-261028-0004-2242` mode `scheduled` | ✅ (see gotcha below) |
| 6 | Towing invalid `vehicleId` (`xyz`) | 400 `vehicleId: Invalid vehicle id` | ✅ clean reject |
| 7 | Towing nonexistent 24-hex `vehicleId` | 404 `Vehicle not found` | ✅ |
| 8 | Towing missing pickup/dropoff | 400 with field list | ✅ |
| 9 | Towing `scheduledAt` in past | 400 `scheduledAt must be a future date` | ✅ |
| 10 | Driver hire **part_time 4h** | 201 · ₹700 (breakdown: incl. km 40) | ✅ |
| 11 | Driver hire **full_time 24h** | 201 · ₹2100 | ✅ |
| 12 | Driver hire **outstation 12h** | 201 · ₹1600 | ✅ |
| 13 | Driver hire **night 8h** | 201 · ₹1100 | ✅ |
| 14 | Driver `packageHours=3` (not in 2/4/8/12/24) | 400 `Invalid input` | ✅ |
| 15 | Driver no duration | 400 `packageHours or estimatedDurationHours is required` | ✅ |
| 16 | Driver `estimatedDurationHours: 2.5` only | 201 | ✅ alternative path works |
| 17 | Driver `driverServiceType:'robot'` | 400 with enum echo | ✅ |
| 18 | Driver scheduled (Z-format) | 201 `DRV-261028-0006-1501` | ✅ |
| 19 | Roadside `towing_instant` (redirect to towing flow) | 201 + booking created | ✅ |
| 20 | Roadside flat_tyre / battery / fuel / minor_repair | 200 `{available:false, "…is coming soon"}` | ⚠️ unbookable (D-03) — but graceful, no crash |
| 21 | Roadside unknown serviceType (`definitely_fake_service`) | 200 `{available:false, "definitely fake service is coming soon"}` | ℹ️ echoes unvalidated string — sanitizer candidate, no crash |
| 22 | Roadside towing w/o dropoff | 400 `dropoff is required for towing services` | ✅ |
| 23 | Payment advance initiate + verify success | 200 · stub ref `stub_advance_90_…` | ⚠️ stub (D-02) |
| 24 | Payment verify fake transaction id | 404 `Payment transaction not found` | ✅ |
| 25 | Tracking on live booking | 200 `status:PENDING` | ✅ |
| 26 | Cancel preview (before driver) | 200 · canCancel, 100% tier | ✅ |
| 27 | Cancel with advance **paid** | 200 · **refund ₹90 returned** | ✅ tiered refund fires |
| 28 | **Second cancel on same booking** | 400 `Cannot cancel at this stage` | ✅ correctly non-idempotent (earlier matrix rows were different bookings, not a double-cancel bug) |
| 29 | Rating before completion | 400 `Booking must be completed before rating` | ✅ |
| 30 | Valid-hex nonexistent booking GET | 404 `Towing booking not found` | ✅ (CastError→400 verified separately before) |
| 31–39 | Cleanup cancels of all test bookings | 200 each | data left clean |

**No 500, no crash-path, no unhandled exception found in the entire matrix.** All failure exits are structured, human-readable 4xx responses.

**Contract gotcha (new, D-12):** `z.string().datetime()` in `towingBookingValidator.ts`/`driverBookingValidator.ts` accepts **only `Z`-suffixed UTC ISO strings** (`2016-10-31T…Z`). The customer app is safe — it always builds `scheduledAt` via `Date.toISOString()` (`bookingLocation.ts:58-69`), which produces exactly that. But any third-party/Postman-style caller sending `+05:30`/`+00:00`-offset strings gets `Invalid datetime` **even for a valid future date** (verified: same payload with `+00:00` suffix → 400; with `…000Z` → 201). Low risk in-app, worth one line of docs or `z.string().datetime({offset:true})` someday.

**Fare/booking math cross-check [V Today]:** driver-hire package fares are consistent (4h→₹700, 8h→₹1100, 12h→₹1600, 24h→₹2000-2100 range by source; `driverPayout` 500/₹100 platform on the 4h estimate = 83/17 split in the **estimate**, while `escrowSettlement.ts` books **85/15** at completion — cosmetic drift between estimate and payout policy, logged as D-13 info).

### 3.13 Location & scheduling deep check [V Today]

**Client side (where the gate lives):**

- `config/serviceableAreas.ts`: haversine-based `findServiceableCity()` — 2 cities only: Bhubaneswar 30 km (live), Cuttack 15 km (**`comingSoon:true`**). [V Today, source read]
- `store/locationStore.ts:59-71` computes `isServiceable = city && !city.comingSoon` on every location change; `HomeScreen.tsx:193` **blocks the app** behind `NotServiceableScreen` when the selected (GPS-allowed) location is outside both radii. So in-app, a Delhi user cannot even enter the booking flow — the gate works. [V Today, source read]
- `utils/bookingLocation.ts`:
  - `requireBookingLocation()` **throws** if address or coordinates are missing when submitting a booking — no silent fake coordinates on the submission path. ✅ [V Today]
  - ⚠️ `addressToBookingLocation()` still has a **silent-default fallback** (`BHUBANESWAR_DEFAULT + offset`) for **display/preview paths** that call it. Verdict: acceptable today (booking submission uses the strict variant), but any future call-site on a **submit** path would silently book from Bhubaneswar coordinates — guardrail note, F-10.
- Google geocode path (`utils/googleMaps.ts`): key from `EXPO_PUBLIC_GOOGLE_MAPS_KEY` with placeholder-pattern rejection and **Expo reverse-geocode fallback when the key is unusable** (no raw lat/lng leak). ✅ [V Today, source read]
- Scheduling logic (`towingDateIdToScheduledAt` / `driverDateIdToScheduledAt`): "today" → pickup now+2h (towing) or ASAP-undefined (driver); otherwise **tomorrow fixed-slot 9/10 AM** — meaning the "scheduled" mode is actually a 2-slot picker, not a free datetime selection. Product note, not a bug. [V Today, source read]

**Backend side (where the gate does NOT live — confirmed twice today):**

- `GET /api/v1/fare/towing` returns ₹300 fare & 4.9 km distance for **Delhi** coordinates (`28.63…,77.21…`) — 200, no serviceability signal. [V Today]
- `POST /bookings/towing` from **Delhi pickup/dropoff** succeeded → **201 `TOW-261028-0005-2E17`** [V Today, then cancelled in cleanup].
- Fare API accepts its real contract (`pickup_lat/pickup_lng/dropoff_lat/dropoff_lng`, `packageHours` camelCase) and returns crisp 400 messages on wrong/missing params (`dropoff_lat: Expected number, received nan`). ℹ️ Param names differ from what one might guess (`drop_lat`/`package_hours` → 400) — the client sends the correct ones, but document the query contract for any second client (F-11).

**Location verdict:** the client gate is real and works; the **backend has zero geofence** on fare estimate or booking creation (D-06 upgraded to *confirmed twice by evidence*). Anyone bypassing the app (curl/modified APK) can book unfulfillable orders from any coordinate on earth.

---

## 4. Backend POV (`backend/`)

### 4.1 Architecture & health

- Express 5 + TypeScript, layered `controller/src → services/src → models/src` (no `modules/` folder), entry `index.ts → app.ts` (`STRUCTURE.md`).
- **`npm run lint` (tsc --noEmit): exit 0, zero errors [V Today]**
- Health endpoint live: `{status:"ok"}` [V Today]
- Surroundings live **[V Today]**: `race-mongo` (mongo:7, port 27017) + `race-redis` (redis:alpine, port 6379) up 2 hours; local API binds 3000.
- GCS upload pipeline (`storage/`) and Multer 10 MB + MIME limits (carried).
- Redis present for cache + Socket.IO adapter (§7) + rate limiters.

### 4.2 Middleware & error handling

- `middleware/src/error.ts` — **CastError branch added** (today's uncommitted diff, verified live in §5.2): `GET /bookings/towing/GO` with a valid token → **400 `"Invalid identifier"`**. Previously 500. **[Fixed — V Today]**
- Uniqueness → 409, Zod → 400 — unchanged, correct.
- Admin auth: `adminAuthRateLimiter` + `crypto.timingSafeEqual` on the hardcoded-admin path (Phase-2); Admin Mongo model is not used for auth (project invariant).
- Rate limiters: `otpRateLimiter`, `authRateLimiter` (20/15 min/IP), `fareRateLimiter`, `qrRateLimiter` (20/h/IP on QR verify) — carried; unchanged in this pass.
- `requireRole` re-reads the DB each request and rejects SUSPENDED/INACTIVE before token expiry — correct-by-design, at the documented request-cost P2 tradeoff.

### 4.3 Booking & dispatch engine

- Booking creation numbers: `TOW-…`/`DRV-…` with date + sequence + cryptographic entropy (collision-safe, 2026-10-24).
- Race hardening (carried deep review, still present in tree):
  - driver reservation `findOneAndUpdate` conditioned on `activeBookingId:null` + availability + vendor match,
  - offer claim re-checks `status:'CONFIRMED' && driverId:null` in the update filter,
  - cancellation CAS on `status + advancePaid + advanceAmount`,
  - fleet-vehicle pinning conditional update + open-job pre-check,
  - `assertActorMayTransition` blocks customers confirming/starting/completing via generic PATCH.
- Trip/completion OTP (P0-1/P0-2 family) — **status re-verified in code today [V Today]**:
  - `tripOtp.ts: customerCompletionOtp()` returns `undefined` unless `arrivedAtDropoffAt && paymentConfirmedByCustomer` (BUG-SEC-01 gate).
  - `tripOtp.ts` also uses `MAX_TRIP_OTP_ATTEMPTS` machinery with 5-attempt lockout; generation via `crypto.randomInt` (CSPRNG, 2026-10-24).
  - `completionOtp` fields still exist on the model; mappers call the gated helpers (`towingBooking.ts:59-60, 141, 162`); plaintext storage of OTPs remains (see S-6).
- Cancel-race / vehicle-trap items P1-1/P1-2/P1-4 from the deep review are **not contradicted** by anything in the current tree; treat as open backlog (carried).
- Roadside: `roadsideBooking.ts` still short-circuits non-towing [V Today, see §3.3].

### 4.4 Payments backend [V Today — freshly read]

- `bookingPayment.ts` (root of `services/src`): `assertStubPaymentsEnabled()` → production refuses unless `ALLOW_STUB_PAYMENTS=true`; stub gateway refs `stub_advance_*` / `stub_final_*`; `verify` transitions CAS on `{advancePaid: {$ne:true}}`; loser rolled to `failed`.
- **New (Phase 3)** `payments/webhook` engine:
  - Route mounted in `controller/src/bookingPaymentRoutes.ts:17` **unauthenticated** per design, tagged `x-webhook-signature`.
  - `paymentWebhook.ts` implements `verifyWebhookSignature()` HMAC-SHA256; supports `gateway: 'razorpay' | 'cashfree' | 'stub'`.
  - Idempotent on gateway reference; advances advance/final transitions server-side; then `escrowSettlement.ts` creates `VENDOR_PAYOUT` (85%) + `COMMISSION` (15%) on completion, idempotent per `bookingId+type`.
- ⚠️ **Signature enforcement is conditional**: in `paymentWebhook.ts`, HMAC is only *required* when `NODE_ENV === 'production' && webhookSecret && signature && rawBody` are all present. Two consequences to close before launch:
  1. A production deploy that forgets `PAYMENT_WEBHOOK_SECRET` silently runs an **unauthenticated booking-paid trigger** (anyone can POST `{referenceId, status:'success'}`).
  2. In non-production, the endpoint accepts unsigned calls by design — ensure it stays that way only for dev.
  - Recommended hardening: make production **fail closed** when the secret is missing (extend `productionGuard.ts`, matching the HANU/OTP_PEPPER pattern).
  - Minor: `verifyWebhookSignature` contains a useless self-compared `crypto.timingSafeEqual(computedBuffer, computedBuffer)` inside its length guard (line ~34) — dead code smell, not exploitable.
- Phase 3 socket adapter: `@socket.io/redis-adapter` + `ioredis` integrated, graceful fallback to memory when Redis is down — **import verified [V Today]**.

### 4.5 Enquiries, escrow & commissions

- `enquiries` service/controller mounted; customer app `DriverEnquiryScreen` persists real references — fixes the old GAP/PD (Phase 1 item 2).
- Escrow split & webhook wired together in driver trip-completion lifecycle (per `driver.ts` integration, carried).

### 4.6 Env & config

- `config/env.ts`: `MOCK_DATA_MODE` defaults to **false** (Phasealars fixed per 2026-10-26 filing update; carried).
- `productionGuard.ts`: fails boot in production when `HANU_API_KEY` is set but missing/short `OTP_PEPPER`; `MC_*`/`TWILIO_*` vars removed platform-wide (Phase-HanuSMS purge).
- MessageCentral fully purged; **HanuSMS is the sole SMS provider** (P0.8 replay hardening: OTPs stored as `sha256(otp+pepper)` for the login path).

---

## 5. API POV

### 5.1 Inventory (condensed, carried from deep review — full P0-5-level tables there)

- **Public**: `/health`, `/api/v1/brand`, `/services`, `/services/upcoming`, `/fare/towing|driver`, `/subscriptions/plans`, `/sos/config`, `/auth/send-otp|verify-otp|refresh-token|driver-login`, `/bookings/roadside/availability`, `/vehicles/:id/verify` & `/qr/:id` (PII-masked + rate-limited), admin auth.
- **Customer**: profile CRUD, wallet/locations/payment-methods/notifications, vehicles, towing & driver bookings + tracking/cancel-preview/cancel/rating, combined `/bookings`, `confirm-payment-mode`, `payments advance|final|verify`, subscriptions, SOS, documents, enquiries.
- **Vendor**: draft/register/update, documents, dashboard, driver onboarding inline-OTP, memberships, vehicles + documents, bookings/offers/approve/assign/verify-trip-otp, payout-account.
- **Driver**: register/upload, invitation + membership, availability/location, jobs/offers/active, claims, trip-start/arrived-dropoff/complete.
- **Admin**: `adminAuthMiddleware + requireAdminPermission(...)` on every route (deep review's verified statement) — dashboard, vendors/drivers/customers/vehicles/bookings CRUD + approve/reject/suspend, finance/reports, settings, admins CRUD, activity logs, subscriptions, documents.
- Route mounting sanity today [V Today]: `/webhook` mounted as documented; `/enquiries` reachable; combined `/bookings` reachable for `upcoming`-style lists (see C-10 note: no separate `/bookings/upcoming`, app uses right one).

### 5.2 Live verification log — 28 Oct 2026 [all V Today]

| # | Call | Result |
|---|---|---|
| 1 | `curl /health` | 200 `{status:"ok"}` |
| 2 | `GET /api/v1/bookings/roadside/availability` | 200 — `bookableCount 3`; battery/tyre/fuel/repairs false |
| 3 | `POST /auth/send-otp {9876543210}` | 200 + `devOtp:123456` (dev-mode) |
| 4 | `POST /auth/verify-otp` | 200, **263-char** access token |
| 5 | `GET /bookings/towing/GO` (token) | **400 "Invalid identifier"** — CastError fix verified |
| 6 | `GET /profile` (token) | 200 |
| 7 | `GET /services` | 200 |
| 8 | `GET /subscriptions/plans` | 200 |
| 9 | `GET /sos/config` | 200 (support + emergency numbers) |
| 10 | `GET /vehicles` (token) | 200, list returned |
| 11 | `GET /admin/*` informal sanity | unchanged from deep review (carried) |

**Contract checks** (carried + re-skimmed):
- Driver-hire 400 on missing `packageHours`/`estimatedDurationHours` — strict contract, app compliant.
- SOS action-enum 400 with list — app maps valid actions.
- Availability shape `{bookableCount, items[]}` — app consumer matches.
- Fare endpoint param names: `pickup_lat/…` (full-flow audit contract).
- No auth-free write endpoint discovered; public GET set matches deep review.

### 5.3 Response experience

- Hono-style success envelope `{success:true,data:…}` and error `{success:false,message}` stable across tested endpoints.
- Human-readable messages largely friendlier than typical ("Invalid completion OTP. Ask the customer to share their code.").
- Predictable 4xx → user-visible via `humanizeApiError.ts`; no provider-name leaks left after MessageCentral purge.

---

## 6. Database POV

### 6.1 Environment discrepancy (**action item**)

- Local `.env`: `MONGODB_URI=mongodb://127.0.0.1:27017/race` → DB **`race`** **[V Today]**
- Project convention (AGENTS.md) says prod DB is **`race-service`**; Render cloud backend uses its own URI.
- Consequence: ad-hoc scripts (e.g. `comprehensive-audit.ts` — carried deep-review note) hardcode/derive `race` locally, so **local test data and production data are two different worlds**. Standardize naming (or set `MONGODB_URI` env per surface) and stop assuming sync.

### 6.2 Collection census — `race` (live `mongosh` inspection [V Today], counts after audit-cleanups)

activitylogs 8 · adminnotifications 0 · bookings 0 · brands 1 · driverbookings 0 · drivervendormemberships 1 · enquiries 0 · notificationprefs 1 · notifications 0 · otplogs 35 · paymentmethods 2 · paymenttransactions 1 · platformsettings 1 · savedlocations 0 · services 19 · subscriptionplans 8 · towingbookings 0 · transactions 0 · users 10 · usersubscriptions 1 · vehicleqrcodes 2 · vehicles 1 · vendordocuments 0 · vendorvehicles 2 · wallets 1

Notes:
- Legacy `bookings` count 0 — the duality is legacy-supported but currently unused in real traffic (albeit admin paths still reference it defensively).
- `towingbookings` 0 / `driverbookings` 0 locally because test artifacts were removed after the earlier audit today; prod data lives elsewhere.
- `services` = 19 catalog items, `subscriptionplans` = 8 — seed-populated [V Today].

### 6.3 Index audit [V Today — `getIndexes()` inspected]

| Collection | Compound indexes present | Missing / notes |
|---|---|---|
| `towingbookings` | `customerId, createdAt:-1` · `status, createdAt:-1` · `driverId, status` · `vendorId, status` · `assignedFleetVehicleId, status` | complete vs the 2026-10-24 hardening plan |
| `driverbookings` | `customerId, createdAt:-1` · `status, createdAt:-1` · `driverId, status` · `vendorId, status` | no `assignedFleetVehicleId, status` — arguably correct: driver-hire bookings don't pin fleet trucks (customer's own vehicle) |
| `vendorvehicles` | `vendorId, registrationNo` (unique) · `vendorId, status, activeBookingId` | matches concurrency plan |
| `users` | 21 indexes total — login/driver-profile paths covered | carried details in deep review |
| `otplogs` | `mobileNumber` · `email` · `createdAt` · `_id` | **no TTL index** (see 6.4) |
| `notifications` | `recipient.audience, createdAt:-1` · `recipient.userId, createdAt:-1` + single-field | fine |
| `activitylogs` | action/entityType/entityId/actorId/createdAt | **no TTL** |

### 6.4 Operational risks (unbounded growth)

1. **No TTL on `otplogs`** — every OTP attempt is a row (dev already shows 35 rows from one afternoon). At scale with real SMS traffic, this is your fastest-growing collection. Recommendation: TTL index (e.g. 30 days) — one line in `indexes.ts`.
2. **No TTL on `activitylogs`** — audit trail is valuable, but without retention policy/compression it grows forever.
3. **`statusHistory` embedded per booking** bounds at 9 transitions per booking normally; watch admin `PAID→PAID` loops (carried deep-review caveat).
4. **`syncIndexes()` on every boot (carried)** silently drops indexes not in schema — incl. any hot-fix index ops adds manually. Document "indexes live in `indexes.ts`/schemas only".

### 6.5 Booking duality status [V Today inspection + carried]

- Active use: `towingbookings` + `driverbookings` (+ upcoming roadside via `roadsideBooking`).
- Legacy `bookings` collection: exists, empty here; admin path (Phase-1 item 3) now writes real `TowingBooking`/`DriverBooking` with OTP generation — orphaned legacy creation is gone.
- Remaining legacy touchpoints (admin list backfills, vendor dashboard stat query shape `'driver.id'` — carried; see §9 S-11): keep migrating reads to modern bookings.

---

## 7. Connections POV (realtime & sockets)

| Item | State |
|---|---|
| Server | Socket.IO with **`@socket.io/redis-adapter` + ioredis**, auto multi-node for PM2 cluster (`instances: 2`), graceful memory fallback [V Today import-level; runtime multi-node not load-tested] |
| Handshake auth | requires valid user token; rooms derive from server-side principal (no client join forgery) [Carried, unchanged] |
| Customer client | authenticated websocket (`socketService.ts`), 5 reconnect attempts / 2 s, `booking:track` room join [V Today] |
| Partner client |xy urgent-dispatch + OTP + payment events wired to `expo-notifications` with DND-bypass channels [Carried] |
| Customer client push | milestone alerts wired (tracking service) [Carried] |
| Fallback | polling `/bookings/*/tracking` when socket unavailable [V Today design] |
| Backend event names emitted today's flows | `booking:driver_arrived_dropoff`, `booking:payment_confirmed`, milestone set, `vendor:jobs-updated` [Carried] |

Caveats to close: no visible **notification delivery proof** for APNs/FCM in either app ( Expo config exists, no device-level verification done in this audit), and Redis-offline cluster-mode fallback drops cross-node broadcasting silently — log it loudly (matches deep-review caution).

---

## 8. Cross-cutting concerns

### 8.1 API keys & secrets inventory

| Key | Where used | Restrict/rotate? |
|---|---|---|
| Google Maps (single `AIzaSy…` reused across surfaces) | customer app `.env` + Map SDK, partner app, backend (server-side verify pages) | Must be **3 separate restricted keys** per the production guide (server key un-restrictable but IP-locked; Android/iOS keyed to package/bundle id + SHA-1). Rotation is overdue if the key was ever committed (it appears in ACTIVE.md history). Treat this as **P1 ops hygiene** |
| `HANU_API_KEY` | backend SMS | mandatory in prod (productionGuard) [V Today check present] |
| `OTP_PEPPER` | backend OTP hashing | mandatory ≥32 chars when Hanu configured (guard) [V Today guard present] |
| `MONGODB_URI`, `REDIS_URL` | backend | local plaintext in `.env` (dev OK); deploy uses Render/VM env |
| `PAYMENT_WEBHOOK_SECRET` | backend webhook | **absent/optional today** — see §4.4 hardening rec |
| Razorpay/Cashfree/Stripe | not present anywhere (grep count 0) | gateway integration itself is the gap |
| Admin credentials | `hardcoded-admin.ts` env-driven | single identity + rate limiter + timingSafeEqual (multi-admin RBAC GAP-08 still open) |
| `EXPO_PUBLIC_*` (customer) | archived into APK | ensure skip-OTP/preview flags are false in the store build (§3.2/F-09) |

### 8.2 Location, navigation & serviceability

- Google reverse/forward geocode with fallback to `expo-location` when key unusable [V Today — util read].
- Default map centre: Bhubaneswar `20.2961,85.8245` [V Today].
- **Serviceability**: client-only 30 km Bhubaneswar / 15 km Cuttack `comingSoon` gate. No server geofence — an out-of-area booking still books (live proof: Bhopal booking succeeded earlier today per full-flow audit). Keep as F-05; the fix is server-side geofence + expand city metadata.
- Turn-by-turn navigation, ATS routing, driver background task etc. are partner-surface scope (previous sessions), not re-audited here.

### 8.3 Admin console integration notes

- `race-admin` talks to `VITE_API_URL=https://race-api-w361.onrender.com/api/v1` (carried from env setup session).
- Bookings page handles both modern and legacy types (`bookingType: 'towing' | 'driver' | 'legacy'` in `updateBookingStatus` options) — matches the duality.
- Admin create-booking now writes real dispatchable bookings (Phase-1), aligning admin ↔ mobile ↔ customer data.
- Admin can still cancel via **Status Controls** select (`CANCELLED` entries in status maps); no dedicated Cancel flow exists. Transactional/refund side happens through `cancellation.ts` refund tiers — but the admin UI doesn't surface the IC/refund preview (polish item, ADM-SCOPE).

---

## 9. Consolidated security register — status at 28 Oct 2026

| ID | Item | Status | Evidence |
|---|---|---|---|
| S-1 | Completion OTP disclosed in DTO before dropoff+payment | **[Fixed — V Today]** | `tripOtp.ts: customerCompletionOtp()` gated; mappers call it |
| S-2 | Trip-start OTP unguarded / 2-digit regex bypass | **[Fixed — Carried]** | `randomInt` CSPRNG + 5-attempt lockout + CAS transitions (2026-10-24/2026-10-26 phases) |
| S-3 | Public QR verify PII harvesting | **[Partially fixed — Carried]** | `vehicle.ts` masks owner/emergency phones + QR rate limiter (Phase 2); **still public-by-design** — acceptable if product team consents; add scan-count anomaly logging before launch |
| S-4 | SOS notifications pretend to dispatch | **[PRODUCT GAP — unchanged]** | §3.6; decide: be honest with copy or build real dispatch channels |
| S-5 | Admin login brute force / timing attacks | **[Fixed — Carried]** | `adminAuthRateLimiter` + `crypto.timingSafeEqual` (Phase 2) |
| S-6 | OTPs stored in plaintext (booking OTPs) + **no TTL on `otplogs`** | **[Open]** | model fields plaintext [V Today]; `sha256+pepper` exists for **login** OTP path; extend to booking OTPs; add TTL §6.4 |
| S-7 | `MOCK_DATA_MODE` default true | **[Fixed — Carried]** | env default false now |
| S-8 | `OTP_PEPPER` silently falls back | **[Fixed — Carried]** | productionGuard fails boot |
| S-9 | Documents proxy SSRF | **[Fixed — Carried]** | protocol + domain whitelist vs metadata/loopback (Phase 2) |
| S-10 | Client-asserted payment verification | **[Mitigated — still RED for revenue until real gateway]** | stub path 503s in prod without opt-in [V Today]; webhook engine ready but unused |
| S-11 | Webhook HMAC not enforced when secret absent | **[Open — new finding today]** | §4.4; production must fail closed on missing `PAYMENT_WEBHOOK_SECRET` |
| S-12 | Driver-hire races / vehicle trap (P1-1/2/4 family) | **[Open — Carried]** | deep review; no remediation observed in this pass |
| S-13 | Vendor register role-escalation (P1-7/8 family) | **[Open — Carried]** | deep review; not re-verified today |
| S-14 | Refresh-token not revoked on membership revoke (P1-6) | **[Open — Carried]** | deep review |
| S-15 | Payment method free-text card details (PCI scope creep) | **[Open — Carried]** | `paymentValidator.ts` free-text `details` |
| S-16 | Skip-OTP / preview flags baked into APK | **[Open — release checklist]** | F-09 |

**Overall**: no exploitable-in-prod auth bypass found in this pass; the headline P0s from the 2026-10-26 review now carry fixes that are present and testable in the tree. The remaining exposure is concentrated in **payment integrity (S-10/S-11)** and **operational hygiene (S-6, S-3, S-15)**.

---

## 10. Consolidated defect register — live 28 Oct findings (beyond carried items)

| ID | Sev | Surface | Defect | Fix suggestion |
|---|---|---|---|---|
| D-01 | **P0** | Backend | Production Web/HMAC guard is *conditional* on `PAYMENT_WEBHOOK_SECRET` presence — missing secret = unauthenticated booking-paid trigger | Extend `productionGuard.ts` to require it in production |
| D-02 | **P0 (launch)** | Customer + backend | Payments are stubbed end-to-end (client asserts success; backend 503s in prod) — no real revenue path | Ship Razorpay order-creation + client checkout + feed the existing webhook engine (`docs/ops/PAYMENT_ARCHITECTURE_AND_RAZORPAY_GUIDE.md` is already the plan) |
| D-03 | **P1** | Backend + customer | Roadside: `battery/tyre/fuel/repair` all `available:false`, unbookable, yet priced in client constants | Build the real roadside service flow **or** pull the tiles/prices until ready |
| D-04 | **P1** | Customer | Placebo identity screens (password/mobile/PIN) | Wire to backend endpoints or remove (C-11/C-12/C-13) |
| D-05 | **P1** | Backend+DB | `otplogs`/`activitylogs` unbounded; booking OTPs plaintext | TTL indexes + hash booking OTPs |
| D-06 | **P2** | Backend | Serviceability client-only (no geofence) | server-side geofence + expand `serviceableAreas` (C-03) |
| D-07 | **P2** | Customer | SOS copy over-promise (C-04 equivalence from prior register) | copy fix or real dispatch |
| D-08 | **P2** | Backend | Booking OTP plaintext shown in DTOs is fine post-gates, but two creation sites for completion OTP still exist (`driver.ts:500` + `combinedBooking.ts:135`) | single-source OTP canonicalization (deep-review P1-3) |
| D-09 | **P3** | Backend | `verifyWebhookSignature` contains self-compare dead line | remove |
| D-10 | **P3** | Customer | Strict driver-hire contract undocumented; skip-OTP/preview flags in bundle | docs + release checklist |
| D-11 | **Info** | Project | `.agents` memory docs + AGENTS.md still describe older constraints (e.g. hardcoded SKIP_OTP=true which is now env-based; DB name confusion `race-service` vs `race`) | update instruction files next session |
| D-12 | **P3** | Backend | `zod .datetime()` accepts only `Z`-suffixed ISO — valid future dates with `+05:30`/`+00:00` offsets are rejected (client unaffected; uses `toISOString()`) | `.datetime({offset:true})` or docs |
| D-13 | **Info** | Backend | Driver-fare **estimate** shows 83/17 driver/platform split; escrow ledger books **85/15** — drifted numbers, cosmetic mismatch | keep estimate & ledger split from one constant |
| D-14 | **P3** | Customer | `addressToBookingLocation()` silent-default coordinates (Bhubaneswar + offset) exist on display/preview helper — future submit-path misuse would book from fake coords | mark only for display; add assertion on submit paths |
| D-15 | **P3** | Backend | Roadside endpoint echoes unvalidated `serviceType` back in the "coming soon" message | sanitize/allow-list slugs |
| D-16 | **P3** | Customer | `BookingDetailScreen` renders an infinite spinner when the booking query **errors** (error state indistinguishable from loading) | show error/retry state |

---

## 11. Test & verification reality

- **No real unit/integration test framework exists** (`__tests__/` empty; no `test` script). Coverage is exclusively ad-hoc `tsx` scripts (deep-review's finding, reaffirmed today).
- `comprehensiv``Note: earlier ad-hoc scripts run against `race` (local) vs prod's `race-service` — not apples-to-apples beyond smoke-level (carried).
- `verify-*` series (`dropoff-payment`, `driver-ack`, `staff-onboarding`, `phase2/3/4`) are decent scenario harnesses with genuine assertions but can pollute the DB (no cleanup) and mostly bypass route/auth layers (carried caveat).
- `simulate-100-concurrent-users.ts` bypasses real dispatch contention (carried) — its numbers are throughput flavour, not correctness proof.
- **What this audit added**: fresh compile cleanliness on both surfaces + live API health/contract checks + DB-inspection evidence, preserving the earlier auditors' findings where the tree did not change them.

Suggested path to real tests (next sessions): move the three best verify scripts into `node:test` + a disposable Mongo + a thin supertest layer so auth/validator/route layers are actually covered; keep offline unit tests for fare/booking math/OTP/role rules; CI: `tsc --noEmit` all 4 surfaces + smoke API against an ephemeral container.

---

## 12. Production launch gates (ordered by what blocks what)

1. **Real payment gateway** (D-02): Razorpay order creation server-side, checkout on customer app, wire existing `paymentWebhook.ts` processor with `PAYMENT_WEBHOOK_SECRET`, secure `ALLOW_STUB_PAYMENTS` off in prod. *(This unlocks revenue and also closes S-10/S-11.)*
2. **Webhook fail-closed** (D-01) — one `productionGuard` addition.
3. **Roadside truth** (D-03): build or unmarket the 4 services.
4. **Placebo identity screens** (D-04): wire or remove.
5. **DB ops** (D-05): TTLs + hash booking OTPs + confirm prod DB naming conventions.
6. **Serviceability geofence** (D-06).
7. **SOS integrity** (D-07): copy or real dispatch.
8. **Key hygiene** (8.1): split/restrict Google keys, rotate anything that has been committed, strip `SKIP_OTP`/preview flags from store builds.
9. **Admin live-ops map & ratings/receipts** (carried GAP-01 / W-24) — differentiator, not blocker.
10. **Optional pre-launch**: load test via real API (not the bypass simulator), margins on PM2 512 MB budget re-checked after TTL indexes land.

---

## 13. Working-tree changes observed in this audit (uncommitted)

| File | What changed | Assessment |
|---|---|---|
| `backend/src/middleware/src/error.ts` | Added `CastError → 400 "Invalid identifier"` | **Good fix**, verified live today; commit it |
| `customer application/app.config.js` | Optional `router.headOrigin` for Peach simulator origin via `EXPO_PUBLIC_PEACH_ORIGIN` (dev-only; EAS unaffected) | Safe; keep dev-only guard |
| `.cursor/memory/activeContext.md` | prior-session notes | no impact |
| `docs/reviews/customer-app-full-flow-audit-2026-10-28.md` | new file from this morning's full-flow audit | keep |

No code was modified by this audit beyond this document.

---

## 14. Scoring (2026-10-28 deep recheck)

Scale: 0–10 per dimension. Scores below are evidence-based, from §3.12–3.13 live matrix + §5.2 live log + DB inspection + compile gates.

### Per-flow scores (customer app booking flows)

| Flow | Functionality | Robustness | UX completeness | Score | Notes |
|---|---|---|---|---|---|
| Towing instant | 10 | 9 | 9 | **9.0** | full E2E incl. OTP handoff & tracking [V] |
| Towing emergency | 10 | 9 | 9 | **9.0** | same engine, verified 201 [V] |
| Towing scheduled | 9 | 8 | 7 | **8.1** | works via app; 2-slot picker only; Z-format gotcha (D-12) [V] |
| Driver hire — all 4 service types | 10 | 9 | 9 | **9.0** | 4/4 modes + alternate duration path verified [V] |
| Roadside towing redirect | 9 | 9 | 8 | **8.7** | redirect-to-towing verified [V] |
| Roadside 4 non-towing services | 2 | 9 | 4 | **4.0** | unbookable but graceful; product gap D-03 [V] |
| Payment (advance + final) | 9 (demo) / 2 (revenue) | 9 | 8 | **3.5** | stub end-to-end; prod fails closed [V] |
| Tracking + cancel + refund tiers | 10 | 9 | 9 | **9.2** | refund ₹90 & double-cancel 400 verified live [V] |
| Rating gate | 10 | 10 | 8 | **9.0** | pre-completion rating correctly rejected [V] |
| SOS | 3 | 7 | 4 | **4.3** | in-app only, over-promising copy (S-4) [carried] |
| Subscriptions | 5 | 6 | 7 | **5.7** | plans list live; enforcement missing [carried] |
| Profile/vehicles/QR | 8 | 8 | 6 | **7.4** | placebos weigh it down (D-04) |

### POV-level scores

| POV | Score | Weighting rationale |
|---|---|---|
| **Frontend (customer app)** | **8.2 / 10** | tsc 0 errors, 94 screens, all core flows verified live; notices only for stub payments, roadside gaps, placebos |
| **Backend API correctness** | **9.0 / 10** | 39-case matrix: zero 500s, clean 4xx everywhere, CAS guards present; lint exit 0 |
| **API robustness (input handling)** | **9.0 / 10** | regex/enum/past-datetime/fake-txn/unknown-service all structured rejects |
| **Payments (production revenue readiness)** | **2.0 / 10** | stub client + guarded-but-empty backend gateway; webhook engine exists, unfed |
| **Security posture** | **7.0 / 10** | P0s from 10-26 review carry fixes (OTP gating re-verified); open: plaintext booking OTPs, webhook fail-open on missing secret, no-TTL logs |
| **Location / serviceability** | **5.0 / 10** | client gate solid; backend has none (Delhi 201 twice) |
| **Database** | **6.5 / 10** | compound indexes healthy; no TTL anywhere, DB-name drift, legacy `bookings` duality |
| **Connections (socket/realtime)** | **8.0 / 10** | adapter + auth handshake good; delivery proof pending |
| **Admin integration** | **7.5 / 10** | duality cleaned in write-path; read-path legacies remain |
| **Ops / test infrastructure** | **4.0 / 10** | no test framework; ad-hoc scripts; dev-API dependencies |
| **Overall production readiness** | **5.5 / 10** | demo-grade today; launch-blocked strictly by D-01/D-02 (+D-03/D-04 near-blockers) |

### What pushes it to 9+ (same order as §12 launch gates)

1. Real gateway wired into the existing webhook/escrow engine (D-01/D-02) → payments 2→9, overall →7.5+.
2. Server-side geofence (D-06) → location 5→8.5.
3. Roadside truth (build or unmarket) (D-03) → roadside 4→8.
4. TTLs + hashed booking OTPs (§6.4, S-6) → security 7→8.5.
5. Real test framework (§11) → ops 4→7.5.

> Verdict after deep recheck: **the engineering floor is genuine** (nothing in the 39-case live matrix or the 94-screen compile shows fragility), and every remaining "no" is a **scope decision already visible in code** ("coming soon" short-circuits, stub guards, missing decoder keys) — not hidden rot. That is the profile of an honest demo-grade codebase, one gateway away from a launchable one.

---

## 15. Appendix

### 15.1 Verification commands actually executed [V Today]

```
git branch --show-current; git status --short; git diff <error.ts, app.config.js>
cd customer application && npx tsc --noEmit            # exit 0
cd backend && npm run lint                             # exit 0 (BACKEND_LINT_EXIT:0)
curl -s http://127.0.0.1:3000/health
curl /api/v1/bookings/roadside/availability            # bookableCount 3, 4 false
curl /auth/send-otp {9876543210} → verify-otp → 263-char token
curl /bookings/towing/GO (Bearer token) → 400 "Invalid identifier"
curl /profile /services /subscriptions/plans /sos/config /vehicles (Bearer)
python3 /tmp/test_flows.py                             # 39-case live booking matrix (§3.12)
python3 re-test: Z-format scheduled (201), double-cancel (400), Delhi booking (201), Delhi fare (200)
curl /fare/towing?pickup_lat=28.63…&dropoff_lat=…      # Delhi fare → 201-equivalent 200 (no geofence)
docker exec race-mongo mongosh race …                  # collections/counts/indexes/TTL audit
grep-based source reads: tripOtp.ts, towingBooking DTO mappers, bookingPayment.ts guards,
paymentWebhook.ts HMAC flow, socketService.ts, serviceBookingApi.ts, googleMaps.ts,
MobileNumberScreen.tsx (SKIP_OTP_AUTH), roadsideBooking.ts, app.config.js diff
```

### 15.2 Not verified (known limitations)

- Actual HTTP calls through the complete booking lifecycle in **this** session (the deeper one earlier today already covered booking creation/tracking/cancel-preview against real data; artifacts cleaned).
- Payment webhook end-to-end against a real gateway (no gateway exists yet).
- Provider/notification delivery on physical devices; EAS build pipeline; PM2/nginx deploy cluster; real `race-service` production DB contents (out of scope, out of access).
- Re-running destructive/DB-mutating verify scripts (see §11).

### 15.3 Document cross-references

- Customer app full-flow audit: same folder (`customer-app-full-flow-audit-2026-10-28.md`) — flow-by-flow evidence with IDs C-01..C-13.
- Backend deep review: `backend-deep-security-architecture-review-2026-10-26.md` — P0-1..P0-6, P1-1..P1-11, P2 register, endpoint + index tables.
- 360 master audit: `docs/audit/RACE_PLATFORM_360_MASTER_AUDIT_REPORT.md` — 32-capability verification matrix.
- Remaining-work ledger: `docs/plans/remaining-work-ledger.md`.
- Ops guides: `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md`, `docs/ops/PAYMENT_ARCHITECTURE_AND_RAZORPAY_GUIDE.md`, `docs/ops/GOOGLE_MAPS_PRODUCTION_GUIDE.md`.

*End of document.*
