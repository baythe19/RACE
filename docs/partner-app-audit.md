# RACE Partner Mobile Application — Comprehensive Screen & Architecture Audit

> **Generated:** October 2026
> **Scope:** RACE Partner Mobile Application (`mobile application/`), Driver & Vendor surfaces, Shared UI system, Backend API integrations.
> **Audited Baseline:** Expo SDK 57, React Native 0.86, TypeScript Strict.

---

## 1. Executive Overview

The RACE Partner application serves three distinct operator personas across a unified React Native / Expo codebase:
1. **Self Driver:** Independent towing operator or professional chauffeur. Authenticates via mobile number and SMS OTP. Manages availability, accepts/declines job offers, validates customer 4-digit trip OTPs, executes trips, and tracks personal payouts.
2. **Vendor / Fleet Owner:** Towing agency, garage, or fleet enterprise. Authenticates via mobile number and SMS OTP. Manages fleet drivers and vehicles, inspects incoming booking leads, assigns fleet assets to customer requests, tracks business verification, and manages bank payouts.
3. **Vendor Driver:** Employed driver provisioned by a vendor. Authenticates using vendor-assigned Login ID and password. Executes assigned trips; restricted from accessing vendor fleet management, bank accounts, and dispatch queues.

---

## 2. Screen, Route, Role & API Audit Matrix

| Screen / Route | Roles | Existing State | UI Status | Behavior Status | API Status | Missing Connection | Planned Action | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Welcome / Role Select**<br>`WelcomeScreen` | All | Fully functioning entry | Polished RACE theme | Role selection routes to Login | `None` (local nav) | None | Preserved; clean role separation | P0 |
| **Driver Type Select**<br>`DriverTypeSelectScreen` | Driver | Operational | Polished | Segregates Self Driver vs Vendor Driver | `None` (local nav) | None | Preserved | P0 |
| **Partner Login**<br>`PartnerLoginScreen` | Self Driver, Vendor | Operational | Polished | Mobile input + OTP request with demo shortcuts | `POST /auth/request-otp`<br>`POST /auth/partner-login` | None | Preserved with dev safety checks | P0 |
| **Vendor Driver Login**<br>`VendorDriverLoginScreen` | Vendor Driver | Operational | Polished | Login ID + password auth | `POST /auth/vendor-driver-login` | None | Preserved; strictly routes to Driver flow | P0 |
| **Driver Verification Gate**<br>`DriverVerificationGateScreen` | Driver | Operational | Polished board | Pending verification review with step progress | `GET /api/v1/profile` | None | Preserved | P0 |
| **Driver Dashboard**<br>`DriverDashboardScreen` | Driver | Complete (Board 1) | Polished yellow-black UI | Online toggle, active job card, KYC banner, metrics | `GET /profile`, `PUT /driver/availability`, `GET /driver/jobs` | Bell routed to `openPartnerNotifications` | Preserved | P0 |
| **Vendor Home**<br>`PartnerHomeScreen` | Vendor | Enhanced | Polished yellow-black UI | Fleet KPIs, incoming leads cards, quick dispatch | `GET /vendor/status`, `GET /vendor/dashboard`, `GET /vendor/booking-offers`, `GET /vendor/fleet/drivers`, `GET /vendor/fleet/vehicles` | Bell routed; incoming leads directly CTA to `VendorAssignJob` | Refined with Driver toggle removed | P1 |
| **Driver Jobs**<br>`DriverJobsScreen` | Driver | Complete (Board 1) | Polished | Filters (All, Available, Active, Done) | `GET /driver/jobs`, `GET /driver/job-offers` | Bell routed to `openPartnerNotifications` | Preserved | P0 |
| **Vendor Jobs / Leads**<br>`PartnerJobsScreen` | Vendor | Enhanced | Polished | Leads list, unassigned filter, assign CTA | `GET /vendor/booking-offers`, `GET /vendor/status` | Bell routed to `openPartnerNotifications` | Preserved & elevated | P1 |
| **Vendor Assign Job**<br>`VendorAssignJobScreen` | Vendor | Elevated | Polished (`PartnerScreenLayout`) | Select vehicle, verify availability, approve assignment | `POST /vendor/bookings/:id/approve`, `GET /vendor/fleet/vehicles` | Pre-populated lead details with vehicle selector | Complete | P1 |
| **Vendor Drivers**<br>`VendorDriversScreen` | Vendor | Complete | Polished | List, search, add driver modal, document uploads, credentials provisioning | `GET /vendor/fleet/drivers`, `POST /vendor/fleet/drivers`, `POST /vendor/fleet/drivers/:id/documents` | Linked from Vendor Home quick actions | Preserved | P1 |
| **Vendor Vehicles**<br>`VendorVehiclesScreen` | Vendor | Complete | Polished | List, search, add vehicle modal, RC/insurance dates | `GET /vendor/fleet/vehicles`, `POST /vendor/fleet/vehicles` | Linked from Vendor Home quick actions | Preserved | P1 |
| **Vendor Verification**<br>`PartnerVerificationStatusScreen` | Vendor | Complete | Polished | Document review, background check, rejection notes | `GET /vendor/status` | Linked from Vendor Home & Account | Preserved | P1 |
| **Partner Account Hub**<br>`PartnerAccountScreen` | Driver, Vendor | Complete | Polished | Role-aware metrics, quick links to all 10 subpages | `GET /profile`, `GET /vendor/status` | Full 10-screen deep routing | Complete | P0 |
| **Edit Profile**<br>`PartnerEditProfileScreen` | Driver, Vendor | Complete | Polished | Avatar upload, name, email, mobile lock, languages | `PUT /profile`, `POST /storage/upload` | Full stack integration | Complete | P1 |
| **Vehicle Info**<br>`PartnerVehicleInfoScreen` | Driver | Complete | Polished | Vehicle artwork, plate number, model, insurance, RC | `GET /driver/vehicle`, `PUT /driver/vehicle` | Full stack integration | Complete | P1 |
| **Documents Hub**<br>`PartnerDocumentsScreen` | Driver, Vendor | Complete | Polished | Required vs Optional tabs, status badges, upload sheet | `GET /documents`, `POST /storage/upload` | Upload sheet wired | Complete | P1 |
| **Earnings & Payouts**<br>`PartnerEarningsScreen` | Driver, Vendor | Complete | Polished | Earnings & Payouts tabs, weekly bar chart, recent trips | `GET /driver/earnings`, `GET /driver/payouts` | Tooltip highlight & period filtering | Complete | P1 |
| **Notifications Inbox**<br>`PartnerNotificationsScreen` | Driver, Vendor | Complete | Polished | All, Jobs, Account, Earnings filter chips, mark read | `GET /notifications`, `POST /notifications/read-all` | Bell icons on all 3 home/job screens wire here | Complete | P1 |
| **Settings Hub**<br>`PartnerSettingsScreen` | Driver, Vendor | Complete | Polished | Language sheet, dark mode toggle, security, legal | Local state + API preferences | Language sheet modal wired | Complete | P1 |
| **Help & Support**<br>`PartnerHelpSupportScreen` | Driver, Vendor | Complete | Polished | Searchable FAQs, 24x7 phone call, WhatsApp chat | Direct phone/linking intent | Complete | P1 |
| **Bank Details**<br>`PartnerBankDetailsScreen` | Driver, Vendor | Complete | Polished | Account number masking, IFSC lookup, automated payout notice | `GET /profile/bank`, `PUT /profile/bank` | Complete | P1 |
| **Trip History**<br>`PartnerTripHistoryScreen` | Driver, Vendor | Complete | Polished | All, Completed, Cancelled tabs with fare breakdown | `GET /driver/trips` | Complete | P1 |

