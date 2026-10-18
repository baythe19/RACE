# Partner Role and Dispatch Redesign v6 - Execution Plan

**Branch:** changes-v6-partner-role-dispatch
**Workspace:** isolated Codespace worktree at /workspaces/RACE-v6-partner-role-dispatch
**Status:** implementation in progress; static checks pass; Peach simulator live UI checked on 18 October 2026
**Contract revision:** 2
**Updated:** 18 October 2026

## Goal

Replace the old partner model with two clear modes: Towing Vendor and Driver. A Driver is a verified person account and does not need to own a vehicle. A Towing Vendor owns fleet vehicles and may invite an already registered Driver. Customer and Driver access can coexist on the same verified person account.

The detailed product rationale, screen map, source audit, migration cautions, and research references live in [the product report](../product/PARTNER_ROLE_AND_DISPATCH_REDESIGN.md).

## Target flows

### Driver

1. Sign in through phone OTP; retain existing Customer capability.
2. Complete Driver identity, driving licence, and required identity/profile documents. No fleet vehicle or RC is required.
3. See independent Driver-Hire work in the Driver Jobs feed.
4. If invited by a Towing Vendor, review the vendor and accept or decline. An accepted relationship appears in My Vendor.
5. See vendor-assigned work, the assigned vendor fleet vehicle for towing, vendor details, and trip progress.
6. Report location only for an active assigned booking. Vendor tracking reads that booking-scoped Driver location, never the vendor handset location.

### Towing Vendor

1. Complete vendor onboarding/verification and register vehicles owned by the business.
2. Search opted-in, verified Drivers by name or phone; show only minimal masked profile fields, then invite the selected account. For non-discoverable accounts, exact-phone invite returns a generic result. Do not create or reset Driver credentials.
3. Wait for the Driver to accept before dispatch.
4. For towing, assign one eligible accepted Driver and one active vehicle owned by this vendor. For Driver-Hire, assign an eligible Driver and no tow vehicle.
5. See booking-scoped Driver location and milestones while the assignment is active.

### Invariants

- Persisted user capabilities and server-side membership/resource ownership authorize actions; the client-selected app mode is not authorization.
- A Driver can keep Customer access while enabling Driver access. Towing Vendor and Driver are separate account types.
- An independent Driver cannot accept towing work directly. Towing must come through a Towing Vendor and its fleet.
- The customer vehicle and vendor fleet tow truck are separate fields and must never overwrite one another.
- One booking, Driver, and tow truck cannot be actively assigned to competing work.
- Location sharing is scoped to the assigned Driver and active booking, has freshness metadata, and ends at a terminal state.
- Persist canonical state before emitting realtime invalidation. Reconnect and resume always refetch server state.
- Existing booking history, admin views, and customer routes remain readable during migration.

## Implemented in this worktree

- Added a capability resolver and authorization middleware that permit Customer + Driver while keeping Vendor separate.
- Kept the existing OTP path usable for Drivers with legacy vendor-linked accounts; active navigation no longer asks vendors to distribute Driver passwords.
- Added a separate Driver-Vendor membership record and vendor invite/list/revoke plus Driver invitation read/respond APIs. Phone lookup has generic responses, Driver consent is required, and old embedded vendor credential links are cleared on response/revocation.
- Changed Driver onboarding to request Driver type and driving licence instead of a personal vehicle registration; required documents no longer include fleet RC/insurance/photos. The active consolidated flow now uploads selected files to the backend storage endpoint, shows transfer progress, keeps the returned durable URL, and blocks registration when a real upload is missing.
- Restricted independent Driver offer selection to Driver-Hire while preserving a compatibility path for old vendor-linked drivers.
- Changed vendor dispatch to require an accepted eligible Driver; towing additionally requires an active vendor-owned vehicle, while Driver-Hire has no truck requirement.
- Added Driver My Vendor and Towing Vendor membership screens, service-aware assignment UI, and a separate vendor booking tracking screen.
- Scoped Driver location writes to a matching active booking and added an authorized vendor tracking endpoint with stale-location handling.
- Added foreground socket invalidation/refetch hooks with bounded REST refresh fallbacks.
- Added a focused backend offer-routing/role/dispatch audit script.
- Corrected Driver registration stepper wording and role-specific login claims; OTP now trusts the backend onboarding flag so returning Drivers are not forced through signup.
- Added Vendor Track entry on assigned/active job cards. Removed the broken permanent Driver↔vehicle link UI and derive fleet availability from active booking assignments.
- Corrected Driver preview fixtures so independent offers are Driver-Hire, with no personal truck/RC implication.
- Passed explicit booking kind from Customer booking lists into detail reads and removed collection probing by ID; removed the duplicate Driver location emission in the controller.
- Updated the product report and this plan with cross-surface customer/admin compatibility requirements and a file-level change matrix.

