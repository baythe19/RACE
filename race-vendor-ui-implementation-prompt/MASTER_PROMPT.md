# RACE Partner App — Vendor UI/UX Implementation Master Prompt

**Target agent/model:** GLM 5.3 Flash (coding agent)  
**Scope:** Vendor / Fleet Owner experience in the existing RACE Partner mobile app, plus role-aware shared screens and end-to-end connections.  
**Primary references:** The three attached visual boards in `reference-images/`, the existing codebase, the RACE Partner architecture/audit document, and the already-implemented Driver UI.

---

## Mission

You are continuing development of the existing **RACE Partner mobile application**. The Driver side has already received substantial UI/UX redesign and implementation. Do not start over or redesign the Driver side wholesale. First understand the codebase and the implemented Driver screens, extract their real design/component patterns, then bring the Vendor / Fleet Owner side up to the same level of quality and consistency using the three visual reference boards.

This is not an image-only recreation task. Deliver connected, functional React Native screens using the project’s actual routes, state, API contracts, permissions, and data models. Match the supplied references closely in visual hierarchy, spacing, grouping, component layout, and behavior, but never copy example names, fares, vehicle IDs, counts, addresses, charts, or statuses as live hard-coded data.

Think deeply and independently before editing. Inspect the actual code and trace complete flows. You do not need to print private internal reasoning. Instead, record concise, verifiable findings in an audit file, implement the required work, test it, and report what actually changed.

**Do not stop after giving an audit or a plan.** Make the changes in reviewable phases and keep progressing unless a destructive decision or a genuinely unresolved product rule blocks safe implementation.

## 1. Source-of-truth order

When sources appear to conflict, use this priority:

1. The actual running code, route definitions, API contracts, backend validation, authorization rules, tests, and established business logic.
2. The supplied RACE Partner architecture/audit documentation.
3. The already-implemented and polished Driver UI, reusable components, theme tokens, and the project’s current UX/motion standards.
4. The three attached Vendor visual reference boards.
5. Carefully reasoned inference for genuinely missing UX states. Label the inference in the implementation report and do not invent backend behavior.

The images define the desired visual direction and screen composition. They do not supersede real API rules, nor do they prove that a feature exists.

## 2. Understand the product roles before changing UI

RACE Partner is one app with separate operational experiences:

### Driver
An independent tow-truck operator or chauffeur who can receive requests, accept/decline jobs, navigate to pickup, confirm arrival, validate customer trip OTP, start/complete service, and view their own earnings and profile.

### Vendor / Fleet Owner
A towing business, workshop, or fleet operator who manages booking leads, vehicles, drivers, assignments, business verification, and supported payout/profile workflows.

### Vendor Driver
A driver employed by a Vendor. This is a **Driver operational account**, not a Vendor Owner account. Vendor Drivers use vendor-assigned Login ID/password according to the known product design. Do not grant fleet-owner permissions to a Vendor Driver.

Role boundaries must be enforced both in navigation/UI and by existing backend authorization. Do not confuse:
- individual Driver availability with fleet/vehicle availability;
- Vendor Owner booking leads with a Driver’s personally available jobs;
- a Vendor Driver with the Vendor Owner;
- a vehicle assignment with a completed driver assignment unless the actual backend explicitly models both;
- document upload with document approval;
- OTP authentication with partner verification approval.

## 3. Phase 0 — Inspect the real repository deeply (mandatory)

Do this before changing screens or adding libraries.

1. Inspect the current repository instructions, README, `package.json`, lockfile, Expo SDK and React Native versions, build scripts, TypeScript configuration, lint/test scripts, and installed dependencies. Treat the actual project versions as authoritative; do not assume documentation examples match the live code.
2. Trace root navigation, auth navigation, registration navigation, and the existing three-tab Partner navigation (Home/Dashboard, Jobs, Account). Inspect typed routes and route params.
3. Find the real Vendor implementations and the shared/hybrid screens. The architecture document may mention names like `PartnerHomeScreen`, `PartnerJobsScreen`, `VendorAssignJobScreen`, `VendorDriversScreen`, `VendorVehiclesScreen`, and `PartnerAccountScreen`; verify actual paths and names rather than blindly assuming them.
4. Inspect the already-redesigned Driver screens in code. Identify the components and tokens responsible for headers, bottom tabs, page margins, cards, buttons, form fields, chips/badges, list rows, empty/error/loading states, sheets, icons, typography, and animation.
5. Trace the same components into Vendor mode and list where Vendor UI is old, inconsistent, incomplete, or disconnected.
6. Inspect API services, query/mutation hooks, response/request models, query keys, cache invalidation, Redux/Zustand usage, auth/session state, mock/demo fallbacks, realtime/socket events, and any relevant persistence.
7. Trace Vendor booking lead → assign vehicle → updated booking status → Driver/vehicle availability and any resulting Driver job visibility. Read the actual mutation and API response. Do not infer the assignment result from button labels alone.
8. Inspect vehicle and driver create/edit APIs, document-upload APIs, status mutations, verification data, bank/payout support, and notification support.
9. Search for duplicate routes/components, unused UI, fake data leaking into production, dead buttons, TODO placeholders, swallowed errors, and mismatches between frontend assumptions and backend schemas.
10. Map the visual boards to actual routes/components. Treat each panel as an individual screen/state, not as one composite screen.

