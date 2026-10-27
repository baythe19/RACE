# RACE System — Audit, Key Findings & Test Cases Reference

> **Generated:** 2026-10-01  
> **Branch:** `v2.0.1-cleanup`  
> **Environment:** Local Codespace (Docker MongoDB 7, Redis In-Memory Fallback, Express 5 API, Vite Admin Panel, Expo SDK 54 Metro)

---

## 1. Executive Summary & Health Status

| Service | Port | Local Endpoint | Codespace / External Endpoint | Status | Notes |
|---|---|---|---|---|---|
| **MongoDB** | `27017` | `mongodb://127.0.0.1:27017/race` | Container: `race-mongo` (mongo:7) | **Online** | 22 collections initialized and indexed |
| **Backend API** | `3000` | `http://localhost:3000` | `https://miniature-couscous-q74pr6jv56pf4pwj-3000.app.github.dev` | **Online** | `GET /health` -> 200 OK |
| **Admin Web** | `3001` | `http://localhost:3001` | `https://miniature-couscous-q74pr6jv56pf4pwj-3001.app.github.dev` | **Online** | Vite dev server with `/api` reverse proxy |
| **Customer App** | `8081` | `http://localhost:8081` | `exp://10.0.13.69:8081` | **Online** | Expo Metro bundler ready for Expo Go |
| **Partner App** | `8082` | `http://localhost:8082` | `exp://10.0.13.69:8082` | **Online** | Expo Metro bundler ready for Expo Go |

---

## 2. Key Findings & Architectural Discrepancies

### Finding 1: Dual Booking Model Discrepancy
* **Issue:** The backend maintains two separate sets of booking collections:
  - Mobile apps create and track bookings in **`towingbookings`** (`TowingBookingModel`) and **`driverbookings`** (`DriverBookingModel`).
  - Legacy admin reports and the root booking collection query **`bookings`** (`BookingModel`).
* **Symptom:** When a customer creates a towing booking, it increments `towingbookings`, but the legacy admin bookings/reports list shows 0 bookings.
* **Fix required:** Unify booking models so that admin queries aggregate across `towingbookings`, `driverbookings`, and `roadsidebookings`, or consolidate into a single polymorphic collection.

### Finding 2: Payment Gateway is 100% Mock / Stub
* **Issue:** Endpoints `/api/v1/payments/advance` and `/verify` return synthetic payment transaction objects (`stub_adv_...`) and automatically flag transactions as `COMPLETED`.
* **Symptom:** No real money flows through the system; no Razorpay, Cashfree, or Stripe SDK is integrated.
* **Fix required:** Implement a real payment gateway webhook and SDK integration before public rollout.

### Finding 3: OTP Dev-Bypass vs Production Twilio
* **Issue:** In `customer application/src/screens/auth/MobileNumberScreen.tsx` and partner login, `SKIP_OTP_AUTH = true` is hardcoded.
* **Symptom:** In development mode (`NODE_ENV=development`), the backend emits `devOtp` in the JSON response, enabling auto-login without SMS. On production with live phone numbers, a paid Twilio account or Indian SMS gateway (DLT-registered) is required.
* **Fix required:** Toggle `SKIP_OTP_AUTH = false` and verify SMS delivery via DLT SMS provider.

### Finding 4: Driver Document Upload & KYC Gaps
* **Issue:** Partner mobile app displays file pickers for Aadhaar, Driving License, and Police Verification. However, during driver registration, document payloads are often not persisted or omit cloud storage presigned URLs.
* **Symptom:** Driver is created with basic personal details, but documents array remains empty or unlinked.
* **Fix required:** Ensure `uploadVendorDriverDocument` streams files to Google Cloud Storage or local `/uploads` directory.

### Finding 5: Vehicle QR Code Scanner Simulation
* **Issue:** On the customer mobile app, scanning a vehicle QR code is a button trigger rather than opening the device camera.
* **Symptom:** Real vehicle QR stickers cannot be scanned in the field.
* **Fix required:** Wire `expo-camera` or `expo-barcode-scanner` into `QRScanScreen`.

### Finding 6: Socket.IO Live Tracking Scaffold
* **Issue:** Socket.IO rooms exist (`join_booking`, `location_update`), but partner apps do not continuously stream background GPS coordinates.
* **Symptom:** Tracking screens show static pickup-dropoff polylines without animated driver icons.
* **Fix required:** Implement `expo-location` background location task on partner mobile.

---

## 3. Database Collection Inventory (MongoDB)

Live inspection of `mongodb://127.0.0.1:27017/race` after platform seeding and test suite execution:

