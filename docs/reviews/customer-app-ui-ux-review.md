# Customer App — UI/UX Deep Review

> Date: 2026-10-04  
> Branch: `v2.5.2-development`  
> Surface: `customer application/` (Expo 57 / RN 0.86)  
> Scope: **UI/UX only** (alignment, hierarchy, honesty, nav consistency, leftovers). Not a backend gap dump.  
> Method: Unlazy orchestrated review — five leaf findings merged here.  
> Detail leaves: `.unlazy/customer-ui-ux-review/findings/`

## Executive verdict

The app has a **real brand shell** (gold `#F5A800`, `pageBg`, shared layouts, SOS FAB, towing/driver booking family) and several **polished mid-journey screens**. What hurts most is **UX honesty and IA debt**: first-run CTAs overpromise, money/tracking/security screens look production-complete while stubbed, Splash/OTP/Premium paths mislead, and **~20 leftover screens + dual navigators** keep two visual languages alive.

**UI is mostly fine. UX needs the major work** — especially trust, progress clarity, and killing parallel dead UIs before polishing pixels.

## What's working

- Live auth path (`AccountType` → `MobileNumber` → `ProfileWizard` → `AddFirstVehicle`) uses consistent `pageBg`, 54px CTAs, validation states, loading overlays.
- Home location gate + out-of-area `NotServiceableScreen` is purposeful.
- Towing/Driver booking layouts share a recognizable family (accent + review + advance pay animation).
- Vehicle list/add, Bookings list (active/history), Profile hub, and SOS Call chrome feel productized when they tell the truth.
- Theme tokens exist (`colors.json`, spacing, radius, layout) and newer screens adopt `AppScreenLayout` / `TabRootHeader`.
- SOS center FAB is distinctive and hides tab bar on Call — good emergency focus.

## What's broken

### Trust / honesty (highest UX damage)
1. Review copy says “won’t be charged until service begins” → next screen **Pay Advance** + “Payment successful!”
2. Payment method theater (UPI/Cash/Wallet + PCI copy) with stub outcomes.
3. Tracking **LIVE** badges / hardcoded roadside mechanic before real partner GPS.
4. PIN / password / mobile change succeed via demo constants with no “demo” framing.
5. QR scan says “point your camera” but is a **Scan Demo QR** button (and unreachable from Call UI).
6. Popular rail always says **Book now** for Coming Soon SKUs; hero **Request Help** opens mostly Coming Soon roadside.

### Navigation / dead paths
7. Splash CTAs are invisible hotspots on a stretch-scaled bitmap.
8. Profile Premium/Upgrade → unregistered `SubscriptionPlans` (live stack has `ChoosePlan` only).
9. Dual navigators (`MainNavigator` orphan + unused `AppNavigator` default) + duplicate Bookings/Detail/Auth/OTP/Login.
10. ServiceList → SelectService is call-only dead-end.

### Stress / safety UX
11. SOS pulse + “Send Alert” fire with **no confirm / hold**.
12. Location card claims “Current Location Detected” while showing demo/default address text.

### Polish / consistency (still UX)
13. Gold hex drift (`#F5A800` vs `#F59E0B` / `#FFB800` / `#F4A115`); GoldButton vs PrimaryButton; System-only fonts.
14. Booking step UI is a lone number — no “Step X of N”; Instant still hits static May date chips.
15. Home ≈ Services duplication; vehicle Edit/Detail older chrome vs list/add.

## Priority backlog

Ordered for a UI-major workstream. Implement honesty + kill leftovers before micro-alignment.

