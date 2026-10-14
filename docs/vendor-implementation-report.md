# RACE Vendor Implementation Report (2026-10-14)

Branch `3.5.0-new-driver-screeens` · Scope: Vendor UI/UX per Master Prompt boards A/B/C on the Driver-polished Partner app.

## Vendor screens implemented/refined

| Screen | Work |
|---|---|
| `PartnerHomeScreen.tsx` | Consolidation pass per board A1: honest compact **Earnings** card (Today-completed + All-time from `GET /vendor/dashboard`); removed the fabricated weekly chart that only charted `earningsToday`; new **Fleet overview** card (open leads / drivers available of N / vehicles active of N, each tappable) replacing three repetitive stat cards; added **no-new-leads** empty state (shortcuts preserved); removed duplicate "Booking leads" and "Verification & KYC" quick actions (covered by leads banner + verification card); **fixed wrong vehicle-status strings** (`'active'`/`'maintenance'` → real `ACTIVE`); "Active drivers" nearby count now derived correctly; recent-activity no longer duplicates incoming leads; CTA label "Assign vehicle" (accurate to vehicle-only contract) |
| `PartnerJobsScreen.tsx` | Vendor branch now tracks the whole job lifecycle: new backend-backed rows feed the Assigned / In progress / Completed tabs (formerly permanently empty); awaiting-driver approved jobs de-duplicated from the New tab; vendor assigned-job cards show a fleet-driver chip with name/phone; fare line is honest per state (`Customer estimate` vs `Confirmed order value` for completed). Driver branch untouched |
| `VendorAssignJobScreen.tsx` | Vehicle artwork mapped from the vehicle type (flatbed / wheel-lift / heavy / car) instead of a hardcoded flatbed; per-vehicle linked-driver line (from `driverProfile.vehicleRegistration` incl. `Pending ·` pre-approval prefix); still ACTIVE-vehicles-only (server-authoritative) |
| `VendorVehiclesScreen.tsx` | **P0 fix:** "Assign driver" replaced — the old flow called `createVendorDriver` without required `loginId`/`password` (real API 400; preview-only "success") with `POST /vendor/drivers/:id/assign-vehicle`; added backend-supported finance fields (RC, insurer, policy no, expiry) and "Edit vehicle" mode reusing the form + `PUT /vendor/vehicles/:id`; `UNDER_MAINTENANCE` now labelled "Under maintenance" everywhere (was the confusing "In service"); removed invented tonnage metadata (real maintenance note shown instead); keyboard-avoiding form; card shows type + year + note |
| `VendorDriversScreen.tsx` | Add-driver split into the board's two stages: **Step 1 details & credentials** (validated, values preserved) → **Step 2 documents & optional ACTIVE-vehicle chip**; per-document upload failures surfaced (driver kept, retryable) instead of being swallowed; menu gains **Assign vehicle** / unlink via the new endpoint with an unlink action; success copy states documents stay pending until admin approval (never "verified/eligible instantly") |

## Shared Driver components/reuse

- Vendor Jobs reuses one canonical list implementation (`PartnerJobsScreen`) with role-aware data — no duplicate vendor list created.
- Same `AppScreenLayout`, `PartnerScreenLayout`, `FormField`, `PartnerDocumentUploadList`, `GlassCard`, token sets (`theme/colors`, `driverUi`) — no second design system.
- Account screen unchanged (already role-aware); parity verified — Vendor Owner sees Drivers/Vehicles/Verification/Bank; Vendor Driver gets no owner menus.

## Routes/APIs connected

**Backend (2 new vendor-scoped endpoints, auth + admin-approval gated):**
- `GET /api/v1/vendor/bookings` — `vendorBookingsService.listBookings`: both booking models where `vendorId = user` or `driverId ∈ vendor drivers`, newest-first, ≤100 rows, incl. `driver` (id/name/phone/rating via `resolveAssignedDriver`), `serviceLabel`, fares, `assignedFleetVehicleLabel`. Powers post-assignment tracking.
- `POST /api/v1/vendor/drivers/:id/assign-vehicle` — `{ vehicleRegistration }` optional/null: links/unlinks a fleet driver to a vendor-owned vehicle; rejects other vendors' drivers and `INACTIVE` vehicles; empty string unlinks. `updateVendorVehicle`/`removeVehicle` contracts unchanged; `assignBooking` stays deprecated.