Create or update `docs/vendor-ui-audit.md` with this matrix:

`Screen / Route | Role | Current state | Existing component/API | UI gap | Behavior/connection gap | Action | Priority`

Classify each relevant screen as `Working`, `Needs polish`, `Partial`, `Missing`, `Disconnected`, `Backend unsupported`, or `Product rule unclear`.

After the audit, continue into implementation. Do not wait for a confirmation just to start work that is safely inferable from code and references.

## 4. Learn the already-implemented Driver design system

The Driver experience is the design baseline. Inspect it in source, do not merely describe it from memory.

- Reuse real theme colors, typography, spacing, radii, shadows/elevation, icon library, and component implementations.
- Keep RACE branding consistent. Use restrained amber/orange for primary actions and selected states; use semantic green/blue/red only for real availability, information, warning, or error states consistent with the current theme.
- Keep the same header geometry and back behavior on comparable screens.
- Keep Home, Jobs, and Account root navigation consistent. Do not add a second bottom bar inside a screen already hosted by a tab navigator.
- Use the same button hierarchy, inputs, chips, list/card patterns, status badges, modal/bottom-sheet conventions, keyboard behavior, motion, and safe-area handling.
- Vendor content may have a different information hierarchy, but it must still feel like RACE Partner, not another product.
- Improve existing Driver UI only to fix verified regressions or shared-component issues. Do not undo already accepted Driver design decisions to accommodate Vendor.

Follow existing RACE standards for anti-patterns: no redundant cards or repeated statistics, no website-like stacked marketing sections, no unnecessary giant hero imagery in operational screens, no fake values, no dead actions, no arbitrary color changes, and no decorative animation that delays work.

## 5. Reference Image A — Vendor Dashboard, Jobs, Assign Vehicle

Use `reference-images/01-vendor-dashboard-jobs-assignment.png` as the visual reference for this group.

### A1. Vendor Home / Dashboard

Target structure:
- Existing RACE Partner header/identity with notification access and Vendor/business identity/profile action, using current app components.
- Short time-of-day greeting with Vendor’s first name/business context where the source data supports it.
- Brief supporting line, not a marketing paragraph.
- An incoming-leads module with a clear count and `View all` action.
- A compact preview of a small number of high-priority new leads. Each preview may show service type, booking reference, pickup/route summary, and estimated fare only if those values exist in the API.
- A compact earnings summary only if real earnings data and timeframe semantics are available. Do not render a fabricated chart or percentage change.
- A compact fleet overview showing genuinely distinct metrics such as available drivers, available vehicles, and open/in-progress jobs, only where the API supports the counts.
- Shortcuts to Manage Drivers, Manage Vehicles, and Verification/KYC when those routes exist.
- Recent activity only if it adds value and is backed by real events. Do not duplicate the incoming leads preview with an identical second block.
- The existing Home / Jobs / Account bottom tabs.

Dashboard decision rules:
- Prioritize incoming leads when action is required.
- If there is no incoming lead, show a useful empty state and preserve fleet shortcuts.
- Avoid stacking Incoming Leads, Booking Leads, Jobs Today, Active Drivers, Fleet Vehicles, Verification Approved, and Recent Activity as multiple large repetitive cards. Consolidate repeated facts.
- Keep verification status compact when approved; make required action prominent when attention is needed.
- Do not show an individual Driver’s Online/Offline toggle as though it represents fleet status.
- Pull-to-refresh and query loading/error behavior should match the existing codebase.

### A2. Vendor Jobs — Reuse the Driver Jobs UI where possible