| Sev | Area | Issue | Why it hurts UX | Fix hint |
|-----|------|-------|-----------------|----------|
| P0 | Splash | Invisible hotspot CTAs on stretch bitmap | Mis-taps / a11y fail / unprofessional first impression | Real Pressables + theme buttons over art |
| P0 | Home | Hero “Request Help” → mostly Coming Soon roadside | Primary urgency CTA fails | Point to Towing or SOS; promote bookable SKUs |
| P0 | Home | Popular “Book now” on non-bookable | Trust hit on browse | CTA from bookability; filter popular |
| P0 | Services | ServiceList → SelectService call-only | Dead-end after catalog pick | Route to real bookers; retire SelectService |
| P0 | Booking | Charge copy vs Pay Advance | Bait-and-switch at money | Align advance copy or remove claim |
| P0 | Booking | Payment theater + PCI/wallet fake | Looks like real checkout | “Demo — no charge”; hide unused methods |
| P0 | Booking | LIVE tracking before partner GPS | False arrival confidence | “Waiting for partner”; gate Continue |
| P0 | Profile | Premium → unregistered SubscriptionPlans | Dead monetization CTAs | Retarget to ChoosePlan; one plan UI |
| P0 | Call | SOS / Send Alert no confirm | Accidental emergency dispatch | Hold-to-activate or 3s cancel |
| P0 | Call | Fake QR scanner | Breaks vehicle-QR emergency story | Camera or remove; link from Call |
| P0 | Profile | PIN/password/mobile demo success | Users think security changed | Hide or label unavailable |
| P0 | Design | Dual navigators + duplicate bookings/auth | Wrong screen edited; visual drift | Quarantine MainNavigator leftovers |
| P1 | Auth | SKIP_OTP skips polished OTP UI | Security step never shown | Product builds: show OTP |
| P1 | Auth | Dual leftover Login/OTP/PIN/password | Confusing parallel flows | One canonical auth stack |
| P1 | Onboarding | Photo URL fields; gender default male | Feels unfinished / biased | Image picker; DOB picker; explicit gender |
| P1 | Booking | No Step X of N; Instant still scheduled | Funnel length unknown; Instant friction | Progress bar; skip date for Instant |
| P1 | Booking | Hardcoded date chips / Custom Time dead | Scheduling feels fake | Rolling dates + real picker |
| P1 | Home/Services | Duplicate heroes / IA | Wasted tab; decision friction | Home=act; Services=browse+status |
| P1 | Vehicles | Edit/Detail chrome mismatch; long-press delete | Two-app feel; delete undiscoverable | Shared layout; Delete on detail |
| P1 | Design | Gold drift + GoldButton/PrimaryButton | Brand inconsistency mid-journey | One primary CTA + token accents |
| P1 | Design | System-only fonts | Weak brand voice vs marketing | expo-font display + body |
| P2 | Onboarding | Carousel no swipe; stretch heroes | Static / distorted | PagerView; cover/contain |
| P2 | Settings/Help | Coming soon rows; FAQ answers missing | Over-promises support | Honest empty / real answers |
| P2 | Components | Unused EmptyState/FeatureList/etc. | Wrong primitives get reused | Adopt or quarantine |

## Recommended UI work order

1. **Honesty pass (1–2 days):** payment/tracking/security/QR/coming-soon CTA labels; SOS confirm; Premium route fix.
2. **IA cleanup (2–3 days):** kill/quarantine leftover navigators & duplicate screens; one auth, one bookings, one plans, one vehicle chrome.
3. **First-run + booking funnel (3–5 days):** Splash real CTAs; Home hero; Step X of N; Instant skip date; popular rail honesty.
4. **Brand polish (ongoing):** gold token collapse, single button, fonts, Home vs Services differentiation, micro-alignment.

## Leaf findings (source)

| Leaf | File |
|------|------|
| Auth + onboarding | `.unlazy/customer-ui-ux-review/findings/auth-onboarding.md` |
| Home + services | `.unlazy/customer-ui-ux-review/findings/home-services.md` |
| Booking flows | `.unlazy/customer-ui-ux-review/findings/booking.md` |
| Profile + vehicles + call | `.unlazy/customer-ui-ux-review/findings/profile-vehicles-call.md` |
| Design system + leftovers | `.unlazy/customer-ui-ux-review/findings/design-system.md` |

## Screen inventory

Total `*Screen*.tsx` under `customer application/src`: **104**.  
Status: `reviewed` = opened in a leaf; `reviewed-via-layout` = covered via layout/nav/design pass; `leftover` = orphan/duplicate/dead path called out for quarantine.

