# RACE Partner App — Full-Project UI/UX, Driver–Vendor Parity, Flow Connectivity & QA Master Prompt

> **Use this as the main task prompt for the coding agent (Gemini 3.8 High or another capable coding agent).**
> Attach/read the included architecture audit, design standards, motion standard, and reference images before making changes.

## Mission

You are working inside the existing **RACE Partner mobile application**. The Driver side has already received significant UI/UX implementation and refinement. Do **not** replace it wholesale. Your job is to perform a deep, repository-grounded audit of the entire Partner app, protect the best existing Driver work, finish and polish the Vendor/Fleet Owner experience using the same established design system, connect all relevant shared and role-specific flows, identify anything missing or disconnected, and validate the app end to end.

This is an **implementation task**, not merely a review. Do not stop after producing a plan or audit report. Audit first, then implement in safe, prioritized batches, run available checks, and report the actual outcome.

## 1. Read these sources first

Treat these sources as the working context, in this order:

1. `supporting-standards/RACE_Partner_Architecture_Audit.txt` — primary functional/screen inventory and existing architecture evidence.
2. `supporting-standards/RACE_UI_UX_SKILL.md` — RACE's design approach and redesign workflow.
3. `supporting-standards/DESIGN_SYSTEM.md` — visual tokens and component guidance.
4. `supporting-standards/DO_NOT_DO.md` — anti-patterns that must be avoided.
5. `supporting-standards/MOBILE_APP_PATTERNS.md` — shared mobile interaction and behavior patterns.
6. `supporting-standards/RACE_MOTION_INTERACTION_STANDARD.md` — navigation, transitions, animation, GPS/map, states, and smoothness standards.
7. `supporting-standards/ACCOUNT_NOTIFICATIONS_REFERENCE_PROMPT.md` — account/profile, notifications, settings, earnings, support, and related screen guidance.
8. The PNG files under `reference-images/` — visual direction only, not exact functional specs.
9. The actual codebase, APIs, navigation types, state, tests, and configuration — authoritative for implementation truth.

If an image conflicts with a real API, permission rule, role model, or working code, preserve functional truth and use the image only as a visual reference. Do not make assumptions silently; note unresolved product/backend gaps.

## 2. Product model: one app, distinct roles

RACE Partner is a single Expo / React Native codebase serving different actors. Audit the actual `package.json` and installed versions rather than assuming that any package or SDK version in old documentation is still installed.

### Driver

An independent tow-truck operator or chauffeur. The main product tasks are:
- Choose the correct Driver subtype during onboarding.
- Authenticate using the valid method for that subtype.
- Complete registration and submit required documents.
- Track verification status and understand whether they are eligible to go online.
- Set online/offline availability when eligible.
- Receive, inspect, accept or decline available job requests.
- Navigate to pickup, mark arrival, verify the customer's 4-digit trip OTP, start the service, complete it, and see confirmed earnings/job results.
- Manage personal profile, registered vehicle, documents, earnings/payout information when applicable, notifications, and support.

### Vendor / Fleet Owner

A towing agency, fleet owner, garage, or workshop operator. The main product tasks are:
- Register and verify business information.
- See and triage incoming customer booking leads.
- Assign an appropriate available fleet vehicle/driver to a job.
- Manage fleet drivers and vehicles.
- Track job/assignment status, business verification, and payout readiness.
- Manage Vendor profile, documents, account settings, notifications, and support where supported.

### Vendor Driver

A driver employed by a Vendor. This is a **Driver operational role with vendor-assigned credentials**, not a Vendor Owner account. A Vendor Driver signs in using the Login ID and password provisioned by their vendor, unless the current implementation documents a different contract. Do not send this person to the Vendor Owner dashboard or grant fleet-owner permissions.

### Role/data boundaries

- A user’s actual authenticated role and permissions govern the UI and routes.
- Shared presentation does not mean shared permissions or shared data.
- Driver and Vendor may share screen shells, headers, profile patterns, notification components, document rows, empty states, confirmation dialogs, and form fields when the behavior is genuinely the same.
- Keep different operational content/actions in role-aware components or screen configuration. Avoid one huge component full of nested conditionals.
- Do not duplicate identical screens just to change a title; do not force genuinely different workflows into one confusing screen either.

