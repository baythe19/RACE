# 30 — UI/UX Page Inventory (component level)

**Purpose:** answer, page by page — *what components exist, what should exist, what is over-engineered, what is missing, and which changes are cheap wins.*

Legend: ✅ present & appropriate · ➕ should be added · ✂️ over-engineered / remove or defer · ⚠️ present but misleading

---

## A. Customer app

| Screen | Components now | Should have | Verdict |
|--------|----------------|-------------|---------|
| `MobileNumberScreen` | country selector, phone input, CTA, error banner, `SKIP_OTP_AUTH` branch | same | ✅ |
| `OTPScreen` / `OtpVerificationScreen` | 6-digit input, resend timer, dev-OTP toast | **one** OTP screen | ✂️ duplicate screens |
| `CreatePinScreen`, `ForgotPassword`, `ResetPassword`, `ChangePassword` | local UI only (no API) | either real endpoints or removal | ⚠️/✂️ dead UI |
| `HomeScreen` | service grid, hero cards, offers, SOS entry | service availability badge (real), "coming soon" flag | ➕ honesty labels |
| `ServiceComingSoonScreen`, `PlaceholderScreen` | generic stub art | — | ✂️ must not be reachable from production nav |
| `MyVehicles` / `AddVehicle` / `EditVehicle` | list, form, vehicle card, QR link | doc expiry indicator (insurance/PUC) | ➕ (product) |
| `MyQr` / `QRCodeScreen` / `QRCard` / `QRCodePlaceholder` | QR image, share action | one QR implementation | ✂️ four QR artefacts |
| `QRScanScreen`, `VehicleQrEmergencyScreen` | tap-to-scan, emergency actions | real camera scan → `/vehicles/:id/verify` | ⚠️ non-functional |
| Towing flow (9 screens) | picker map, vehicle chooser, rate card, schedule, review, advance payment, tracking, completion, rating | ETA (real), driver card with call/chat | ➕ ETA |
| Driver-hire flow (16 screens) | type chooser, calendar, location, review, payment, tracking | consolidation (several screens differ only by copy) | ✂️ overlaps |
| Roadside flow (5) | category, location, review, help-on-way | job detail/tracking view | ➕ endpoint missing |
| `BookingDetail` / `Bookings` | tabs, status chip, fare breakdown, rating CTA | cancel entry point unification | ✅ |
| `LiveTrackingScreen` | `LiveTripMap`, driver card, call button, status timeline | realtime source confirmed | ⚠️ unverified [X] |
| `Profile` family | personal info, payment methods, notifications, help, SOS | one profile entry (3 exist today) | ✂️ overlap |
| `ChoosePlan` | plan cards, billing toggle | payment path (stub) | ⚠️ |

## B. Partner app

| Screen | Components now | Should have | Verdict |
|--------|----------------|-------------|---------|
| `PartnerSplash` / `Welcome` / `RoleSelection` / `DriverAuthMode` | brand logo, role cards, art | same | ✅ |
| `PartnerLogin` / `PartnerOtpVerification` | phone input, OTP input (`PartnerOtpInput`), dev toast | same | ✅ (flag off by default) |
| `PartnerVendorDriverLogin` | login ID + password | "forgot login id?" help | ➕ |
| Driver registration (4) + `DriverVerificationPending` | stepper layout, document uploader, review summary, verification view | **real upload** for documents | ⚠️ PA-2 |
| Vendor registration (4) | wizard, address, doc uploader, review | bank/MSME/agreement (client spec) | ➕ |
| `PartnerHomeScreen` (1134) | vendor cards, KPIs, quick actions, verification card + **dead driver branches** | split by persona; keep vendor home only | ✂️ |
| `DriverDashboardScreen` (1445) | greeting, availability card + read-only state, earnings chart w/ period sheet, requests section, recent jobs, verification card, location-health card | map strip, next-job card | ✂️ chart is heavy here; ➕ map |
| `DriverJobsScreen` | filter tabs, job cards, accept/withdraw, empty/error states | same | ✅ |
| `DriverActiveJobScreen` (411) | step tracker, 4-digit OTP sheet, call/customer actions, completion + final earnings | **map + route**, ETA | ➕ |
| `DriverOfferAlert` | overlay with countdown, accept/decline, lock states | same | ✅ model component |
| `PartnerVerificationStatusScreen` (877) | vendor stepper, history, documents, support CTAs | share token/status components with the driver verification view | ✂️ duplicate design language |
| `VendorDrivers` / `VendorVehicles` / `VendorAssignJob` | lists, forms, assign sheet | fleet map, driver online/offline dots | ➕ |
| `PartnerAccount` / `PartnerDocuments` / `PartnerEditProfile` / `PartnerVehicleInfo` | profile rows, doc list, forms | reduce overlap with registration screens | ✂️ |

