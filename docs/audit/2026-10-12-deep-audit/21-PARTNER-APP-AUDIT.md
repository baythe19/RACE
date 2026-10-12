# 21 — Partner App Audit (`mobile application/`)

**Stack:** Expo 57 / RN 0.86 / Redux + React Query + Zustand · 244 source files · 32 screens · port 8082
**Three personas share one app:** vendor company, vendor-managed driver (login ID + password), self-registered driver (phone OTP).

**Verdict:** flows are broad and the driver job cycle is now a real, backend-driven experience — but the app has a **32-site mock-data fallback that is ON by default**, which means a broken API looks like a working app.

---

## 1. Screen inventory [V]

| Group | Screens |
|-------|---------|
| Auth (9) | `PartnerSplash`, `PartnerWelcome`, `PartnerRoleSelection`, `PartnerDriverAuthMode`, `PartnerLogin`, `PartnerOtpVerification`, `PartnerVendorDriverLogin`, `WrongAppRole` |
| Registration — driver (4 + pending) | `DriverPersonalInfo`, `DriverVehicleInfo`, `DriverDocuments`, `DriverReview`, `DriverVerificationPending` |
| Registration — vendor (4) | `VendorBusinessInfo`, `VendorBusinessAddress`, `VendorDocuments`, `VendorReview` |
| Vendor home / fleet | `PartnerHomeScreen` (1134 lines), `VendorDriversScreen`, `VendorVehiclesScreen`, `VendorAssignJobScreen`, `PartnerVerificationStatusScreen` (877) |
| Driver surface (4) | `DriverDashboardScreen` (1445), `DriverJobsScreen`, `DriverActiveJobScreen`, `DriverVerificationGateScreen` |
| Account (4) | `PartnerAccountScreen`, `PartnerDocumentsScreen`, `PartnerEditProfileScreen`, `PartnerVehicleInfoScreen` |

Shared infra: `DriverOfferAlert` (overlay), `PartnerTabBar`, `PartnerScreenLayout`, `PartnerHeaderLogo`, `PartnerOtpInput`, `DriverToggle`, `theme/driverUi.ts` (measured design tokens).

## 2. Flows [V]

| Persona | Flow | Backend wiring |
|---------|------|----------------|
| **Vendor company** | role → business info → address → documents (Aadhaar/PAN/GST/cheque) → review → submit → verification status | ✅ `/vendor/draft|register|update|status|profile|dashboard`, `/vendor/upload-document`, `/vendor/selfie` |
| Vendor fleet | add drivers, upload their documents, claim existing driver, add vehicles, approve job offers, assign to driver/vehicle | ✅ full set, all behind `requireRole('vendor')` |
| Vendor **trip start** | — | ❌ `verify-trip-otp` defined but **no screen calls it** |
| **Vendor-managed driver** | login ID + password → job offers → accept → status updates | ✅ `/auth/driver-login` (bcrypt, blocks SUSPENDED/REJECTED) |
| **Self driver** | phone OTP → 4-step registration → pending screen → dashboard | ✅ `/driver/register` (documents sent as **local URIs** — see DB/DQ-1) |
| Driver job cycle | offer alert (with server-provided expiry) → accept → en route → arrived → start OTP → complete → earnings | ✅ `/driver/bookings/*`, approval-gated |
| Driver pre-approval | verification gate replaces the tabs until `driverProfile.status === 'APPROVED'` | ✅ gate + read-only dashboard |