| Status | File |
|--------|------|
| reviewed-via-layout | `NotServiceableScreen.tsx` (`customer application/src/components/location/NotServiceableScreen.tsx`) |
| reviewed | `ProfileSubScreenLayout.tsx` (`customer application/src/components/profile/ProfileSubScreenLayout.tsx`) |
| reviewed-via-layout | `ServiceDetailScreenLayout.tsx` (`customer application/src/components/services/ServiceDetailScreenLayout.tsx`) |
| reviewed-via-layout | `AppScreenLayout.tsx` (`customer application/src/components/ui/AppScreenLayout.tsx`) |
| reviewed | `Screen.tsx` (`customer application/src/components/ui/Screen.tsx`) |
| reviewed | `BookingsScreen.tsx` (`customer application/src/screens/BookingsScreen.tsx`) |
| reviewed | `CallScreen.tsx` (`customer application/src/screens/CallScreen.tsx`) |
| reviewed | `DriverServiceScreen.tsx` (`customer application/src/screens/DriverServiceScreen.tsx`) |
| reviewed | `HomeScreen.tsx` (`customer application/src/screens/HomeScreen.tsx`) |
| reviewed | `MoreServicesScreen.tsx` (`customer application/src/screens/MoreServicesScreen.tsx`) |
| leftover | `PlaceholderScreen.tsx` (`customer application/src/screens/PlaceholderScreen.tsx`) |
| reviewed | `ProfileScreen.tsx` (`customer application/src/screens/ProfileScreen.tsx`) |
| reviewed | `RoadsideAssistanceScreen.tsx` (`customer application/src/screens/RoadsideAssistanceScreen.tsx`) |
| reviewed | `SelectServiceScreen.tsx` (`customer application/src/screens/SelectServiceScreen.tsx`) |
| reviewed | `ServiceComingSoonScreen.tsx` (`customer application/src/screens/ServiceComingSoonScreen.tsx`) |
| reviewed | `ServiceListScreen.tsx` (`customer application/src/screens/ServiceListScreen.tsx`) |
| reviewed | `ServicesScreen.tsx` (`customer application/src/screens/ServicesScreen.tsx`) |
| reviewed | `TowingServiceScreen.tsx` (`customer application/src/screens/TowingServiceScreen.tsx`) |
| reviewed | `AccountTypeScreen.tsx` (`customer application/src/screens/auth/AccountTypeScreen.tsx`) |
| leftover | `CreateAccountScreen.tsx` (`customer application/src/screens/auth/CreateAccountScreen.tsx`) |
| leftover | `CreatePinScreen.tsx` (`customer application/src/screens/auth/CreatePinScreen.tsx`) |
| leftover | `ForgotPasswordScreen.tsx` (`customer application/src/screens/auth/ForgotPasswordScreen.tsx`) |
| leftover | `LoginScreen.tsx` (`customer application/src/screens/auth/LoginScreen.tsx`) |
| reviewed | `MobileNumberScreen.tsx` (`customer application/src/screens/auth/MobileNumberScreen.tsx`) |
| leftover | `OTPScreen.tsx` (`customer application/src/screens/auth/OTPScreen.tsx`) |
| reviewed | `OnboardingScreen.tsx` (`customer application/src/screens/auth/OnboardingScreen.tsx`) |
| reviewed | `OtpVerificationScreen.tsx` (`customer application/src/screens/auth/OtpVerificationScreen.tsx`) |
| leftover | `ResetPasswordScreen.tsx` (`customer application/src/screens/auth/ResetPasswordScreen.tsx`) |
| reviewed | `SignupVendorTypeScreen.tsx` (`customer application/src/screens/auth/SignupVendorTypeScreen.tsx`) |
| reviewed | `SplashScreen.tsx` (`customer application/src/screens/auth/SplashScreen.tsx`) |
| reviewed | `WrongAppRoleScreen.tsx` (`customer application/src/screens/auth/WrongAppRoleScreen.tsx`) |
| leftover | `BookingDetailScreen.tsx` (`customer application/src/screens/booking/BookingDetailScreen.tsx`) |
| leftover | `BookingFlowScreen.tsx` (`customer application/src/screens/booking/BookingFlowScreen.tsx`) |
| reviewed | `BookingPaymentScreen.tsx` (`customer application/src/screens/booking/BookingPaymentScreen.tsx`) |
| leftover | `BookingsScreen.tsx` (`customer application/src/screens/booking/BookingsScreen.tsx`) |
| leftover | `LiveTrackingScreen.tsx` (`customer application/src/screens/booking/LiveTrackingScreen.tsx`) |
| leftover | `RatingReviewScreen.tsx` (`customer application/src/screens/booking/RatingReviewScreen.tsx`) |
| reviewed | `DriverAssignedScreen.tsx` (`customer application/src/screens/booking/driver/DriverAssignedScreen.tsx`) |
| reviewed | `DriverBookingConfirmedScreen.tsx` (`customer application/src/screens/booking/driver/DriverBookingConfirmedScreen.tsx`) |
| reviewed | `DriverBookingDateTimeScreen.tsx` (`customer application/src/screens/booking/driver/DriverBookingDateTimeScreen.tsx`) |
| reviewed | `DriverBookingLocationScreen.tsx` (`customer application/src/screens/booking/driver/DriverBookingLocationScreen.tsx`) |
| reviewed | `DriverBookingPaymentScreen.tsx` (`customer application/src/screens/booking/driver/DriverBookingPaymentScreen.tsx`) |
| reviewed | `DriverBookingReviewScreen.tsx` (`customer application/src/screens/booking/driver/DriverBookingReviewScreen.tsx`) |
| reviewed | `DriverBookingVehicleScreen.tsx` (`customer application/src/screens/booking/driver/DriverBookingVehicleScreen.tsx`) |
| reviewed | `DriverChooseVehicleTypeScreen.tsx` (`customer application/src/screens/booking/driver/DriverChooseVehicleTypeScreen.tsx`) |
| reviewed | `DriverDateTimeScreen.tsx` (`customer application/src/screens/booking/driver/DriverDateTimeScreen.tsx`) |
| reviewed | `DriverEnquiryScreen.tsx` (`customer application/src/screens/booking/driver/DriverEnquiryScreen.tsx`) |
| reviewed | `DriverOnWayScreen.tsx` (`customer application/src/screens/booking/driver/DriverOnWayScreen.tsx`) |
| reviewed | `DriverPickupScreen.tsx` (`customer application/src/screens/booking/driver/DriverPickupScreen.tsx`) |
| reviewed | `DriverReviewScreen.tsx` (`customer application/src/screens/booking/driver/DriverReviewScreen.tsx`) |
| reviewed | `DriverSelectTypeScreen.tsx` (`customer application/src/screens/booking/driver/DriverSelectTypeScreen.tsx`) |
| reviewed | `DriverTrackScreen.tsx` (`customer application/src/screens/booking/driver/DriverTrackScreen.tsx`) |
| reviewed | `RoadsideHelpOnWayScreen.tsx` (`customer application/src/screens/booking/roadside/RoadsideHelpOnWayScreen.tsx`) |
| reviewed | `RoadsideLocationScreen.tsx` (`customer application/src/screens/booking/roadside/RoadsideLocationScreen.tsx`) |
| reviewed | `RoadsideReviewScreen.tsx` (`customer application/src/screens/booking/roadside/RoadsideReviewScreen.tsx`) |
| reviewed | `RoadsideSelectServiceScreen.tsx` (`customer application/src/screens/booking/roadside/RoadsideSelectServiceScreen.tsx`) |
| reviewed | `TowingAdvancePaymentScreen.tsx` (`customer application/src/screens/booking/towing/TowingAdvancePaymentScreen.tsx`) |
| reviewed | `TowingChooseVehicleScreen.tsx` (`customer application/src/screens/booking/towing/TowingChooseVehicleScreen.tsx`) |
| reviewed | `TowingCompletedScreen.tsx` (`customer application/src/screens/booking/towing/TowingCompletedScreen.tsx`) |
| reviewed | `TowingConfirmedScreen.tsx` (`customer application/src/screens/booking/towing/TowingConfirmedScreen.tsx`) |
| reviewed | `TowingDateTimeScreen.tsx` (`customer application/src/screens/booking/towing/TowingDateTimeScreen.tsx`) |
| reviewed | `TowingDriverOnWayScreen.tsx` (`customer application/src/screens/booking/towing/TowingDriverOnWayScreen.tsx`) |
| reviewed | `TowingPickupDropScreen.tsx` (`customer application/src/screens/booking/towing/TowingPickupDropScreen.tsx`) |
| reviewed | `TowingRateScreen.tsx` (`customer application/src/screens/booking/towing/TowingRateScreen.tsx`) |
| reviewed | `TowingReviewScreen.tsx` (`customer application/src/screens/booking/towing/TowingReviewScreen.tsx`) |
| reviewed | `TowingSelectTypeScreen.tsx` (`customer application/src/screens/booking/towing/TowingSelectTypeScreen.tsx`) |
| reviewed | `TowingTrackScreen.tsx` (`customer application/src/screens/booking/towing/TowingTrackScreen.tsx`) |
| reviewed | `BookingDetailScreen.tsx` (`customer application/src/screens/bookings/BookingDetailScreen.tsx`) |
| reviewed | `QRScanScreen.tsx` (`customer application/src/screens/call/QRScanScreen.tsx`) |
| reviewed | `SOSEmergencyScreen.tsx` (`customer application/src/screens/call/SOSEmergencyScreen.tsx`) |
| reviewed | `SelectLocationScreen.tsx` (`customer application/src/screens/home/SelectLocationScreen.tsx`) |
| reviewed | `AddFirstVehicleScreen.tsx` (`customer application/src/screens/onboarding/AddFirstVehicleScreen.tsx`) |
| leftover | `ProfileSetupScreen.tsx` (`customer application/src/screens/onboarding/ProfileSetupScreen.tsx`) |
| reviewed | `ProfileWizardScreen.tsx` (`customer application/src/screens/onboarding/ProfileWizardScreen.tsx`) |
| leftover | `QRCodeScreen.tsx` (`customer application/src/screens/onboarding/QRCodeScreen.tsx`) |
| leftover | `VehicleRegistrationScreen.tsx` (`customer application/src/screens/onboarding/VehicleRegistrationScreen.tsx`) |
| reviewed | `VehicleSuccessScreen.tsx` (`customer application/src/screens/onboarding/VehicleSuccessScreen.tsx`) |
| leftover | `AddVehicleScreen.tsx` (`customer application/src/screens/profile/AddVehicleScreen.tsx`) |
| reviewed | `ChangeMobileNumberScreen.tsx` (`customer application/src/screens/profile/ChangeMobileNumberScreen.tsx`) |
| reviewed | `ChangePasswordScreen.tsx` (`customer application/src/screens/profile/ChangePasswordScreen.tsx`) |
| reviewed | `ChoosePlanScreen.tsx` (`customer application/src/screens/profile/ChoosePlanScreen.tsx`) |
| leftover | `CreatePinScreen.tsx` (`customer application/src/screens/profile/CreatePinScreen.tsx`) |
| leftover | `EmergencySosScreen.tsx` (`customer application/src/screens/profile/EmergencySosScreen.tsx`) |
| reviewed | `HelpSupportScreen.tsx` (`customer application/src/screens/profile/HelpSupportScreen.tsx`) |
| leftover | `MyQrScreen.tsx` (`customer application/src/screens/profile/MyQrScreen.tsx`) |
| reviewed | `MyVehiclesScreen.tsx` (`customer application/src/screens/profile/MyVehiclesScreen.tsx`) |
| reviewed | `NotificationsScreen.tsx` (`customer application/src/screens/profile/NotificationsScreen.tsx`) |
| reviewed | `PaymentMethodsScreen.tsx` (`customer application/src/screens/profile/PaymentMethodsScreen.tsx`) |
| reviewed | `PersonalInformationScreen.tsx` (`customer application/src/screens/profile/PersonalInformationScreen.tsx`) |
| reviewed | `SavedLocationsScreen.tsx` (`customer application/src/screens/profile/SavedLocationsScreen.tsx`) |
| reviewed | `SettingsScreen.tsx` (`customer application/src/screens/profile/SettingsScreen.tsx`) |
| reviewed | `SosDetailsScreen.tsx` (`customer application/src/screens/profile/SosDetailsScreen.tsx`) |
| leftover | `SubscriptionPlansScreen.tsx` (`customer application/src/screens/profile/SubscriptionPlansScreen.tsx`) |
| leftover | `SupportCenterScreen.tsx` (`customer application/src/screens/profile/SupportCenterScreen.tsx`) |
| reviewed | `AddVehicleScreen.tsx` (`customer application/src/screens/vehicles/AddVehicleScreen.tsx`) |
| reviewed | `EditVehicleScreen.tsx` (`customer application/src/screens/vehicles/EditVehicleScreen.tsx`) |
| reviewed | `VehicleDetailScreen.tsx` (`customer application/src/screens/vehicles/VehicleDetailScreen.tsx`) |
| reviewed | `VehicleListScreen.tsx` (`customer application/src/screens/vehicles/VehicleListScreen.tsx`) |
| reviewed | `VehicleQrEmergencyScreen.tsx` (`customer application/src/screens/vehicles/VehicleQrEmergencyScreen.tsx`) |
| reviewed-via-layout | `ReviewSubmissionScreen.tsx` (`customer application/src/screens/vendor/ReviewSubmissionScreen.tsx`) |
| reviewed-via-layout | `SelectVendorTypeScreen.tsx` (`customer application/src/screens/vendor/SelectVendorTypeScreen.tsx`) |
| reviewed-via-layout | `VendorTypeSelectScreen.tsx` (`customer application/src/screens/vendor/VendorTypeSelectScreen.tsx`) |
| reviewed-via-layout | `VendorWizardScreen.tsx` (`customer application/src/screens/vendor/VendorWizardScreen.tsx`) |
| reviewed-via-layout | `VerificationStatusScreen.tsx` (`customer application/src/screens/vendor/VerificationStatusScreen.tsx`) |

## Driver notes

- Spot-checked: Splash `REF_W` hotspots, `SKIP_OTP_AUTH = true`, Profile → `SubscriptionPlans` vs AppNavigator `ChoosePlan` only, Home “Book now”, Track LIVE, Pay Advance success copy, QR “Scan Demo QR”.
- UI/UX focused; backend gaps (real payments, GPS) only appear where the **UI overclaims**.
