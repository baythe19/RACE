# RACE Vendor UI Audit — Phase 0 (2026-10-14)

Branch: `3.5.0-new-driver-screeens` · Scope: Vendor/Fleet-Owner experience in `mobile application/` (+ minimal backend connections), per Master Prompt boards A/B/C.
Sources of truth used: backend `controller/src/vendor.ts` + `services/src/vendor*.ts`, mobile `services/vendor/*`, navigation `PartnerNavigator.tsx`, and the already-polished Driver screens/theme.

## Verified backend contract (authoritative)

| Concern | Real behavior |
|---|---|
| Vendor approval gate | `assertVendorApproved`: `user.vendorProfile.status === 'approved'` required for drivers/vehicles/bookings endpoints (`ForbiddenError` otherwise) |
| Job assignment | **`POST /vendor/bookings/:id/approve` = vehicle-only** (`{ bookingType, vehicleId }`). Status stays `CONFIRMED`; vendor **drivers self-claim** via offers feed. `assignBooking(driverId)` is kept for old clients only (deprecated). |
| Vehicle eligibility for assignment | `status === 'ACTIVE'` only (`UNDER_MAINTENANCE` / `INACTIVE` rejected server-side) |
| Open-lead feed | `GET /vendor/bookings/offers` = CONFIRMED bookings with no driver, unassigned OR this vendor-approved (awaiting driver claim). Includes `serviceLabel`, `estimatedFare`, `pickup`, `dropoff`, `assignedFleetVehicleLabel`, `vendorApproved`. No `offerExpiresAt` for vendor-routed jobs. |
| Vehicles | `{ id, registrationNo, type, model, year?, status: ACTIVE|UNDER_MAINTENANCE|INACTIVE, insuranceExpiry?, maintenanceNote? }`; create accepts `insuranceProvider/insurancePolicyNumber/rcNumber` (folded into `maintenanceNote`); unique reg per vendor; **no assigned-driver field** — driver↔vehicle is by `driverProfile.vehicleRegistration` string |
| Drivers | `{ id, name, phone, email, driverType, licenseNo, city, vehicleRegistration, status PENDING/APPROVED, isAvailable, isBusy, rating, loginId, hasPasswordLogin }`. Create REQUIRES `name, phone, licenseNo, loginId, password` (+ optional `driverType/city/vehicleRegistration/email`). Existing-phone driver is re-linked to the vendor (login/password overwritten). No password-reset/update API. Docs: `driving_license, aadhaar, police_verification, medical_certificate` → status stays PENDING until admin approval. |
| Dashboard stats | `GET /vendor/dashboard` → `jobsToday, earningsToday, earningsTotal` only (legacy `BookingModel` + `TransactionModel` TTL semantics; no weekly series, no fleet counts) |
| Vendor driver login | `driverProfile.loginId` + password (hashed); `PartnerVendorDriverLoginScreen` exists |
| Trip OTP | Vendor can verify trip OTP (`POST /vendor/bookings/:id/verify-trip-otp`) at `DRIVER_ARRIVED` → `IN_PROGRESS` |

## Screen matrix