## 3. Non-negotiable rules

1. **Preserve the existing Driver redesign.** Treat current Driver screens as the visual baseline. Make deliberate, minimal-to-moderate refinements; no full redesign unless a verified issue requires it.
2. **Bring Vendor up to the same quality bar.** Finish missing Vendor screens and refine existing ones while maintaining the established RACE visual language.
3. **Audit both roles.** Do not assume Driver completion means the feature is automatically working for Vendor.
4. **Connect flows fully.** Buttons, cards, tabs, filters, back actions, modals, deep links, uploads, status links, and notification destinations must lead to the correct route and state.
5. **No fake functionality.** Do not add dead buttons, static mock earnings, invented API success, fake verification, fake notification events, or hard-coded customer/driver details to production paths.
6. **No silent API contract changes.** Inspect request/response models and backend validation before changing fields, statuses, or payloads.
7. **Do not remove working functionality** simply because it is visually inconvenient.
8. **Do not install libraries blindly.** Inspect current dependencies, Expo compatibility, and project conventions before adding a package.
9. **Demo/mock features must remain gated.** Inspect `UI_PREVIEW_MODE`, preview helpers, fixtures, and auth config. Demo role switches and shortcut logins must not leak into production behavior.
10. **Verification is a separate state.** OTP success is not approval. Registration submitted is not approval. Uploaded is not approved. Approved is not necessarily payout-ready.
11. **No immediate dashboard redirect for first-time/pending users.** After authentication, use real account/verification state to route first-time or pending Driver/Vendor users to the correct registration/verification flow, not blindly to the dashboard.
12. **Keep user input safe.** API failure should not destroy a partially completed form or uploaded-document state unnecessarily.
13. **Be honest about testing.** Never claim a command, build, or device test passed if it was not run.
14. **Keep changes focused and reviewable.** Avoid unrelated refactors, sweeping formatting changes, or replacing the navigation architecture without proven need.

## 4. Phase 0 — Establish the baseline before edits

Inspect the project and produce an internal inventory before implementation. Record:

- Expo SDK / React Native / TypeScript versions from actual files.
- Package manager and lockfile.
- Existing scripts for type checking, linting, tests, and builds.
- Navigator structure and route types.
- Shared UI components and theme tokens.
- Driver screens that are already polished, partially working, or visually inconsistent.
- Vendor screens that are complete, partial, missing, or disconnected.
- API clients, auth state, query/mutation hooks, Redux/Zustand stores, socket handlers, push-notification handling, file uploads, and mock/demo fallbacks.
- Any old/duplicate screen, unused component, abandoned route, dead CTA, TODO/FIXME, or stale endpoint that is demonstrably connected to the user flows.

Create/update a concise audit artifact in the project, for example `docs/partner-app-audit.md`, with a matrix containing:

`Screen / Route | Roles | Existing state | UI status | Behavior status | API status | Missing connection | Planned action | Priority`

Use the actual paths discovered; do not assume documented paths are current. This audit is an execution aid, not the final deliverable. After making the inventory, continue implementing without waiting for user approval unless a destructive/high-risk product decision is truly blocked.

## 5. Phase 1 — Build a Driver/Vendor screen and flow matrix

At minimum, inspect the following documented areas and any additional screens discovered in the repo.

### Shared authentication and role entry

- Partner splash/session restoration.
- Welcome / role selection.
- Driver type selection: Self Driver vs Vendor Driver.
- Shared mobile OTP login where used by Self Driver and Vendor Owner.
- OTP verification and resend/error states.
- Vendor Driver Login ID + password screen.
- Wrong-app-role guard for Customer accounts.
- Existing-account, new-account, verification-pending, rejected, approved, expired-session, and network failure destinations.

Ensure the initial role and authentication method remain unambiguous:
- Self Driver: mobile number → OTP.
- Vendor Owner: mobile number → OTP.
- Vendor Driver: vendor-assigned Login ID + password.
- Do not add a mobile OTP requirement to Vendor Drivers unless the verified product contract requires it.
- Do not ask the user to select Driver/Vendor twice when the selected role can safely be carried forward.

### Driver registration and verification

