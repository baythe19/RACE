# RACE Service — Client User-Flow Guide

> **Happy-path journeys, step by step, for each audience.**

These flows trace through the **release4Aug2026** codebase. Each flow names the screens, the API calls, and what the user sees.

---

## Flow 1 — Customer books a towing service (mobile)

| # | User Action | Screen / API | What happens |
|---|---|---|---|
| 1 | Opens app | `SplashScreen` → `HomeScreen` | Auto-detects session; if not logged in, redirects to login |
| 2 | First time | Login → `LoginScreen` → `OtpPage` | Enters phone → `POST /api/v1/auth/send-otp` → backend creates `{mobileNumber, role:"customer", isVerified:false}` if new user, sends OTP via Twilio |
| 3 | Enters OTP | `OtpPage` → `verify-otp` | `POST /api/v1/auth/verify-otp` → JWT issued, `onboardingRequired:true` |
| 4 | Completes profile | `ProfileSetupPage` → `VehicleRegistrationPage` | `PUT /api/v1/profile/complete` + `POST /api/v1/vehicles` |
| 5 | Goes back home | `HomeScreen` | Sees service categories |
| 6 | Taps "Towing" | `TowingServiceScreen` → `CreateBookingPage` (or booking flow) | Vehicle pre-selected if only one registered |
| 7 | Picks pickup, drop, notes | `CreateBookingPage` | Form validation client-side + Zod server-side |
| 8 | Reviews fare | `CreateBookingPage` | `GET /api/v1/fare/towing` with pickup+drop → fare preview rendered |
| 9 | Confirms booking | `CreateBookingPage` | `POST /api/v1/bookings/towing` → backend pushes to driver dispatch queue |
| 10 | Sees active booking | `BookingsPage` / detail | Status timeline + assigned driver info |
| 11 | Tracks driver live | Booking detail + map | Socket.IO emits driver location → map polyline updates |
| 12 | Service completes | Driver marks status complete | Status timeline advances |
| 13 | Rates service | Rating modal | `POST /api/v1/bookings/towing/:id/rating` |

**Variations**:
- **Returning user**: Skip onboarding (step 3 sets `onboardingRequired:false` if `isProfileCompleted:true`)
- **Cancellation**: `POST /api/v1/bookings/towing/:id/cancel` after `GET .../cancel-preview` shows fee
- **Advance / final payment**: `POST /api/v1/payments/advance` then `/verify` (currently stubbed — no real gateway)

---

## Flow 2 — Customer triggers SOS from anywhere

| # | User Action | Screen / API | What happens |
|---|---|---|---|
| 1 | Long-press SOS button | `EmergencySosScreen` (Profile tab) | One-tap activation |
| 2 | App captures location | `react-native-geolocation` | Lat/lng + accuracy |
| 3 | App fetches SOS config | `GET /api/v1/sos/config` (cached) | Returns emergency numbers + escalation actions per region |
| 4 | App fetches SOS context | `GET /api/v1/sos/context` | Includes active booking, vehicle, address, prior alerts |
| 5 | User confirms "Send SOS" | `EmergencySosScreen` | `POST /api/v1/sos/alert` with `{ location, context }` |
| 6 | App shows confirmation | `SosDetailsScreen` | Shows what was sent + next steps |
| 8 | Admin / support sees alert | Admin live feed (Socket.IO) | Operator calls back / dispatches help |

> **QR-triggered SOS**: customer app `QRScanScreen` can scan a vehicle QR and attach a scanned-by context.

---

## Flow 3 — New driver joins the platform (partner mobile)

| # | User Action | Screen / API | What happens |
|---|---|---|---|
| 1 | Downloads app, opens | `PartnerSplashScreen` → `PartnerWelcomeScreen` | |
| 2 | Selects role: "Driver" | `PartnerRoleSelectionScreen` | |
| 3 | Enters phone | `PartnerDriverAuthModeScreen` → `PartnerOtpVerificationScreen` | `POST /api/v1/auth/send-otp` |
| 4 | Enters OTP | same | `POST /api/v1/auth/verify-otp` → user record created with `role:"driver"` |
| 5 | Personal info | `DriverPersonalInfoScreen` | Name, DOB, emergency contact, experience, availability |
| 6 | Vehicle info | `DriverVehicleInfoScreen` | If driver owns a vehicle: make/model/year/registration |
| 7 | Documents | `DriverDocumentsScreen` | Uploads Aadhaar, PAN, driving license, selfie, police verification (each → GCS presigned URL) |
| 8 | Reviews and submits | `DriverReviewScreen` → submit | `POST /api/v1/profile/complete` (driver-flavoured) |
| 9 | Lands on verification status | `PartnerVerificationStatusScreen` | Status: pending |
| 10 | Admin verifies | Admin app → driver detail → approve | DB updated, driver can now go online |
| 11 | Driver goes online | (future) | `PATCH /api/v1/driver/availability` toggles ready-for-jobs |

> **Vendor variant**: vendor flow is similar but covers business info + GST/PAN + fleet management instead of vehicle info.

