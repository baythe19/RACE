# RACE — Remaining Work, Gaps & Issues to Reach 95/100

> **Generated:** 2026-10-01  
> **Branch:** `v2.0.1-cleanup`  
> **Baseline Score:** 57/100 (from [CLIENT_DOC_VS_BUILD.md](file:///workspaces/RACE/docs/client/CLIENT_DOC_VS_BUILD.md))  
> **Target Score:** 95/100  
> **Source of Truth:** [clintdoc.md](file:///workspaces/RACE/clintdoc.md) — the client's original specification

---

## Executive Summary

The system is a **working prototype** across 4 surfaces (Backend API, Admin Web, Customer App, Partner App). The happy-path flows exist for all 9 client modules. However, key subsystems are **stub/partial**: payments are fake, driver KYC documents don't submit to the API, QR scanning is simulated (no camera), live GPS tracking has no mobile implementation, and admin reports query a legacy empty collection instead of real bookings.

To reach **95/100**, we need to close ~38 points of gaps across 9 modules. No new "future" modules need to be built — only finishing what's already started.

---

## Module-by-Module Gap Analysis

### Module 1: Customer App Registration
**Current Score: 78/100 → Target: 96/100 (+18 points)**

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **REG-01** | **PIN/Password is demo-only** | 🔴 High | Medium | Client asks "Create PIN/Password". Current: Settings shows PIN vs hardcoded `1234`; change password = alert stub. Not used for login (OTP only). **Fix:** Either implement a real 4-digit PIN stored as hashed on `User` model (used as 2FA after OTP), or explicitly remove from the product story and mark as "OTP-only auth". |
| **REG-02** | **Profile photo has no camera/gallery upload** | 🟡 Medium | Small | Field exists as URL text input. No `expo-image-picker` integration. **Fix:** Add `expo-image-picker` → upload to backend `/uploads` or GCS → save URL on user profile. |
| **REG-03** | **Email is required but client says optional** | 🟢 Low | Trivial | App requires email in profile wizard validation. **Fix:** Remove email validation requirement, make it truly optional. |
| **REG-04** | **Vehicle photo missing in "add vehicle" flow** | 🟢 Low | Small | Onboarding can take a URL, but later "add vehicle" form has no photo field. **Fix:** Add image picker to vehicle add form. |
| **REG-05** | **OTP skip flag hardcoded `true`** | 🔴 High | Trivial | `SKIP_OTP_AUTH = true` in [MobileNumberScreen.tsx](file:///workspaces/RACE/customer%20application/src/screens/auth/MobileNumberScreen.tsx) and [PartnerLoginScreen.tsx](file:///workspaces/RACE/mobile%20application/src/screens/partner/auth/PartnerLoginScreen.tsx). **Fix:** Set to `false` and verify real SMS delivery via configured provider. |

**Files to modify:**
- `customer application/src/screens/auth/MobileNumberScreen.tsx` (OTP skip)
- `customer application/src/screens/onboarding/` (profile wizard validation)
- `backend/src/services/src/auth.ts` (verify Twilio/SMS provider)

---

### Module 2: Customer Home Screen Services
**Current Score: 72/100 → Target: 95/100 (+23 points)**

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **SVC-01** | **Towing: No instant vs emergency distinction** | 🔴 High | Medium | Backend `TowingBooking` model has no `towingMode` field to differentiate Instant/Scheduled/Emergency. All three go through the same booking path. **Fix:** Add `towingMode: 'instant' \| 'scheduled' \| 'emergency'` to the model + pass from UI. Emergency should set higher priority. |
| **SVC-02** | **Driver: Type not stored on booking** | 🔴 High | Medium | Customer books 4 driver types (Part-Time, Full-Time, Outstation, Night). Backend `DriverBooking` doesn't store which type. **Fix:** Add `driverServiceType` field to `DriverBooking` model + pass from customer app. |
| **SVC-03** | **Full-Time Driver is enquiry only** | 🟡 Medium | Medium | Customer taps "Full-Time Driver" → enquiry form, not a real booking. **Fix:** Convert enquiry to real `DriverBooking` with `driverServiceType: 'full_time'`, or clearly mark as "Contact Us" in the UI (not a bookable service). |
| **SVC-04** | **Roadside: Minor Repairs shown as "coming soon"** | 🟢 Low | Trivial | Some services are marked `availableNow: false` in seed. **Fix:** Set `availableNow: true` for Minor Repairs if ready for MVP. |

**Files to modify:**
- `backend/src/models/src/towingBooking.ts` (add towingMode)
- `backend/src/models/src/driverBooking.ts` (add driverServiceType)
- `customer application/src/screens/booking/` (pass type fields)
- `backend/src/database/src/admin-seed.ts` (service availability flags)

---

### Module 3: Towing Service Vendor Registration
**Current Score: 69/100 → Target: 95/100 (+26 points)**

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **VND-01** | **Bank account details not collected** | 🔴 High | Medium | Client requires Account Holder Name, Account Number, IFSC Code. Current: Cancelled cheque upload exists but no bank form fields. **Fix:** Add bank details form step in vendor registration wizard + save on `Vendor` model. |
| **VND-02** | **MSME/Udyam registration upload missing** | 🟡 Medium | Small | Only in unused wizard config. **Fix:** Add to vendor document upload list as optional. |
| **VND-03** | **Agreement acceptance is hardcoded `true`** | 🔴 High | Small | `acceptTerms: true` sent without user interaction. **Fix:** Add a real checkbox with terms text + require user tap before submit. |
| **VND-04** | **Background verification is stub** | 🟡 Medium | Medium | Admin schema has verification stages but no actual process. **Fix:** Implement admin-side verification workflow: mark documents as verified → update vendor status → send notification. |
| **VND-05** | **Selfie verification has no dedicated step** | 🟡 Medium | Small | Profile photo mapped but no selfie comparison step. **Fix:** Add selfie capture step in vendor wizard using `expo-image-picker` camera mode. |
| **VND-06** | **Shop & Establishment Certificate mislabeled** | 🟢 Low | Trivial | Called "Business Registration Certificate". **Fix:** Rename to match client doc. |

**Files to modify:**
- `mobile application/src/screens/partner/registration/vendor/` (bank form, agreement, selfie)
- `backend/src/models/src/vendor.ts` (bank detail fields)
- `mobile application/src/constants/partnerRegistrationDocuments.ts` (MSME)

---

### Module 4: Towing Vehicle Driver Registration
**Current Score: 38/100 → Target: 92/100 (+54 points)** ⚠️ BIGGEST GAP

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **DRV-01** | **Documents collected but NOT sent to API** | 🔴 Critical | Medium | [DriverReviewScreen.tsx](file:///workspaces/RACE/mobile%20application/src/screens/partner/registration/driver/DriverReviewScreen.tsx) submit payload only sends: `fullName, email, address, licenseNo, driverType, vehicleRegistration, city, vehicleType`. **All document files (Aadhaar, PAN, DL, photo) collected in wizard are dropped.** |
| **DRV-02** | **Date of birth collected but not submitted** | 🔴 High | Trivial | DOB field exists in wizard step but not included in API payload. |
| **DRV-03** | **Emergency contact missing entirely** | 🔴 High | Small | Client requires it. No field in driver registration form. |
| **DRV-04** | **City hardcoded to "Bhubaneswar"** | 🟡 Medium | Trivial | Line 68: `city: 'Bhubaneswar'` — should come from address input. |
| **DRV-05** | **RC number misused as license number** | 🟡 Medium | Small | `licenseNo: driverVehicle.rcNumber` — RC (Registration Certificate) is not the same as Driving License number. |
| **DRV-06** | **Police Verification Certificate not in form** | 🔴 High | Small | Client requires it for tow truck drivers. |
| **DRV-07** | **Medical Fitness Certificate (optional) missing** | 🟢 Low | Small | Client lists as optional for tow drivers. |
| **DRV-08** | **Commercial Permit, Insurance, Fitness, PUC not in form** | 🔴 High | Medium | Client lists 4 vehicle documents. Backend `Driver` schema knows some types but live form doesn't collect them. |
| **DRV-09** | **Bank details (Account + IFSC) stub only** | 🔴 High | Medium | Passbook slot exists but details not submitted. |
| **DRV-10** | **Vehicle photos not posted** | 🟡 Medium | Small | Slot exists in form but not included in API payload. |

**Fix approach:** This is the single most impactful module. The driver wizard collects ~80% of what's needed but the submit function in `DriverReviewScreen.tsx` drops everything except 8 basic fields. **Fix the submit function to include all collected data + add missing fields.**

**Files to modify:**
- `mobile application/src/screens/partner/registration/driver/DriverReviewScreen.tsx` (critical)
- `mobile application/src/screens/partner/registration/driver/DriverPersonalScreen.tsx` (emergency contact, DOB)
- `mobile application/src/screens/partner/registration/driver/DriverDocumentsScreen.tsx` (police, medical, vehicle docs)
- `backend/src/controller/src/driver.ts` (accept document uploads)
- `backend/src/services/src/driver.ts` (persist documents)

---

### Module 5: Full-Time Driver Registration
**Current Score: 28/100 → Target: 90/100 (+62 points)** ⚠️ SECOND BIGGEST GAP

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **FTD-01** | **No separate full-time signup flow** | 🔴 High | Large | Combined wizard only. Client wants dedicated full-time flow with experience, previous employer, languages, reference. |
| **FTD-02** | **Years of experience not collected** | 🔴 High | Medium | Schema may have field but wizard doesn't collect. |
| **FTD-03** | **Vehicle categories driven not collected** | 🟡 Medium | Small | |
| **FTD-04** | **Previous employer details missing** | 🟡 Medium | Small | |
| **FTD-05** | **Languages known missing** | 🟡 Medium | Small | |
| **FTD-06** | **Reference contact (optional) missing** | 🟢 Low | Small | |

**Fix approach:** Rather than building 3 entirely separate registration flows, enhance the existing combined wizard with conditional steps based on `driverType` selection:
- Tow Driver → vehicle documents step (permit, insurance, PUC)
- Full-Time → experience + languages + reference step
- Part-Time → availability windows step

---

### Module 6: Part-Time Driver Registration
**Current Score: 28/100 → Target: 90/100 (+62 points)**

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **PTD-01** | **No separate part-time signup** | 🔴 High | Large | Same combined wizard. |
| **PTD-02** | **Hourly/daily/night/weekend availability not collected** | 🔴 High | Medium | Backend schema may have `availability` but refers to online/offline toggle, not time windows. |
| **PTD-03** | **Driving experience not collected** | 🟡 Medium | Small | |
| **PTD-04** | **Vehicle categories not collected** | 🟢 Low | Small | |

**Same fix approach as Module 5** — conditional wizard steps.

---

### Module 7: Subscription Module
**Current Score: 52/100 → Target: 92/100 (+40 points)**

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **SUB-01** | **Payment for subscription is stub** | 🔴 High | Large | Subscribe API exists but uses the same `stub_` payment gateway. Real Razorpay/Stripe needed. Tied to payment gateway work (PAY-01). |
| **SUB-02** | **No recurring auto-debit** | 🔴 High | Large | Client expects subscription renewals. No payment scheduler or gateway subscription API. |
| **SUB-03** | **No partner subscribe screen** | 🟡 Medium | Medium | Vendor benefits (reduced commission, priority leads, featured listing, performance badge) are flags on plan seed data. No partner app UI to subscribe. |
| **SUB-04** | **Vendor subscription benefits not implemented** | 🟡 Medium | Medium | Commission reduction, priority leads, featured listing, badges are flags only — no actual routing or display logic. |

---

### Module 8: QR Emergency Vehicle Module
**Current Score: 42/100 → Target: 94/100 (+52 points)**

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **QR-01** | **No real camera scanner** | 🔴 Critical | Medium | `handleScan` is a button tap, not camera decode. No `expo-camera` or `expo-barcode-scanner` used. **Fix:** Integrate `expo-camera` with QR scanning → decode vehicle → show owner/SOS options. |
| **QR-02** | **Scan → Contact owner not working** | 🔴 High | Medium | Live scan doesn't decode a vehicle ID to look up owner contact. **Fix:** Decode QR → API lookup → display owner name + call button. |
| **QR-03** | **Scan → Notify emergency contacts not tied to QR** | 🟡 Medium | Small | SOS alert exists but not triggered from QR scan flow. **Fix:** Wire QR scan result → SOS alert with vehicle owner's emergency contact. |
| **QR-04** | **Scan → Request towing not from QR flow** | 🟡 Medium | Medium | No direct path from QR scan to pre-filled towing request. **Fix:** QR decode → vehicle info → pre-fill towing request with vehicle details. |
| **QR-05** | **Scan → Share emergency location** | 🟡 Medium | Small | SOS has location but not specifically from QR context. |
| **QR-06** | **Automated emergency dialer** | 🟢 Low | Small | No `Linking.openURL('tel:...')` from QR scan result. |

**Files to modify:**
- `customer application/src/screens/` (QR scan screen)
- `customer application/package.json` (add expo-camera dependency)
- `backend/src/controller/src/` (QR vehicle lookup API)

---

### Module 9: Admin Panel
**Current Score: 58/100 → Target: 95/100 (+37 points)**

| Gap ID | Issue | Priority | Effort | Details |
|--------|-------|----------|--------|---------|
| **ADM-01** | **Reports query legacy `Booking` collection (empty)** | 🔴 Critical | Medium | Admin reports and dashboard use `BookingModel` which maps to `bookings` collection (0 documents). Real bookings are in `towingbookings` and `driverbookings`. **Fix:** Update [adminReports.ts](file:///workspaces/RACE/backend/src/services/src/admin/adminReports.ts) and [adminDashboard.ts](file:///workspaces/RACE/backend/src/services/src/admin/adminDashboard.ts) to aggregate across all booking collections. |
| **ADM-02** | **Financial page shows seed/stub data** | 🔴 High | Medium | Finance tab reads payment transactions that are all `stub_` gateway references. **Fix:** Tied to real payment gateway (PAY-01). Meanwhile, ensure finance queries read from `PaymentTransaction` for real booking transactions. |
| **ADM-03** | **No live GPS map on dashboard** | 🟡 Medium | Large | Client asks "Track Live Status". Admin dashboard has no map showing real-time driver locations. **Fix:** Add a map component (Leaflet/Google Maps) consuming Socket.IO driver location events. |
| **ADM-04** | **Suspend accounts has no clear action** | 🟡 Medium | Small | Status in edit form but no dedicated "Suspend" button/action. **Fix:** Add suspend button + confirmation dialog + API call. |
| **ADM-05** | **Cancellation handling is basic** | 🟡 Medium | Small | Can set status to "cancelled" but no dedicated cancel/refund workflow. |
| **ADM-06** | **Refunds are stub** | 🔴 High | Large | "Razorpay pending" style stub. Tied to payment gateway. |
| **ADM-07** | **Commission tracking not from live jobs** | 🟡 Medium | Medium | Commission tab exists but not driven by actual completed bookings with real revenue. |
| **ADM-08** | **Admin login is single env user** | 🟢 Low | Medium | Login uses one hardcoded email/password from `.env`. `Admin` model exists but is ignored. **Fix:** Implement multi-admin login from database. |

---

## Cross-Cutting Issues (Affect Multiple Modules)

### PAY-01: Payment Gateway is 100% Stub 🔴 CRITICAL
- **Impact:** Modules 7, 8, 9 all depend on real payments
- **Current:** [bookingPayment.ts](file:///workspaces/RACE/backend/src/services/src/bookingPayment.ts) returns `stub_${type}_${amount}_${uuid}` 
- **Fix:** Integrate Razorpay/Cashfree/Stripe SDK
- **Effort:** Large (3-5 days)
- **Approach:** Replace `createGatewayPaymentSession()` with real SDK call → handle webhooks for verification

### TRACK-01: Live GPS Tracking Not Implemented 🟡 HIGH
- **Impact:** Customer tracking screen, admin live map, partner app location sharing
- **Current:** Socket.IO is initialized on backend ([socket.ts](file:///workspaces/RACE/backend/src/services/src/socket.ts)) with rooms for `driver:join`, `booking:track`, `location_update`. But mobile apps don't stream GPS.
- **Fix:** 
  1. Partner app: Add `expo-location` background task to stream GPS every 10s via Socket.IO
  2. Customer app: Listen on booking room for driver location updates → animate map marker
  3. Admin: Add map widget consuming all driver locations
- **Effort:** Large (3-4 days)

### DB-01: Dual Booking Collection Problem 🔴 HIGH
- **Impact:** Admin dashboard KPIs, reports, booking lists show wrong/empty data
- **Current:** Mobile apps create `TowingBooking` and `DriverBooking`. Admin reports still query legacy `Booking` collection (0 docs).
- **Fix:** Update all admin service files to aggregate from `TowingBookingModel` + `DriverBookingModel`:
  - [adminBookings.ts](file:///workspaces/RACE/backend/src/services/src/admin/adminBookings.ts)
  - [adminReports.ts](file:///workspaces/RACE/backend/src/services/src/admin/adminReports.ts) 
  - [adminDashboard.ts](file:///workspaces/RACE/backend/src/services/src/admin/adminDashboard.ts)
- **Effort:** Medium (1-2 days)

### ENV-01: Production Environment Issues 🟡 MEDIUM
- **Current Issues:**
  - Twilio trial account: 502 errors on unverified numbers
  - MongoDB Atlas URI has no database name → logs show `database: test`
  - `APP_BASE_URL` on VPS is still a laptop LAN IP
- **Fix:** Configure production env properly before any real-user testing

---

## Scoring Roadmap: Path from 57 → 95

| Module | Current | After Fixes | Delta | Key Fix |
|--------|---------|-------------|-------|---------|
| 1. Customer Registration | 78 | 96 | +18 | Real OTP, optional email, photo upload, PIN decision |
| 2. Home Screen Services | 72 | 95 | +23 | Store towing mode + driver type on bookings |
| 3. Vendor Registration | 69 | 95 | +26 | Bank form, agreement checkbox, selfie, MSME |
| 4. Tow Driver Registration | 38 | 92 | +54 | **Submit documents to API**, add missing fields |
| 5. Full-Time Driver | 28 | 90 | +62 | Conditional wizard steps for experience/languages |
| 6. Part-Time Driver | 28 | 90 | +62 | Availability windows, conditional steps |
| 7. Subscriptions | 52 | 92 | +40 | Real payment gateway, partner subscribe screen |
| 8. QR Emergency | 42 | 94 | +52 | `expo-camera` QR scan, decode → owner/SOS |
| 9. Admin Panel | 58 | 95 | +37 | Fix booking queries, real finance, suspend action |
| **OVERALL** | **57** | **93** | **+36** | |

> [!IMPORTANT]
> The biggest single improvement is **Module 4 (Tow Driver Registration)** — fixing `DriverReviewScreen.tsx` to actually submit collected documents would jump the score by 54 points for that module alone.

---

## Priority-Ordered Work Plan

### 🔴 Phase 1: Critical Fixes (Days 1-3) — Score impact: +25 points

1. **DRV-01**: Fix `DriverReviewScreen.tsx` to submit all collected documents to API
2. **ADM-01/DB-01**: Admin reports + dashboard aggregate from `TowingBooking` + `DriverBooking` instead of legacy `Booking`
3. **SVC-01**: Add `towingMode` field to `TowingBooking` model
4. **SVC-02**: Add `driverServiceType` field to `DriverBooking` model
5. **REG-05**: Set `SKIP_OTP_AUTH = false` (trivial toggle)

### 🟡 Phase 2: High-Value Fixes (Days 4-7) — Score impact: +18 points

6. **VND-01**: Bank account details form in vendor registration
7. **VND-03**: Real agreement acceptance checkbox
8. **DRV-02 to DRV-10**: Complete driver registration data (DOB, emergency, city, documents)
9. **QR-01**: Integrate `expo-camera` for real QR scanning
10. **QR-02**: QR decode → vehicle lookup → owner contact

### 🟠 Phase 3: Medium-Value Fixes (Days 8-12) — Score impact: +15 points

11. **FTD-01/PTD-01**: Conditional driver wizard steps (experience, availability)
12. **SUB-03**: Partner subscription screen
13. **ADM-03**: Admin live GPS map (requires TRACK-01)
14. **REG-02**: Profile photo with `expo-image-picker`
15. **ADM-04**: Suspend account action button

### 🔵 Phase 4: Payment & Tracking (Days 13-18) — Score impact: +12 points

16. **PAY-01**: Real payment gateway integration (Razorpay/Cashfree)
17. **TRACK-01**: Background GPS streaming from partner app
18. **SUB-01**: Real subscription payments
19. **ADM-06**: Real refund workflow

---

## Files Most Likely to Change

| File | Changes Needed |
|------|---------------|
| [DriverReviewScreen.tsx](file:///workspaces/RACE/mobile%20application/src/screens/partner/registration/driver/DriverReviewScreen.tsx) | Submit all collected documents + missing fields |
| [adminDashboard.ts](file:///workspaces/RACE/backend/src/services/src/admin/adminDashboard.ts) | Query TowingBooking + DriverBooking |
| [adminReports.ts](file:///workspaces/RACE/backend/src/services/src/admin/adminReports.ts) | Same |
| [adminBookings.ts](file:///workspaces/RACE/backend/src/services/src/admin/adminBookings.ts) | Same |
| [towingBooking.ts model](file:///workspaces/RACE/backend/src/models/src/towingBooking.ts) | Add `towingMode` enum |
| [driverBooking.ts model](file:///workspaces/RACE/backend/src/models/src/driverBooking.ts) | Add `driverServiceType` enum |
| [bookingPayment.ts](file:///workspaces/RACE/backend/src/services/src/bookingPayment.ts) | Replace stub gateway with real SDK |
| [MobileNumberScreen.tsx](file:///workspaces/RACE/customer%20application/src/screens/auth/MobileNumberScreen.tsx) | OTP skip toggle |
| [PartnerLoginScreen.tsx](file:///workspaces/RACE/mobile%20application/src/screens/partner/auth/PartnerLoginScreen.tsx) | OTP skip toggle |

---

## What Is Already Done & Should Not Be Rebuilt

> [!TIP]
> These components work correctly and should be preserved as-is:

- ✅ Customer OTP flow + profile wizard (name, gender, DOB, address, emergency)
- ✅ Multi-vehicle registration + QR **generation**
- ✅ Home service catalog (19 services, correct names from client doc)
- ✅ Roadside assistance 4 booking types (flat tyre, jumpstart, fuel, minor repairs)
- ✅ Scheduled towing with fare calculation
- ✅ Vendor company registration (basic info + core documents)
- ✅ Admin customer/vendor/driver lists with approve/reject
- ✅ Admin document review workflow
- ✅ Subscription plan names and tiers (8 seeded plans matching client spec)
- ✅ SOS alert API with location
- ✅ Socket.IO server infrastructure (rooms, events defined)
- ✅ Backend auth with JWT + refresh tokens
- ✅ Database seeding (22 collections, demo data)

---

## Test Coverage Status

From [SYSTEM_AUDIT_AND_TEST_CASES.md](file:///workspaces/RACE/docs/SYSTEM_AUDIT_AND_TEST_CASES.md):

| Suite | Tests | Pass | Notes |
|-------|-------|------|-------|
| Database & Platform Setup | 2 | 2 ✅ | MongoDB + collections verified |
| Admin Panel & Backoffice API | 12 | 12 ✅ | All admin endpoints working |
| Customer Mobile API Flows | 17 | 17 ✅ | All customer APIs working (payments are stub) |
| Partner Mobile API Flows | 9 | 9 ✅ | All partner APIs working |
| **Total** | **40** | **40 ✅** | 100% pass rate on existing test suite |

> [!WARNING]
> The 100% pass rate is misleading — tests verify the **existing** stub behavior (fake payments, dropped documents). After fixes, tests must be updated to verify real behavior.