## 3. Findings specific to this app

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| PA-1 | 🔴 Critical | **Mock data is enabled by default.** `UI_PREVIEW_MODE = process.env.EXPO_PUBLIC_UI_PREVIEW_MODE !== 'false'` → `true` unless the env var is explicitly `"false"`. 15 service files wrap failed calls in `if (UI_PREVIEW_MODE) return MOCK_*` — **40 fallback sites** (driver jobs, offers, active job, availability, vendor status/dashboard, drivers, vehicles, notifications, profile, auth). A production build without that env var shows **fabricated jobs, earnings and vendor data** instead of errors | `constants/preview.ts:6-7`; `services/driver/driverApi.ts:71,89,106,125`; `services/vendor/vendorApi.ts:30,47,64,78,92`; grep count = 40 |
| PA-2 | 🟠 High | The 4-step **driver registration sends documents as local device URIs** (`url: doc.uri`), and the only driver-document upload endpoint is for vendor-managed drivers → self-driver KYC never reaches storage | `DriverReviewScreen.tsx:86-90`; `vendorRoutes.ts:52` |
| PA-3 | 🟠 High | `DriverReviewScreen` fabricates profile data when fields are empty (name `'Rajesh Kumar'`, email `rajesh.driver@gmail.com`, licence `OD-0220190012345`, vehicle `OD 02 AB 1234`, languages `['Odia','Hindi','English']`) and, when no session exists, invents a `mock-driver-token` | `DriverReviewScreen.tsx:94-130, 141-170` |
| PA-4 | 🟡 Medium | Driver dashboard/active-job have **no map** while the customer app does; a driver cannot see the route | `DriverDashboardScreen.tsx` (1445 lines, no MapView) |
| PA-5 | 🟡 Medium | **No background location**; location reporting stops with the app backgrounded and resumes on foreground | `hooks/useDriverLocationReporting.ts` (no task-manager/background registration); `AppState` re-report added |
| PA-6 | 🟡 Medium | Partner app has **no socket client** — offers/jobs/active job poll at 8 s / 10 s / 15 s (`useDriverQueries.ts`) | grep: socket.io-client only in the customer app |
| PA-7 | 🟢 Low | `EXPO_PUBLIC_SKIP_OTP_AUTH` now defaults **false** (real OTP) — this contradicts older project memory that says both Expo login screens hard-skip OTP; the current code requires the env var to be `'true'` | `PartnerLoginScreen.tsx:53-54` |

## 4. UI/UX assessment

**Good [V]:**
- Driver design tokens were **measured from the boards** (`theme/driverUi.ts`) and applied consistently (logo, page gutters 15 dp, card radii, amber/green ramp).
- The incoming-offer alert is a single overlay mounted above the tab navigator, with server-provided expiry, countdown states (`live → expiring → expired → taken`), duplicate-tap locking and a vendor-routing exemption — this is genuinely thought-through UX.
- Verification states are honest now: gate screen + read-only dashboard, derived from `driverProfile.status` (not `isVerified`).
- Error/empty/loading handling is explicit on the driver dashboard (location-health card with *Open settings* / *Try again*).

**Weak [V/O]:**
- **Persona branching inside one screen file** (`PartnerHomeScreen` 1134 lines, `PartnerActiveJobScreen` 411, `PartnerDashboard` 1445) — dead vendor/driver branches remain in screens that no longer render them for that persona. Main maintainability cost of the app.
- Mock fallback (PA-1) means designers/testers cannot tell "API failed" from "working" — it also hides regressions.
- Vendor side has no **job board / active jobs** view beyond offers; a vendor cannot watch an in-flight job.
- `PartnerVerificationStatusScreen` (877 lines) is vendor-shaped and duplicates the driver verification story in a second design language.

## 5. Scores

| Area | Weight | Score |
|------|-------:|------:|
| Persona/flow coverage | 20% | 8/10 |
| API wiring completeness | 20% | 7/10 |
| Data honesty (mock mode, fabricated fields) | 20% | 3/10 |
| Driver live experience (map, location, realtime) | 15% | 4/10 |
| UI/UX & design-system adherence | 15% | 8/10 |
| Maintainability (file size, duplicated branches) | 10% | 4/10 |
| **Weighted** | 100% | **5.9/10** |

### Two-level view

| Capability | If DONE | If NOT done | Today |
|-----------|--------:|------------:|-------|
| Real data in production builds (mock mode off) | 10 | 0 | **1** |
| Driver KYC documents actually uploaded | 10 | 2 | **2** |
| Driver job cycle end-to-end | 10 | 3 | **8** |
| Approval gating & honest status screens | 10 | 3 | **9** |
| Background location during a job | 10 | 4 | **3** |
| Vendor can supervise a running job | 10 | 3 | **4** |

## 6. Proposals (not applied)

| # | Proposal | Effort |
|---|----------|--------|
| P1 | Make preview mode **opt-in** (`=== 'true'`) and fail loudly in production builds | S — highest value change in this app |
| P2 | Give self-driver registration a real document upload path (reuse `vendorDocumentUpload` + GCS) | M |
| P3 | Remove fabricated defaults from `DriverReviewScreen`; require the fields instead | S |
| P4 | Add the job map + background location (active job only) | M–L |
| P5 | Split persona logic out of the god-screens into `driver/` and `vendor/` folders; delete dead branches | M |
| P6 | Vendor "active jobs" view using existing `/vendor/bookings/offers` + assignment data | M |