---

## Flow 4 — Vendor manages a fleet (partner mobile)

| # | User Action | Screen / API | What happens |
|---|---|---|---|
| 1 | Vendor logs in | `PartnerLoginScreen` → OTP | Same as Flow 3 |
| 2 | Lands on Partner Home | `PartnerHomeScreen` | Today's earnings, pending jobs |
| 3 | Adds a driver to the fleet | `VendorDriversScreen` → Add | Creates a `Driver` record owned by this vendor |
| 4 | Adds a vehicle to the fleet | `VendorVehiclesScreen` → Add | Creates a `VendorVehicle` record |
| 5 | Receives a job | `PartnerJobsScreen` shows incoming job | Backend assigned via dispatch logic |
| 6 | Assigns to a driver | `VendorAssignJobScreen` | Vendor selects a driver; booking linked to driver |
| 7 | Driver sees in their app | `PartnerJobsScreen` (in driver account) | Status: assigned |
| 8 | Driver picks up + completes | Active job → status updates | Socket.IO to vendor + admin |

---

## Flow 5 — Admin reviews and assigns a booking

| # | User Action | Screen / API | What happens |
|---|---|---|---|
| 1 | Admin logs in | `LoginPage` (race-admin) | Different JWT (admin role) |
| 2 | Sees live bookings | `DashboardPage` + `BookingsPage` | Live feed via Socket.IO |
| 3 | Filters to unassigned | `BookingsPage` filter | |
| 4 | Opens booking detail | `BookingDetailPage` | Full timeline, customer, vehicle, addresses |
| 5 | Checks available drivers | "Assign driver" modal | `GET /api/v1/admin/drivers/available` returns drivers currently online near pickup |
| 6 | Assigns driver | Modal confirm | `PATCH /api/v1/admin/bookings/:id/assign-driver` |
| 7 | Driver + customer notified | Push + Socket.IO | Both apps update in real time |

> **Cancellation path**: `POST /api/v1/admin/bookings/:id/cancel` if admin needs to force-cancel (fraud, vehicle not at pickup, etc.).

---

## Flow 6 — Subscription purchase (customer)

| # | User Action | Screen / API | What happens |
|---|---|---|---|
| 1 | Opens Profile → Subscriptions | `SubscriptionPlansScreen` | |
| 2 | Sees plans | `GET /api/v1/subscriptions/plans` (public) | Plans for towing / driver categories |
| 3 | Picks a plan | ChoosePlanScreen | Plan details, billing cycle, perks |
| 4 | Confirms | Subscription checkout | `POST /api/v1/subscriptions` with `planId` + `audience:"customer"` |
| 6 | Subscription active | `SubscriptionPlansScreen` | Shows active plan, renewal date |
| 7 | Cancellation | "Cancel" button | `POST /api/v1/subscriptions/cancel` — status moves to `cancelled`, expiry honoured |

> **Vendor subscriptions**: vendor-side plans work the same way but with `audience:"vendor"` and different plan slugs (`partner` category).

---

## Flow 7 — On-the-day roadside help (battery / tyre / fuel)

| # | User Action | Screen / API | What happens |
|---|---|---|---|
| 1 | From Home → "Roadside Assistance" | `RoadsideAssistanceScreen` | |
| 2 | Picks sub-category (battery / tyre / fuel / lockout) | Same screen | |
| 3 | App checks if nearby | `GET /api/v1/bookings/roadside/availability` | Returns ETA + partner availability |
| 4 | Confirms | `POST /api/v1/bookings/roadside` | Creates a service-specific booking |
| 5 | Same lifecycle as towing | (status / tracking / payment / rate) | |

---

## Cross-cutting UX notes

- **All authenticated screens** check JWT expiry on focus; expired token → silent refresh via `refresh-token`; refresh failure → force logout to `LoginPage`.
- **Offline mode** is not yet implemented in the mobile apps. They require a live connection to the backend (Tailwind/MongoDB+Redis cluster).
- **Push notifications** use Expo's notification service. Backend sends via Expo push token stored on the user record at registration.
- **Errors** are uniform: `{success:false, message:"..."}` from backend; the frontend renders a toast / inline error.
- **Cancellation policy** is a single shared config (admin-managed) applied across all booking types — preview shown before the user confirms cancel.

---

## What's intentionally NOT in scope for `release4Aug2026`

- ❌ Real payment gateway wiring (Razorpay / Stripe) — payment routes are stubs
- ❌ Multi-language / i18n — strings are English-only
- ❌ Automated tests — `__tests__` folder exists but is empty; coverage relies on Postman + manual QA
- ❌ Production hardening — rate limiting is global; per-endpoint limits are not configured
- ❌ Customer app push token registration endpoint is not exposed in API.md (verify with backend before integrating)
- ❌ Vendor-side sub-admin permissions — vendor can manage their own fleet but cannot invite other vendors

These gaps are tracked but not yet actioned. See `docs/client/CLIENT_OVERVIEW.md` for a high-level summary.
