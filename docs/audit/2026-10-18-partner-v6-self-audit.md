# Partner v6 implementation, integration, and legacy self-audit

**Audit date:** 18 October 2026
**Repository:** teamwebstarts-cmyk/RACE
**Branch reviewed:** changes-v6-partner-role-dispatch
**Published branch HEAD:** 03d71df7016adc3129721cd771f0adadfad695c2
**Source snapshot:** v6 implementation commit 88be358; later 6939652 and 03d71df commits are documentation-only rechecks.
**Product contract:** [Partner App: Towing Vendor and Driver Role Redesign](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/docs/product/PARTNER_ROLE_AND_DISPATCH_REDESIGN.md)
**Implementation plan:** [Partner Role and Dispatch Redesign v6](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/docs/plans/PARTNER_ROLE_DISPATCH_V6_PLAN.md)

## Executive finding

The Towing Vendor/Driver redesign is **partially implemented, but not complete end to end and not ready for live dispatch**. Registration, membership, fleet, assignment, tracking and typed booking building blocks exist. The core workflow still has safety and data-integrity failures: a Vendor assignment can be recorded as Driver-accepted and en route before the Driver accepts that specific job; the location service writes a global user location before booking validation; an old Vendor link can authorize some new dispatch; and the server does not reserve a tow truck against concurrent assignments.

Customer and Admin apps are only partly aligned with the new booking model. Some Customer list/detail routes are typed, but old trip history, customer-owned vehicle information, composite booking IDs in state/socket tracking, Admin projections, payment truth, payout reconciliation and bank-data privacy remain open.

The prior product report and implementation plan are strong (**8/10 for requirement coverage and actionability**). The weighted source/release readiness score is **35/100**. This score measures whether the requested experience is verified and safe to ship, not the amount of work completed.

This audit changed no application, backend, database, migration, configuration or running service. It creates only this requested Markdown review document.

## Scorecard and rubric

Rubric: 0 = absent; 2 = partial scaffold with blocking gaps; 5 = mostly present but not proven end to end; 8 = complete with minor gaps; 10 = verified against acceptance tests.

| Dimension | Score | Weight | Weighted points | Why |
|---|---:|---:|---:|---|
| Partner screens, navigation and role flow | 5.5/10 | 25% | 13.75/25 | Driver/Vendor onboarding, fleet, membership, My Vendor and tracking screens exist. Active navigation still relies on a scalar role, the mounted Driver route lacks per-job assignment response, and the live walkthrough could not be verified. |
| Backend and database correctness | 2/10 | 35% | 7/35 | Membership and tracking APIs exist, but dispatch can bypass per-job consent, legacy Vendor authorization remains, location validation is late, vehicle reservation is absent, and migration/database tests are absent. |
| Customer and Admin integration | 4/10 | 20% | 8/20 | Typed booking requests exist in places; legacy history, composite IDs, vehicle/payment projections, Admin assignment data and bank privacy are incomplete. |
| Legacy retirement and migration safety | 3/10 | 20% | 6/20 | Some old UI paths were removed. Old identity fields and authorization paths remain, with no additive migration or rollback proof. |
| **Weighted end-to-end readiness** |  | **100%** | **34.75/100 → 35/100** | **Do not enable real dispatch until the P0 gates below pass.** |

## User-approved product contract

The attached prior prompt asks for this flow:

1. One person identity can have Customer and Driver capabilities; Towing Vendor remains a separate business account.
2. A Driver registers and owns their login/verification. They do not need a personal vehicle.
3. An independent Driver receives Driver-Hire work only, accepts it, travels to the customer, and completes the service.
4. A Towing Vendor owns its fleet and receives towing offers. Vendors may also receive Driver-Hire offers and fulfill one with an eligible connected Driver, without assigning a tow truck.
5. A Vendor discovers a registered Driver through privacy-safe, Driver-controlled discovery and sends an invitation. Only the Driver accepts or declines membership.
6. For towing, a Vendor assigns an eligible accepted Driver and its own active tow vehicle. The assignment remains pending until the Driver accepts that specific job.
7. A connected Driver sees Vendor, assigned work, vehicle, notifications and progress in a dedicated area.
8. Vendor tracking is limited to its own accepted, active assignment; it shows freshness and milestones, and ends when the job ends.
9. Customer, Driver, Vendor, Admin and database views agree on booking kind, customer vehicle, fleet truck, status, payment and ownership.
10. Old Vendor-created credentials and silent permanent links are retired only after safe account reclamation and migration.

