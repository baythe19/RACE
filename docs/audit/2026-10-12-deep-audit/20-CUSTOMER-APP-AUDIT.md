# 20 — Customer App Audit (`customer application/`)

**Stack:** Expo 57 / RN 0.86 / Redux + React Query · 337 source files · ~90 screens · port 8081
**Verdict:** the most complete of the three surfaces, and the only one with a realtime client. The problems are **dead UI (PIN/password/QR scan)** and **stub money**.

---

## 1. What exists [V]

| Group | Screens |
|-------|---------|
| Auth (15) | `Splash`, `Onboarding`, `MobileNumber`, `OTP`, `OtpVerification`, `AccountType`, `CreateAccount`, `CreatePin`, `Login`, `ForgotPassword`, `ResetPassword`, `ChangePassword`, `ChangeMobileNumber`, `SignupVendorType`, `WrongAppRole` |
| Home / discovery | `Home`, `Services`, `ServiceList`, `MoreServices`, `SelectService`, `Placeholder`, `ServiceComingSoon`, `Call` |
| Profile (13) | `Profile`, `PersonalInformation`, `ProfileSetup`, `ProfileWizard`, `MyVehicles`, `AddVehicle`, `EditVehicle`, `PaymentMethods`, `Notifications`, `MyQr`, `PersonalInformation`, `HelpSupport`, `EmergencySos` |
| Booking — towing (12) | `TowingPickupDrop`, `TowingChooseVehicle`, `TowingRate`, `TowingDateTime`, `TowingReview`, `TowingAdvancePayment`, `TowingConfirmed`, `TowingDriverOnWay`, `TowingCompleted`, + detail/payment/rating |
| Booking — driver (16) | `DriverSelectType`, `DriverChooseVehicleType`, `DriverPickup`, `DriverDateTime`, `DriverBookingLocation`, `DriverBookingVehicle`, `DriverBookingDateTime`, `DriverBookingReview`, `DriverBookingPayment`, `DriverBookingConfirmed`, `DriverAssigned`, `DriverOnWay`, `DriverTrack`, `DriverEnquiry` |
| Booking — roadside (5) | `RoadsideAssistance`, `RoadsideSelectService`, `RoadsideLocation`, `RoadsideReview`, `RoadsideHelpOnWay` |
| Shared booking | `BookingFlow`, `BookingDetail`, `Bookings`, `BookingPayment`, `LiveTracking`, `RatingReview` |
| QR / emergency | `MyQr`, `QRCodeScreen`, `QRScanScreen`, `VehicleQrEmergencyScreen`, `components/qr/QRCard` |
| Subscriptions | `ChoosePlan` (+ plan list) |

Navigation is a real graph (60+ registered routes) with a main tab (Home / Bookings / Call / Profile) **[V]**.

## 2. Wiring reality [V]

| Flow | Backend wired? | Notes |
|------|---------------|-------|
| Phone OTP login | ✅ real | `send-otp`, `verify-otp`, refresh rotation; `EXPO_PUBLIC_SKIP_OTP_AUTH` defaults **false** (real OTP) |
| Profile + wizard | ✅ real | `/profile`, `/profile/complete` |
| Vehicles + QR image | ✅ real | `/vehicles` CRUD; `/vehicles/:id/verify` |
| Towing booking end-to-end | ✅ real | create → tracking → cancel-preview → cancel → rating |
| Driver-hire booking | ✅ real | same pattern |
| Roadside | ⚠️ partial | create + availability only; **no detail/tracking endpoint exists**, so a roadside job can only be seen in the combined bookings list |
| Live tracking | ⚠️ unverified | `services/socketService.ts` (only client with socket.io-client) + `/tracking` REST fallback; behaviour on device **[X]** |
| Payments (advance/final) | ❌ stub | UI is complete, gateway returns `stub_*` |
| Subscriptions | ⚠️ half | plans + subscribe + cancel are wired; **payment for a plan is the same stub**, and the linked "corporate/employee plan for vendors" side does not exist |
| SOS | ⚠️ half | config/context/alert wired; backend only logs — no call/SMS dispatch |
| QR scan | ❌ dead | see §3 |
| PIN / password screens | ❌ dead | see §3 |

## 2b. Backend touchpoints (backend ⇄ this app) [V]

| This app's area | Endpoint group | Backend route file | Service / logic | Collection(s) |
|-----------------|----------------|--------------------|-----------------|---------------|
| Login/OTP | `/api/v1/auth/*` | `controller/src/authRoutes.ts` | `services/src/auth.ts` + `services/src/otp.ts` (+ `utils/src/sms.ts` MessageCentral) | `users`, `otplogs` |
| Profile & wizard | `/api/v1/profile*` | `controller/src/profileRoutes.ts` | `services/src/profile.ts` | `users` (`driverProfile` exposed for drivers) |
| Vehicles + QR verify | `/api/v1/vehicles*` | `controller/src/vehicleRoutes.ts` | vehicle service + `utils/src/qrCode.ts` | `vehicles`, `vehicleqrcodes` |
| Towing booking | `/api/v1/bookings/towing*` | `controller/src/towingBookingRoutes.ts` | `services/src/bookings/*` | `towingbookings` |
| Driver-hire booking | `/api/v1/bookings/driver*` | `controller/src/driverBookingRoutes.ts` | `services/src/bookings/*` | `driverbookings` |
| Roadside | `/api/v1/bookings/roadside*` | `controller/src/roadsideBookingRoutes.ts` | roadside booking service | booking collections |
| Combined history | `GET /api/v1/bookings` | `controller/src/bookingRoutes.ts` | `services/src/combinedBooking.ts` | all booking collections |
| Fare preview | `/api/v1/fare/*` | `controller/src/fareRoutes.ts` | `services/src/fare.ts` + `services/src/googleMaps.ts` | — (external Google) |
| Payments (stub) | `/api/v1/payments/*` | `controller/src/bookingPaymentRoutes.ts` | `services/src/bookingPayment.ts` (**stub gateway**) | `paymenttransactions` |
| Subscriptions | `/api/v1/subscriptions*` | `controller/src/subscriptionRoutes.ts` | subscription service | `subscriptionplans`, `usersubscriptions` |
| Saved locations / methods / notifications / wallet | `/api/v1/profile/{locations,payment-methods,notifications,wallet}` | `locationRoutes.ts`, `paymentRoutes.ts`, `notificationRoutes.ts`, `index.ts` (wallet inline) | profile-adjacent services | `savedlocations`, `paymentmethods`, `notifications`, `wallets` |
| SOS | `/api/v1/sos/*` | `controller/src/sosRoutes.ts` | SOS service (**logs only**, no dispatch) | `activitylogs`/notifications |
| Self-driver onboarding | `/api/v1/driver/*` | `controller/src/driverRoutes.ts` | `services/src/driverSelf.ts` + `services/src/driver.ts` | `users.driverProfile` |

