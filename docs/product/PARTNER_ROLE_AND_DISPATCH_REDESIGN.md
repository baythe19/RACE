# Partner App: Towing Vendor and Driver Role Redesign

**Research report — 18 October 2026**
**Branch:** changes-v6-partner-role-dispatch (isolated from v5 working tree)
**Scope:** partner mobile, identity/auth, vendor membership, dispatch, tracking, and customer/admin contracts.
**Method:** source and product-flow audit followed by implementation review in the isolated v6 worktree. Metro and the Peach simulator were launched; welcome, login and Driver registration were inspected live. The backend/database integration and physical-device behavior were not exercised. The report separates implemented source changes from release gates that still require database, device, operational, or product validation.

## Recommendation

Reshape the partner app around two roles: **Towing Vendor** and **Driver**.

A Towing Vendor owns its fleet, invites already registered drivers, and dispatches an eligible driver with an owned tow vehicle to towing work. A Driver owns their identity and phone-OTP login, does not need a vehicle to register or accept driver-hire work, and may also retain Customer capability on the same account. If the driver accepts a vendor invitation, the same driver account receives vendor-assigned jobs and vehicle details. Vendors must not create driver passwords or silently attach a driver by phone.

This is a domain and dispatch change, not just a screen refresh. Account roles, membership consent, service-specific offers, assignment races, location access, notifications, and migration all need to agree.


## MVP readiness verdict

**Not ready for a customer-facing MVP launch yet.** The published v6 branch is an implementation scaffold that is ready for code review and limited UI inspection. It is not yet safe to dispatch live work: the active Vendor assignment path starts trips before Driver acknowledgment, location writes global user coordinates before validating the booking, a legacy vendor link can authorize dispatch, and fleet/Driver reservations are not proven race-safe. Customer booking identity/history and Admin/payout projections also have gaps. Close the P0 gates below and run database-backed and device-level end-to-end tests before calling the flow MVP-ready.
## Requirements captured

1. Partner role selection says **Towing Vendor** and **Driver**.
2. A customer can add the Driver capability to the same verified identity; registration does not replace Customer access.
3. Driver registration is self-owned and does not require a personal or tow vehicle.
4. A Towing Vendor can search opted-in, verified Drivers by name or phone and invite the selected account; only that Driver accepts/declines. Search returns minimal, masked identity and never exposes private documents or location.
5. Towing requests go to Towing Vendors. Vendors select an eligible linked driver plus an active owned tow vehicle.
6. Driver-Hire requests go to independent Drivers and Towing Vendors. A Vendor fulfills one by assigning an eligible linked Driver; no tow truck is required. One booking has one winning fulfillment path.
7. An independent Driver’s open-job feed contains driver-hire work only. Towing work reaches that driver only through a vendor assignment with the assigned fleet vehicle.
8. Linked drivers have a dedicated **My Vendor** page for vendor identity, membership state, assignments, assigned vehicle, and notifications.
9. Vendor can track the driver on a specific active job and see arrival/pickup/delivery milestones. Location sharing ends with the job.
10. Update backend permissions/data, customer and admin projections, notifications, migration, and partner navigation as one flow.

## Baseline behavior before v6 implementation

The table below records the original v5 behavior found during the source audit. It is not a description of the current v6 worktree; implemented v6 changes and remaining gaps are documented in the implementation snapshot near the end of this report.

| Area | Verified current behavior | Gap |
|---|---|---|
| Identity | User has one role: customer/vendor/driver. A verified phone cannot OTP-login under a different role. DriverSelfService changes a customer’s role to driver. Sources: backend auth roles, models/user.ts, services/auth.ts, services/driverSelf.ts. | Customer and Driver capabilities cannot coexist on one identity. |
| Driver registration/login | Partner role UI separates Self Driver (copy says owns a vehicle) from Vendor Driver (vendor-provided login/password). Registration still sends vehicle fields. | Wrong account split and vehicle assumption; vendor must stop controlling driver credentials. |
| Vendor adds drivers | Vendor can create a driver and password. claimByPhone immediately links a matching account without a driver acceptance step. Sources: services/vendorDrivers.ts and controller/vendorRoutes.ts. | No invitation/consent/revocation lifecycle; account discovery and document privacy risk. |
| Membership | driverProfile.vendorUserId holds one vendor; loginId/passwordHash/fleetSource also live on driver profile. | No auditable pending/accepted/revoked relationship; no explicit driver consent. |
| Driver jobs | Open offers can include both TowingBooking and DriverBooking; DriverJobs copy includes towing/roadside requests. Source: services/bookings/driverAssignment.ts and screens/partner/driver/DriverJobsScreen.tsx. | Direct Driver feed must be driver-hire only. |
| Vendor jobs | Vendor lists both TowingBooking and DriverBooking. Vendor approval always requires a fleet vehicle; it approves the vehicle first and a fleet driver self-claims later. Source: services/vendorBookings.ts and screens/partner/VendorAssignJobScreen.tsx. | Driver-hire work should not require a tow truck; vendor must choose the driver at dispatch. |
| Location | Driver current location is written to User. Current tracking REST endpoints authorize customer/admin, not vendor. Vendor booking rows have no location projection. Sources: services/driver.ts, bookings/driverBooking.ts, bookings/towingBooking.ts, vendorBookings.ts. | Vendor cannot load an authorized tracking snapshot, freshness, or milestones. |
| Background | Package targets Expo SDK 57 and has expo-location, but lacks expo-task-manager and expo-notifications. Current hook requests foreground location and reports while mounted. | No reliable closed-app push or configured background-location task. Must test a native build. |
| Prior docs | vendor-flow-map.md, partner-flow-map.md, and client flow docs explain the old credential/vendor-driver split. | Treat as historical; revise after the target contract is approved. |

