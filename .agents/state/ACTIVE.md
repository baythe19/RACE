# RACE — Active State

> **Updated:** 2026-10-12
> **Read this first in every new session.**

---

## Current Objective

**Partner mobile (Master Prompt UI/UX, Driver–Vendor Parity, Flow Connectivity & Deliverables) COMPLETED.**
Complete, high-fidelity implementation matching Master Prompt & Reference Boards 1 & 2 in `mobile application/`:
- Screen A: `PartnerAccountScreen.tsx` (Account/Profile hub with role-aware metrics, verified badge, quick navigation)
- Screen B: `PartnerEditProfileScreen.tsx` (Profile edit with avatar upload, mobile lock, DOB, city, address, languages chips)
- Screen C: `PartnerVehicleInfoScreen.tsx` (Tow truck / vehicle artwork, plate number, active badge, RC, model, insurance)
- Screen D: `PartnerDocumentsScreen.tsx` (All required docs approved banner, Required 6 vs Optional 2 tabs, upload sheet)
- Screen E: `PartnerEarningsScreen.tsx` (Dual-tab Earnings & Payouts, weekly bar chart with highlight tooltip, trip metrics, recent trips, recent payouts)
- Screen F: `PartnerNotificationsScreen.tsx` (Canonical notifications inbox with Mark all read, filter chips, Today/Yesterday grouping, unread dots, action navigation)
- Screen G: `PartnerNotificationPreferencesModal.tsx` (Toggles for job requests, updates, account, earnings alerts, promotions)
- Screen H: `PartnerSettingsScreen.tsx` (Account, App Settings, Support, About, Session with language picker, dark mode switch)
- Screen I: `PartnerHelpSupportScreen.tsx` (Searchable FAQs, 24x7 Call Support, WhatsApp chat, common topics, Contact Us banner)
- Screen J: `PartnerBankDetailsScreen.tsx` (Bank details with masked account, IFSC with Find IFSC, bank name, automated payout readiness)
- Screen K: `PartnerTripHistoryScreen.tsx` (All, Completed, Cancelled tabs with fare, timestamps, references)
- Screen L: Modals (`PartnerLogoutDialog.tsx`, `PartnerSuccessDialog.tsx`, `PartnerLanguageSheet.tsx`, `PartnerUploadSheet.tsx`, `PartnerLocationSheet.tsx`)
- Screen M: `PartnerHomeScreen.tsx` (Vendor Home elevated with incoming leads banner, quick assign CTA, fleet KPIs, notification bell)
- Screen N: `VendorAssignJobScreen.tsx` (Elevated to `PartnerScreenLayout` with vehicle artwork, radio selection, and assignment mutation)
- Navigation & Notifications: Wired `openPartnerNotifications()` helper into top notification bells (`DriverDashboardScreen.tsx`, `DriverJobsScreen.tsx`, `PartnerHomeScreen.tsx`, `PartnerJobsScreen.tsx`)
- Floating UI QA Navigator & Zero-Blocking UI Testing Mode:
  - Added `UiTestNavigator.tsx` floating badge (`⚡ UI QA`) with 1-tap role switcher and instant jump to ~30 Driver, Vendor, and Account screens.
  - Zero-blocking inputs: tapping Continue/Next/Submit on any registration or login screen auto-fills sensible defaults if blank.
  - Toggle script: `scripts/toggle-ui-test-mode.sh` (or `npm run test:ui-on` / `npm run test:ui-off` / `npm run test:ui-status`) controls `EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE` on demand.
  - In-app live switch: Toggle Permissive Mode ON/OFF directly inside the `⚡ UI QA` sheet with zero restart needed.
- Deliverables generated: `docs/partner-app-audit.md`, `docs/partner-flow-map.md`, `docs/partner-implementation-report.md`
- Quality status: 0 TypeScript errors in `mobile application/` and `backend/`.

## Active Branch

`3.5.0-new-driver-screeens` (HEAD at last check) — current work branch. `3.0.0-driver-app-development` was the branch during the 2026-10-12 audit; the tree has since switched, and `PartnerHomeScreen.tsx` / `PartnerJobsScreen.tsx` / `VendorAssignJobScreen.tsx` carry uncommitted UI edits.

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

## Recent Work — Driver verification gate (Partner app)