## Verification run

- Backend TypeScript lint: passed.
- Backend partner-v6 role/dispatch audit: passed.
- Partner mobile TypeScript lint: passed after the Driver registration copy/style cleanup.
- Customer app TypeScript lint: passed after installing its checked-in lockfile.
- Admin web TypeScript lint: not run; clean install is blocked because the workspace package lock omits @types/node@22.20.5 and undici-types@6.21.0. The lockfile was left unchanged.
- Customer dependency audit during npm ci reported 37 advisories (12 moderate, 24 high, 1 critical); triage them before a production release.
- git diff --check: passed.
- Duplicate-index warning for driverLockKey: removed by keeping one explicit unique sparse index.
- Peach headless simulator launched against the existing Metro server on port 8082. Welcome, login, and Driver registration flow were inspected. The step 2 form and updated stepper rendered; full backend-connected flow, browser/iOS simulator, and physical-device checks remain open.

## File-by-file change map

This is the implementation contract for the next passes. `Keep` means preserve the existing data contract or behavior that is already correct; `Change` names the concrete source work; `UI effect` describes what the user will see. Where a risky backend invariant is not yet implemented, the row remains a release gate rather than claiming the current build is done.

### 1. Account identity and role selection

| Files | Keep | Change | UI effect and validation |
|---|---|---|---|
| `backend/src/auth/src/roles.ts`, `backend/src/middleware/src/role.ts`, `backend/src/services/src/auth.ts`, `backend/src/services/src/driverSelf.ts` | Persisted server-side capabilities; Customer + Driver may coexist; Towing Vendor remains distinct. | Ensure every OTP/login/refresh path returns the full capability set and registration does not downgrade an existing Customer. Add a migration-safe capability resolver for old scalar roles. | A verified Customer can add Driver access without losing Customer pages. Test OTP, refresh, token authorization, suspended-user rejection, and role switching. |
| `mobile application/src/navigation/PartnerAuthNavigator.tsx`, `PartnerAppNavigator.tsx`, `mobile application/src/screens/partner/auth/PartnerWelcomeScreen.tsx`, `PartnerLoginScreen.tsx`, `PartnerOtpVerificationScreen.tsx`, `PartnerVendorDriverLoginScreen.tsx`, `mobile application/src/services/authService.ts`, `mobile application/src/store/partnerRegistrationStore.ts`, `mobile application/src/types/auth.ts`, `mobile application/src/types/partnerNavigation.ts` | Keep separate entry choices for Driver and Towing Vendor; keep phone OTP as account proof. | Represent user capabilities separately from the selected surface in `AuthUser` and route guards. Trust the backend OTP response: route verified Drivers to their account instead of forcing registration; retain Customer access and show the correct Driver/Vendor destination. Replace the old login benefit copy. The OTP handler and role-specific login/welcome copy are updated in this worktree; capability-aware app switching remains open. | Driver sees Driver-Hire plus vendor-assigned work; Vendor sees towing/Driver-Hire work, fleet and connected Drivers. No claim of guaranteed settlement or instant roadside work. Test fresh and existing users, dual capability, back navigation, OTP retry and app relaunch. |
| `mobile application/src/constants/partnerRegistration.ts`, `mobile application/src/components/partner/DriverRegistrationLayout.tsx`, `mobile application/src/screens/partner/registration/driver/DriverRegistrationFlowScreen.tsx`, `DriverReviewScreen.tsx` | Keep identity, licence and required document collection. | Replace stale vehicle step/summary labels with Driver details; registration must not request fleet RC or require a personal vehicle. Keep the vendor fleet form in the Vendor flow only. The live stepper label was corrected in this worktree. The active consolidated flow now posts camera/gallery/PDF files to the authenticated `driverUploadDocument` endpoint, tracks actual upload progress, stores the returned durable URL and blocks submit when a real document has no server URL. Preview sample files remain gated to explicit UI preview mode; verify storage configuration, retry and end-to-end review behavior. | Stepper, review and error copy consistently say Driver details. A Driver can finish signup without owning a vehicle. UI regression gate covers every step and keyboard focus. |