Code evidence in one line: auth enforces one role; self-registration promotes customer to driver; vendor create-driver stores credentials; phone-claim has no consent; offers include two booking types; vendor approval requires a vehicle for either type; vendor tracking REST is absent.

## Target identity and membership

Keep one person identity per verified phone and add capabilities such as Customer and Driver. Selecting the active app area is not a new identity and cannot overwrite other capabilities. The server must authorize every selected context and resource; a client-supplied role is never authority.

Represent vendor-to-driver membership as its own relationship, with invitation state, timestamps, and actor/reason for revocation:

**Invited → Accepted (awaiting RACE verification if needed) → Active**
Other states: **Declined, Expired, Revoked, Suspended**.

- Provide opt-in Driver discoverability for name/phone search. Return only the minimum profile needed to select a Driver (name, service eligibility, verification state, masked contact); rate-limit and audit lookups. Exact-phone invitation fallback must return a generic response for non-discoverable accounts so it cannot enumerate registered numbers. Only the Driver's own account can accept.
- Driver signs in with their phone OTP and sees vendor identity/terms before accepting.
- RACE driver-document approval is independent from vendor membership. A vendor cannot approve its own driver’s RACE verification.
- Vendor sees only the profile/eligibility information required for dispatch. Government documents stay in the admin verification flow unless a separate need is approved.
- MVP default: one active vendor membership per driver. Multi-vendor work requires explicit shift/availability and dispatch rules.

Do not let vendor membership grant password reset, impersonation, or ownership of the driver’s account.

## Target flows and dispatch invariants

### Towing

Customer confirms towing → only approved Towing Vendors receive the offer → vendor selects an active tow vehicle and an eligible active member driver → server reserves booking, driver, and vehicle → driver acknowledges assignment → driver travels to pickup and reports milestones → vendor/customer see the same job state.

### Driver Hire

Customer confirms driver hire → eligible independent Drivers and Towing Vendors receive the request → an independent Driver accepts directly, or a Towing Vendor selects an eligible linked Driver → the backend commits exactly one path → the Driver acknowledges and performs service → customer/vendor see milestones.

If a vendor assignment is pending driver acceptance, suppress other claims for that booking. If the driver declines/times out, release reservations and reopen according to the dispatch policy. A vendor-assigned driver sees the assignment in **My Vendor**; a direct independent offer is not a towing lead.

### Invariants

- One active fulfillment assignment per booking.
- One active job per driver.
- One active towing job per tow vehicle.
- Driver-hire assignment requires a driver, not a vendor tow vehicle.
- Direct Driver offers never include towing requests.
- Vendor-linked drivers receive vendor work only when assigned.
- Simultaneous direct-driver acceptance and vendor assignment of one DriverBooking have one winner.
- Stale retries cannot reopen cancelled/completed work or duplicate assignment/status events.

Use conditional compare-and-set for booking, driver, and vehicle reservation. If one decision updates multiple MongoDB documents, first confirm the deployed topology supports MongoDB transactions. MongoDB documents single-document atomic writes and multi-document transactions on replica sets/sharded clusters; transactions cost more and should protect a real invariant. If unavailable, use idempotent reservations, compensating release, and crash recovery.

### State model

Separate booking/payment state from dispatch and trip progress:

- Booking/payment: request and payment confirmation, cancellation, final payment.
- Dispatch: open, offered, vendor assignment awaiting driver, direct-driver assignment, vendor-driver assignment, expired/reopened.
- Trip: en route to pickup, arrived, pickup/service confirmed, in progress, en route to destination, delivered/completed.