**Mobile:** `vendorBookingsApi.listVendorBookings` + `VendorBookingItem`, `useVendorBookingsQuery`, `vendorDriversApi.linkVendorDriverVehicle`, `useLinkVendorDriverVehicleMutation`, endpoints `vendorBookings` / `vendorDriverAssignVehicle`, `DriverJobBooking.driver?`, preview mocks `MOCK_VENDOR_BOOKINGS`, query invalidations after approve/link/create.

## Driver-UI regressions checked

- `DriverDashboardScreen` / `DriverJobsScreen` / active-job flow untouched; role switching stays in `PartnerNavigator` (`isDriver ? DriverJobsScreen : PartnerJobsScreen`).
- `DriverJobBooking` change is additive (`driver?` optional) — no driver call-site impact.
- Mobile + backend TypeScript clean (below).

## Deep-recheck pass (same day, post-implementation review)

Four gaps found and fixed in the recheck:
1. `VendorDriversScreen` — production vendor-created drivers start `PENDING` but the list badge showed them as **Active** (backend sets `isAvailable: true` at create). Added a distinct `Pending · Awaiting admin approval` state, a Pending stat card and a Pending filter/threshold so counts and filters stay truthful.
2. `PartnerJobsScreen` — the vendor 403 gate message ("...must be approved...") was not recognized as the pending-approval state; vendors awaiting admin approval saw a raw error instead of the friendly "Waiting for approval" state. Matcher broadened (driver message unchanged).
3. `VendorAssignJobScreen` — on approve failure (stale/taken lead), the screen now refetches offers + vehicles so stale rows disappear immediately.
4. `PartnerHomeScreen` — removed dead `useWindowDimensions`/`width` left over from the removed chart.

Endpoint contract re-verified: `routesIndex.ts` mounts `/api/v1/vendor` → new client paths `vendorBookings` and `vendorDriverAssignVehicle` match exactly; validators (`vendorBookingsValidator`, `vendorDriversValidator`) match payloads; both new endpoints sit behind `authMiddleware` + `requireRole('vendor')`.

## Actual commands run & results

- `cd "mobile application" && npx tsc --noEmit` → **exit 0** (after the mid-session revert of two screens, re-verified post-re-apply).
- `cd backend && npm run lint` (tsc --noEmit) → **exit 0**, run 3× during the work.
- Simulator/device/backend E2E **not run** (no emulator/ADB/ Mongo instance verified in this environment) — see next section.

## Mock/demo data policy

All preview fallbacks remain strictly behind the existing `UI_PREVIEW_MODE` flag (`MOCK_VENDOR_BOOKINGS` etc.). No new mock values were added to live paths; no design-board fares/IDs reused as live data.

## Missing backend capabilities / unresolved rules (not faked)

1. **Per-driver document management after creation** — list API doesn't expose uploaded docs, and there is no doc-status API for vendor drivers; step-2 handles it at create; failures surfaced, listed as retry guidance. Needs a `GET` driver-documents endpoint to do it properly.
2. **Password reset for vendor drivers** — no API; credential overwrite only happens implicitly if recreated by phone. Left untouched intentionally.
3. **Password re_confirmation** — re-creating an existing phone overwrites credentials at backend (`vendorDriversService.create`); a safer update flow needs backend support.
4. **Vehicle removal with active assignments** — backend `removeVehicle` has no active-booking guard; UI shows a confirm dialog but server allows deletion. Reported; guard belongs backend-side.
5. **Vehicle-documents/verification per vehicle** — model has no per-vehicle document objects (only a maintenance note), so board-B "Documents/verification" is represented honestly by the note fields.
6. **Earnings semantics** — dashboard aggregates legacy `BookingModel`/`TransactionModel`; weekly history doesn't exist → card shows Today + All-time only.
7. Device/simulator visual QA and real-API smoke of the two new endpoints once the backend is redeployed to the tested cloud API.

## Remaining suggestions (non-blocking)

- Numeric unread badge on vendor Home bell (driver dashboards already have it).
- Vendor booking detail tap-through for Assigned/In-progress cards (verify-trip-otp surface exists backend-side).
- Paginate `GET /vendor/bookings` beyond 100 rows when fleets scale.
