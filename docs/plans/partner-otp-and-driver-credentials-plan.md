# Partner App — Real OTP + Vendor-Driver ID/Password Login — Execution Plan

**Created:** 2026-10-17 · **Branch target:** `v4.0.0-vander` · **Status:** IMPLEMENTED 2026-10-17 — WI-1→WI-4 done, tsc + backend lint both 0. Remaining: real-OTP device smoke + EAS APK.
**Reference system:** Customer app OTP (already tested working against Render + MessageCentral)

---

## 1. Verified current state (deep-researched, file:line evidence)

### 1.1 OTP backend — SHARED with customer app, zero new backend needed for OTP

| Piece | File | Status |
|---|---|---|
| OTP service (MessageCentral VerifyNow) | `backend/src/services/src/otp.ts` | ✅ Role-agnostic. Production mode stores only `mcVerificationId`; dev mode returns `devOtp` |
| SMS transport | `backend/src/utils/src/sms.ts` | ✅ MC_CUSTOMER_ID + MC_AUTH_TOKEN env; Render already configured (customer OTP tested working) |
| Rate limits | `otp.ts` (assertResendAllowed, attempts), `authRoutes.ts` (`otpRateLimiter`) | ✅ Active in production |
| Routes | `backend/src/controller/src/authRoutes.ts` | ✅ `POST /send-otp`, `POST /verify-otp` — both take `role` (vendor/driver accepted) |

Role-aware guards in `backend/src/services/src/auth.ts`:
- `sendOtp` (line ~123): existing user → `assertRoleAccess`; **vendor-created drivers blocked from OTP** (line ~139): loginId + vendorUserId present → 409 *"This number belongs to a vendor driver. Sign in with the Login ID and password provided by your vendor."*
- `verifyOtp` (line ~161): same 409 guard (line ~185) + sets `isVerified`, issues token pair.

**Conclusion: partner app real OTP needs NO backend change. Same OTP system as customer — already wired.**

### 1.2 Vendor-Driver ID/Password backend — ALREADY COMPLETE

| Piece | File:line | Status |
|---|---|---|
| `driverProfile.loginId` unique sparse index | `backend/src/models/src/user.ts:129` | ✅ |
| bcrypt hash/verify + loginId normalize | `backend/src/utils/src/driverPassword.ts` | ✅ 10 salt rounds |
| Vendor creates driver with loginId+password | `backend/src/services/src/vendorDrivers.ts:76-134` | ✅ Uniqueness check, existing-number re-link, PENDING (prod) / APPROVED (non-prod) |
| Credential login endpoint | `auth.ts:212` + `authRoutes.ts:31` (`/driver-login`, schema + `authRateLimiter`) | ✅ bcrypt compare, active/suspended checks, token pair |
| Vendor Drivers UI collects loginId+password | `mobile application/src/screens/partner/VendorDriversScreen.tsx:172-341,561+` | ✅ Validation (loginId 4–40 `[a-zA-Z0-9._-]`, password ≥6), success alert shares password |

### 1.3 Mobile partner — the real work is HERE (bypasses + glue)

| Item | File:line | Problem |
|---|---|---|
| **Hardcoded OTP bypass** | `PartnerOtpVerificationScreen.tsx:167` | `catch` block: `UI_PREVIEW_MODE \|\| __DEV__ \|\| permissive \|\| code === '123456' \|\| code === '000000'` → fakes a session. **In production APK, typing 123456 on a wrong OTP logs in with a mock token.** Must remove code literals. |
| Auto-fill toast fallback | same file:278 | Last-resort `'123456'` — remove |
| OTP suggestion fallback | same file:329 | `UI_PREVIEW_MODE ? '123456' : undefined` — remove literal |
| Mock login in error paths | `PartnerLoginScreen.tsx:210`, `authService.ts:40-70,100-110`, `PartnerVendorDriverLoginScreen.tsx:88` | All gated by `UI_PREVIEW_MODE`/`__DEV__` → neutralized automatically when APK is built with `EXPO_PUBLIC_UI_PREVIEW_MODE=false`; leave code, flag handles prod |
| SKIP_OTP_AUTH | `PartnerLoginScreen.tsx:45` | Env-gated (`=== 'true'`), default OFF → real OTP is already the primary path. Keep as dev convenience, document |
| Vendor-driver 409 UX | `PartnerLoginScreen.tsx:188-199` | Error matching only handles *"registered as a vendor/driver"* phrases; the 409 *"vendor driver → use Login ID"* message has **no in-app CTA** to jump to the ID-login screen |
| Password length mismatch | `PartnerVendorDriverLoginScreen.tsx` (min 4) vs `VendorDriversScreen.tsx:279` (min 6) | Align login screen to ≥6 |
| Login screen entry | Welcome → `PartnerDriverAuthModeScreen` → `PartnerVendorDriverLogin` (dashboard reachable ✅) | Verify auth-mode screen copy shows both options clearly (OTP / Login ID) |