Towing milestones should include **en route → arrived → vehicle loaded/pickup confirmed → en route to destination → vehicle delivered → completed**. Retain customer OTP at the point it proves service start. Driver-hire has its own pickup/start/destination milestones and no vehicle-loaded step. Driver should accept vendor-assigned work before it is treated as staffed.

## Tracking, realtime, and permissions

Track a specific accepted active job, not every driver for the whole day.

- Start on accepted active work; tell the driver who sees it and why.
- Stop on completion, cancellation, unassignment, logout, or membership removal when no job is active.
- Keep booking-scoped latest coordinate, accuracy, device capture time, server receive time, and stale indicator. Do not display old coordinates as live.
- Vendor may read location only for its own active assigned booking. Customer may read only their own booking. Other vendors/drivers receive no location.
- Minimize location history and set a short retention policy; retain only what support/operations needs.
- If permission/network/background execution fails, show last-seen and manual milestones instead of claiming realtime.

Partner package is Expo SDK 57. Its official SDK docs require background location permissions, a top-level TaskManager task, and a native development build; platform restrictions can stop updates, including after app termination. Remote push on Android is unavailable in Expo Go; configure push credentials and test a development/release build on devices. The browser simulator can verify screens, not background execution.

Socket.IO rooms can deliver events to a server-managed subset, but room membership is not a permission check. Derive room access from the authenticated user and persisted booking/membership. Never trust a client-supplied room or booking ID alone.

| Actor | May read | May mutate |
|---|---|---|
| Customer | Own booking, assigned partner, own active-trip location | Create/cancel under policy, payment, rate completed service |
| Independent Driver | Eligible Driver-Hire offers and own jobs/profile | Own availability; accept/decline eligible offer; update own assigned trip/location |
| Vendor owner | Own vehicles, accepted linked-driver summaries, vendor offers/jobs | Invite/revoke; manage own fleet; assign a valid driver and, for towing, vehicle |
| Vendor-linked Driver | Own membership, vendor identity, assigned work/vehicle | Accept/decline invite/assignment; update only own trip/location |
| Admin | Scoped verification/operations data | Review/suspend with actor, reason, audit history |

## Screen change map

| Screen area | Keep | Change/add |
|---|---|---|
| Role selection | Two choices | Rename Vendor to Towing Vendor; explain driver needs no vehicle and can also be a customer. |
| Driver auth | Phone OTP | Remove Self Driver vs Vendor Driver credential path. |
| Driver registration | Personal data, license, skills, documents, review status | Remove mandatory vehicle step and vendor-owned password. Add service eligibility and invitation inbox. |
| Driver navigation/jobs | Home, Jobs, Account, current trip flow | Add My Vendor. Available feed shows Driver Hire only; add a Vendor Assigned segment. |
| Vendor Home/Jobs | Fleet metrics and list patterns | Use Towing Vendor wording; segment Towing, Driver Hire, Assigned, In Progress, Completed. |
| Vendor Drivers | List/search/work status | Replace “create driver” with invite registered driver; show consent, membership, and verification state. |
| Vendor Vehicles | Fleet registration/docs/status | Keep. Require a vehicle only for towing assignment. |
| Vendor assignment | Job summary and resource selection | Towing: select driver + truck. Driver Hire: driver only. Confirm in one server mutation. |
| Vendor tracking | Existing job details | Add authorized location map, freshness, milestones, assigned-driver status, and recovery/support state. |
| Admin | Driver/vendor verification | Add membership/dispatch audit. Keep RACE verification separate from vendor consent. |

Deactivate old entry points before deleting files. ADR-007 requires proving import graph safety. Preserve old record read paths during migration.

## Migration and rollout

1. Decide offer routing, linked-driver independent work, driver acknowledgement, payout ownership, roadside scope, and GPS policy before schema changes.
2. Add capabilities and membership data additively. Add service-specific assignment state while preserving legacy reads.
3. Reclaim vendor-created drivers with their own phone OTP and review/consent. Do not auto-activate old vendor links or disable their only login before reclaim.
4. Backfill old driverProfile.vendorUserId as legacy-unconfirmed membership. Require driver acceptance before dispatch.
5. Match old driver vehicleRegistration to an owned VendorVehicle by normalized registration; unmatched values remain unassigned for review.
6. Preserve completed/cancelled booking history. Enable new dispatch only for new requests; do not mass-rewrite history.
7. Pilot one vendor and small driver cohort. Test direct/vendor races, push, location permissions, and customer/vendor/driver views.
8. Retire vendor-created credentials, vehicle-required driver onboarding, and vehicle-only booking approval only after adoption/usage checks. Keep historical compatibility.