- Personal Information.
- Vehicle Details.
- Document upload.
- Review & Submit.
- Application submitted / verification status.
- First-login and pending-verification route guard.
- Approval, rejection, resubmission, missing/expired document, upload failure, and resume-draft states.

Follow the current backend's document requirements. Keep required, conditional, and later/payout-only documents distinct. Never mark a document optional in the UI if the existing API/policy requires it before submission or activation.

### Vendor registration and verification

- Business information.
- Business/operating address.
- GSTIN/MSME/business details as supported.
- Bank/payout details according to the current contract.
- Business/owner document uploads.
- Review & Submit with explicit terms acceptance if required by the current flow.
- Application submitted / verification status.
- Missing, rejected, resubmission, and pending verification states.

Do not copy Driver registration fields blindly into Vendor registration. They are different business entities with different information and document requirements.

### Shared/hybrid Home and Jobs screens

Home/Dashboard:
- Driver: availability toggle, current/active trip priority, relevant request shortcut, earnings, KYC/verification status, today’s work, recent activity.
- Vendor: company/fleet context, incoming booking leads, relevant assignments, driver availability, vehicles status, verification, business-level jobs/earnings where actual data exists.
- Never show the Driver online/offline switch on Vendor Owner Home unless current requirements explicitly call for it. A vendor’s fleet being active is not the same as an individual driver’s online status.

Jobs:
- Driver filters and states must follow actual implementation (documented candidates: All, Available, Active, Done).
- Vendor filters and states must follow actual implementation (documented candidates: All, New, Nearby, Assigned, In progress, Completed).
- Driver’s primary action for available work is accept/decline; an active job opens the driver’s job execution screen.
- Vendor’s primary action for an unassigned lead is assign a vehicle/driver; assigned/in-progress jobs show assigned fleet details and status.
- Maintain separate data scopes: an individual driver must not see the company-wide queue unless product rules permit it.

### Driver job lifecycle

Check the whole chain:
`Available Request → Review Request → Accept/Decline → Accepted/Assigned → En Route to Pickup → Arrived at Pickup → Verify 4-digit Customer Trip OTP → In Progress → Complete Job → Confirmed Completion/Earnings Summary`

Preserve the existing backend state names and allowed transitions. The above labels are a UX model, not permission to invent new backend statuses.

Make race conditions safe: another driver may accept the request, a request can expire, or the API may fail. The UI must reconcile with the server instead of displaying stale availability or false success.

### Vendor dispatch and fleet management

- Vendor Assign Job screen.
- Vehicle-selection list and appropriate availability/maintenance checks.
- Driver-selection/assignment workflow if supported by the backend.
- Assignment confirmation and resulting job state.
- Vendor Drivers list, search, filters, status badges, Add Driver form/modal, and appropriate KYC fields.
- Vendor Vehicles list, search, filters, maintenance state, insurance-expiry warnings, Add Vehicle form/modal, and driver assignment where supported.
- Empty/loading/error/success states for all fleet screens.
- Prevent deleting/reassigning vehicles/drivers when current business rules prohibit it; do not invent those rules, inspect existing API/backend policy.

### Common account and support family

Audit Driver and Vendor behavior for:
- Account/Profile overview.
- Edit profile/business profile.
- Personal/vehicle/business information destinations.
- Documents and verification.
- Earnings and payouts where relevant.
- Notifications inbox and preferences if implemented or connected to existing events.
- Help and support.
- Settings and legal links where available.
- Logout confirmation.
- Trip/job history if available.

Common UI can be reused, but role-specific sections, data scope, and permissions must remain correct. Do not create duplicate destinations or fake functionality to fill out a reference collage.

## 6. Phase 2 — Normalize the design system and interaction behavior

Use the existing established RACE Partner implementation and supporting standards as the baseline. Do not independently redesign every page.

Audit and unify:
- Headers: back button, title, action slots, safe area, and spacing.
- Bottom tab bar: same destinations/order/style where appropriate; no duplicate tab bars on nested screens.
- Typography scale and text hierarchy.
- Spacing, screen gutters, card radius, border/elevation, field heights, button heights, icon sizing, status badges, and color semantics.
- Inputs: labels, focus, validation, keyboard type, return action, auto-scroll above keyboard, and CTA visibility.
- Lists: stable keys, separators/cards, loading skeletons, pagination/refresh where supported, and performant rendering.
- Sheets, dialogs, confirmation patterns, permission prompts, file/photo pickers, and toast/snackbar feedback.
- Loading, empty, error, offline, stale-data, success, and retry states.
- Small, restrained motion and native-feeling transitions using dependencies already installed and compatible.