## C. Admin web

| Page | Components now | Should have | Verdict |
|------|----------------|-------------|---------|
| `LoginPage` | email/password form | lockout messaging, rate-limit awareness | ⚠️ SEC-1 |
| `Dashboard` | `MetricCard` grid, `dashboard-charts` (revenue/service/month) | KPI truth (single booking source), live counters | ⚠️ AD-2 |
| `Bookings` list + detail | `data-grid`/`data-table`, filters, status chips, assign vendor/driver modals | cancel action (endpoint exists), booking timeline, map | ➕ |
| `Customers` list + detail | list, filters, detail, status toggle, CSV export | wallet/transaction view, booking history from **new** collections | ➕ |
| `Vendors` list + detail (670) | profile, business, bank, documents (approve/reject), fleet drivers, vehicles, assign | **document preview**, fleet map, commission config | ➕ A1 |
| `Drivers` list/detail/available | list, filters, detail, docs approve/reject, availability board | **document preview**, live status, earnings | ➕ |
| `Financial` | transactions table, summary cards | refunds, payouts, commissions; currently stub-ledger data | ⚠️ |
| `Reports` | 3 chart cards + export | correct data source first | ⚠️ |
| `Subscriptions` | overview + plan list | create/edit/assign/cancel (endpoints exist) | ✂️/➕ |
| `Settings` (386) | many setting fields | keep only what backend consumes | ✂️ |
| `Notifications` | list, unread badge, mark read | push/broadcast composer | ➕ |
| `Profile` (262) | platform admin profile | minimal read-only view | ✂️ |
| `Admin users` | route only | hide until real admin auth exists | ✂️ |
| — | — | **Activity log page** (endpoint exists) | ➕ |
| — | — | **Live ops map** | ➕ |

## D. Cross-surface UX inconsistencies worth fixing

| # | Inconsistency | Where | Fix |
|---|---------------|-------|-----|
| 1 | Verification is told in **three different designs** (vendor stepper 877-line screen, new driver verification view, dashboard card) | partner app | one token set + two thin screens |
| 2 | Same job status is worded differently across surfaces (`In progress` / `DRIVER_EN_ROUTE` / `EN_ROUTE`) | all | single status→label map (one exists for driver bookings: `utils/driverBookingStatus.ts`) |
| 3 | Customer sees "Payment successful" while backend says stub | customer app | label payments as "demo mode" until real gateway |
| 4 | Admin shows a hardcoded service area when data is empty | admin | show `—` |
| 5 | Partner app has a measured design-token file (`theme/driverUi.ts`) but the customer app uses the legacy `theme/` ramp in places | both | align ramps before final polish pass |

## E. Quick-win shortlist (UI/UX, low risk)

1. Hide reachable "coming soon"/placeholder screens behind a build flag. *(S)*
2. Show `—` instead of hardcoded values in admin detail views. *(S)*
3. Delete or wire the 4 PIN/password screens. *(S)*
4. Add ETA + map strip to the driver active-job screen (data already flows). *(M)*
5. Add the admin activity-log page (endpoint ready). *(S)*
6. Make offer/verification/skeleton states shared components instead of per-screen copies. *(M)*