---

## 2. Target working model (what "done" looks like)

### Flow A — Vendor (fleet owner)
```
Welcome → select Vendor → Mobile + OTP (real SMS via MessageCentral)
        → new vendor  → Vendor registration wizard → admin approval gate
        → existing    → Vendor dashboard
```

### Flow B — Self-registered Driver
```
Welcome → select Driver → Auth mode screen → "Login with OTP"
        → Mobile + OTP (real SMS) → 4-step driver registration / verification gate → dashboard
```

### Flow C — Vendor-created Fleet Driver (ID + password)
```
Vendor → Drivers → Add Driver (step 1: loginId + password ≥6 + phone + name) → DB: driverProfile.loginId + passwordHash(bcrypt), status PENDING
Driver app: Welcome → Driver → Auth mode → "Login with ID from vendor"
        → loginId + password → POST /api/v1/auth/driver-login → bcrypt verify → tokens → dashboard (onboardingRequired=false)
Driver who forgot password → "Contact your vendor" (vendor resets; see WI-4)
Driver tries OTP with vendor-bound number → backend 409 → app shows CTA "Login with ID & password"
```

**Auth duality rule (by design):** self-drivers = OTP identity; vendor fleet drivers = credential identity. Backend already enforces each correctly.

---

## 3. Work items (exact edits)

### WI-1 (mobile, ~30 min) — Purge OTP bypasses — `PartnerOtpVerificationScreen.tsx`
1. Line ~167 `catch`: remove `finalCode === '123456' || finalCode === '000000'` and the mock-session fallback; keep only `UI_PREVIEW_MODE || __DEV__` preview-session behavior (dead in prod APK) **or** remove the whole preview branch — decision: **remove entirely** so prod semantics = real API only; dev still has `devOtp` toast from backend.
2. Line ~278: auto-fill action uses only `extractOtpFromMessage(...) ?? devOtp ?? extractOtpFromMessage(otpMessage)` (no `'123456'`).
3. Line ~329: `suggestedOtp={devOtp ?? extractOtpFromMessage(otpMessage)}`.
4. Keep `isUiTestPermissiveMode()` disabled-state logic but flip default (see WI-5 env matrix).

### WI-2 (mobile, ~15 min) — `PartnerLoginScreen.tsx`
1. Keep `SKIP_OTP_AUTH` env-gated block (default OFF) — add comment: dev-only, never set in prod builds.
2. Quick-Preview mock row already `__DEV__ || UI_PREVIEW_MODE` gated — leave.
3. Line ~210 fallback (`sendOtp` failure → mock login): make it preview-only AND log a clear warning; in prod APK branch is unreachable already.

### WI-3 (mobile, ~30 min) — 409 glue + consistency
1. In `PartnerOtpVerificationScreen` + `PartnerLoginScreen` error paths: match message containing `vendor driver` → show action "Login with ID & password" → `navigation.navigate('PartnerVendorDriverLogin')`.
2. `PartnerVendorDriverLoginScreen`: password min 4 → **6** (match vendor creation rule); error copy for 401/403 already surfaces backend message.
3. `PartnerDriverAuthModeScreen`: verify both options labeled: "Login with OTP" / "I have a Login ID from my vendor".