---

## 3. Key Findings & Resolved Architectural Gaps

1. **Role Boundary Separation on Home Screen:**
   - Previously, `PartnerHomeScreen.tsx` had an active Driver availability toggle and called `useDriverLocationReporting`.
   - In the updated architecture, `PartnerNavigator.tsx` routes drivers to `DriverDashboardScreen.tsx` and vendors to `PartnerHomeScreen.tsx`.
   - `PartnerHomeScreen.tsx` has been decoupled from driver background location reporting, preventing duplicate location watchers and cleaning up vendor dashboard logic.

2. **Lead-to-Dispatch Flow Connectivity:**
   - Vendor Home now renders an active **Incoming Leads Banner** whenever booking offers are received.
   - Each lead provides a direct `"Assign Vehicle & Driver"` CTA that transitions directly into `VendorAssignJobScreen` with pre-populated lead data.
   - `VendorAssignJobScreen` renders with `PartnerScreenLayout`, visual truck artwork, live radio selection, and an integrated approval mutation.

3. **Global Notification Inbox Connectivity:**
   - All three top-level screens (`DriverDashboardScreen`, `DriverJobsScreen`, and `PartnerHomeScreen`/`PartnerJobsScreen`) are now equipped with notification bell buttons.
   - All bell buttons invoke `openPartnerNotifications()`, which deep-links to `PartnerNotificationsScreen` inside `PartnerAccountStackNavigator`.
