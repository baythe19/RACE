# 11 — Database Audit

**Stack:** MongoDB via Mongoose · DB name `race-service` · 26 model files, ~1,900 lines of schema.
**Verdict:** schema coverage is broad and mostly sensible, but there are **two structural faults** (a ghost-ref problem and a triple booking collection) and one aggregation bug that makes admin numbers untrustworthy.

---

## 1. Collections & models [V]

| Model file | Registered model | Collection | Purpose | Notes |
|-----------|------------------|-----------|---------|-------|
| `user.ts` (+`userProfileSchema.ts`) | `User` | `users` | every human: customer, vendor, driver | **Vendor and Driver live inside `users`** as `vendorProfile` / `driverProfile` sub-documents |
| `booking.ts` | `Booking` | `bookings` | **legacy** unified booking | still queried by 13 files incl. 7 admin services |
| `towingBooking.ts` | `TowingBooking` | `towingbookings` | towing jobs (real product) | 155 lines, status history, fare breakdown |
| `driverBooking.ts` | `DriverBooking` | `driverbookings` | driver-hire jobs | 159 lines |
| `vehicle.ts` | `Vehicle` | `vehicles` | customer vehicles | |
| `vehicleQr.ts` | `VehicleQrCode` | `vehicleqrcodes` | QR per vehicle (1:1) | `vehicleId` unique |
| `vendorVehicle.ts` | `VendorVehicle` | `vendorvehicles` | vendor fleet | |
| `vendorDocument.ts` | `VendorDocument` | `vendordocuments` | uploaded KYC files | separate collection |
| `subscription.ts` | `SubscriptionPlan`, `UserSubscription` | `subscriptionplans`, `usersubscriptions` | plans + purchases | |
| `payment.ts` | `PaymentMethod` | `paymentmethods` | saved methods | stored card data must be checked before real gateway |
| `paymentTransaction.ts` | `PaymentTransaction` | `paymenttransactions` | booking payments (stub gateway) | |
| `transaction.ts` | `Transaction` | `transactions` | ledger for admin finance | refs to Booking/Vendor/Driver |
| `wallet.ts` | `Wallet` | `wallets` | wallet balance | |
| `notification.ts`, `notificationPrefs.ts` | `Notification`, `NotificationPrefs` | notifications | per-user prefs unique | |
| `otpLog.ts` | `OtpLog` | `otplogs` | OTP send/verify audit | stores `mobileOtp` **in plain text** in dev path |
| `location.ts` | `SavedLocation` | `savedlocations` | saved addresses | |
| `activityLog.ts`, `adminNotification.ts` | `ActivityLog`, `AdminNotification` | — | admin audit trail | |
| `platformSettings.ts` | `PlatformSettings` | — | admin settings singleton | |
| `service.ts`, `brand.ts` | `Service`, `Brand` | public content | |
| `admin.ts` | `Admin` | `admins` | **not used for auth** (see SEC-1) | |

`models/src/vendor.ts` (10 lines) and `models/src/driver.ts` (2 lines) are **type-only re-export shims** — there is no `Vendor` or `Driver` model registered anywhere in the codebase **[V]** (grep for `model('Vendor'`/`model('Driver'` returns nothing).

## 2. Finding DB-1 (HIGH) — ghost references to `Vendor` / `Driver` models

Schemas declare references to model names that **do not exist**:

| File:line | Field | ref | Reality |
|-----------|-------|-----|---------|
| `booking.ts:144` | `vendorId` | `'Vendor'` | vendor is a `User` with `vendorProfile` |
| `towingBooking.ts:122` | `vendorId` | `'Vendor'` | same |
| `towingBooking.ts:123` | `driverId` | `'Driver'` | driver is a `User` with `driverProfile` |
| `driverBooking.ts:126` | `driverId` | `'Driver'` | same |
| `driverBooking.ts:128` | `assignedFleetVehicleId` | `'VendorVehicle'` | ✅ exists |
| `transaction.ts:50-51` | `vendorId`, `driverId` | `'Vendor'`, `'Driver'` | same |

**Impact:** any `.populate('driverId')` / `.populate('vendorId')` on these paths throws `MissingSchemaError: Schema hasn't been registered for model "Driver"`. Today the admin dashboard only populates `customerId` (`adminDashboard.ts:164-166`, `ref: 'User'` ✅), so the crash is **latent** — it triggers the moment a join is added (e.g. "show driver name on booking detail"), and it is a semantic lie in the schema either way.
**Proposed fix (not applied):** ref `'User'` and populate with a select/filter, or register real `Vendor`/`Driver` models — a product decision, since drivers currently *are* users.
**Confidence:** [V] for the refs, [I] for the crash timing.

## 3. Finding DB-2 (HIGH) — three booking collections, and admin sums all three

| Written by | Collection |
|-----------|-----------|
| Customer app towing flow | `towingbookings` |
| Customer app driver-hire flow | `driverbookings` |
| Admin seed / legacy paths / vendor dashboard | `bookings` (legacy `Booking`) |