### WI-4 (backend + mobile, ~1.5 h) — Vendor password reset (completes the model)
Backend:
- `vendorDriversValidator.ts`: `resetVendorDriverPasswordSchema { password: min 6 }`.
- `vendorDrivers.ts`: `resetDriverPassword(vendorUserId, driverId, dto)` — assert vendor owns driver (existing assert), `passwordHash = hashDriverPassword(dto.password)`, return `{ reset: true }`. Never return the hash.
- Route: `POST /api/v1/vendor/drivers/:id/reset-password` behind `authMiddleware + requireRole('vendor')` (same as sibling vendor drivers routes).
- DB: **no schema change** (passwordHash field exists).
Mobile:
- `vendorDriversApi.ts`: `resetVendorDriverPassword(driverId, password)`.
- `VendorDriversScreen` 3-dot menu: "Reset password" → prompt (min 6) → mutation → Alert "New password shared with driver".

### WI-5 — Env matrix for builds (the critical switch)

| Env | Client-testing APK | Production (later) | Local dev (Expo Go) |
|---|---|---|---|
| `EXPO_PUBLIC_UI_PREVIEW_MODE` | **false** | false | unset (mock fallbacks on) |
| `EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE` | **false** | false | unset |
| `EXPO_PUBLIC_SKIP_OTP_AUTH` | **absent** | absent | optional true |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | real key | real key | optional |
| Backend (Render): `MC_CUSTOMER_ID/MC_AUTH_TOKEN` | already configured ✅ | same | — |
| Backend (Render): `FORCE_MOCK_OTP` | must be false/unset | false | — |

### WI-6 — Verification gates (before "done")

1. `cd "mobile application" && npx tsc --noEmit` → 0 errors.
2. `cd backend && npm run lint` → 0 errors.
3. OTP smoke vs Render (`https://race-api-w361.onrender.com`):
   - Partner vendor number → SMS arrives (real MC), wrong OTP → "Incorrect code…", correct OTP → tokens + role routing.
   - Fresh driver number → OTP → registration wizard entry.
4. ID/password smoke:
   - Vendor → Add Driver (loginId `ravi.kumar`, password) → row appears.
   - Driver app → ID login with those credentials → dashboard (PENDING status shows verification gate — expected in prod; APPROVED in non-prod).
   - Wrong password → 401 shown; suspended driver → 403 shown.
   - OTP attempt on vendor-driver number → 409 → CTA "Login with ID & password" visible.
5. APK: `EXPO_PUBLIC_UI_PREVIEW_MODE=false EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE=false npx eas build -p android --profile preview` → install → repeat step 3/4 on device.

---

## 4. Edge cases handled

| Case | Behavior |
|---|---|
| Same number as customer app | `assertRoleAccess` role-mismatch message; UI shows "use the other app" guidance (existing `roleMismatch` util) |
| Vendor-driver tries OTP | 409 → CTA jump to ID login (WI-3) |
| Duplicate loginId | creation blocked: "This login ID is already taken" (existing) |
| Existing mobile number re-created as vendor driver | re-link path sets credentials; other-vendor conflict still blocked (existing) |
| OTP spam | `otpRateLimiter` + hourly resend cap (prod) |
| OTP expiry | backend 400 with resend guidance; screen timer + resend button |
| LoginId case | normalized lowercase both at create and login |
| Password exposure | bcrypt hash only; never returned (select('+passwordHash') server-side) |

## 5. Exact execution order

1. WI-1 → WI-2 → WI-3 (all mobile, one commit) → tsc gate.
2. WI-4 (backend commit + mobile) → backend lint + tsc gate.
3. WI-6 step 1–4 smoke.
4. EAS preview APK → device smoke → hand to client test build.

Estimated total: ~3–4 h including verification.
Lock note: `partner` surface currently claimed by another agent ("PartnerTabBar rebuild") — clear/finish that claim before starting WI-1.