### 2. Towing Vendor fleet and Driver consent

| Files | Keep | Change | UI effect and validation |
|---|---|---|---|
| `backend/src/models/src/driverVendorMembership.ts`, `backend/src/database/src/indexes.ts`, `backend/src/services/src/driverVendorMembership.ts`, `backend/src/controller/src/vendor.ts`, `backend/src/controller/src/vendorRoutes.ts`, `backend/src/services/src/vendorDriversValidator.ts` | Canonical membership record; generic non-discoverable phone lookup response; opt-in verified Driver search by name/phone; Driver-owned accept/decline; one active/pending vendor lock. | Add opt-in directory search by name or normalized phone with rate limiting, masked/minimal profile projection and audit; keep generic exact-phone fallback for non-discoverable accounts. Add invitation expiry and idempotent lock release; reject acceptance when vendor account is suspended; make legacy links non-authorizing for new dispatch while preserving history/active trips. Current backend still accepts the legacy embedded link for new dispatch, so consent must be enforced before release. | Driver sees who invited them, permission scope and clear Accept/Decline. Vendor sees Pending/Active/Expired, never a Driver password. Test consent ownership, lookup privacy, expiry races, suspended accounts and duplicate invites. |
| `mobile application/src/screens/partner/VendorDriversScreen.tsx`, `VendorDriverMembershipsScreen.tsx`, `driver/DriverMyVendorScreen.tsx`, `mobile application/src/services/vendor/vendorDriversApi.ts`, `vendorMembershipApi.ts`, `useVendorMembershipQueries.ts`, `PartnerNavigator.tsx`, `PartnerTabBar.tsx` | Keep membership roster and Driver My Vendor destination. | Replace permanent legacy Driver-to-vehicle linking with invite/manage membership and per-job assignment. Ensure an accepted Driver has a visible connected Vendor card and can leave/report a connection. Add a visible navigation entry for My Vendor and pending invitations. | Vendor can search opted-in verified Drivers by name/phone, review minimal masked profile, send/cancel invite, and see state; non-discoverable phone lookup does not reveal account existence. Driver gets a dedicated Vendor page with company, status, assigned work and vehicle. Test invite notification plus REST recovery after socket loss. A job-card Track action was added for Vendor active/assigned bookings in this worktree; verify both service kinds in Peach. |
| `backend/src/services/src/vendorDrivers.ts`, `backend/src/controller/src/vendorRoutes.ts`, `mobile application/src/screens/partner/VendorVehiclesScreen.tsx`, `mobile application/src/services/vendor/vendorVehiclesApi.ts` | Keep vendor-owned fleet vehicles and vehicle verification. | Remove or deprecate old permanent Driver↔vehicle endpoints from the active UI; do not assign a driver globally to a truck. The fleet UI action/modal was removed in this worktree, and availability now derives from active booking assignments. Vehicle is selected per towing booking. Add vehicle availability/reservation checks in dispatch. | Vehicle list shows fleet ownership and current availability; driver name appears only on an active assignment. Test vehicle CRUD and concurrent assignment. |

### 3. Offer routing, dispatch, acceptance, and trip milestones