The project already has a strong Driver Jobs screen. **Inspect and reuse that screen’s design/components rather than build a duplicate Vendor list from scratch.** Prefer one canonical/shared Jobs implementation with role-aware data scope, filters, labels, and primary actions, where the existing architecture supports it.

Keep the same list visual language: header, summary, filters/chips, job cards, status badges, route/destination grouping, date/time, and primary CTA. Preserve existing reusable components and accessibility patterns.

Vendor-specific requirements:
- Use Vendor-authorized booking leads, not the Driver’s personal request feed.
- Use only real statuses the backend supports. The documented categories may include All, New, Nearby, Assigned, In Progress, and Completed, but verify actual enums and endpoints.
- New leads should prioritize `Assign vehicle` or the existing supported assignment action, not a Driver-only `Accept trip` action.
- Assigned/in-progress items should link to the appropriate Vendor job/assignment detail, not the Driver Active Job route unless that is explicitly the intended supported destination.
- Keep count summaries and list data consistent with the same query/cache state.
- Respect existing filter, pagination, refresh, and scroll state where feasible.
- If role conditions have become scattered across the screen, refactor them into clear role-specific data/configuration or small dedicated subcomponents without duplicating the shared visual primitives.

Do not compromise Driver Jobs while adding Vendor behavior. Test both roles against the updated implementation.

### A3. Assign Job / Assign Vehicle

Use the third panel in Image A as the visual target.

Expected structure:
1. Consistent back header and a concise `Assign vehicle`/existing route title.
2. Job summary: service type, booking reference, pickup, destination where available, and estimated fare with honest label/source.
3. Short informational note only if it explains real assignment behavior.
4. Eligible fleet vehicle list using selectable cards/radio controls.
5. Clear selected state and visible vehicle type/registration/status; associated driver information may appear if backed by actual data.
6. A bottom-safe primary confirmation CTA matching the current design system.
7. Empty state when no eligible vehicle is available, with a route to Add Vehicle if that route is supported.
8. Loading, API failure, stale lead, conflict, and successful assignment states.

Critical logic:
- Read the existing assignment API and product flow before designing the final mutation.
- The architecture documentation describes vehicle selection and an action such as `Assign Vehicle & Approve Job`, with the assigned lead subsequently handled by available fleet drivers. Preserve this behavior if it remains the true backend contract.
- Do not invent mandatory manual driver selection if the current API assigns only a vehicle. If the current code does support explicit driver assignment, use the actual constraints and fields instead.
- Only selectable/eligible vehicles may be confirmed. In-service, inactive, maintenance, or already-committed vehicles should be disabled or excluded according to actual assignment rules, with a clear state rather than a silent failure.
- Preserve the selected booking context when opening Assign Vehicle and when returning to Jobs.
- Prevent double submission. Keep the screen in a pending state until the server confirms.
- On confirmed assignment, update/invalidate the canonical job, fleet, vehicle, and any related Driver data queries. Do not locally fake a success status.
- If the lead is no longer assignable, explain that it changed and refresh the data.

## 6. Reference Image B — Vendor Vehicle Management

Use `reference-images/02-vendor-vehicle-management.png` for this group.

### B1. Vendor Vehicles List

Preserve the existing Vendor Vehicles implementation and refine it using the current RACE visual system.

Target structure:
- Standard subpage header and title.
- `Add vehicle` primary action.
- Compact vehicle counts/status summary only when those counts are meaningful and available.
- Search by registration number/model.
- Existing status/type filters and sorting only where implemented.
- Vehicle cards showing registration, vehicle category, make/model, relevant metadata (year/capacity only if available), associated driver where applicable, and one clear status.
- Contextual overflow menu for existing supported operations.
- Consistent root tabs only if this route currently belongs to a root tab; do not duplicate bottom navigation on nested routes.

Data/status rules:
- Map UI labels to actual vehicle states and allowed transitions.
- Do not show contradictory statuses in list, details, and dashboard.
- Do not call a vehicle `Available` merely because it is not currently in a visible job; follow backend eligibility rules.
- Maintenance, inactive, and in-service/assigned states must be distinct if the model distinguishes them.
- Counts, filters, and sorted results must reflect the same data scope.

### B2. Add Vehicle

Prefer a dedicated screen or the existing established modal flow that best matches current route architecture. Do not embed a long registration form inside the scrollable list if that produces awkward keyboard behavior or makes the list persist underneath unnecessarily.

