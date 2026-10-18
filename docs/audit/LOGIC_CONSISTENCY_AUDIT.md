# Cross-app logic consistency audit

Status: in progress
Branch: v5.0.0--productions--works
Scope: customer mobile, partner driver/vendor mobile, admin web, backend APIs and persisted state.

This audit follows each consequential action from its screen control through API authorization and service/model mutation to socket or query invalidation and the corresponding views in other roles. A typecheck alone does not establish runtime behavior. The destructive seed:fresh audit is not run against an unverified Codespace database.

## Work plan

1. Inventory role-specific booking actions, state transitions, and API routes.
2. Compare persisted booking/driver/vendor/payment/document state with each app's data sources and invalidations.
3. Fix only mismatches supported by code evidence, while respecting active surface locks.
4. Run focused checks, app typechecks, and safe integration checks; label anything requiring live DB/device credentials.

## Evidence and findings

### Booking assignment and driver availability

- Open driver offers and vendor-routed claims share claimOpenBookingOffer; admin and auto-assignment use assignDriverToBooking.
- The previous implementation read driver availability, updated the booking, then marked the driver busy. Two simultaneous assignment requests could each pass the read and assign different bookings to the same driver.
- Assignment now reserves an approved, online driver with a single compare-and-set before claiming the booking. If booking claim fails, the reservation is cleared only when it still belongs to that booking.
- Driver release now requires the matching active booking id, preventing an old completion/cancellation path from clearing a later job.
- Verification: backend npm run lint and repository git diff --check pass. No live DB race test was run.

### Driver availability, fleet edits, and operational location

- The driver availability endpoint previously checked busy state only for the offline transition and wrote availability without a compare-and-set. It now blocks either availability change while a booking is active, allows online only for approved drivers, and atomically conditions the write on no active booking.
- Driver creation now defaults offline. Profile and vendor list mappings report available only for approved drivers with no active booking; the admin available-driver query also excludes active bookings.
- Vendor-created and self-registered drivers no longer receive new Bhubaneswar placeholder GPS coordinates. Vendor driver status, availability, and vehicle/document edits refuse changes when an active booking is observed.
- Admin driver edits/deletes and the repository writes are booking-scoped; an active-booking compare-and-set prevents profile mutations or deletion from racing an assignment. Changing driver verification status also takes the driver offline.
- Self-registration and document re-upload refuse changes when an active booking is observed; re-upload also forces the driver offline for review. Legacy coordinate freshness and concurrent document-edit races remain to be checked.
- Verification: backend npm run lint and repository git diff --check pass. No live DB race test was run.
- Still to verify: legacy persisted placeholder coordinates may remain, and real-location freshness rules for offer ranking need a separate trace.

## Remaining audit areas

- Customer cancellation and driver/vendor rejection, arrival, OTP pickup, completion, and rating.
- Vendor approval, fleet membership, vehicle-driver pairing, dispatch and job views.
- Admin status/payment/refund actions versus customer and partner projections.
- Earnings, payout and transaction accounting.
- Persisted notifications, socket invalidation, background push and app refresh.
- Driver/vendor documents, verification decisions, account status and role access.
- Cross-screen routing and action feedback, including error and retry states.

## Runtime limitations

- Real payment gateway, signed provider webhooks, and live refunds remain external integrations.
- Background/closed-app push requires Expo/FCM credentials and configuration.
- Live DB/device behavior is not established by typecheck or bundle export.


### Admin booking and vendor document workflows

- Admin cancellation now checks the booking state transition, caps the refund request to the persisted amount already paid, and performs a status compare-and-set before releasing only the matching active-driver reservation. It records the refund as initiated/pending; this is intentionally not reported as a completed refund because the payment provider integration is still a stub.
- Admin booking detail invalidates booking, count, and available-driver queries after mutations. A later cross-check found service-booking status options did not fully match payment/assignment ownership; the verified finding and fix are recorded in the follow-up below.
- Admin document previews now read the uploaded file bytes from local storage or the configured GCS bucket and return the stored MIME type; the old synthetic PDF preview has been removed. Local path traversal is bounded to the upload root.
- Vendor document status and admin detail now come from persisted VendorDocument records. Vendor approval is blocked until every type-specific required document is actually uploaded and approved. Rejecting a vendor document requests changes and returns the account to a non-operational state.
- Admin vendor detail now includes current towing/driver service bookings and their completed paid revenue. Vendor dashboard/earnings add successful payment transactions for these service bookings; legacy payout records are still separate and no real payout settlement is implemented.

### Refresh and invalidation evidence

- Driver jobs/offers/active job and notifications use authenticated socket invalidation plus foreground refresh. Offers and active-job data poll at 5 seconds, jobs at 10 seconds, and notification data at 10 seconds; background polling is disabled and reconnect/resume refreshes active queries.
- Customer ongoing booking list/detail refresh at 5 seconds and customer tracking rejoins the authorized booking room. Admin booking list/detail/count and available-driver data use foreground polling because the admin app does not currently maintain the booking socket connection.
- Vendor booking/list and operational screens use foreground React Query polling and mutation invalidation; the 2026-10-17 follow-up below adds authenticated vendor socket invalidation for live leads and booking changes.
- Notification reads no longer synthesize a welcome record. Backend push delivery while the app is backgrounded or closed still needs Expo/FCM configuration and credentials.