- Board "Your account is under verification" is implemented as a **shared view**: `mobile application/src/components/partner/DriverVerificationView.tsx`, used by both the post-registration screen and the in-app gate (`screens/partner/driver/DriverVerificationGateScreen.tsx`).
- `driverProfile.status` is now exposed by **GET /api/v1/profile** for role `driver` (`backend/src/services/src/profile.ts` → `mapDriverProfile`; DTO in `profileValidator.ts`). No credentials (`loginId`, `passwordHash`) are ever returned.
- Step tracker/state/copy live in `mobile application/src/utils/driverVerification.ts` (`buildDriverVerification`) — the dashboard verification card reads the same module.
- **Fixed bug:** `isVerified` is set to `true` at driver registration even while the review is open, so the dashboard used to claim "Verification approved" for pending drivers. Approval is now `driverProfile.status === 'APPROVED'` (same field the backend gates on).
- `PartnerAppNavigator` starts an unapproved driver on the gate instead of the live tabs; "Go to Dashboard (Read only)" opens them. The dashboard skips jobs/offers/availability/location requests until approved (they would 403).
- Removed fabricated `mock-driver-token` / placeholder user from the verification screen; `DriverReviewScreen` still contains its own mock fallbacks (untouched, separate task).

## Recent Work — Driver dashboard visual alignment (2026-10-14)

- Tightened `DriverDashboardScreen.tsx` to match the supplied compact 390dp reference: restored the Partner logo mark, reduced top/header and card spacing, compacted request and recent-job rows, reduced secondary typography, and used the concise approved-state dashboard label.
- Front-end presentation only; API queries, approval gating, availability, and navigation behavior were not changed.
- Partner TypeScript check and `git diff --check` pass. Physical/device screenshot comparison remains to be run when a preview target is available.

## Reference review — Partner driver boards (2026-10-14)

- Additional design source: `/workspaces/RACE/partner app/` contains the dashboard reference, three cropped journey references, one repeated five-board composite, and `more context for deisng .md`.
- The intended driver sequence is `DRIVER_EN_ROUTE → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED`; Dashboard, Jobs, and Account keep the three-tab bar, while active-job, OTP, and completion screens hide it.
- Implemented the next visual/behavior pass: Jobs branding/counts/segments, full-bleed active map, route callouts and marker colors, en-route action order, OTP dimming and manual focus, completion success layout, confirmation before completing, and in-card Back to Home.
- Preview acceptance now promotes the selected offer into the active trip, removes accepted/declined offers, validates the preview trip OTP (`1234`), records status history/final fare, and treats completed trips as no longer active.
- Completion preserves a local snapshot so the board remains visible after the real backend releases the active booking. Account/verification visual references were not present in the additional folder.
- Verified with partner TypeScript, `git diff --check`, Expo Android bundle export, and a preview lifecycle handoff script. Device screenshot comparison remains pending because no emulator/ADB is available.

## Deep audit — 2026-10-12 (documentation only, no code changed)

Full audit lives in `docs/audit/2026-10-12-deep-audit/` (README index + scorecard + per-surface docs + bug register + test catalogue).
Key outcomes: **platform readiness 5.8/10**, launch readiness 3.6/10; four blockers (partner-app mock mode on by default, publicly readable KYC uploads, unauthenticated Socket.IO rooms, hardcoded admin credential with a default).
Execution order for the fixes: `80-IMPLEMENTATION-PLAN.md` (phases 0-6, owner + connection + verification per item); pure numbers: `81-SCORING-ONLY.md`.
MVP scope added on request: `82-MVP-DEFINITION-AND-BUILD-PLAN.md` — what a working MVP is across all four surfaces + API, three tiers (**MVP-0 honest demo ~14 dd · MVP-A working MVP ~29 dd · MVP-B pilot-hardened ~38.5 dd**), per-surface completeness tables, the 7 end-to-end journeys with exact screen→endpoint connections, an ordered work list (MVP-01…MVP-23 with verify steps), and a ~50-check acceptance script for calling the MVP "done".
Self-review corrections (see `02-§6`): backend is **171 route registrations / 136 unique paths** (not 159); client wiring is **88%** (not 67%) and admin **81%** (not 52%) — the first pass undercounted because of a mount-table bug and template-concatenated client paths. Score moved connections 6.2 → 6.6, platform 5.7 → 5.8.

**Correction to older memory:** `SKIP_OTP_AUTH` is **no longer hardcoded `true`** in the Expo login screens — both apps now use `process.env.EXPO_PUBLIC_SKIP_OTP_AUTH === 'true'` (default false). The partner app instead has `EXPO_PUBLIC_UI_PREVIEW_MODE` which **defaults to on** and returns mock data on API failure (40 sites) — that is the real "looks done but is not" switch now.

## Next Action (When User Returns)

1. Run a real-device screenshot pass for the partner driver boards and tune remaining spacing/map rendering against the supplied references.
2. If the driver boards are accepted, continue with any missing partner Account references/screens.
3. Cloud/APK work stays paused until the user asks. Runbook: `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md`.

## Do Not

- Push to `main`, `release4Aug2026`, `release/13July26`
- Recreate `customerweb/`, `partnerweb/`, `web application/`, `race-service/`
- Delete unused-looking screens without an import graph
- Commit `.env` or secrets
