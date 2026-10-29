# RACE Customer App — Implementation Plan (audit defects C-01…C-13)

**Date:** 28 October 2026
**Status:** PLAN ONLY — no code written yet. Nothing here is "done" until verified per §7.
**Source audit:** [`docs/reviews/customer-app-full-flow-audit-2026-10-28.md`](customer-app-full-flow-audit-2026-10-28.md) (13 items; C-04 already fixed & verified).
**Active branch:** `v7.0.0-major-update` (re-verify with `git branch --show-current` before every commit; the audit header text says `v2.0.1-cleanup` — stale label, ignore).
**Rule:** reuse-first. Every new endpoint follows backend `controller → service → validator` and every screen change reuses existing components (`FormField`, `GoldButton`, `OtpInput`, `usePartnerDialog`-style confirm sheets). No second copies of services.

---

## Executive order (what we build, in sequence)

| Phase | Items | Why this order | Blocked on |
|---|---|---|---|
| **P1 — Trust defects** | C-12 Change Mobile, C-11 Change Password, C-13 Create PIN | Users believe an action happened when nothing did (worst trust class); zero external deps | — |
| **P2 — Orders safety** | C-03 serviceability server-side | Unfulfillable orders are revenue/support cost; self-contained | — |
| **P3 — Polish** | C-08 camera, C-06 WhatsApp, C-05 settings rows, C-09 onboarding QR, C-07 Google button | Small, independent, shrinkable | — |
| **P4 — Payments** | C-02 Razorpay (advance + final + webhooks) | Biggest value, but needs keys | **User: Razorpay test/live keys** |
| **P5 — Roadside** | C-01 (4 of 6 services) | Largest scope; **doc-only in this plan** | **User: product decision between Option A/B (§6)** |

---

## P1 — Trust defects (C-11, C-12, C-13)

### Ground truth (verified in source today)

- `customer application/src/screens/profile/ChangePasswordScreen.tsx` — `handleSave` validates locally then `Alert.alert('Updated', …)`. **Zero API.**
- `customer application/src/screens/profile/ChangeMobileNumberScreen.tsx` — `handleSendOtp` sets local state only; `handleUpdate` compares against `DEMO_OTP` from `constants/auth` (a hardcoded client constant — must be deleted as part of this fix, not just bypassed). **Zero API.**
- `customer application/src/screens/profile/CreatePinScreen.tsx` — numeric keypad, local validation, `Alert.alert('PIN Updated',…)` at line 115. **Zero API.**
- Backend: **no customer change-password / change-number / PIN endpoints exist.** `profileRoutes.ts` exposes only `GET /`, `PUT /`, `PUT /complete`. Only admin auth (`backend/src/services/src/admin/`) has password change for admins. No `pin` hits anywhere in backend.

### P1.1 — C-12: Change Mobile Number (WhatsApp-of-record field)

**Backend (new, ~120 lines):**