| Collection Name | Document Count | Purpose |
|---|:---:|---|
| `users` | 22 | Unified accounts (Platform Admin, Customers, Vendors, Drivers) |
| `vehicles` | 1 | Customer vehicles (Car, Bike, EV, etc.) |
| `vehicleqrcodes` | 1 | Base64 QR code representations for saved vehicles |
| `towingbookings` | 1 | Towing service requests (Instant, Scheduled, Emergency) |
| `driverbookings` | 1 | On-demand personal driver hire requests |
| `bookings` | 0 | Legacy general booking model |
| `paymenttransactions` | 1 | Advance and final payment transaction logs |
| `transactions` | 0 | Legacy financial ledger collection |
| `subscriptionplans` | 8 | Pre-seeded subscription tiers (Basic, Premium, Family, Partner) |
| `services` | 19 | Service catalog items (Towing, Roadside, Jumpstart, Tyre, Fuel) |
| `brands` | 1 | Platform brand identity config & theme colors |
| `notifications` | 10 | In-app notification messages |
| `activitylogs` | 17 | Platform audit log entries |
| `otplogs` | 11 | SMS OTP verification history |
| `platformsettings` | 1 | Platform commission rate (12.5%), booking radius (50km) |
| `wallets` | 0 | Customer virtual wallet records |
| `paymentmethods` | 0 | Saved UPI IDs and cards |
| `savedlocations` | 0 | Favorite customer addresses |

---

## 4. Comprehensive Test Cases & Verification Matrix

Automated script: `backend/src/scripts/comprehensive-audit.ts` (Run via `npx tsx src/scripts/comprehensive-audit.ts`).

### Suite 1: Database & Platform Setup
| ID | Test Case | Method / Target | Expected Result | Verified Result | Status |
|---|---|---|---|---|:---:|
| **TC-DB-01** | MongoDB Connection | `mongodb://127.0.0.1:27017/race` | Successful Mongoose connection | Connected, db name: `race` | ✅ PASS |
| **TC-DB-02** | Collections & Indexes | Database collection check | All 22 required collections exist | Indexes ensured across 12 models | ✅ PASS |

### Suite 2: Admin Panel & Backoffice API
| ID | Test Case | Endpoint | Request Payload / Params | Expected Result | Status |
|---|---|---|---|---|:---:|
| **TC-ADM-01** | Admin Authentication | `POST /api/v1/admin/auth/login` | `{ identifier: "admin@raceservice.com", password: "Admin@123" }` | 200 OK + JWT access token + 22 permissions | ✅ PASS |
| **TC-ADM-02** | Dashboard KPI Overview | `GET /api/v1/admin/dashboard` | Header: `Bearer <admin_token>` | 200 OK + metrics, charts, and activity feed | ✅ PASS |
| **TC-ADM-03** | Customers Directory | `GET /api/v1/admin/customers` | Header: `Bearer <admin_token>` | 200 OK + paginated customer list | ✅ PASS |
| **TC-ADM-04** | Vendors Directory | `GET /api/v1/admin/vendors` | Header: `Bearer <admin_token>` | 200 OK + 5 seeded vendor records | ✅ PASS |
| **TC-ADM-05** | Drivers Directory | `GET /api/v1/admin/drivers` | Header: `Bearer <admin_token>` | 200 OK + 10 seeded driver records | ✅ PASS |
| **TC-ADM-06** | Available Online Drivers | `GET /api/v1/admin/drivers/available` | Header: `Bearer <admin_token>` | 200 OK + list of drivers currently marked `isAvailable: true` | ✅ PASS |
| **TC-ADM-07** | Bookings Management | `GET /api/v1/admin/bookings` | Header: `Bearer <admin_token>` | 200 OK + booking management list | ✅ PASS |
| **TC-ADM-08** | Financial Transactions | `GET /api/v1/admin/transactions` | Header: `Bearer <admin_token>` | 200 OK + transaction ledger entries | ✅ PASS |
| **TC-ADM-09** | Financial Summary | `GET /api/v1/admin/transactions/summary`| Header: `Bearer <admin_token>` | 200 OK + revenue, payout, and fee totals | ✅ PASS |
| **TC-ADM-10** | Platform Settings | `GET /api/v1/admin/settings` | Header: `Bearer <admin_token>` | 200 OK + commission rate (12.5%), radius | ✅ PASS |
| **TC-ADM-11** | Subscriptions Overview | `GET /api/v1/admin/subscriptions/overview`| Header: `Bearer <admin_token>` | 200 OK + subscription metrics | ✅ PASS |
| **TC-ADM-12** | Subscription Plans | `GET /api/v1/admin/subscriptions/plans` | Header: `Bearer <admin_token>` | 200 OK + 8 seeded plans | ✅ PASS |