## Acceptance gates

1. Customer adds Driver capability without losing customer access or creating another identity.
2. Driver completes onboarding without a personal vehicle.
3. Vendor membership is inactive until driver accepts from their verified account.
4. Vendor cannot reset/own driver credentials, impersonate, see private documents before consent, or silently set availability.
5. Independent feed and alerts contain Driver Hire only; never towing.
6. Vendor can assign towing only to an approved member driver and active owned tow truck.
7. Vendor can assign Driver Hire without a towing truck.
8. Competing direct/vendor claims yield one winner; driver and vehicle cannot be double-booked.
9. Assignment appears in My Vendor with vendor/job/vehicle details; accept/decline updates vendor state.
10. Towing timeline has arrived, loaded/pickup-confirmed, destination, and delivered. Driver-Hire has its own milestones.
11. Vendor location is scoped to its active job, displays freshness, stops after job end, and rejects unauthorized IDs.
12. Device tests cover backgrounded, terminated, offline, denied/granted permissions, and resume. Browser preview is not a substitute.
13. Retries do not duplicate assignments, payouts, or status history.
14. Existing records remain readable and rollback is defined before legacy fields are removed.

## Decisions required before implementation

These are product decisions, not facts inferred from code. Suggested defaults are in bold.

1. **Driver-Hire routing is fixed by the request:** both eligible independent Drivers and Towing Vendors receive offers. Vendor fulfillment selects an eligible connected Driver, and the backend allows only one fulfillment winner.
2. **Can vendor-linked drivers accept direct Driver Hire jobs?** Recommend no while on an active vendor shift; add an explicit independent-work mode later if needed.
3. **Can drivers join multiple vendors?** Recommend one active vendor in MVP.
4. **Must the driver acknowledge vendor assignment?** Recommend yes with a deadline; do not count/track it as staffed until acceptance.
5. **Who pays a driver for vendor-fulfilled Driver Hire, and who owns refunds/commission?** Typed service-payment and demo PaymentTransaction records exist, but gateway processing, webhook reconciliation and service Vendor/Driver settlement are not implemented. Define a controlled manual pilot or a provider-backed contract before promising earnings.
6. **Roadside service routing remains an implementation boundary:** the client catalog includes roadside categories, but some APIs are incomplete. Classify each service as supported Vendor towing, Driver-Hire, or unavailable before sending offers; never route unsupported work silently.
7. **When does GPS sharing start?** Recommend after driver accepts an active job, not all-day.
8. **How are old vendor-created driver accounts reclaimed?** Recommend OTP proof, driver review/acceptance, then removal of vendor credentials.

## Planning estimate

This cross-app change is not a quick UI patch. Planning range for one experienced engineer: **3–6 weeks including backend, mobile, migration, and physical-device QA**, depending on dispatch, multi-vendor, payment, and background-tracking decisions. An MVP can be smaller if background GPS/push or automated payout is explicitly out of pilot scope.

## Follow-up code review: report alignment and additional risks (18 October 2026)

The original product recommendation follows the requested model. This follow-up review recorded baseline details and cautions used by the v6 plan; unresolved behavior is listed in the implementation snapshot and release gates below.

### Baseline findings used by the v6 plan

- Driver vehicle fields are optional in backend validation; the actual blocker is the mobile onboarding copy/validation that requires a vehicle type, registration number and ownership. Keep server registration vehicle-optional.
- The live role entry is PartnerWelcomeScreen. PartnerAuthNavigator registers the PartnerRoleSelection route with that welcome component, so PartnerRoleSelectionScreen itself is not rendered as the live role chooser. Change the reachable route rather than treating the dead screen as complete.
- The active vendor job route maps to PartnerActiveJobScreen, which invokes driver-active-job APIs and useDriverLocationReporting. That hook reports the current device location every 12 seconds. This is a concrete role-routing/privacy bug; vendor tracking needs its own read-only vendor view.
- Vendor-created driver records are currently marked isVerified=true without verified-phone proof. Migration must never treat that flag as OTP proof. Reclaim requires fresh phone OTP and driver acceptance while preserving historical work/documents.
- A deprecated direct-assignment API still exists beside the current vehicle-approval then driver-self-claim flow. Replace or version both paths; do not leave an alternate endpoint that bypasses driver acceptance or resource rules.
- Driver and booking updates have conditional claims, but the fleet vehicle has no server-side active reservation. UI-only reservedVehicleIds does not protect concurrent dispatch.
- Current vendor Socket.IO room authorization is partially scoped to matching vendorId. The missing tracking capability is a canonical vendor REST snapshot/projection, location freshness and milestones; do not describe all vendor socket access as absent.
- Driver GPS writes currently update global User.currentLocation; both booking schemas also retain driverLatitude/driverLongitude fields that are not the canonical write/read path. Choose a booking-scoped canonical source, define backfill/dual-read, and remove duplicate legacy fields only after compatibility evidence.
- Existing vendor identity is an embedded vendorProfile on User, while driverProfile stores a single vendorUserId. MVP can retain that user-owned vendor ID as the membership owner, but multi-user vendor organizations need a separate future product/model decision.
- Do not edit or rerun migrate-unified-users.ts: it is a one-time non-transactional migration that drops legacy collections. Add a separate additive, idempotent migration with dry run, measurable counts, rollback and old-client compatibility.
- Persisted in-app notifications and Socket.IO invalidation already exist; push/SMS provider hooks remain TODO. Extend existing systems rather than treating notifications as absent.
- mobile application/AGENTS.md still says SDK 54 while the actual package targets Expo ~57.0.30. Use the package lock and SDK 57 docs for native work and correct the stale instruction.