| Files | Keep | Change | UI effect and validation |
|---|---|---|---|
| `backend/src/services/src/bookings/driverAssignment.ts`, `backend/src/services/src/vendorBookings.ts`, `backend/src/services/src/vendorBookingsValidator.ts`, `backend/src/services/src/bookingStatusConstants.ts`, `backend/src/models/src/driverBooking.ts`, `towingBooking.ts` | Keep separate booking collections and separate customer `vehicleId` versus vendor `assignedFleetVehicleId/Label`. Independent Driver-Hire eligibility and vendor-owned towing fleet validation are directionally correct. | Require ACTIVE membership (legacy vendor pointers only for read/continuation), forbid a fleet vehicle for Driver-Hire, reserve Driver and vehicle atomically or with durable recoverable reservations, and release on reject/cancel/complete/timeout. Vendor assignment must be `DRIVER_ASSIGNED` awaiting Driver acceptance; only Driver acceptance moves to `DRIVER_EN_ROUTE`. Carry typed booking kind on every state/event. | Vendor sees “Awaiting driver”; Driver receives the job with Accept/Decline; accept begins en route; decline/expiry safely reopens the offer. Add service-specific towing milestones (arrived, vehicle loaded/collected, delivered) with actor/time/idempotency; Driver-Hire gets its own start/finish steps. Test one-driver/one-truck race, retries, timeout, decline, crash recovery, and no stale legacy authorization. |
| `backend/src/services/src/driver.ts`, `backend/src/controller/src/driver.ts`, `backend/src/controller/src/driverRoutes.ts`, `mobile application/src/screens/partner/PartnerJobsScreen.tsx`, `driver/DriverDashboardScreen.tsx`, `driver/DriverActiveJobScreen.tsx`, `mobile application/src/services/driver/driverApi.ts` | Keep Driver-Hire requests for independent eligible Drivers; keep vendor-assigned towing work in the connected Driver surface. | Make feed and accept/decline policies membership- and work-mode-aware. Add an explicit shift/availability rule for connected Drivers so vendor work and independent Driver-Hire offers cannot conflict. Remove duplicate location emission in the controller. | Driver sees only the correct queue, clear job type, customer pickup/drop, selected fleet vehicle where relevant, and an actionable Accept/Decline. Test a dual Customer+Driver account and an active vendor member across both feeds. |
| `backend/src/services/src/vendorBookings.ts`, `backend/src/services/src/socket.ts`, `mobile application/src/screens/partner/VendorBookingTrackingScreen.tsx`, `mobile application/src/services/vendor/vendorBookingsApi.ts`, `useVendorRealtimeSync.ts`, `PartnerNavigator.tsx` | Keep vendor-owned tracking endpoint, active-state check, stale-location cutoff and REST refresh fallback. | Require explicit booking type in socket authorization/events; only publish Driver GPS for the accepted assigned booking; add accuracy, capturedAt/receivedAt, retention/clear-on-terminal and reconnect snapshot. Persist first, emit second. | Vendor job detail shows a map/list location, last update age and milestone confirmation; no vendor handset GPS presented as Driver GPS. Stops showing location when stale, unassigned or terminal. Test wrong vendor, wrong Driver, wrong booking type/ID collision, stale GPS and terminal cleanup. |

### 4. Customer app compatibility