### Suite 3: Customer Mobile API Flows
| ID | Test Case | Endpoint | Request Payload / Params | Expected Result | Status |
|---|---|---|---|---|:---:|
| **TC-CUST-01**| Customer OTP Dispatch | `POST /api/v1/auth/send-otp` | `{ mobileNumber: "9876543299", role: "customer" }` | 200 OK + `devOtp` returned in payload | ✅ PASS |
| **TC-CUST-02**| Customer OTP Verify | `POST /api/v1/auth/verify-otp` | `{ mobileNumber: "9876543299", otp: "<devOtp>", role: "customer" }`| 200 OK + JWT tokens + `onboardingRequired: true` | ✅ PASS |
| **TC-CUST-03**| Complete Profile | `PUT /api/v1/profile/complete` | `{ fullName, email, gender: "male", address: { line1, city, state, pincode }, emergencyContact: { name, mobileNumber, relationship } }` | 200 OK + `isProfileCompleted: true` | ✅ PASS |
| **TC-CUST-04**| Register Vehicle & QR | `POST /api/v1/vehicles` | `{ vehicleNumber: "OD-02-TEST-9999", vehicleType: "car", brand: "Hyundai", model: "Creta", fuelType: "diesel", year: 2023 }` | 200 OK + `qrCode` (`QR-CUST-...`) + Base64 image | ✅ PASS |
| **TC-CUST-05**| List Garage Vehicles | `GET /api/v1/vehicles` | Header: `Bearer <cust_token>` | 200 OK + registered vehicle array | ✅ PASS |
| **TC-CUST-06**| Fetch Brand Identity | `GET /api/v1/brand` | Public | 200 OK + theme colors, logo, company name | ✅ PASS |
| **TC-CUST-07**| Service Catalog | `GET /api/v1/services` | Public | 200 OK + 19 services across 4 categories | ✅ PASS |
| **TC-CUST-08**| Towing Fare Estimation | `GET /api/v1/fare/towing` | `?pickup_lat=20.2961&pickup_lng=85.8245&dropoff_lat=20.3588&dropoff_lng=85.8333` | 200 OK + base fare, distance km, total | ✅ PASS |
| **TC-CUST-09**| Create Towing Booking | `POST /api/v1/bookings/towing` | `{ vehicleId, pickup: { address, latitude, longitude }, dropoff: { address, latitude, longitude } }` | 201 Created + `bookingNumber` + `advanceAmount` | ✅ PASS |
| **TC-CUST-10**| Towing Booking Detail | `GET /api/v1/bookings/towing/:id` | Header: `Bearer <cust_token>` | 200 OK + status timeline (`CREATED`) | ✅ PASS |
| **TC-CUST-11**| Towing Live Tracking | `GET /api/v1/bookings/towing/:id/tracking`| Header: `Bearer <cust_token>` | 200 OK + driver coordinate scaffold | ✅ PASS |
| **TC-CUST-12**| Create Driver Booking | `POST /api/v1/bookings/driver` | `{ vehicleId, pickup: { address, latitude, longitude }, packageHours: 4 }` | 201 Created + driver hire booking record | ✅ PASS |
| **TC-CUST-13**| Roadside Assistance | `POST /api/v1/bookings/roadside` | `{ vehicleId, serviceType: "battery_jumpstart", pickup: { address, latitude, longitude } }` | 201 Created + roadside assistance record | ✅ PASS |
| **TC-CUST-14**| Advance Payment Session | `POST /api/v1/payments/advance` | `{ bookingId, bookingType: "towing" }` | 200 OK + stub reference ID (`stub_adv_...`) | ⚠️ PASS (STUB) |
| **TC-CUST-15**| Emergency SOS Config | `GET /api/v1/sos/config` | Header: `Bearer <cust_token>` | 200 OK + police, ambulance, support hotlines | ✅ PASS |
| **TC-CUST-16**| Trigger SOS Alert | `POST /api/v1/sos/alert` | `{ action: "sos", latitude: 20.2961, longitude: 85.8245, address: "Bhubaneswar" }` | 200 OK + `alertId` generated | ✅ PASS |
| **TC-CUST-17**| Browse Subscriptions | `GET /api/v1/subscriptions/plans` | Public | 200 OK + active customer subscription plans | ✅ PASS |