| File | Change |
|---|---|
| `backend/src/services/src/profile/profileValidator.ts` (or co-located validator used by `profileRoutes`) | New zod schemas: `requestMobileChangeSchema { newMobile: string (E.164-ish 10–13 digits, != current) }`, `confirmMobileChangeSchema { changeId/token?, code: string(6) }` |
| `backend/src/services/src/profile/profileService.ts` (extend same service the controller already uses) | Two functions, **stateless two-step to avoid new collections**: (1) `requestMobileChange(userId, newMobile)` → rate-limit (Redis `INCR mobile-change:${userId}` — 3/hour), checks number not claimed by another user, then reuses the **existing OTP pipeline** exactly as registration does (same provider selection: HanuSMS in prod, whitelist/devOtp in non-prod) but with purpose `"mobile-change"`; stores pending change as a short-lived signed payload (HMAC/redis, 10 min TTL): `{ userId, newMobile }`. (2) `confirmMobileChange(userId, code)` → verify code against otplogs entry (same verify function used by verify-otp), then `User.findOneAndUpdate` mobile + `mobileNumber` in profile, bump token version **only if tokens embed the number** (they don't — JWT is by id; to verify during implementation and skip if false), invalidate cached profile. Idempotency: identical request while pending → resend without new rate-limit hit. |
| `backend/src/controller/src/profileController.ts` + `profileRoutes.ts` | `POST /api/v1/profile/mobile/change-request` and `POST /api/v1/profile/mobile/change-confirm`, both auth-guarded wired on the same router |

**Contract (api docs file `backend/docs/API.md` append):**

```
POST /profile/mobile/change-request   { newMobile: "9876543211" }
→ 200 { message, expiresInSec: 600, devOtp?: "123456" (non-prod whitelist only) }
409 { message: "already registered" } | 429 rate-limited | 400 invalid

POST /profile/mobile/change-confirm   { code: "123456" }
→ 200 { profile } (mobile updated)
400 wrong/expired code | 404 no pending change | 429 too many verifies
```

**App (`ChangeMobileNumberScreen.tsx` rewrite of 4 handlers):**
- Add `services/profileService.ts` functions `requestMobileChange()` / `confirmMobileChange()` using existing axios client (`services/api.ts` base + auth interceptor).
- `handleSendOtp` → `requestMobileChange`; show server `devOtp` hint only when present (same pattern as OTP login screen). Keep 30s resend timer server-driven (`expiresInSec` respected).
- `handleUpdate` → `confirmMobileChange`; on success update `useAuthStore` user + `useProfileStore` profile from response; toast/dialog via existing dialog component; navigate back.
- **Delete `DEMO_OTP` import/usage** (constant itself can stay if onboarding uses it — grep and keep references minimal).
- Edge cases: same-number → 400 message surfaced; number owned by another account → 409 copy "This number is already registered — log in with it instead"; offline → existing network-error copy; screen left mid-flow → pending change expires server-side (10 min) with friendly re-request.

**Verification:** backend lint; `npx tsc --noEmit`; live curl both endpoints (wrong code 400, right code 200, DB shows new number, old number now free); app E2E in Peach sim: change 9000000005 → revert; confirm customer login with new number works afterwards. Est: **~1 session.**

### P1.2 — C-11: Change Password

**Backend:** `POST /api/v1/profile/password/change` `{ currentPassword, newPassword }` (min 8 here; app's 6-char check raised to 8 to match backend validator — decide once and mirror).
- Service: verify `currentPassword` via the **same bcrypt helper the vendor/driver password model uses** (`mobile application` partners use PASSWORD-model already — customer model may be OTP-only; **if customers have no password hash field, add `passwordHash` (nullable) to User schema** and set on first change; login flow gains "password OR OTP" only if product wants — out of scope, not touched).
- Reset brute-force: Redis counter `pw-change:${userId}` 5/hour; on wrong current → 401 `{"message":"Current password is incorrect"}`.
- Session hygiene: bump `tokenVersion` or re-issue a fresh JWT in the response so other-device sessions die only if product asks (default: keep others alive — simpler; note in doc).

**App:** wire `ChangePasswordScreen` `handleSave` → new `profileService.changePassword()`; error mapping (401 inline error under Current field, not generic Alert); success → confirmation dialog + `goBack()`.

**Verification:** wrong-current 401; short password 400; happy path 200 + re-login with new password (if login-by-password enabled for customers — else verify hash set in DB via mongo query). Est: **~half session.**

### P1.3 — C-13: Create/Change PIN

**Product delta first:** a PIN with no unlock surfaces is decoration. Two honest choices — (a) implement backend + defer UX, (b) implement along with "require PIN on app cold-start" gate. **Recommendation: (a) now** (store + endpoints + screen wired) and log the cold-start gate as a follow-up item; do not fake it.

**Backend:** `User.appPinHash` (bcrypt, nullable) + `POST /profile/pin/set` `{ currentPin? }` (required when hash exists) + `POST /profile/pin/verify` `{ pin }` → `{ ok }` (used by future gate). Same Redis brute-force pattern.
**App:** `CreatePinScreen` handlers → service calls; wrong-current inline error; success dialog → back.

**Verification:** set → verify → wrong-verify paths via curl; app flow in sim. Est: **~half session.**

---

## P2 — C-03: Serviceability server-side

Ground truth: `customer application/src/config/serviceableAreas.ts` has 2 cities (Bhubaneswar 30 km, Cuttack 15 km marked comingSoon) checked **client-side only**; audit proved a Bhopal booking succeeded.

**Backend (single choke point):**
- New `backend/src/services/src/serviceability.ts`: haversine distance vs a `serviceableAreas` config (start: same 2 cities as client — mirrored in one backend config file; DB collection later if it churns).
- Wire at booking create paths only (not fare GET — quotes for "is this covered?" need honest pricing): `towingBooking`, `driverBooking`, and (when born) roadside. On miss → 422 `{ code: "NOT_SERVICEABLE", message: "We don't operate in this area yet", nearestCity, nearestKm }` using the existing `sendError`/AppError patterns in `error.ts`.
- Scheduled bookings: validate pickup coords at create; re-check at dispatch time is Phase-2 nice-to-have (document, don't build).

**App:** error mapper in `services/api.ts` (or the existing shared error normalizer) → `NOT_SERVICEABLE` renders the friendly dialog with nearest-city copy; keep client `serviceableAreas.ts` as a **soft gate** (pre-filter city list) but remove its authority (no local "coming soon" blocking that hides state mismatch with server).

**Verification:** Bhopal booking now 422 (the audit's own repro); Bhubaneswar booking 201 unchanged; app shows friendly state. Est: **~1 session.**

---

## P3 — Polish items

| Item | Change | Reuse |
|---|---|---|
| **C-08 camera** | `AddVehicleScreen` 4 dead Alert spots → `expo-image-picker` (already a dependency) camera + library flows with permission pre-ask | Copy interaction pattern from `mobile application/src/screens/partner/registration/driver/DriverRegistrationFlowScreen.tsx` (lines ~464–560: perm check → canAskAgain handling → `launchCameraAsync`/`launchImageLibraryAsync`) |
| **C-06 WhatsApp** | Replace placeholder Alert with `Linking.openURL('https://wa.me/<NUMBER>?text=…')`. **Need the real support number from user** — else default `+911080808080`? (ask; do not guess in code) | `Linking` already used for terms links |
| **C-05 settings rows** | Either implement or remove: Language (no i18n exists → **remove row**, log for future), Location Access (real: `expo-location` settings deep-link + permission status display), Profile Visibility (no backend → **remove row**), Delete Account (real: needs `DELETE /profile` backend with re-auth → small backend endpoint + confirm sheet; **recommended to implement**, it's a store-compliance requirement) | Existing dialog/sheet components |
| **C-09 onboarding QR actions** | Two dead Alerts on `QRCodeScreen`; replace with working share (React Native `Share.share(uint? …)` / save-image via MediaLibrary — check if `expo-media-library` present; if absent use share-URL only) | QR image already exists as base64 (`vehicle.qrCode`) |
| **C-07 Google Sign-In** | Do **not** fake-implement. Hide the buttons (both Login + CreateAccount) behind a single `EXPO_PUBLIC_GOOGLE_SIGNIN_ENABLED=false` flag default-off, so enabling later is config + real `@react-native-google-signin` work | Existing env-flag patterns in `app.config.js` |

Est: **~1–1.5 sessions total.** Each item ships separable commits.

---

## P4 — C-02 Payments (Razorpay) — prepared, blocked on keys

Scope when unblocked (recap so the session is mechanical):
1. Backend: replace stub in `payments` service — advance order create → `razorpay.orders.create`, signature verification (sha256 HMAC of `order_id|payment_id`) in verify endpoint; final-payment flow swaps `verifyFinalPayment({status:'success'})` unconditional call in `customer application/src/services/bookings/serviceBookingApi.ts:192` for real gateway order + verify; webhook (`payment.captured`) for idempotent settlement.
2. `.env` (user supplies): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Test-mode keys fine.
3. App: `react-native-razorpay` (or Checkout web sheet) — pick at session time against Expo 57 compat; stub path stays behind `EXPO_PUBLIC_PAYMENTS_STUB=true` for mock/demo builds.
4. Verification: ₹1 test payment E2E (advance + final), duplicate-webhook idempotency, failure path (cancelled checkout → booking stays PENDING-payment), refund flow via cancel-preview tiers.

**Preparation possible now without keys:** none-code-wise beyond this plan (stub removal without real gateway breaks demo-mode builds). Wait for keys.

---

## P5 — C-01 Roadside — **doc-only per user decision today**

No code until product call (`abhi sirf document karna`). Ground truth from audit: `backend/src/services/src/bookings/roadsideBooking.ts:54,74` hard-codes `available:false` + "coming soon" for flat-tyre/battery/fuel/repair; app already renders those tiles as "Coming soon" honestly; pricing constants (₹199–₹499) exist but never charge.

**Option A — Reuse towing engine (recommended):** model each roadside job as a towing booking with `serviceType` + fixed price slot; untouched data model; fastest to live bookings; final payment stage = the existing stub until P4 lands. Risk: towing-specific fields (pickup/dropoff) don't map perfectly to "fix here" services — dropoff becomes optional. Effort: **~2 sessions incl. app flow to reuse confirmed-screen.**

**Option B — Standalone roadside models:** real product surface (own booking type, statuses, ETA, on-site completion, per-service pricing tables matching the ₹199/₹299/₹399/₹499 slabs). Cleaner long-term; bigger scope: models + services + validators + routes + 4 app screens diverging from towing layout. Effort: **~4–6 sessions.**

**Decision inputs for the user:** Are roadside jobs dispatched to the same tow-truck fleet (→ A is fine), or dedicated roadside vans with different tracking semantics (→ B)? Do prices stay slab-fixed (both A/B support it; B models it natively)?

---

## 7. Verification gates (apply to every phase before "done")

1. `git branch --show-current` == active work branch (memory: `v7.0.0-major-update`; user's frozen-list rule respected — never `main`/release branches).
2. Backend: `npm run lint` = 0. App: `npx tsc --noEmit` = 0.
3. Live curl of every new endpoint: happy + one error path each (400/401/409/422 as designed).
4. App E2E in the Peach sim (runbook: `docs/CUSTOMER_APP_PEACH_RUNBOOK.md`): walk the changed screen(s); screenshot proof.
5. DB after-state matches expectation (no orphan test rows; test data cleaned like the audit did).
6. Update `.cursor/memory/activeContext.md`; own one lock row in `agents-lock.md` during edits, clear after.

## 8. Suggested commit sequence

1. `feat(profile): mobile change request/confirm endpoints + app wiring (C-12)`
2. `feat(profile): customer password change (C-11)`
3. `feat(profile): app PIN set/verify (C-13)`
4. `feat(bookings): server-side serviceability gate (C-03)`
5. `feat(vehicles): image picker in add-vehicle (C-08)`
6. `chore(profile): settings/support/QR/google cleanup rows (C-05/06/07/09)`
7. (P4/P5 commits when unblocked)

Each commit independently revertable; no cross-phase bundling.