### Additional product decisions to resolve or record as MVP defaults

1. Driver discovery: Drivers control an explicit discoverability opt-in. Vendors may search opted-in, verified Drivers by name or normalized phone using minimal masked fields, rate limits and audit logging. Non-discoverable exact-phone invitations return a generic response and reveal no account existence, documents, or location.
2. Service matrix: classify every catalog service/roadside category as Vendor-only, Driver-Hire, or unavailable before emitting offers.
3. Driver-Hire vehicle semantics: customer's service vehicle is not the vendor's tow truck; never require a fleet vehicle for Driver-Hire.
4. Offer expiry, direct-vs-vendor timer, requeue, no-show, cancellation and driver/vendor responsibility need explicit rules.
5. GPS starts after the linked driver accepts an assignment. For towing, keep it active during the authorized dispatch window, including travel to collect the vendor truck if applicable; stop on terminal/cancelled state. Show stale/offline timestamps rather than a false live pin.
6. Assignment acknowledgement and each milestone need an authenticated actor, timestamp, idempotency key and audit history.
7. Settlement, commission, refund and payout ownership stay out of the code change until the business contract exists. Payment records and demo bookkeeping are present, but real gateway settlement and v6 vendor/driver payouts are not implemented.

### How this relates to the v6 execution plan

The ordered file-level plan and before/after UI map are in docs/plans/PARTNER_ROLE_DISPATCH_V6_PLAN.md. Existing docs/vendor-flow-map.md and docs/partner-flow-map.md describe the old credential and vehicle-first contracts; preserve them as historical until new flows ship, then version them with cutover and rollback notes. Do not silently rewrite an existing contract while the implementation still supports the old behavior.

## Research references

### Repository evidence
- backend/src/auth/src/roles.ts; backend/src/models/src/user.ts; backend/src/services/src/auth.ts
- backend/src/services/src/driverSelf.ts; backend/src/services/src/vendorDrivers.ts; backend/src/controller/src/vendorRoutes.ts
- backend/src/services/src/bookings/driverAssignment.ts; backend/src/services/src/vendorBookings.ts
- backend/src/models/src/driverBooking.ts; backend/src/models/src/towingBooking.ts; backend/src/models/src/vendorVehicle.ts
- backend/src/services/src/driver.ts; backend/src/services/src/bookings/driverBooking.ts; backend/src/services/src/bookings/towingBooking.ts; backend/src/services/src/socket.ts
- mobile application/src/screens/partner/auth/PartnerRoleSelectionScreen.tsx
- mobile application/src/screens/partner/auth/PartnerDriverAuthModeScreen.tsx
- mobile application/src/screens/partner/registration/driver/DriverRegistrationFlowScreen.tsx
- mobile application/src/screens/partner/driver/DriverJobsScreen.tsx; mobile application/src/screens/partner/VendorAssignJobScreen.tsx
- mobile application/src/hooks/useDriverLocationReporting.ts; mobile application/package.json
- docs/vendor-flow-map.md; docs/partner-flow-map.md; docs/client/CLIENT_USER_FLOWS.md; .agents/decisions/ADR-007-leftover-screens.md

### External primary sources
- OWASP API Security API1:2023 Broken Object Level Authorization: https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/
- MongoDB transactions and atomicity: https://www.mongodb.com/docs/manual/core/transactions/
- Socket.IO rooms: https://socket.io/docs/v4/rooms/
- Expo SDK 57 Location/background-location: https://docs.expo.dev/versions/v57.0.0/sdk/location/
- Expo SDK 57 TaskManager: https://docs.expo.dev/versions/v57.0.0/sdk/task-manager/
- Expo SDK 57 notifications: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/