Fields should come from the real model and API. The visual reference suggests:
- Vehicle registration number (usually required).
- Vehicle type (required where the schema requires it).
- Make/model (required only if the current contract requires it).
- Manufacturing year (optional if supported).
- Assigned driver (optional/conditional where supported).
- Insurance expiry/provider or vehicle document fields where supported.

Do not assume the reference form’s exact requiredness is legally or technically correct. Verify backend validation and business rules before changing required/optional status.

Behavior:
- Correct keyboard types and formatting.
- Keep labels visible, validate fields, prevent duplicate submissions, and preserve values on API failure.
- Use existing selectors/date pickers and existing upload infrastructure.
- On success, use returned data, close the form/navigate to details as appropriate, and refresh the vehicle list and relevant Home/assignment queries.
- If assignment is required to be unique or restricted, respect existing backend constraints.

### B3. Vehicle Details and Status

Use the image’s detail layout as a guide:
- Vehicle summary and current status.
- Registration, type, model, and relevant additional information.
- Assigned driver or no-assignment state.
- Documents/verification section with actual per-document status.
- Edit action.
- Supported vehicle-status controls.
- Destructive remove action only if the API allows it.

Status change behavior:
- Confirm consequential state changes if needed.
- Do not allow invalid status changes for a vehicle on an active job if the backend/business rule forbids it.
- Removing a vehicle should require confirmation and respect active assignments.
- Update all screens that summarize the vehicle after confirmed mutations.
- Never mark documents as approved just because they have been uploaded.

## 7. Reference Image C — Vendor Driver Management

Use `reference-images/03-vendor-driver-management.png` for this group.

### C1. Vendor Drivers List

Target structure:
- Standard header/title and `Add driver` action.
- Compact counts for total/available/on-job/inactive if supported.
- Search by name, phone, Login ID or assigned vehicle only for fields returned by the current API.
- Existing status filters with clear selected state.
- Reusable driver cards showing name/avatar or initials, contact information when permitted, Login ID only when appropriate, assigned vehicle, and an accurate current status.
- Contextual actions such as view/edit, reassign, call, deactivate, or remove only if actually supported.
- Appropriate empty state, refresh/error state, and count consistency.

Do not expose full passwords in driver cards or subsequent screens. If credentials must be issued during creation, treat them as a one-time sensitive value according to existing security behavior. Do not invent a password generation or reset API.

### C2. Add Driver — Step 1: Driver Details / Credentials

Use the supplied image’s two-stage form layout as a design reference. Confirm the real current form/schema before implementing fields.

Potential fields supported by the documented implementation include:
- Full name.
- Mobile number.
- Driving licence number.
- Driver type (e.g. Tow Driver, Full-Time, Part-Time) where applicable.
- Assigned vehicle, optional if business logic permits unassigned drivers.
- Vendor Login ID.
- Password or credential generation, according to the current backend flow.

Required behavior:
- Reuse existing shared input, dropdown, validation, and form components.
- Generate a Login ID only if the backend or established client logic genuinely supports it; otherwise use the existing supported mechanism.
- Never invent the credential format, password requirements, or driver account creation API.
- Provide clear helper text explaining that Vendor Drivers use credentials supplied by the Vendor.
- Keep password input secure; offer show/hide where appropriate.
- Do not allow ambiguous duplicate accounts if the backend has username uniqueness rules.
- If assigned vehicle is selected, verify its actual eligible state using current data/constraints.
- Save draft only if there is a real draft persistence mechanism; otherwise do not present a nonfunctional `Save draft` action.

### C3. Add Driver — Step 2: Documents

The second screen should make document rules understandable, not overwhelm the Vendor with an undifferentiated list.

Group documents by verified policy:
- Required by the current backend/RACE verification policy.
- Required only when applicable.
- Later/other checks, only where supported.

Potential document types mentioned by the architecture include Driving Licence, Aadhaar or another accepted identity document, police verification, and medical fitness. These must not all be marked universally mandatory without confirmation from the current policy/API.

Each document row should provide:
- Document name and short useful description.
- Required/Conditional status.
- Upload/Replace/View action appropriate to the state.
- Progress/error/retry state where supported.
- Actual verification status (Pending/Approved/Rejected/Expired) if returned by the backend.