**Frontend-only, no backend counterpart:** PIN/password screens, QR scan, SOS dispatch, plan payment.

## 3. Findings specific to this app

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| CA-1 | 🔴 High | **QR "scan" cannot work.** No camera library is installed (`expo-camera`, `expo-barcode-scanner`, vision-camera absent from `package.json`) and no `CameraView`/`BarCodeScanner` exists anywhere in `src`. `screens/call/QRScanScreen.tsx` therefore fakes the scan. The whole emergency-QR product (5 screens + QRCard + placeholder) is decorative | `customer application/package.json`; grep for camera APIs → only `ImagePicker.requestCameraPermissionsAsync` in `DocumentUpload.tsx:80` |
| CA-2 | 🟠 Medium | **PIN/password screens are local-only.** `CreatePinScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`, `ChangePasswordScreen` contain **no API calls**, and the backend exposes **no** customer pin/password route (only admin password routes). Any PIN set is stored on-device or nowhere | grep for `api.`/`API_ENDPOINTS` in those files → zero hits; `authRoutes.ts` has only OTP/driver-login/refresh |
| CA-3 | 🟠 Medium | Two "coming soon" routes are registered (`ServiceComingSoonScreen` at 2 places) — acceptable as a product stub, but they must not appear in store screenshots as working services | `AppNavigator.tsx:371, 429` |
| CA-4 | 🟡 Low | `QRCodePlaceholder.tsx` remains in `components/auth` alongside the real QR card — duplicate concept | file inventory |
| CA-5 | 🟡 Low | Customer app also implements driver onboarding (`/driver/register`, availability, location) — good reuse, but it means a **customer account can create a driver record**, which the driver approval gate then has to catch | `serviceBookingApi.ts` + driver endpoints in `config/api.ts` |

## 4. UI/UX assessment

**Good [V]:**
- Consistent booking flow shape across three services (select → schedule → review → pay → track → rate).
- Loading/empty/error states exist in the booking lists (skeletons + retry).
- Location picker with map + saved locations (4 call sites) is a real, reusable component.
- SOS entry point present at the tab level ("Call") — appropriate primacy for a roadside product.

**Weak [V/O]:**
- Payment screens promise gateway behaviour (cards, UPI copy, success animation) that the backend does not perform → **trust risk** if shown to a client on a real device.
- QR emergency screen promises "scan to call owner / notify contacts / request towing" — none of it can execute (CA-1).
- `Placeholder`/`ServiceComingSoon` screens still reachable from the service grid; they read as incomplete product rather than "coming soon".
- Overlap: `OTP` + `OtpVerification` (two OTP screens), `ProfileSetup` + `ProfileWizard` + `PersonalInformation` (three profile surfaces), `MyQr` + `QRCodeScreen` + `QRCard` — consolidation candidates.

## 5. Scores

| Area | Weight | Score |
|------|-------:|------:|
| Screen/flow coverage vs product spec | 20% | 8/10 |
| API wiring completeness | 20% | 7/10 |
| Real-vs-fake honesty (QR, PIN, payments) | 20% | 3/10 |
| Realtime / tracking | 15% | 6/10 |
| UI/UX quality & consistency | 15% | 7/10 |
| Error/empty/loading states | 10% | 7/10 |
| **Weighted** | 100% | **6.3/10** |

### Two-level view

| Capability | If DONE | If NOT done | Today |
|-----------|--------:|------------:|-------|
| Real OTP login | 10 | 0 | **9** — done (flag off by default) |
| Booking flows wired to real API | 10 | 2 | **8** |
| Real payment | 10 | 0 | **1** |
| Working camera QR scan | 10 | 3 | **1** |
| No dead auth UI (PIN/password) | 10 | 5 | **3** |
| Live tracking verified on device | 10 | 4 | **6** (unverified) |

## 6. Proposals (not applied)

| # | Proposal | Effort |
|---|----------|--------|
| C1 | Either implement PIN properly (endpoint + hash) or remove the PIN/password screens for launch | S (remove) / M (implement) |
| C2 | Install `expo-camera`, implement QRScan → `GET /vehicles/:id/verify` + SOS actions, or hide the entry point | M |
| C3 | Add a roadside detail/tracking endpoint or reuse towing tracking | S–M |
| C4 | Consolidate duplicate OTP/profile/QR screens | M |
| C5 | Label or gate "coming soon" services behind a flag so previews are honest | S |