### Validation after this audit pass

- Backend npm run lint (TypeScript): passed after correcting a missing Mongoose Types import in vendor earnings aggregation.
- Admin web npm run lint --workspace=@race/admin-web (TypeScript): passed.
- Repository git diff --check: passed.
- Automated gate re-verification: G0 (ledger lint) and G7 (backend typecheck) pass. G1-G6 and G8 remain pending until the full manual action-to-screen traces and available runtime scenarios are verified; a clean typecheck is not a substitute.
- Not established: live database concurrency/payment/refund behavior, real document retrieval against deployed object storage, physical Android keyboard/native picker behavior, socket behavior across real accounts, and closed-app push delivery.


### Customer cancellation race follow-up

- Both customer cancellation paths previously loaded a booking, changed fields on the stale document, and saved it, which could race with driver assignment or payment-state changes. They now atomically cancel only when the persisted booking status and advance-payment fields still match the policy inputs; status history is appended atomically.
- If another action wins the race, the API returns a conflict instead of overwriting the newer booking state. The matching active driver reservation is released only after cancellation succeeds.
- Backend TypeScript check and repository git diff --check pass after this fix. No live MongoDB concurrency test was run.


### Admin finance and revenue projection follow-up

- The admin finance endpoints previously queried only legacy Transaction records; current towing/driver advance, final, and refund rows live in PaymentTransaction. A successful booking payment therefore appeared in booking details/customer or partner data but was absent from finance totals and transaction list.
- Finance list now merges both sources in date order, applies type/status/date/search filters to each source, and reports stable pagination totals. Current booking advances/final payments map to PAYMENT; refunds map to REFUND. initiated maps to PENDING, success to COMPLETED, and failed to FAILED.
- Finance summary and monthly revenue reports now include only successful current booking advance/final payments and successful current booking refunds. Initiated refund stubs are excluded from completed refund totals. Commission and payout metrics still reflect the legacy transaction engine; current service-booking commission and settlement are not implemented and are not inferred.
- Backend and admin-web TypeScript checks pass; git diff --check passes. No database-backed finance fixture or live payment-provider test was available.


### Booking payment verification race follow-up

- Advance/final initiation reuses an existing initiated stub session for the same booking and payment stage when available. Verification now compare-and-sets the transaction from initiated to success/failed and applies booking payment flags only when the persisted booking is still unpaid in the expected state.
- The winning transaction id is persisted for both advance and final payments. Repeated verification of the same successful payment is idempotent; a different session that loses the booking compare-and-set is marked failed so the development stub does not inflate finance totals.
- This rollback is safe only because the current gateway is a non-production stub and production verification returns HTTP 503. A real gateway must use signed provider confirmation and reconcile captured money with booking updates (preferably with durable idempotency/outbox or database transactions); this was not tested against a live provider/database.
- Backend TypeScript check and repository git diff --check pass.


### Admin service-booking projection follow-up

- Current towing/driver booking details now resolve the persisted vendor user and expose its business name, phone, and id instead of blank placeholders.
- The payment summary now selects a successful payment transaction for its transaction id and paid-at timestamp; an initiated stub session is not presented as a completed transaction.
- Backend TypeScript check passes. This projection was not verified against live account records.

### Preview-mode fabricated success hardening

- The partner app's preview mode previously treated failed OTP/login, driver registration, profile edits, notification read/preference changes, payout edits, and driver/vendor job mutations as successful mock operations. On an API outage or invalid session, the UI could therefore advance while no backend state changed.
- Mock sign-in helpers and their quick-login/role-switch entry points are now guarded by an explicit EXPO_PUBLIC_UI_PREVIEW_MUTATIONS=true opt-in. API-error fallbacks for these write actions use the same flag. It is ignored in release builds. UI-test permissive mode now defaults off and cannot be enabled in release.
- Read-only fixtures remain available only when EXPO_PUBLIC_UI_PREVIEW_MODE=true is explicitly set in a non-release build. .env.example defaults preview, permissive testing, and mock mutations to false.
- This distinction matters for the current Codespace: its ignored local environment was observed with UI preview enabled, and read queries can still fall back to demo fixtures after API failure. The Codespace backend was not listening on port 3000 during this audit; the mobile API config points at the hosted Render API. Therefore a screen showing populated demo fixtures does not prove authenticated live data arrived.
- Verification: mobile partner app, backend, and admin-web TypeScript lint checks pass after the guard changes; repository git diff --check passes. Mock persistence is intentionally disabled by default. A device-level auth and failed-request walkthrough remains pending.

### Isolated payment initiation race test