Do not make Vendor look like a different product. Maintain the same RACE identity and components, while changing information hierarchy/actions to suit the Vendor Owner workflow. A subtle role cue is acceptable if it matches the existing design system; do not invent a completely separate visual theme.

Use the anti-pattern list. Specifically avoid:
- Overcrowded dashboards and repeated trust/status cards.
- Marketing-website style sections in operational screens.
- Giant hero imagery pushing tasks below the fold.
- Multiple competing primary buttons.
- Long forms without grouping or progress.
- Every screen having a bottom navigation bar regardless of context.
- Floating debug/settings gear leaking into production.
- Static mock metrics in live mode.
- Tiny touch targets, stale status pills, dead buttons, or hidden keyboard actions.

## 7. Phase 3 — Connect every route and action

Build a route/interaction map from code and verify the connections. For every screen, confirm:

- Where the user enters from.
- Correct back destination.
- Primary and secondary actions.
- Role and permission guard.
- Data source / query / mutation.
- Success destination and state refresh.
- Loading and failure outcome.
- Deep link / notification target if relevant.
- Session restore and app resume behavior.

Use a canonical destination rather than creating a duplicate screen for the same resource. When profile updates or mutations succeed, refresh/invalidate the correct caches and stores. When a job changes state, keep dashboard, job list, active-job screen, and notifications consistent with authoritative data.

For notification routing, only support event types and URLs that exist or are explicitly implemented. Restore authentication first, validate current role and ownership, resolve stale/deleted targets, and avoid duplicate navigation stacks.

## 8. Phase 4 — Audit and repair API/backend connections

The front-end flow is not complete if it only looks correct. At minimum, audit all API connections used by the screens in scope.

- Search for stale endpoints, outdated response properties, abandoned hooks, duplicate state sources, incorrect query keys, missing invalidations, broken upload URLs, unhandled request errors, wrong payload fields, and old mock data leaking into live mode.
- Confirm token attachment, session expiry/refresh behavior, role-specific auth, logout cleanup, and protected route handling.
- Confirm loading/error handling for every important query and mutation.
- Check API/backend code in the workspace if present and in scope. Do not assume a backend repository is available if it is not.
- Reconcile UI-required fields with server validation. Report mismatches instead of bypassing validation.
- For file uploads, validate file type/size based on actual server rules, handle progress/retry, and do not report an upload success before the server confirms it.
- For job state transitions, treat the server as authoritative and protect against duplicate taps/race conditions.
- Keep mock/demo paths isolated and explicit. If demo fallback must remain, label and gate it correctly.

If time becomes constrained, fully connect and validate the most important Driver/Vendor flows first, then continue lower-priority backend cleanup. Do not skip API review for a screen whose behavior depends on it.

## 9. Phase 5 — Test real end-to-end scenarios

Run the checks available in this repository, chosen from actual scripts. Do not assume a command exists.

### Driver scenarios

1. Self Driver login with mobile OTP.
2. New Self Driver registration and submit.
3. First-time/pending Driver lands on verification status, not directly into operational Home.
4. Approved Driver enters Home and can toggle availability if eligible.
5. Incoming request arrives and can be reviewed.
6. Accept succeeds; duplicate requests/race outcomes handled.
7. En-route → Arrived → customer trip OTP → In progress → Complete.
8. Incorrect OTP and API failures do not advance the lifecycle.
9. App background/resume recovers the active job correctly.
10. Profile/document/notification interactions use valid routes.

### Vendor Owner scenarios

1. Vendor mobile OTP login.
2. New Vendor registration and submission.
3. Pending Vendor sees appropriate verification/limited-access state.
4. Approved Vendor sees Vendor dashboard, not Driver availability controls.
5. Vendor sees the company’s booking leads.
6. Assign job to a valid available vehicle/driver using supported backend data.
7. Driver/vehicle lists, add/edit flows, search/filter, and maintenance states work.
8. Account/documents/payout/settings destinations are role appropriate.