| Files | Keep | Change | UI effect and validation |
|---|---|---|---|
| `customer application/src/screens/BookingsScreen.tsx`, `src/types/navigation.ts`, `src/services/bookings/useBookingQueries.ts`, `src/services/bookings/bookingApi.ts`, `src/services/bookings/serviceBookingApi.ts` | Keep combined bookings endpoint and its `bookingType`; keep explicit typed cancellation, rating and payment APIs. | Pass `bookingType` from list through detail/tracking/rating routes, query keys and local cache selection. When type is known, call exactly that collection endpoint; remove towing-first/driver-fallback probing. Audit older booking screens and callers before making type required. | Opening same-ID towing and Driver-Hire records always shows the correct booking. Test a fixture with identical IDs in both collections, cache isolation, tracking, cancellation and rating. |
| `customer application/src/screens/bookings/BookingDetailScreen.tsx`, `src/screens/booking/BookingDetailScreen.tsx`, `src/screens/booking/LiveTrackingScreen.tsx`, `src/services/tracking/trackingService.ts`, `src/hooks/useBookingTracking.ts` | Keep route-aware tracking and existing customer-owned history. | Carry booking type into every navigation callback and make tracking listeners/poll/socket state keys composite (`type:id`); do not share latest updates by ID alone. | Customer can follow the right job without a socket/poll collision. Old history remains readable with an explicit legacy fallback until migration is complete. |
| `backend/src/services/src/bookings/driverBooking.ts`, `combinedBooking.ts`, `customer application/src/types/serviceBooking.ts`, `src/types/booking.ts`, customer booking cards/detail/tracking screens | Keep customer vehicle and vendor tow truck as different backend fields. | Add a customer vehicle summary to combined/detail projection; expose assigned fleet vehicle independently. Never map `vehicleNumber` to an empty string when the booking has a customer vehicle. | Towing detail clearly labels “Your vehicle” and “Assigned tow truck”; Driver-Hire shows no tow truck unless one is explicitly part of the service. Test projection and UI display. |

### 5. Admin and backend operations

| Files | Keep | Change | UI effect and validation |
|---|---|---|---|
| `backend/src/services/src/admin/adminBookings.ts`, `adminServiceBookings.ts`, `race-admin/apps/admin-web/src/components/bookings/booking-detail-content.tsx`, admin booking list/detail hooks and routes | Keep `?type=` in Admin detail routes and `(id,type)` query keys; preserve legacy admin history and permission checks. | Populate real service-booking vendor fields and assigned fleet vehicle; distinguish record kind, service category, assignment source, customer vehicle, vendor and fleet truck. Decide and audit whether admin assignment is a global override or must obey active membership; never silently use legacy pointer. | Admin can understand and audit the complete job without confusing Driver-Hire with Towing or customer vehicle with vendor truck. Test both booking kinds, same-ID collisions, filters, assignment and audit trail. |
| `backend/src/services/src/admin/notificationService.ts`, `backend/src/services/src/socket.ts`, mobile notification and realtime services | Keep persisted in-app notification before user-scoped socket invalidation. | Add durable push/outbox retry for offline/background delivery after device tokens and provider credentials are configured. Socket joins/updates must include booking kind. | Foreground updates refresh immediately; background/closed app delivery is a separate validated release gate, not promised by current socket behavior. Test reconnect/refetch and idempotent notification delivery. |

### 6. Migration, privacy, payments, maps, and tests

