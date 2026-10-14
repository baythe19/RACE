# RACE Vendor Flow Map (2026-10-14)

Real code paths — screens, routes, hooks, and backend connections for the Vendor/Fleet-Owner experience.

## Core booking flow

```
Vendor Home (Tab Home → PartnerHomeScreen)
  ├─ incoming-leads banner  (useVendorBookingOffersQuery → GET /vendor/bookings/offers)
  │     └─ "Assign vehicle" → PartnerJobs stack → VendorAssignJobScreen
  ├─ Fleet overview card    (offers + drivers + vehicles queries)
  └─ Empty-leads state → View all → Jobs tab

Jobs (Tab Jobs → PartnerJobsScreen, vendor branch)
  ├─ Tabs use the same list visual language as the Driver board
  ├─ All / New        → open marketplace offers (no vendorApproved) → "Approve & assign vehicle"
  ├─ Assigned         → vendor bookings rows claimed by fleet drivers
  │     (GET /vendor/bookings → driver chip + vehicle + status)
  ├─ In progress      → DRIVER_EN_ROUTE / DRIVER_ARRIVED / IN_PROGRESS
  └─ Completed        → COMPLETED / RATED (shows confirmed order value)

VendorAssignJobScreen (Jobs stack → VendorAssignJob)
  ├─ Booking summary (service, #ref, pickup, customer-API fare)
  ├─ ACTIVE fleet vehicles only (useVendorFleetVehiclesQuery active-only;
  │     server rejects non-ACTIVE with 400 as the authority)
  ├─ select card → POST /vendor/bookings/:id/approve { bookingType, vehicleId }
  ├─ success → alert → back to PartnerJobsList (offers + bookings + driver queries refetch)
  └─ empty state → Add Vehicle in Jobs stack, return preserves assign params
```

Contract note: assignment is **vehicle-only**; the job stays `CONFIRMED` and fleet drivers
self-claim from their offers feed (backend `approveVendorBookingOffer`).

## Vehicle management

```
Account → Vendor Vehicles   (or Jobs stack, or Home shortcut, or assignment empty state)
VendorVehiclesScreen
  ├─ Add vehicle (keyboard-safe card): registration, type chips, model, year,
  │     RC, insurer, policy no, expiry (YYYY-MM-DD) → POST /vendor/vehicles
  ├─ overflow menu → Edit details (type/model/year/insurance note) → PUT /vendor/vehicles/:id
  │                 → Mark Active / Under maintenance / Inactive (distinct labels)
  │                 → Assign driver → POST /vendor/drivers/:id/assign-vehicle
  │                 → Remove vehicle (confirm) → DELETE /vendor/vehicles/:id (server has no active-job guard → documented risk)
  └─ driver↔vehicle link lives on driverProfile.vehicleRegistration
```

## Driver management

```
Account → Vendor Drivers (VendorDriversScreen)
  ├─ Add Driver step 1/2 — name, mobile, license, city, Login ID, password, driver type
  │     → validated locally, then returns to step 2 (values preserved)
  ├─ Add Driver step 2/2 — optional fleet-vehicle chip (ACTIVE vehicles)
  │     + documents (driving_license, aadhaar, police_verification, medical_certificate)
  │     → POST /vendor/drivers, then per-doc POST /vendor/drivers/:id/upload-document
  │     → per-document failures surfaced (driver kept; retry from the list)
  ├─ overflow menu → View details / Assign vehicle (links or unlinks) / Unlink driver
  │                   (link requires vendor-approved account; server validates fleet + status)
  └─ list stats: total / active / on job / inactive — derived from isAvailable/isBusy/status
```

Vendor-created drivers authenticate on the existing Vendor Driver login path
(`PartnerVendorDriverLoginScreen`) and remain Driver-role accounts — no owner permissions.
Documents never auto-approve; status stays PENDING until admin review.

## Account (shared route, role-aware)

```
Account tab → PartnerAccountScreen
  ├─ Vendor Owner: Vendor Drivers · Vendor Vehicles · Verification Status · Bank & Payouts · Notifications
  ├─ Shared (both roles): Preferences, Language, Notification prefs, Help & Support, App version, Log out
  └─ Vendor Driver / Self Driver: driver-only destinations (no fleet administration)
```

## Refresh/invalidation map

- Approved assignment → invalidates `['vendor','booking-offers']`, `['vendor','bookings']`, driver offers.
- Vehicle create/update/remove → invalidates `['vendor','vehicles']` (all variants).
- Driver create → invalidates `['vendor','drivers']` (both hooks).
- Driver↔vehicle link → invalidates `['vendor','drivers']`.
- Home/Jobs pull-to-refresh refetches status, dashboard, offers, bookings, drivers, vehicles.