## Additional customer/admin integration requirements

The independent customer/admin review adds several compatibility requirements to the v6 execution plan:

- Customer detail navigation currently lacks booking kind and probes separate towing/driver records by ID. Carry the explicit record kind through navigation, request selection, and cache keys; preserve a legacy fallback for historical callers.
- DriverBooking.vehicleId means the customer's vehicle. Store the vendor fleet truck in a separate assignment field and show both where relevant.
- Preserve three separate dimensions: record kind (legacy/towing/driver-hire), service catalog/category, and assignment source (independent/vendor). Do not overload the existing admin serviceType field.
- Keep legacy customer and admin histories readable. Add assignment, driver acknowledgement, vendor, fleet vehicle, and milestone data to projections additively.
- Admin manual assignment should remain an audited operations override and enforce the same driver/truck conflict constraints.
- Payment and settlement flows are outside this release; current payment stubs remain unchanged.

The file-level customer/admin implementation map and collision, legacy-history, and authorization regression scenarios are in [the v6 execution plan](../plans/PARTNER_ROLE_DISPATCH_V6_PLAN.md).


## Implementation snapshot and remaining gates (18 October 2026)

This snapshot reflects the isolated v6 worktree, not a deployed release. The original v5 checkout at /workspaces/RACE was left unchanged. The v6 implementation is published on origin/changes-v6-partner-role-dispatch; its source changes are in 88be358, and the active-state documentation update is in 0dca0c0. The branch may advance as this review is published.

### Implemented and statically verified

- The server now resolves Customer and Driver as compatible capabilities while keeping Towing Vendor separate. Authorization consults persisted user state instead of trusting only the client-selected partner mode.
- Driver OTP remains available for legacy vendor-linked accounts. The active Partner entry flow no longer asks a vendor to issue a Driver Login ID/password. The OTP handler now respects the backend onboarding flag, so returning complete accounts enter the app rather than registration.
- A separate vendor membership/invitation record supports phone lookup, invitation, Driver accept/decline, vendor roster, and revocation. Lookup responses are generic; existing Driver verification remains separate from vendor consent.
- Driver registration now requests Driver type and driving licence without requiring a personal vehicle or vendor fleet documents. The visible stepper now says “Driver Details”. The active flow now uploads real files through the authenticated storage endpoint and submits the returned durable URL; service credentials and full end-to-end storage behavior still need integration validation.
- Independent Driver offer selection is restricted to Driver-Hire. Vendor dispatch validates an accepted membership or a legacy embedded vendor link; the legacy path still bypasses the new Driver-consent rule and must be removed for new dispatch. Towing also needs an active vehicle owned by that vendor, while Driver-Hire does not.
- Driver has a My Vendor screen for invitations, membership, and vendor-assigned work. Vendor has a membership roster and service-aware assignment screen. Vendor job cards now have a Track action for assigned/active work; verify it in the live preview for both booking kinds.
- A booking-scoped location field and authorized vendor tracking endpoint/screen exist, but the current write path first updates global User.currentLocation, and treats DRIVER_ASSIGNED as active before the Driver accepts the job. Therefore the implementation does not yet meet the target privacy rule; do not describe pre-accept location as booking-authorized. Vendor tracking must start only after explicit per-job Driver acceptance and stop at terminal state.
- Foreground authenticated socket invalidation and REST refresh fallbacks are wired for booking, driver, vehicle and notification data; membership/invitation cache keys are not invalidated by those socket handlers, and membership screens rely on polling/manual refresh. This is not background push delivery. Vehicle fleet UI no longer exposes the old broken permanent Driver↔vehicle action; the availability count is based on active booking assignment records.
- Backend TypeScript lint, the focused partner-v6 role/dispatch audit, Partner mobile TypeScript lint, Customer app TypeScript lint, and git diff whitespace checks passed. The duplicate Mongoose index warning was removed.
- Admin web lint remains unverified because npm ci reports a workspace lockfile mismatch (missing @types/node@22.20.5 and undici-types@6.21.0); the lockfile was not modified.
- Customer npm ci reported 37 dependency advisories (12 moderate, 24 high, 1 critical). Review the affected packages and reachable paths before production; no automated audit fix was applied.

### Additional P0 gaps found in the latest source audit