Behavior:
- Use existing document picker/upload infrastructure and server file limits.
- Handle permission denial, upload retry, preview and replacement where supported.
- Keep previously completed document uploads when another upload fails.
- Show rejection reason and re-upload action if the backend provides it.
- Do not claim the driver is verified or immediately job-eligible after saving documents.
- Save the driver only according to the actual multi-step API flow. If account creation happens in Step 1 and documents are separate, preserve that lifecycle instead of collapsing requests.
- After confirmed success, return to the Drivers list or a supported details/status screen and refresh all related data.

## 8. Account screen — Shared route, role-aware content

The Account/Profile area must be audited for both Driver and Vendor Owner. Do not create a completely separate, duplicate Vendor Account screen if the existing `PartnerAccountScreen` can responsibly host role-aware sections.

Keep shared options shared where the behavior and data are genuinely common:
- Personal/profile details.
- Notifications.
- Help & Support.
- General settings.
- Legal information.
- Log out.
- Common verification/status destinations where appropriate.

Add Vendor-specific destinations if genuinely missing:
- Business Profile / Business Details.
- Vendor Drivers.
- Vendor Vehicles.
- Business Verification / KYC.
- Bank & Payouts, only if existing backend/routes support it.
- Relevant business account settings.

For Driver and Vendor Driver, show only their appropriate personal/driver destinations. Vendor Driver must not get Vendor Owner-only driver/fleet administration actions.

Requirements:
- Preserve the existing Account route and role resolution.
- Identify missing entries and connect them to canonical routes.
- Do not create duplicate document, notification, settings, or support destinations.
- Use the established row/icon/status layout from Driver UI.
- Do not add an item unless it has a working route or is clearly and honestly marked unavailable under the product policy.
- Never expose a development preview/role-switch button in production unintentionally.

## 9. Shared screens and route connections

Trace complete paths before changing route definitions.

Expected Vendor journey:

`Vendor Dashboard → Jobs → Select Lead → Assign Vehicle → Confirm → Updated Lead/Fleet State`

Vehicle management:

`Dashboard/Account or Assignment Empty State → Vehicles List → Add/Edit Vehicle → Details/Status → Return to original context`

Driver management:

`Dashboard/Account → Drivers List → Add Driver Step 1 → Add Driver Step 2/Documents (where current flow uses it) → Driver List/Details/Verification Status`

Common account journey:

`Account → Shared Profile/Notifications/Settings/Support` plus Vendor-specific Business/Drivers/Vehicles/Verification/Payout destinations only for the Vendor Owner role.

Connection rules:
- Preserve the relevant `jobId`, `vehicleId`, and `driverId` route params where the canonical flow needs them.
- Back from a detail/form screen should return to the expected source, not always reset to Home.
- Return from Add Vehicle in the assignment journey to the same booking context when appropriate, then refresh eligible vehicles.
- After successful assignment, invalidate/refetch the relevant Jobs, Dashboard, Vehicle and Driver data using existing query/store patterns.
- After adding/editing a driver, refresh the driver list, relevant fleet summary, and assigned vehicle relationship where supported.
- Avoid parallel duplicate local state that can disagree with the server.
- Keep the root Home/Jobs/Account tab pattern consistent; nested forms/details should follow existing project conventions and not render a duplicate tab bar.

## 10. Motion and native behavior

Follow the project's existing RACE Motion & Interaction Standard and installed libraries.

Audit and preserve:
- Press feedback.
- Screen/back transitions.
- Keyboard-safe forms.
- Focus and scroll-to-field behavior.
- Bottom-sheet/modal behavior.
- Loading skeletons and stable layout.
- Pull-to-refresh.
- List performance and stable keys.
- Safe areas and Android Back behavior.
- Reduced-motion behavior where implemented.

Avoid adding animation, map, or gesture dependencies without checking Expo compatibility. Do not animate the entire screen for every data update. Do not let keyboard or sticky bottom buttons cover required inputs. State-changing actions must remain understandable and responsive.

## 11. API/data integrity and error handling

For every screen, identify the actual source of truth and mutation.

- Use existing API hooks and models where possible.
- Do not hard-code data from design boards.
- Do not ship mock/demo data in normal live UI.
- Do not invent missing endpoints or silently change API payloads.
- Preserve the current auth/session architecture; avoid broad Redux/Zustand refactors unrelated to the task.
- Keep backend/server validation authoritative.
- Use appropriate query invalidation and refresh only after confirmed mutations.
- Prevent duplicate assignment, duplicate create, or repeated status updates.
- Handle request conflicts, stale leads, expired sessions, offline state, missing permissions, no available vehicles, and no available drivers with useful messages.
- Preserve form state on request failure where safe.
- Never show success before the authoritative response.

