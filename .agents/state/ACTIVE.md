# RACE — Active State

> **Updated:** 2026-10-07
> **Read this first in every new session.**

---

## Current Objective

**Customer mobile UI/UX redesign, one screen at a time.** Scope is `customer application/` only. Design rules live in `.agents/uiux/` (`SKILL.md`, `MOBILE_APP_PATTERNS.md`, `AGENT_QUICK_RULES.md`).

Already treated as done (do not restyle unless asked): onboarding, sign up, sign in, Home, and service pages (Services, Towing, Driver, Roadside, More, location picker).

Next: wait for the user to name the next screen. Before code, write the skill’s screen contract (goal, one primary CTA, keep/remove, states).

Cloud production remains documented in `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md`. Do not start Render/Vercel/EAS work in this design pass.

## Active Branch

`v2.5.2-development` (HEAD) — this is the current work branch.
Previous cleanup branch `v2.0.1-cleanup` was merged/superseded.

## Phase

Cloud-hosted API (Render) + admin (Vercel) + customer Android APK (Expo EAS `@webstarts/race-service`).

## Completed Work

- [x] Local environment fully running (Backend :3000, Admin :3001, Customer :8081, Partner :8082, MongoDB :27017)
- [x] All 4 surfaces: deps installed, TypeScript clean, Vite proxy configured
- [x] Database seeded; 40-case comprehensive audit 100% pass
- [x] System audit documented (`docs/SYSTEM_AUDIT_AND_TEST_CASES.md`)
- [x] Gap analysis documented (`docs/RACE_REMAINING_WORK_AND_GAPS.md`) — 57→95/100 plan
- [x] Mock testing mode + universal OTP + data seeders + playbook
- [x] Complete pixel-perfect redesign of Customer mobile app core screens based on reference mockups:
  - `HomeScreen.tsx`: Pure white background, sticky top bar with location pill dropdown, highlighted greeting ("Good afternoon, Welcome! 👋"), road scenery atmospheric background extending 100% full-bleed edge-to-edge (`left: -px(20)`, `width: width`) with zero side gaps, shifted higher (`top: -px(56)`, `height: px(380)`) behind "Good afternoon", dual-ended LinearGradient melting both top edge and bottom road edge seamlessly into pure solid `#FFFFFF` eliminating hard cuts/corners, custom SVG curved 24/7 card with dipped notch starting right beside "24/7", smooth rounded top-right corner (`R_tr = px(24)`), multi-stop continuous ease gradient on the card eliminating transition lines and graduating to `stopOpacity="0.45"` on the right corner for crystal-clear tow truck visibility while maintaining 100% solid white contrast on the left for text, native bottom drop shadow (`elevation: 4`, `shadowOpacity: 0.10`), lower card position (`marginTop: px(58)`), single-line "Roadside Assistance" title, 2-line subtitle ("Reliable help, anytime,\nanywhere in Bhubaneswar."), tightened gap to Request Help button, highlighted golden-gradient Request Help CTA, highlighted Our Services icons, and 2x2 Popular Services grid.
  - `ServicesScreen.tsx`: Top header with highlighted 23px "Services" title and back button, increased card height (`px(150)`), wider cards (`paddingHorizontal: px(14)`), borderless design with soft shadows (`shadowColor: '#000', elevation: 3`), right-anchored artwork container (`width: '58%'`, `height: '92%'`) displaying tow truck, driver, mechanic wrench, and car visuals cropped on the right with no top/bottom overflow, and gentle left fog gradient overlay ensuring text sits on clean white/yellow background with zero wash-out of right-side subjects.
  - `TowingServiceScreen.tsx`: Highway tow truck photo banner, 3-stat quick trust bar (30 min arrival, Verified drivers, Safe & insured), 3 towing options with Book Now buttons, Why Choose Us grid, sticky dual action bar (Call Now & Book Towing).
  - `DriverServiceScreen.tsx`: Photo banner with green "Drivers Available" badge, 4 driver options (Part-Time, Full-Time, Outstation, Night), Why Choose Us grid, sticky Call Now & Book Driver bar.
  - `RoadsideAssistanceScreen.tsx`: Photo banner with "Available Now - 25 min" badge, 4 roadside options (Flat Tyre, Battery Jumpstart, Fuel Delivery, Minor Mechanical Fix), Why Choose Us grid, sticky Call Now & Book Service bar.
  - `MoreServicesScreen.tsx`: Yellow hero banner with "Coming Soon" pill, 6 upcoming service cards with "Soon" status badges.
  - `LocationSelectorSheet.tsx`: Top grab handle, back button, "Set your location", search pill, "or" divider, "Use my current location", "Select on map" divider, "Open Map Picker", and popular city chips.
  - `LocationPickerMap.tsx`: Clean header, floating search bar pill on top, yellow pin with blue accuracy circle & dot, floating locate button, bottom sheet with address title & edit icon, and yellow "Use this location" button.
  - `AppNavigator.tsx`: Reordered bottom tab bar (Home, Bookings, SOS, Services, Profile) matching design mockup.