| Files / workstream | Keep | Change | UI effect and validation |
|---|---|---|---|
| `backend/src/database/src/migrate-unified-users.ts` (do not rerun/edit), new additive `backend/src/database/src/migrate-partner-v6.ts`, `docs/plans/remaining-work-ledger.md` | Preserve prior customer, Driver, vendor and booking history. Keep legacy credentials only during verified reclamation. | Add dry-run-by-default, idempotent capability backfill with counts/checkpoints; stage old vendor links as consent-required and non-dispatchable; provide rollback and staged cohort flag. Never auto-consent or overwrite an account. | Existing users are prompted to claim/confirm access; no credential is silently changed. Test dry run, repeat run, partial failure and rollback on disposable DB. |
| `backend/src/services/src/bookings/bookingPayment.ts`, payment controllers/services, `customer application/src/hooks/useServiceBookingPayment.ts`, `useFinalPayment.ts`, `race-admin/apps/admin-web` finance/refund surfaces, client payment requirements document | Keep production guards against pretending stub payments are live. | Choose either a controlled manual-payment pilot contract or a real gateway. For gateway: order/session creation, signed webhook verification, idempotent reconciliation, refunds, vendor settlement/commission and admin audit. Read the client requirements document before changing checkout or payout behavior. | UI says the true payment state and never promises settlement before confirmation. Run duplicate/forged webhook and refund/reconcile tests; manual pilot requires a documented operator receipt/reconciliation path. |
| `mobile application/src/data/mockPartnerData.ts`, `mobile application/src/screens/partner/driver/DriverJobsScreen.tsx`, `mobile application/src/screens/partner/PartnerJobsScreen.tsx` | Keep mock data clearly preview-only. | Remove personal RC/insurance fields from Driver fixtures, show Driver-Hire offers to independent Drivers only, and keep towing only as completed history or a vendor-assigned job. Mock Driver-Hire offers and empty-state copy were corrected in this worktree. | Peach preview should not contradict production eligibility; assert offer type and linked fleet vehicle in assigned fixtures. |
| `mobile application/src/screens/partner/PartnerActiveJobScreen.tsx`, `DriverActiveJobScreen.tsx`, map/location integration, Expo config and backend location policy | Keep current pickup/drop and booking-scoped GPS contract. | Map and turn-by-turn navigation are a separate researched milestone: choose provider, key restrictions/billing, route/polyline, permissions, background behavior, ETA, offline/errors and native Expo config. Keep a non-map address fallback. | Map appears only when map SDK config and location permission exist; app remains usable without it. Validate Android/iOS builds and API billing before release. |
| Backend integration suite, customer/admin typechecks, partner mobile lint, Peach/Android/iOS test checklist | Keep existing focused role/offer audit as a fast check, not end-to-end proof. | Add disposable Mongo replica-set tests for consent, assignment concurrency, location ownership, booking-kind ID collision, migration, payment idempotency and notification retries. Keep expected server state and UI assertions together. | Release review has evidence for persistence and screen behavior; static lint alone cannot pass the MVP gate. |

### Implementation order and dependency gates

1. Freeze API vocabulary and state transitions: `Driver-Hire` offers go to independent Drivers and Towing Vendors; towing; opt-in name/phone discovery; membership `PENDING/ACTIVE/DECLINED/REVOKED/EXPIRED`; per-job Driver acknowledgement; vehicle reservation and booking kind.
2. Fix account/capability and consent authorization before shipping mobile entry points; legacy links cannot authorize new assignments.
3. Add safe dispatch reservations and accept/decline with integration tests before surfacing dispatch actions.
4. Wire Driver/Vendor screens to these API states, then add tracking and typed realtime events.
5. Update customer and Admin projections/routes without breaking old booking history.
6. Ship additive migration behind a staged cohort after dry-run counts and rollback are reviewed.
7. Complete payment and maps only under their explicit MVP decisions; do not label them production-ready while stubs or placeholder maps remain.

## Remaining release gaps