1. Driver document upload is now wired in the active `DriverRegistrationFlowScreen` to `driverUploadDocument`, and registration submits only the returned stored URL. Still verify against configured storage and test upload retry, review, and app restart on a real session.
2. New vendor assignment still treats the booking as Driver acceptance and can set it en route immediately. Add per-job Driver accept/decline/timeout and safe release.
3. A truck can be selected for concurrent open jobs because dispatch does not reserve the fleet vehicle atomically. Also reject a fleet vehicle on Driver-Hire.
4. Legacy `driverProfile.vendorUserId` still authorizes new vendor dispatch/claim in some paths despite the consent-based membership model. Keep it only for history/continuation.
5. The controller's duplicate location emission has been removed. DriverService still writes global User.currentLocation before confirming that activeBookingId/type resolves to the matching owned booking in an operational state. Move validation ahead of any globally visible write; make booking-scoped location the canonical source and test stale pointers, terminal jobs, and wrong type/owner.
6. Partner AuthUser now carries server capabilities, but PartnerNavigator's app-area and screen guards still key off the scalar role. Customer+Driver coexistence is not yet usable through explicit app-area switching; derive access from capabilities and preserve the selected surface.
7. Customer list/detail routes and the primary typed REST query/cache paths now carry booking kind, but Redux, tracking and socket state still use bare IDs. The combined customer endpoint does not include records from the legacy Booking collection, so old customer trips are not yet guaranteed to appear. Admin typed links exist, but bare row keys, untyped legacy fallback, projections, and same-ID cases still need regression work.



8. Admin vendor detail exposes the full bank account number in its response and UI under the broad VENDORS_VIEW permission. Mask server output and UI, define least-privilege access, and add authorization/serialization tests before release.
### Client-document cross-check

The repository’s client baseline is in docs/client/CLIENT_OVERVIEW.md and docs/client/CLIENT_FEATURES.md; the detailed intended flow is docs/client/CLIENT_USER_FLOWS.md, and the gap snapshot is docs/client/CLIENT_DOC_VS_BUILD.md. These files describe an earlier v2/release4Aug2026 contract, so use them as background requirements and reconcile them with the new product decisions in this report rather than treating their old build scores or role model as current code facts.

- The client baseline confirms a two-app, one-admin, one-backend product; Driver-Hire and towing are separate customer services; service booking payments are advance plus final; and real gateway wiring is explicitly pending/stubbed. It names Razorpay/Stripe as candidates, but does not select one. Product must choose gateway, settlement ownership, commission, refund policy, and manual-pilot rules before payout implementation.
- The older client gap report marked bank holder/account/IFSC capture as missing. The current v6 branch now has authenticated Vendor bank/UPI capture and persists details; the Vendor screen shows Pending and the Vendor API masks the account number. No verification action or v6 payout settlement exists. Admin vendor detail currently returns and renders the full account number to users with VENDORS_VIEW access; mask it server-side and review access scope before release. Never show customer receipts as money already paid to a Vendor or Driver.
- The older client flow says a vendor creates/owns fleet drivers and a Driver may register their own vehicle. That conflicts with the newer user-approved design: Drivers are independently verified accounts, do not need a vehicle, and join a Vendor only with consent. The new role and consent rules in this report supersede those earlier flow assumptions.
- The client docs list roadside categories but also say some service types are “coming soon” or incomplete. Before opening offers, explicitly map each catalog item to Vendor towing, Driver-Hire, roadside provider, or unavailable. Do not route an unsupported roadside request as towing by default.
### Cross-surface and UI findings from the published-source recheck

