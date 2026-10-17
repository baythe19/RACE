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
- Admin status actions for current service bookings are limited to valid transitions and the CONFIRMED state where a driver workflow must perform the next step. The booking detail UI only presents supported next actions and refreshes booking/count/available-driver queries after mutation.
- Admin document previews now read the uploaded file bytes from local storage or the configured GCS bucket and return the stored MIME type; the old synthetic PDF preview has been removed. Local path traversal is bounded to the upload root.
- Vendor document status and admin detail now come from persisted VendorDocument records. Vendor approval is blocked until every type-specific required document is actually uploaded and approved. Rejecting a vendor document requests changes and returns the account to a non-operational state.
- Admin vendor detail now includes current towing/driver service bookings and their completed paid revenue. Vendor dashboard/earnings add successful payment transactions for these service bookings; legacy payout records are still separate and no real payout settlement is implemented.

### Refresh and invalidation evidence

- Driver jobs/offers/active job and notifications use authenticated socket invalidation plus foreground refresh. Offers and active-job data poll at 5 seconds, jobs at 10 seconds, and notification data at 10 seconds; background polling is disabled and reconnect/resume refreshes active queries.
- Customer ongoing booking list/detail refresh at 5 seconds and customer tracking rejoins the authorized booking room. Admin booking list/detail/count and available-driver data use foreground polling because the admin app does not currently maintain the booking socket connection.
- Vendor booking/list and operational screens use foreground React Query polling and mutation invalidation. Partner app source remains under an active Cursor lock and was not edited during this audit pass.
- Notification reads no longer synthesize a welcome record. Backend push delivery while the app is backgrounded or closed still needs Expo/FCM configuration and credentials.

### Validation after this audit pass

- Backend npm run lint (TypeScript): passed after correcting a missing Mongoose Types import in vendor earnings aggregation.
- Admin web npm run lint --workspace=@race/admin-web (TypeScript): passed.
- Repository git diff --check: passed.
- Automated gate re-verification: G0 (ledger lint) and G7 (backend typecheck) pass. G1-G6 and G8 remain pending until the full manual action-to-screen traces and available runtime scenarios are verified; a clean typecheck is not a substitute.
- Not established: live database concurrency/payment/refund behavior, real document retrieval against deployed object storage, physical Android keyboard/native picker behavior, socket behavior across real accounts, and closed-app push delivery.