### Suite 4: Partner Mobile API Flows
| ID | Test Case | Endpoint | Request Payload / Params | Expected Result | Status |
|---|---|---|---|---|:---:|
| **TC-PART-01**| Driver Login (OTP Send) | `POST /api/v1/auth/send-otp` | `{ mobileNumber: "8888880001", role: "driver" }` | 200 OK + `devOtp` for Om Singh | ✅ PASS |
| **TC-PART-02**| Driver Login (Verify) | `POST /api/v1/auth/verify-otp` | `{ mobileNumber: "8888880001", otp: "<devOtp>", role: "driver" }` | 200 OK + driver JWT + profile data | ✅ PASS |
| **TC-PART-03**| Toggle Driver Online | `PATCH /api/v1/driver/availability` | `{ isAvailable: true }` | 200 OK + `isAvailable: true` in user record | ✅ PASS |
| **TC-PART-04**| Check Active Driver Jobs | `GET /api/v1/driver/bookings/active` | Header: `Bearer <driver_token>` | 200 OK + active booking or null | ✅ PASS |
| **TC-PART-05**| Vendor Login (OTP Send) | `POST /api/v1/auth/send-otp` | `{ mobileNumber: "9812345670", role: "vendor" }` | 200 OK + `devOtp` for RACE Partner 1 | ✅ PASS |
| **TC-PART-06**| Vendor Login (Verify) | `POST /api/v1/auth/verify-otp` | `{ mobileNumber: "9812345670", otp: "<devOtp>", role: "vendor" }` | 200 OK + vendor JWT | ✅ PASS |
| **TC-PART-07**| Vendor Dashboard | `GET /api/v1/vendor/dashboard` | Header: `Bearer <vendor_token>` | 200 OK + fleet counts, jobs, earnings | ✅ PASS |
| **TC-PART-08**| Vendor Fleet Drivers | `GET /api/v1/vendor/drivers` | Header: `Bearer <vendor_token>` | 200 OK + list of drivers assigned to vendor | ✅ PASS |
| **TC-PART-09**| Vendor Fleet Vehicles | `GET /api/v1/vendor/vehicles` | Header: `Bearer <vendor_token>` | 200 OK + list of tow trucks | ✅ PASS |

---

## 5. Client Document vs Active Build Gap Scoring

Scoring based on `docs/client/CLIENT_DOC_VS_BUILD.md`:

| Module | Built & Working | Gaps / Missing | Score |
|---|---|---|:---:|
| **1. Customer Registration & Vehicles** | Phone OTP, profile, multi-vehicle, QR code creation | Real PIN/password, camera selfie upload | **82 / 100** |
| **2. Roadside, Towing & Driver Services** | Catalog, distance fare calculation, 3 booking types | Instant vs Emergency dispatch priority | **74 / 100** |
| **3. Vendor Registration & Fleet Management** | Company profile, driver fleet CRUD, vehicle fleet CRUD | Bank IFSC validation, MSME certificate save | **72 / 100** |
| **4. Driver KYC & Signup** | Combined registration form, driver type selection | Document file persistence, background check | **35 / 100** |
| **5. Subscriptions** | 8 seeded tiers, plan selection, renewal calculation | Real payment gateway for recurring auto-debit | **55 / 100** |
| **6. Vehicle QR & SOS** | Scannable QR generation, one-tap SOS beacon | Real native camera scanner, automated dialer | **48 / 100** |
| **7. Admin Web Panel** | Dashboard, KPI charts, approvals, settings | Live GPS map tracker on dashboard | **68 / 100** |
| **8. Payments & Billing** | Advance/final schemas, transaction tracking | Real payment gateway (currently 100% stub) | **12 / 100** |
| **OVERALL SYSTEM READINESS** | **Working happy-path prototype across all apps** | **Money, live GPS ops, real KYC, camera scan** | **62 / 100** |

---

## 6. Testing Guide for You

### A. Testing the Admin Web Panel
1. Access URL: `https://miniature-couscous-q74pr6jv56pf4pwj-3001.app.github.dev` (or port `3001` in your browser).
2. Credentials:
   - **Identifier:** `admin@raceservice.com`
   - **Password:** `Admin@123`
3. Features to verify:
   - **Dashboard:** Revenue cards, booking status donut chart, recent activity timeline.
   - **Vendors:** Review the 5 seeded vendors; test Approve/Suspend action.
   - **Drivers:** Review the 10 seeded drivers; check KYC documents review screen.
   - **Bookings:** Inspect towing and driver bookings created by the audit script.
   - **Settings:** Adjust commission rate or booking radius.

### B. Testing Customer Mobile App (Expo Go)
1. On your phone, open the **Expo Go** app.
2. Connect to project `race` via Metro URL: `exp://10.0.13.69:8081`.
3. Enter phone: `9876543210`. With `SKIP_OTP_AUTH = true`, you will be logged in immediately.
4. Try adding a vehicle to your garage and viewing the generated QR code.
5. Create a towing request and view the booking status screen.

### C. Testing Partner Mobile App (Expo Go)
1. On your phone, open **Expo Go**.
2. Connect to project `race-partners` via Metro URL: `exp://10.0.13.69:8082`.
3. Log in as demo driver **Om Singh**: `+918888880001`.
4. Toggle availability button to switch between **Online** and **Offline**.
5. Switch to vendor role with phone: `+919812345670` to view the fleet dashboard.