- A direct service-level test used a disposable Mongo database, then removed that database after the run. Concurrent initiation/verification and retries produced one persisted successful payment per stage, the booking referenced the successful transaction ids, and losing duplicate sessions did not become successful.
- This isolated test verifies service compare-and-set behavior only. It does not verify a live payment provider, provider webhook signature, settlement, or production refund execution.


### Vendor refresh, first-load skeletons, and fleet assignment follow-up (2026-10-17)

- Partner Home showed vendor-approved bookings in its “new leads” banner even though the Jobs screen treats those rows as awaiting fleet-driver claim. The banner and its badge now use only open marketplace offers; the overall Jobs metric still includes vendor-routed work. Recent activity now recomputes when offer data changes.
- Partner Home keeps its body skeleton visible until the initial vendor profile, dashboard, offers, drivers, and vehicles responses are ready, avoiding a flash of zero-valued fleet data. The vendor driver list now has a driver-card-shaped skeleton and waits for the fleet-vehicle lookup used to render each driver’s assignment.
- Authenticated vendor sockets join a data-free offer invalidation room. Booking confirmation broadcasts a vendor offer refresh signal; subsequent booking status updates notify only the owning vendor user. The globally mounted partner navigator invalidates active vendor offer, booking, fleet, notification, and dashboard queries when a signal arrives. Existing REST polling remains the recovery path (offers 8s, bookings/drivers 15s, vehicles 30s, notifications 10s).
- Driver-to-vehicle pairing now rejects both INACTIVE and UNDER_MAINTENANCE vehicles, matching the booking approval rule that only ACTIVE vehicles can be dispatched. The write uses an atomic compare-and-set requiring activeBookingId to remain null; if a job claims the driver concurrently, the vehicle edit fails instead of overwriting the active state.
- The driver claim path now rechecks that a vendor-routed job’s persisted fleet vehicle still exists, belongs to that vendor, and remains ACTIVE. Vehicle status changes to maintenance/inactive and vehicle removal are blocked while an operational booking references the vehicle. This prevents normal sequential edits from invalidating an approved job; approval and a concurrent vehicle status change are not transactional, but the claim recheck rejects a stale vehicle rather than dispatching it.
- Verification: partner-app and backend TypeScript checks pass after the fleet-claim guards; repository git diff --check passes. No live device screenshot or multi-account socket test was available in this pass.
- Limitation: sockets and polling stop while the app is backgrounded; the app has no Expo push-notification dependency/token registration yet. Push delivery while backgrounded or closed remains a separate mobile-build and credential setup.


### Admin service-booking confirmation action follow-up (2026-10-17)

- Rechecked the admin status dropdown against current booking/payment services. It exposed `PENDING → CONFIRMED` and `CONFIRMED → DRIVER_ASSIGNED`, but the latter UI action always failed at the API. More seriously, the accepted generic update could confirm a service booking without an advance-payment transaction, after which payment verification could no longer perform the `PENDING → CONFIRMED` transition.
- Removed confirmation and driver-assignment from the generic status menu. Admin assignment remains a separate action. Generic service-booking status PATCH now rejects; verified advance payment, driver trip transitions, and the guarded cancellation service path own those state changes.
- Verification: backend and admin-web `npm run lint` (`tsc --noEmit`) passed; `git diff --check` passed. No production database or device session was changed.


### Customer booking cache after payment follow-up (2026-10-17)

- The customer booking wizard used raw create/verify API calls rather than the existing React Query mutations. After advance or final payment succeeded, already-mounted booking list/detail queries could keep showing the prior status/payment flags until a later refetch.
- Advance and final payment success now invalidates the shared `['bookings']` query family (including service lists/details) so active screens refetch immediately; preview payment paths invalidate the same cache after local preview state changes.
- Verification: customer-app `npm run lint` (`tsc --noEmit`) passed; `git diff --check` passed. This refreshes cached server state after a successful response; it does not implement background push or a real payment provider.


### Admin cancellation refund default follow-up (2026-10-17)

- Admin cancellation previously defaulted an omitted refund amount to the entire amount paid. The admin booking detail action omitted that field, so a status-based cancellation could silently issue a full-advance refund even after driver assignment, contrary to the shared customer cancellation policy.
- The admin cancellation service now defaults to the same status-based policy refund, capped by the amount actually paid. Explicit admin overrides remain bounded by paid amount; the refund is still recorded as pending because no real provider refund exists.
- Verification: backend and admin-web `npm run lint` (`tsc --noEmit`) passed; `git diff --check` passed.


### Customer cancellation cache and refund message follow-up (2026-10-17)

- The customer cancellation detail screen navigated back to the booking list without invalidating its React Query cache, so a still-mounted list could continue showing a canceled job as active. It now invalidates the shared bookings query family after the API confirms cancellation.
- The cancellation success alert previously promised processing in 5–7 business days even though the backend creates only an initiated refund stub and marks refund status pending. The message now says the refund is pending and has not yet been processed.
- Verification: customer-app `npm run lint` (`tsc --noEmit`) passed; `git diff --check` passed.