`BookingModel` is imported by **13 files** including `services/src/vendor.ts`, `bookingRepository.ts` and seven admin services (`adminBookings`, `adminDashboard`, `adminReports`, `adminCustomers`, `adminDrivers`, `adminVendors`, `transactionEngine`) **[V]**.

Concretely, `adminDashboard.ts` computes its headline numbers as *legacy + towing + driver*:
```
:79-81    completed = BookingModel.count({SERVICE_COMPLETED, PAID}) + TowingBooking.count({COMPLETED,RATED}) + DriverBooking.count({COMPLETED,RATED})
:186-188  total     = BookingModel.count() + TowingBooking.count() + DriverBooking.count()
```
`adminBookings.ts:299-316` does the same for the status counters, and `:139-146` switches collection based on a `type` filter.

**Impact:**
- Any demo/seed row in `bookings` inflates production KPIs (no way to distinguish demo from real at query time).
- A status written by the new flows (`COMPLETED`) is not the same vocabulary as the legacy flow (`SERVICE_COMPLETED`,`PAID`) — counts silently diverge.
- Admin "bookings" screen shows legacy rows that no mobile app can open.
**Confidence:** [V].

## 4. Indexes & performance [V]

- `database/src/indexes.ts` (35 lines) runs `model.syncIndexes()` for **12 of 26** models — the other 14 rely on Mongoose `autoIndex` at connect time.
- `syncIndexes()` **drops indexes it does not know about** → running it against production after a manual index would remove it. Acceptable at boot, dangerous as an ad-hoc script.
- Sensible indexes are declared inline: `user.mobileNumber` unique, `otpLog` by mobile+expiry, `vehicleQr.vehicleId` unique + `customerId`, notification prefs `userId` unique, most `*Id` foreign keys `index: true`, plus compound indexes on `vendorProfile.status`/`verificationStage` and `driverProfile.status` (`user.ts:125-131`) — genuinely good.
- Risk to watch: `adminReports.ts` / `adminDashboard.ts` run `aggregate()` without `$match` on an indexed date field first (sampled code shows `.aggregate([...])` over whole collections) — fine at demo volume, a full-collection scan at scale. **Confidence: [V] for the aggregates, [I] for cost.**

## 5. Data-quality risks

| # | Risk | Evidence | Severity |
|---|------|----------|----------|
| DQ-1 | Driver self-registration stores document `url` values that are **local device URIs** (`file:///…`) with no upload endpoint for this path | `DriverReviewScreen.tsx:86-90` (`url: doc.uri`) vs only `/vendor/drivers/:id/upload-document` existing | HIGH — KYC unusable for self-drivers |
| DQ-2 | OTP stored in plain text (`otpLog.mobileOtp`) in the dev/mock path | `otp.ts:120-131` | MEDIUM (dev only) |
| DQ-3 | Payment methods stored in our DB while gateway is a stub — any card-like field becomes a PCI question later | `models/src/payment.ts` | MEDIUM (must be resolved before gateway work) |
| DQ-4 | `documents` arrays exist both as a sub-document (`vendorProfile`) and as a separate collection (`vendordocuments`) — two sources of truth for KYC | `vendorDocument.ts` vs `userProfileSchema.ts` | MEDIUM |
| DQ-5 | Booking `statusHistory` duplicated across legacy/new schemas with different vocabularies | `booking.ts` vs `towingBooking.ts:127+` | MEDIUM |
| DQ-6 | `Transaction.bookingId` refs `'Booking'` (legacy) → ledger rows can never point at real towing/driver bookings | `transaction.ts:52` | HIGH for finance accuracy |

## 6. Migration & seeding [V]

Available: `seed`, `seed:mock`, `seed:fresh`, `seed:demo-drivers`, `seed:reset`, `db:reset`, `migrate:unified-users`, `regenerate-vehicle-qrs`, `reset-test-data`.
✅ A unified-user migration exists (important, since vendor/driver were presumably split models earlier).
⚠️ Every seed path writes the legacy `Booking` — the source of DB-2's inflation.

## 7. Database score

| Area | Weight | Score |
|------|-------:|------:|
| Schema coverage for the product | 20% | 8/10 |
| Referential integrity | 20% | 3/10 (ghost refs, no real FKs) |
| Collection strategy (single source of truth) | 20% | 3/10 (booking duality) |
| Indexing | 20% | 8/10 |
| Migrations & seeding discipline | 10% | 6/10 |
| PII handling at rest (documents, OTP) | 10% | 4/10 |
| **Weighted** | 100% | **5.2/10** |

### Two-level view

| Capability | If DONE | If NOT done | Today |
|-----------|--------:|------------:|-------|
| Booking data in one collection family with one status vocabulary | 10 | 3 | **3** |
| Refs resolve to registered models | 10 | 2 | **2** |
| Hot-path indexes present | 10 | 4 | **9** |
| Migrations for schema changes | 10 | 0 | **6** (one migration exists) |
| Document/KYC single source of truth | 10 | 3 | **3** |