### Vendor Driver scenarios

1. Login by vendor-assigned Login ID/password.
2. Invalid credentials display a useful recoverable error.
3. Successful authentication opens the Driver operational experience with vendor context, not Vendor Owner dashboard.
4. Fleet-owner permissions cannot be reached by manually opening routes.

### Cross-cutting scenarios

- Keyboard does not cover fields or main CTA.
- No network / API failure and retry.
- Expired session / logout.
- Loading and empty states.
- Document upload permission denied, interrupted upload, retry, rejected document.
- Notifications with stale target or an already completed job.
- Android physical/back gesture behavior.
- Different screen sizes and safe areas.
- No leaked demo controls in production mode.

Use unit/component/navigation tests, type checking, linting, and device/emulator smoke testing where available. If physical GPS/background behavior cannot be validated in a simulator or Expo Go, explicitly list it as unverified and recommend a development-build/device test.

## 10. Priority and execution order

Work in this order and keep moving after each batch:

### P0 — Protect core flows
- Prevent broken auth/role routing and incorrect access.
- Preserve Driver functionality and working screen designs.
- Fix route disconnections, dead primary buttons, invalid status transitions, and obvious API contract errors.
- Ensure first-time/pending verification flow is respected for both Driver and Vendor.

### P1 — Vendor parity and shared connectivity
- Complete the Vendor Home and Jobs experience.
- Complete Vendor assignment, drivers, vehicles, registration, and verification flows based on the actual implementation.
- Ensure genuine shared screens and components work for both roles.
- Repair account/profile, notifications, documents, and support destinations when they exist or are required by current product structure.

### P2 — UI polish and behavioral consistency
- Headers, tabs, forms, spacing, error/empty/loading states, transitions, motion, and subtle visual inconsistencies.
- Remove redundant content and accidental duplicate screens.

### P3 — Deeper cleanup
- Backend/API refinements not blocking P0/P1.
- Performance improvements and lower-priority maintainability fixes.
- Documentation updates and additional tests.

Do not spend the whole task polishing shadows while Vendor flows are missing or disconnected. Prioritize functional parity and correct connectivity, then polish.

## 11. Guardrails against risky implementation

- Do not wholesale replace the navigation tree.
- Do not upgrade Expo/React Native or other major dependencies as part of routine polish unless compatibility requires it and you can verify the migration.
- Do not add a new animation/map/state library without proving a real gap in the existing stack.
- Do not duplicate Redux/Zustand/auth state; use existing project conventions and note contradictions.
- Do not hard-code role, verification status, user IDs, job IDs, distance, price, earnings, contact data, or statuses.
- Do not delete a screen until all references/routes and expected role behaviors are traced.
- Do not silently change required fields or approval rules.
- Do not expose demo login or role preview shortcuts in production.
- Do not let visual references override API/backend truth.
- Do not claim work is complete while known major routes remain broken.
- If a product rule is ambiguous, search the current code and docs first. If still ambiguous, choose the lowest-risk behavior that preserves existing functionality, document the assumption, and continue with non-blocked work rather than stopping the whole task.

## 12. Required deliverables

Create/update the following in the project where appropriate:

1. `docs/partner-app-audit.md` — screen/route/API/role matrix and findings.
2. `docs/partner-flow-map.md` — key Driver, Vendor Owner, and Vendor Driver journeys, including verification and job lifecycle.
3. `docs/partner-implementation-report.md` — changed files, reused/created components, completed fixes, remaining blockers, and tests actually run.

The code itself is the primary deliverable. Documentation must describe actual implementation, not an aspirational design.

At the end, summarize:
- Which Driver screens were preserved and what was refined.
- Which Vendor screens were completed/refined.
- Which components/routes are truly shared and how role differences are handled.
- Which screen/API/notification/job flows were reconnected.
- Which backend gaps remain.
- Tests/commands run and exact outcomes.
- Any unverified behavior requiring a physical device/development build.

## Final instruction

**Audit deeply, implement carefully, keep the Driver side stable, bring Vendor to parity with the same established RACE UI/UX, connect all valid shared and role-specific flows, inspect API behavior, and verify the result. Do not stop at the audit or at a visual-only pass.**