| Priority | Gap | Why it matters | Next validation or work |
|---|---|---|---|
| P0 | Driver assignment acknowledgement and timeout/release are not fully implemented end to end | Current vendor dispatch assigns the booking directly; a Driver cannot yet explicitly accept/decline a newly dispatched job and trigger a safe release path | Define assignment state, notification, idempotent accept/decline/timeout, and release/reservation behavior |
| P0 | Driver and vehicle double-book prevention is not atomic across the complete dispatch | Current booking/driver compare-and-set checks are compensating; a concurrent vendor/direct claim or crash can leave a partial reservation | Add disposable-database concurrency tests and atomic/repairable Driver + vehicle reservation |
| P0 | Legacy vendor profile links can still authorize new dispatch | Consent is the new membership contract, but `vendorUserId` remains accepted by some claim paths | Require ACTIVE membership for new assignments; retain legacy links only for history and already-active trips; test denial and invitation recovery |
| P0 | Driver location can still be written/emitted using a stale global pointer | The location controller writes global current location before checking a matching active booking and may emit a duplicate event | Remove duplicate controller event emission (done); then make the active assignment and booking type the only write/emit authorization. Test wrong IDs, terminal jobs, stale pointers and ownership |
| P0 | Real document upload has not been verified against configured storage | The mobile flow now calls the authenticated upload endpoint and uses the returned URL, but static checks do not prove storage credentials, persistence or review visibility | Run upload→registration→admin review using a real disposable account; test retry, file limits and app restart |
| P1 | Mobile does not yet model Customer + Driver capabilities as separate state | Backend supports both capabilities but client auth types/app routing still rely on one scalar role | Add capability-aware auth hydration and test both customer and partner app entry without losing either role |
| P1 | Pending vendor invitations do not expire automatically | EXPIRED exists as a model state but no expiry timestamp or cleanup path releases the Driver lock | Add a bounded invitation lifetime, lazy/worker expiry, and retry-safe lock release |
| P0 | Existing accounts and bookings need an additive migration and rollback plan | New capability and membership data must coexist with scalar role and embedded vendor fields | Create dry-run/idempotent migration with counts, backup, rollback, and staged credential retirement; do not rerun the destructive legacy migration |
| P0 | Customer/Admin contract needs end-to-end validation | Separate towing and Driver-Hire collections can have colliding IDs; Admin has legacy and service-booking projections | Carry record kind through customer routes/cache/API; show vendor fleet truck separately from customer vehicle; verify old history and audited admin override |
| P1 | Push and terminated-app delivery are not enabled | Foreground sockets/polling do not guarantee delivery while the app is backgrounded or closed | Configure Expo/FCM credentials and validate Android/iOS physical devices and notification permissions |
| P1 | Background location is not enabled | Current reporting depends on app foreground activity | Add a consented, battery-aware native background task only after policy and device QA |
| P1 | Maps and turn-by-turn navigation remain a separate feature | This role/dispatch work does not replace the map UI or provide production navigation | Research provider/API/billing, route UX, offline/error handling, and Android/iOS native configuration separately |
| P1 | Payment and refund production flow remains stubbed/manual | A completed service is not a settled payment | Product/operations must choose gateway versus controlled manual pilot, then implement webhooks, reconciliation, refunds, and audit |
| P1 | No disposable Mongo end-to-end suite covers membership and dispatch races | Static audit and TypeScript checks cannot prove persistence, authorization, concurrency, or retry behavior | Add integration tests against a disposable Mongo replica set before release |
| P2 | Production operations and privacy lifecycle need policy | Location retention, admin access, incident handling, backup/restore, and verification SLAs are undefined | Document operating owner, retention, permissions, runbooks, backup restore drill, and alert thresholds |

## Migration and rollout safeguards

- Do not modify or rerun backend/src/database/src/migrate-unified-users.ts; it is a destructive one-time migration.
- Keep scalar roles and legacy vendor credential fields until existing accounts are safely reclaimed by verified phone OTP.
- Introduce capability/membership data additively and make migration rerunnable with dry-run reporting.
- Roll out server compatibility before mobile changes; monitor login, invite, assignment, and tracking failures.
- Keep old customer/admin records readable. Do not rename or overload booking record-kind, service-category, and assignment-source fields.
- Use a feature flag or staged cohort for new dispatch. Define rollback to the old read path without reactivating password sharing.
- No commit or push has been made from this worktree.

## Acceptance gates

- Customer + Driver access survives login, refresh, OTP, and token renewal.
- A vendor cannot silently attach or impersonate a Driver; invitation requires the Driver's own consent.
- Independent Driver feed contains Driver-Hire only.
- Towing assignment requires an accepted member Driver and an active vendor-owned tow vehicle.
- Vendor Driver-Hire assignment has no vehicle requirement.
- Concurrent assignment tests prove one booking/Driver/truck winner and safe rollback on failure.
- Driver sees vendor relationship, assignment, fleet vehicle when applicable, notifications, and job state.
- Vendor tracking is booking-scoped, fresh, authorized, and unavailable after terminal states; vendor handset GPS is never presented as Driver GPS.
- Customer and Admin correctly distinguish record kind, customer vehicle, fleet vehicle, vendor, Driver, and legacy status history.
- Android/iOS device checks cover login, invite consent, assignment, foreground/background/terminated delivery, GPS permission, reconnect, and resume.
- Real payment/refund and background push/location gates are satisfied or explicitly excluded from the MVP launch contract.