## Requirement-by-requirement audit

| Requirement | Status | Evidence and result |
|---|---|---|
| Clear Towing Vendor and Driver roles; Customer + Driver coexistence | Partial | Backend capabilities exist, but mobile dashboard and screen guards still use scalar user.role. Capability-aware surface switching is not yet usable. [Backend roles](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/auth/src/roles.ts#L10-L27) · [PartnerNavigator](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/mobile%20application/src/navigation/PartnerNavigator.tsx#L230-L273) |
| Driver registration without a personal vehicle | Mostly implemented in source | Driver onboarding requests Driver details/documents without requiring a personal vehicle; upload is wired to backend storage. Real authenticated storage, retry and app-restart behavior were not tested against a backend session. [DriverRegistrationFlowScreen](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/mobile%20application/src/screens/partner/driver/DriverRegistrationFlowScreen.tsx#L640-L697) |
| Vendor-owned fleet | Partial | Vendor vehicle registration/list and towing assignment selection exist. No server-side active vehicle reservation prevents concurrent assignment of the same truck. Driver-Hire validation permits an optional fleet vehicle rather than rejecting it. [VendorVehicle model](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/models/src/vendorVehicle.ts#L14-L59) · [Vendor booking validator](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/services/src/vendorBookingsValidator.ts#L13-L21) |
| Driver-controlled Vendor membership and consent | Partial | A membership model and Driver accept/decline flow exist. Vendor search is exact phone only; no persisted Driver discoverability opt-in/name search or expiry timestamp/worker. Legacy embedded Vendor links still authorize some new dispatch. [Membership model](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/models/src/driverVendorMembership.ts#L3-L51) · [Legacy dispatch authorization](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/services/src/vendorBookings.ts#L270-L277) |
| Correct Towing vs Driver-Hire routing | Partial | Independent Driver offers are filtered to Driver-Hire and Vendors receive towing/Driver-Hire offers. Membership acceptance clears a legacy pointer that is used by direct-work classification, so a connected Driver can appear independent. Decide and enforce connected-Driver work/shift policy in both feed and claim paths. |
| Driver accepts each Vendor assignment | **Fail / P0** | Active Vendor assignment can move a booking to DRIVER_EN_ROUTE and set driverAccepted immediately. The separate pending helper is not wired to the Vendor route; the mounted Driver route lacks Accept/Decline before travel actions. [Assignment state transition](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/services/src/bookings/driverAssignment.ts#L610-L678) · [Mounted Driver navigation](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/mobile%20application/src/navigation/PartnerNavigator.tsx#L78-L86) |
| Accepted-job-only Vendor tracking | **Fail / P0** | Tracking API/screen and stale cutoff exist, but DriverService first updates global User.currentLocation and only then checks the booking. DRIVER_ASSIGNED is treated as active, allowing pre-accept tracking. Socket authorization also keys by bare ID rather than booking kind + ID. [Location write](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/services/src/driver.ts#L110-L157) · [Socket authorization](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/services/src/socket.ts#L165-L178) |
| My Vendor and membership notifications | Partial | My Vendor shows membership and assigned work. Invitation data is persisted, but response mapping drops entity type/ID and the notification tap does not open the matching invite. Membership queries poll while foreground socket handlers omit membership query keys; polling is not push. [My Vendor screen](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/mobile%20application/src/screens/partner/driver/DriverMyVendorScreen.tsx#L117-L152) · [PartnerNotificationsScreen](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/mobile%20application/src/screens/partner/account/PartnerNotificationsScreen.tsx#L46-L59) |
| Customer booking/history/data | Partial | Primary Customer reads carry booking kind, but Redux/tracking still use bare IDs. Combined service reads TowingBooking and DriverBooking but omits legacy Booking. Customer vehicle summary is missing; mobile mapping leaves vehicleNumber empty and infers UPI from advancePaid. [Combined booking service](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/services/src/combinedBooking.ts#L72-L88) · [Customer mapper](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/customer%20application/src/services/bookings/bookingApi.ts#L60-L86) |
| Admin booking, payment and finance | Partial / inaccurate | Admin service rows omit some Vendor/fleet details; IDs are not consistently composite. Detail can show method “online” with estimated fare regardless of transaction state. PaymentTransaction has no authoritative method/provider field; service receipts/refunds and legacy commission/payout totals are not reconciled. [Admin bookings](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/services/src/admin/adminBookings.ts#L262-L284) · [Payment model](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/models/src/paymentTransaction.ts#L12-L20) |
| Admin bank-data privacy | **Fail / P0** | Admin Vendor detail returns and renders the full bank account number under broad VENDORS_VIEW permission. Mask at the API/service boundary; any later verification action needs separate least-privilege access and audit. [Admin vendor service](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/services/src/admin/adminVendors.ts#L330) · [Admin route permission](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/src/controller/src/admin/vendorsRoutes.ts#L22-L25) |
| Migration and database proof | **Fail / P0** | No additive partner-v6 migration or rollback runbook exists. Focused offer audit is not database integration; backend has no test runner/script for consent, reservation races, location privacy, typed ID collisions, retries, projections or migration. Leave the old destructive unified-user migration untouched. [Backend scripts](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/backend/package.json#L7-L21) |

## End-to-end flow status

| Stage | What exists | What blocks the requested behavior |
|---|---|---|
| OTP and choose app area | Phone OTP, persisted capability resolver, Driver/Vendor routes | Active mobile routing is scalar-role based; same-identity Customer+Driver switching is not connected. |
| Driver onboarding | Driver-specific fields, license/documents and upload path | Real storage/auth, retries and persisted restart recovery remain unproven. |
| Vendor onboarding and fleet | Business/address/documents/review and fleet routes | This audit could not verify later screens or database persistence. |
| Vendor invites; Driver accepts | Membership model/API/UI | No discoverability opt-in/search, expiry worker or complete invitation deep link; legacy links can still authorize dispatch. |
| Job routing | Separate Driver-Hire/towing paths exist | Connected-driver work mode is inconsistent; unsupported roadside categories need an explicit service matrix. |
| Vendor assignment | UI selects Driver and tow vehicle | API treats assignment as accepted/en route; no per-job response or server truck reservation. |
| Driver work | My Vendor and active-job screens | Pending Vendor work can reach travel/arrival actions before Driver acceptance. |
| Tracking | Vendor endpoint and screen exist | Global location write occurs before booking validation; pre-accept state is trackable; socket IDs are untyped. |
| Customer and Admin | Typed Customer routes and Admin service-booking paths exist | Legacy history, vehicle/payment details, booking ID collisions, Vendor/fleet projection and bank privacy remain incomplete. |
| Legacy retirement | Some old UI entry points removed | Legacy fields/APIs still influence authorization; no migration/reclaim/rollback proof. |

## Live UI check

- Used the existing Peach/Metro preview. No server, Expo, Metro or Codespace process was started or stopped.
- Vendor registration Step 1 rendered once with non-empty demo fixture data. This does not prove the form is connected to backend data.
- Tapping Continue was followed by a black simulator surface. Reloading the original user tab left it white/blank; that tab remains open in this state. I also tried a temporary tab with a manually reconstructed URL, but its package-version metadata was not an exact match, so that result is not treated as independent confirmation. No JavaScript exception appeared in the available DevTools event buffer.
- Read-only GETs returned HTTP 200 for Metro status, the iOS bundle and Peach HTML. The bundle contains the RACE-v6 worktree path and VendorRegistration/DriverMyVendor module strings. The URL’s Expo Swift/Kotlin metadata still points to /workspaces/RACE/mobile application, so native-host provenance should be corrected/proved before using this preview as native/device evidence.
- Because the preview blanked at the first Continue action, address, documents, review, membership, assignment and tracking were not visually checked. No ID/bank document was uploaded, terms were not accepted, no registration was submitted, and no mutating API/database request was made.

**Live UI verdict:** one screen observed; full onboarding walkthrough **not passed**. The blank preview is a test blocker, but with no captured JavaScript exception it cannot yet be attributed to an application route bug rather than the Peach/native preview session.

## Legacy inventory and safe removal rules

| Old behavior/data | Current condition | Safe cleanup rule |
|---|---|---|
| driverProfile.vendorUserId and embedded Vendor links | Still influence dispatch/feed classification | Stop using these for new authorization first. Preserve read-only history and active-trip continuation until migration/reclaim is proven. |
| Vendor-created Driver credentials and permanent Driver↔vehicle links | Some active UI removed, old model/API paths remain | Disable new create/reset behavior after OTP account reclaim. Do not delete fields while existing Drivers depend on them to log in. |
| Personal vehicle requirement in Driver onboarding | Removed from active flow | Retain read support for old records until old client paths and conversion are verified. |
| Scalar role-only app-area selection | Still controls mobile navigation | Move to capability-aware routing after persisted capabilities and server auth are tested. |
| Bare booking IDs in Customer state/tracking/socket/Admin | Still used in active consumers | Switch active identity to (bookingKind, bookingId), preserving typed legacy reads. |
| Legacy Booking history and payout assumptions | Old Customer trips omitted; payout path remains legacy based | Add typed projections and reconcile totals before retiring history/finance UI. |
| Destructive unified-user migration | Present; not safe for this new rollout | Leave untouched. Add a dry-run migration with conflict report, retry and rollback. |

Do not delete these fields or historical records during this audit. Remove them only after migration, account reclaim, usage checks and rollback review.

## Recommended implementation order

### P0 — before real dispatch

1. **Identity and consent:** wire Customer + Driver surface switching after login, refresh, token renewal and relaunch. Require ACTIVE Driver-owned membership for new Vendor dispatch; legacy links may only support history/active-trip continuation.
2. **Per-job acceptance:** assignment starts as Awaiting Driver. Add Accept/Decline/timeout/notification/retry to the mounted Driver route. Only explicit acceptance begins travel, milestones or location sharing.
3. **Race-safe reservations:** reserve booking, Driver and Vendor vehicle atomically where deployed Mongo supports it. Otherwise add durable reservations, recovery and compensation. Reject fleet vehicles for Driver-Hire. Test competing Driver claims and two jobs selecting one truck.
4. **Location/privacy and typed IDs:** validate accepted, owned, active assignment before any location write; make booking-scoped location canonical; stop at terminal state. Use booking kind + ID in Customer reducers/cache/tracking, socket rooms/events and Admin row keys.
5. **Admin bank privacy:** mask at the Admin API boundary under VENDORS_VIEW. If verification is in scope, add separate permission, reviewer, timestamp, reason and changed-bank audit; otherwise defer verification.
6. **Migration and database suite:** add dry-run migration and rollback notes; add disposable Mongo replica-set tests for consent/expiry, assignment races, truck reservation, decline/timeout recovery, stale/wrong-owner/wrong-kind GPS, duplicate IDs, notification retry and old-history preservation.

### P1 — complete the connected flow

7. Add Driver-controlled discoverability opt-in and minimal masked name/normalized-phone search; keep generic responses for non-discoverable accounts and add rate limits/audit.
8. Decide and enforce connected-Driver work mode; use one active Vendor per Driver in MVP unless a multi-Vendor shift policy is approved.
9. Preserve membership notification type/ID and route invite taps to the existing My Vendor page and matching invite; invalidate membership cache keys on socket events and keep REST recovery.
10. Add Vendor Awaiting/Assigned filter and align counts with row predicates. Add loading, empty, error and retry states; polling is not push.
11. Define supported services as Vendor towing, Driver-Hire, supported roadside, or unavailable. Never route unsupported service as towing silently.

### P2 — financial and native release gates

12. Define authoritative payment method/provider fields and populate them only from verified callbacks or documented manual receipts. Show Unknown otherwise; do not infer UPI from advancePaid or show estimated fare as captured money.
13. Reconcile Customer receipts, refunds, Vendor payable, Driver share, commission and actual payout. Do not label a receipt as money already paid to a Vendor/Driver.
14. Validate FCM, background location, native Maps/navigation and permission/offline recovery on Android/iOS builds. Peach browser preview cannot prove these.
15. Remove legacy APIs/model fields in reversible stages only after migration, reclaim, usage audit and historical-read tests pass.

## Release acceptance checklist

- [ ] One verified phone identity can use Customer and Driver surfaces without replacing either capability.
- [ ] Driver registration needs no personal vehicle; upload survives retry and app restart.
- [ ] Only opted-in verified Drivers are discoverable; only the Driver accepts membership; expiry/revoke releases the lock.
- [ ] Legacy Vendor links cannot authorize new work; Vendor cannot create/reset/impersonate Driver accounts.
- [ ] Independent Driver feed contains Driver-Hire only; connected work-mode policy is consistent.
- [ ] Towing requires accepted Driver + active Vendor-owned truck; Driver-Hire requires a Driver and rejects a tow truck.
- [ ] Vendor job remains Awaiting until Driver accepts; decline/timeout releases resources once and reopens safely.
- [ ] Concurrent work cannot reserve one Driver/truck twice; crash recovery is tested.
- [ ] GPS is absent before acceptance, scoped to the correct typed booking, freshness-labelled and stopped/cleared by policy.
- [ ] Customer sees their own vehicle separately from Vendor tow truck; old booking history remains accessible.
- [ ] Admin detail is typed and correct; general Vendor view never returns full bank account.
- [ ] Identical IDs across legacy/towing/Driver-Hire cannot collide in Customer, tracking, sockets or Admin.
- [ ] Native Android/iOS tests cover foreground, background, terminated, offline, permissions, reconnect, push and map fallback.
- [ ] Migration dry-run/rollback, Driver reclaim and payout reconciliation have recorded proof.

## Checks performed and limits

| Check | Result |
|---|---|
| Original prompt | Read and mapped to the contract and checklist above. |
| Branch/source provenance | GitHub API confirms branch HEAD 03d71df; later review commits are documentation-only; source findings remain at the published v6 implementation snapshot. |
| Static source audit | Read-only review across Partner app, backend models/services/routes, Customer app, Admin app and client docs; three audit passes were consolidated. |
| Earlier checks | Prior v6 report records backend lint, focused role/offer audit, Partner mobile lint, Customer TypeScript lint and diff checks as passing. Not rerun because no source changed in this task. |
| Admin lint | Not verified; prior run was blocked by workspace lockfile missing @types/node and undici-types. |
| GitHub combined status | Vercel status at branch HEAD was failure; response did not include the cause, so this is not a passing CI signal. |
| Report publication | The initial GitHub Contents API write returned HTTP 403. This Codespace follow-up includes the report in the branch commit. |
| Live UI | Vendor Step 1 rendered, then Peach blanked at Continue; later screens not verified. |
| Metro/Peach endpoints | Read-only HTTP 200; bundle contains v6 path/modules. Endpoint/bundle health does not prove navigation or backend integration. |
| Database/API mutation and physical devices | Not run; no uploads, registration, legal consent, DB writes, migration or device test. |
| Source changes | None during the original audit; the later Vendor registration UI polish is recorded below. |

## Related documents

- [Product contract, source findings and release gates](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/docs/product/PARTNER_ROLE_AND_DISPATCH_REDESIGN.md)
- [File-level execution plan and implementation order](https://github.com/teamwebstarts-cmyk/RACE/blob/03d71df7016adc3129721cd771f0adadfad695c2/docs/plans/PARTNER_ROLE_DISPATCH_V6_PLAN.md)

Older client flow docs describe a Vendor-owned Driver/credential model. Where those conflict, follow the newer consent-based Towing Vendor + independent Driver contract.

## Follow-up: Vendor registration UI polish (18 October 2026)

The requested visual cleanup was applied after the source audit. Vendor business inputs now use a consistent neutral surface; valid fields retain a green check without an orange border. The India dialing prefix and number share one input container, and the keyboard advances Business name → Owner name → Mobile number → Email, then dismisses on Done or Continue. Focusing a field uses a subtle slate border, while validation errors remain red. Vendor verification document rows use the compact layout (58 dp row minimum, 30 dp icon); Upload retains a 44 dp touch target.

**Validation:** `npm run lint` in `mobile application` passed (`tsc --noEmit`); `git diff --check` passed. The Codespace Expo process remained active on port 8082. The supplied in-app preview URL returned “This site can’t be reached” during this pass, so a live visual screenshot and keyboard interaction could not be confirmed; those still need review in the user’s preview. The readiness score remains **35/100** because these UI refinements do not resolve the backend dispatch-consent, booking-state, reservation, Customer/Admin integration or migration gates above.