## Active Work

Customer app visual redesign queue. Auth + Home + service discovery are the current design baseline. Remaining work is screen-by-screen (bookings, SOS, profile, booking flows, and other named screens).

## Known Blockers & Completed Gaps

- [x] Driver KYC document upload & persistence to API (DRV-01, DRV-02, DRV-03, DRV-04, DRV-05)
- [x] Booking model fields: `towingMode` (instant/scheduled/emergency) & `driverServiceType` (part_time/full_time/outstation/night) (SVC-01, SVC-02)
- [x] Admin reports and dashboard query and aggregate real bookings (`TowingBookingModel` + `DriverBookingModel` + `BookingModel`) (ADM-01, DB-01)
- [x] Vendor bank details collection & interactive agreement checkbox (VND-01, VND-03)
- [x] Partner offline preview & instant demo logins for Driver & Vendor
- [x] QR Emergency Vehicle Module: connected `QRScanScreen` -> `VehicleQrEmergencyScreen` with owner contact, emergency contact, 1-tap towing request, and direct SOS (QR-01, QR-02, QR-03, QR-04)
- [x] OTP Verification parity: both Customer and Partner apps use real OTP verification flow by default (`SKIP_OTP_AUTH = false`), with dev fallback (123456) and one-tap demo logins on both login screens
- [ ] Real payment gateway (stubs)
- [ ] Live GPS tracking on mobile (scaffold only)
- [ ] Automated test framework (`backend/__tests__` empty)

## Important Files

| Purpose | Path |
|---------|------|
| Project structure | `.agents/state/PROJECT_INDEX.md` |
| Decisions index | `.agents/state/DECISIONS_INDEX.md` |
| Gap/remaining work | `docs/RACE_REMAINING_WORK_AND_GAPS.md` |
| Backend layout | `backend/src/STRUCTURE.md` |
| Mock test playbook | `docs/MOCK_TESTING_PLAYBOOK.md` |
| **Cloud prod runbook** | `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md` |
| Client overview | `docs/client/CLIENT_OVERVIEW.md` |

## Important Discoveries

- Expo SDK is **57** (^57.0.0), RN 0.86.3 — stale docs/memory may say 54 or 56, ignore them.
- Admin uses **Zustand + TanStack Query**, not Redux (CLIENT_FEATURES.md was wrong).
- `owner: 'race-service'` in **Expo** was wrong for EAS; customer app uses **`owner: 'webstarts'`**, slug **`race-service`**, projectId **`277981d5-5046-4288-8c91-672aab158419`**. MongoDB DB name `race-service` is still just a string, not a deleted folder.
- VPS is still on `release/13July26` — **cloud** (Render) is the tested API for mobile/admin; do not assume VM matches this branch.
- Customer OTP: MessageCentral on Render when `FORCE_MOCK_OTP=false`; app uses `EXPO_PUBLIC_SKIP_OTP_AUTH` (production APK should be false). Partner app may still have dev skip flags — check code before claiming.
- Admin login: env-hardcoded in `backend/src/config/hardcoded-admin.ts`; `Admin` model unused for auth.

## Active Decisions

See `.agents/state/DECISIONS_INDEX.md` for all decisions.

## Next Action (When User Returns)

1. User names the next customer screen.
2. Read that screen plus shared UI/theme before editing.
3. Apply `.agents/uiux` rules: one goal, one primary CTA, reuse existing components, no invented backend.
4. Cloud/APK work stays paused until the user asks. Runbook: `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md`.

## Do Not

- Push to `main`, `release4Aug2026`, `release/13July26`
- Recreate `customerweb/`, `partnerweb/`, `web application/`, `race-service/`
- Delete unused-looking screens without an import graph
- Commit `.env` or secrets