| Screen / Route | Role | Current state | Existing component/API | UI gap | Behavior/connection gap | Action | Priority |
|---|---|---|---|---|---|---|---|
| `PartnerHomeScreen` (Tab Home, vendor) | Vendor | Partial | `useVendorStatusQuery`, `useVendorDashboardQuery`, `useVendorBookingOffersQuery`, `useVendorFleetDriversQuery`, `useVendorFleetVehiclesQuery` | Stacked repetitive blocks (leads + 5 quick actions + 4 status cards + activity), fabricated weekly chart charting only `earningsToday` | **Vehicle status counted by wrong strings** (`'active'`, `'maintenance'` vs real `ACTIVE/UNDER_MAINTENANCE`); "Active drivers" shows fleet total; activity feed duplicates incoming leads | Consolidate: honest compact earnings (Today + Total, no fabricated series), one fleet-overview card (drivers available / vehicles active / open jobs), keep leads banner w/ assign CTA, trim duplicate "Booking leads" action & dedupe activity | P1 |
| `PartnerJobsScreen` (Tab Jobs, vendor) | Vendor | Working (offers + assign) | `useVendorBookingOffersQuery`; assign → `VendorAssignJob` | Subtitle/labels fine | **Assigned / In progress / Completed tabs are permanently empty** — vendor offers query drops a booking once a driver claims it; no vendor bookings-list endpoint exists | Add backend `GET /vendor/bookings` (vendor-scoped list incl. driver claim data) + mobile hook; map tabs to real data; fix "Estimated earnings" label for vendor (customer estimate) | P0→P1 |
| `VendorAssignJobScreen` (`Jobs/VendorAssignJob`) | Vendor | Working | `useVendorFleetVehiclesQuery(activeOnly)`, `useApproveVendorBookingMutation` → `approve { vehicleId }` | Static `VehicleTypeArtwork type="flatbed"` for every vehicle; no per-vehicle driver association shown | Duplicate-submission guarded (`isPending`); stale-lead conflict surfaces via API error message ✓ | Map vehicle type → artwork badge; show associated driver (via `driverProfile.vehicleRegistration`) | P1 |
| `VendorVehiclesScreen` (`Jobs/` and `Account/` stacks) | Vendor | Partial | `useVendorFleetVehiclesQuery(all)`, create/update/remove mutations | Menu-only status control; missing backend-supported insurance/RC/expiry fields in create; invented "tonnage" metadata | **P0: "Assign driver" sheet calls `createVendorDriver` without required `loginId`/`password`** (`as any` cast) — real API returns 400; in preview mode it silently "works" and would also overwrite credentials. Backend has no driver-update endpoint. | New backend `POST /vendor/drivers/:id/assign-vehicle { vehicleRegistration }` (vendor-scoped) + mobile hook; add insurance/RC optional fields; rename `UNDER_MAINTENANCE` label to "Under maintenance"; drop fake tonnage; keyboard-safe form | P0 |
| `VendorDriversScreen` (`Account/VendorDrivers`) | Vendor | Partial | `useVendorDriversQuery`, `useCreateVendorDriverMutation`, doc upload after create | Single long form card (board C wants Step-1 credentials → Step-2 documents); doc upload failures swallowed silently; no post-create document management; no vehicle link | Vehicle association possible only at create; sort "newest" is actually id-string sort | Two-stage add form (credentials → documents), per-doc upload success/failure feedback, "Assign vehicle" via new endpoint in overflow menu, fix sort | P1 |
| `PartnerAccountScreen` (`Account/PartnerAccountMain`) | Shared | Working | role-aware `isVendor` sections | — | Vendor Owner sees Drivers/Vehicles/Verification/Bank ✓; Vendor Driver blocked (`isVendor` false) ✓; preview role-switch correctly gated behind `UI_PREVIEW_MODE` | No change needed (verify parity only) | P2 |
| `VendorAssignJob` params / type safety | — | Working | `PartnerJobsStackParamList.VendorAssignJob` | — | Params preserved from Jobs/Home ✓ | Verify on final pass | P3 |
| Mock/demo leakage | — | Partial | `UI_PREVIEW_MODE` guards wrap every vendor API | Mock fixtures only under preview flag | Mock fallbacks documented as preview-only; reg-no/OTP QA helpers not injected into live paths | Keep; document in report | P3 |

## Reference-board mapping (A/B/C panels)

- **Board A1 Vendor dashboard** → `PartnerHomeScreen` (consolidation pass above).
- **Board A2 Vendor jobs** → `PartnerJobsScreen` vendor branch — one canonical Jobs implementation reused for both roles (already the case; do not fork a duplicate list).
- **Board A3 Assign vehicle** → `VendorAssignJobScreen` (approve-with-vehicle contract preserved; drivers self-claim — do not force manual driver selection).
- **Board B1/B2/B3 Vehicles** → `VendorVehiclesScreen` list + inline create (keyboard-safe) + vehicle status menu; per-vehicle details are covered by the card itself (model is flat: no documents/verification per vehicle exists in the backend).
- **Board C1/C2/C3 Drivers** → `VendorDriversScreen` list + 2-step add form (credentials then documents).

## Deliverable status

- `docs/vendor-implementation-report.md` — written after implementation.