If a useful screen/state lacks backend support, do not fake it. Implement only the truthful UI behavior currently possible, note the missing API/product rule, and continue work on independent flows.

## 12. Product-quality states that may be missing from the images

Infer and implement the required states from the existing code and API where necessary, even if they do not appear as separate reference panels:

- Vendor dashboard with zero new leads.
- Jobs list with no results for a selected filter.
- All leads already assigned or expired.
- No eligible vehicle for assignment.
- Vehicle list empty and add-vehicle form validation.
- Vehicle already in service / maintenance / inactive.
- Vehicle linked to an active job during remove/status action.
- No drivers / drivers all on-job / driver inactive.
- Duplicate Login ID or invalid credentials according to server response.
- Driver document upload error, rejected document or pending verification.
- Assignment API failure and stale lead conflict.
- Offline, slow response, retry, and refresh state.
- Unsaved form discard confirmation if the app convention supports it.

Do not create extra full screens where a concise inline, dialog, or empty state is more appropriate. Keep the app focused and native rather than adding screens unnecessarily.

## 13. Testing and verification

Use the package manager indicated by the lockfile and run the actual supported scripts. Inspect results and fix issues caused by your changes.

At minimum validate:

### Role parity
- Driver Home/Jobs/Account still works after shared-component changes.
- Vendor Home/Jobs/Account displays the correct role-specific data/actions.
- Vendor Driver remains a Driver operational user and cannot access Vendor Owner-only controls.

### Vendor core flow
- New lead → Assign Vehicle → Confirm → success and refreshed state.
- Assignment failure/stale lead → no false success; user can retry/refresh.
- Vehicles list → Add Vehicle → save → list and assignment selection refresh.
- Vehicle detail → allowed status change and any confirmation flow.
- Drivers list → Add Driver → credential handling → documents → list/status refresh.

### Shared flow
- Account options reach the correct shared/vendor-specific destinations.
- Notifications, documents, settings, support, payout routes are reused and not duplicated.
- Back navigation returns to the proper screen/context.
- Loading, empty, error, keyboard, safe-area, duplicate-submit, and offline behaviors work as far as the environment allows.

### Validation
- Type-check/lint/tests available in the repository.
- No new console/runtime warnings introduced by touched screens.
- No unresolved imports, bad route names, stale types, or malformed navigation params.
- No accidental production demo controls or invented default user data.

Do not claim a simulator/device/backend scenario passed if it was not actually run. List anything requiring a physical device, development build, credentials, or backend access.

## 14. Priority order

**P0 — Preserve/fix core logic:** broken routes, wrong role rendering, invalid assignment behavior, API/data mismatches, permission leakage, broken Driver Jobs regression.

**P1 — Vendor business-critical UX:** Home, shared Jobs adaptation, Assign Vehicle, Vehicles list/Add/Details, Drivers list/Add/Documents, and their connections.

**P2 — Account parity and consistency:** role-aware Account options, common routes, verification and supported payout/settings destinations.

**P3 — Quality polish:** spacing, animation refinement, empty/error states, accessibility, performance, non-blocking cleanup.

Do not spend time polishing shadows while the Vendor job/assignment or driver/vehicle creation flow remains disconnected.

## 15. Required deliverables

Implement the code changes and create/update these reports:

1. `docs/vendor-ui-audit.md` — before/after screen and route matrix with actual API/component references.
2. `docs/vendor-flow-map.md` — Vendor Home → Jobs → Assignment, Vehicle Management, Driver Management, and Account/shared flows.
3. `docs/vendor-implementation-report.md` — files changed, components reused, routes/APIs connected, bugs fixed, tests run with outcomes, and remaining gaps.

In the final response, clearly state:
- Vendor screens implemented/refined.
- Shared Driver components/screens reused.
- Driver UI regressions checked and results.
- Account options added and which are shared vs Vendor Owner-specific.
- Actual APIs/mutations used.
- Missing backend capabilities or unresolved rules.
- Tests/commands actually run and exact results.
- Anything still needing real-device or backend verification.

## Final instruction

Inspect the codebase first. Understand the exact Vendor business logic and the already-polished Driver design system. Use the three visual references as a close UI/UX target. Implement the Vendor flows end-to-end, reuse the existing Driver Jobs UI appropriately, extend the shared Account screen with missing role-aware options, fix genuine connection/API issues, preserve working behavior, and verify both roles. Continue through implementation rather than stopping after analysis.