- Driver discovery is narrower than the requirement. Invitation currently starts from an exact phone number and returns a generic result. There is no persisted Driver-controlled discoverability preference or opt-in name-search endpoint. Add consent settings, minimal masked search results, rate limits, and an audit trail before claiming “search by name or phone” is implemented.
- Connected Driver work mode is unresolved in code. Membership acceptance clears the legacy vendor pointer, while direct Driver-Hire feed classification still relies on that pointer. A linked Driver can consequently look independent and receive direct work. Decide whether a connected Driver can take independent jobs off shift, then enforce the same policy in offer selection and claim/reservation.
- Assignment status and the mounted Driver UI disagree with the target flow. Vendor assignment can mark a booking en route without a per-job Driver acknowledgement. The mounted DriverJobsScreen treats DRIVER_ASSIGNED as active and opens DriverActiveJobScreen; the separate PartnerJobsScreen acceptance controls are not the Driver route. Add an Awaiting response screen/state, Accept/Decline, deadline, notification, release/reopen, and distinct UI status before showing travel actions.
- Vendor Jobs does not clearly expose assigned work. The screen counts assigned work as in progress, but its filters do not have a matching Assigned state. Add an explicit assigned/awaiting-driver filter and align filter counts with row predicates so a new dispatch is findable.
- Realtime and first-load UI remain uneven. Membership queries poll, but the membership/invitation cache keys are not invalidated by the foreground socket handlers. My Vendor, membership roster, vendor assignment, and tracking initial-load paths use spinners. Add membership event invalidation and consistent skeleton/loading/error/retry states; do not call polling a push guarantee.
- Vendor membership notifications are persisted with entityType and entityId, but the notification API response drops those fields. PartnerNotificationsScreen also leaves the invitation info event out of Drivers & Vehicles and has no My Vendor tap route. A Driver can tap an invitation, mark it read, and remain on Notifications. Preserve a typed membership event/id, classify it, and deep-link to the pending invitation with REST recovery.
- Admin vendor detail exposes the full bank account number in its response and UI under the broad VENDORS_VIEW permission. Mask server output and UI, define least-privilege access, and add authorization/serialization tests before release.
- Booking identity is only partly typed end to end. Customer list/detail REST paths carry the booking kind, but Redux active-booking state and tracking/socket maps still use bare IDs, and backend socket authorization does not bind the kind. Two collections may contain the same ID. Use (bookingType, bookingId) for reducer state, query/cache, socket room/event, and authorization.
- Customer, Admin, and payout projections need their own contract pass. The combined Customer endpoint reads towing and Driver-Hire collections, not legacy Booking, so old trips are absent. Customer detail currently lacks the actual customer-vehicle projection, sets vehicleNumber empty, infers UPI from advancePaid and labels the raw booking kind. Admin service rows omit Vendor/fleet data and use bare IDs as React keys; untyped detail requests can fall back to legacy lookup. Admin service detail hardcodes online and estimatedFare regardless of payment state. Service PaymentTransaction records are booking-kind typed, but gateway processing and service settlement are not implemented; finance commission/payout aggregates remain legacy-transaction based. Vendor earnings may count service receipts while payout history remains legacy-only. These are data, UI and privacy gates, not completed dispatch behavior.
- Membership lifecycle and database safeguards are incomplete. EXPIRED exists without an expiry timestamp/worker; invitation/revocation races, suspended Vendor acceptance, reservation crash recovery, and additive migration are not covered by the focused static audit. Add retry-safe expiry/lock release, verify Vendor account state, and test against a disposable Mongo replica set before enabling new dispatch broadly.
### Still open before calling this production-ready

1. Vendor dispatch currently assigns a booking directly. A separate per-job Driver accept/decline/timeout flow and safe release path are not complete. The Driver's acceptance of a vendor membership is implemented; it should not be confused with acceptance of each dispatched job. The mounted Driver Jobs route must show this pending state before any arrived/en route action.
2. Pending vendor invitations currently have no expiry timestamp or cleanup path. The EXPIRED enum is present, but a stale invitation can retain the one-vendor Driver lock. Define lifetime, expiry, lock release, and resend behavior.
3. Driver reservation uses a conditional write with compensating release, but crash recovery is not proven; fleet vehicles have no server-side active reservation. Concurrent-claim, crash-recovery, and rollback behavior still need database-backed tests and stronger reservation invariants.
4. There is no additive dry-run migration and rollback runbook for existing scalar roles, embedded vendor links, and old credential-based Driver records. The old destructive one-time user migration must remain untouched.
5. Customer list/detail routes now carry booking kind and typed reads no longer probe towing then Driver-Hire by ID. Redux active state, tracking maps, socket room/event identity, older callers, and same-ID database tests remain open. The combined Customer endpoint also omits the legacy Booking collection, so legacy trips are not guaranteed to appear. Admin and customer projections need a regression pass that preserves the customer-owned vehicle separately from the vendor's fleet truck; the Admin list currently keys by bare ID.
6. Expo/FCM push delivery, background location, and foreground/background/terminated-device behavior have not been validated on Android or iOS. They need native configuration and physical-device tests.
7. Maps/navigation, real payment/refunds, account/security operations, and location retention remain separate product/operations gates. Typed payment records do not establish provider settlement or Vendor/Driver payouts.

### Runtime validation completed and remaining limits

Metro was already running on port 8082 and was left intact. Peach bridge and a headless simulator were started; the live welcome screen, login screen and Driver step 2 registration form were inspected. Hot reload confirmed the stepper now reads “Driver Details”. Peach reported no runtime console errors at the time checked. The backend API/database was not connected for a complete invite→assignment→tracking walkthrough, so persistence, migration, assignment races, push delivery, GPS privacy and physical Android/iOS behavior remain unverified.
