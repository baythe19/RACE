# MASTER IMPLEMENTATION PROMPT — RACE PARTNER APP
## Account/Profile, Notifications, Earnings, Documents, Settings and Supporting UX

You are working on the **RACE Partner mobile application**, not the RACE Customer app. Read this prompt fully before changing code. The accompanying two reference-board images are visual guidance for the screen family described here. Treat them as design references, not as pixel-perfect specifications and not as evidence that sample data, endpoints, labels, or every illustrated feature already exists.

Your responsibility is to inspect the existing app, preserve its current architecture and working behavior, then refine, implement, and connect the screens below into one coherent experience. Do not stop after producing a critique or mockup: when source code is available, make the safest useful implementation, validate it, and report precisely what changed and what remains blocked.

---

# 1. PRODUCT CONTEXT: SOURCE OF TRUTH

RACE Partner is a **single Expo / React Native mobile app with two distinct roles**:

- **Driver**: an independent tow-truck operator or chauffeur. Key needs include availability, jobs, active-trip execution, profile, vehicle and document verification, earnings, and support.
- **Vendor / Fleet Owner**: a business owner or workshop/fleet operator. Key needs include booking leads, assigning vehicles/drivers, managing a fleet, verification, and business payouts.
- A **Vendor Driver** is a driver employed by a Vendor. This is still a Driver operational experience, not a Vendor/Fleet Owner dashboard. Vendor Drivers authenticate with vendor-assigned Login ID and password; do not force them into the self-driver mobile OTP flow.

The existing navigation is a shared/hybrid app with role-aware UI. The known high-level bottom tabs are **Dashboard/Home, Jobs, Account**. Preserve the actual current route names and navigators found in the repository; do not duplicate or replace navigation with a new system unless a documented blocker requires it.

Known architecture from the project audit includes screens/components such as `PartnerHomeScreen`, `PartnerJobsScreen`, `PartnerAccountScreen`, `PartnerVerificationStatusScreen`, `PartnerActiveJobScreen`, `VendorDriversScreen`, `VendorVehiclesScreen`, driver/vendor registration wizards, a React Query API layer, and existing Redux/Zustand stores. The project has live API behavior and mock/demo fallbacks. Verify the current repository before relying on any of those names or details: code is the implementation source of truth when it differs from this prompt.

## Priority order when sources disagree
1. Existing working code, API contracts, navigation types, and tests.
2. The current architecture/audit document provided with the task.
3. The rules in this prompt and the companion RACE design/motion standards, if present.
4. The two visual reference-board images.
5. Your own inference, clearly marked and not used to invent backend capabilities.

Do not silently modify authentication, API contracts, role resolution, registration requirements, job lifecycle, or data ownership to make a design easier.

---

# 2. VISUAL DIRECTION

Build a **modern, focused, app-native operational interface**. Use the reference boards to understand the visual language:

- White or warm-neutral screen backgrounds, restrained RACE amber/orange for primary actions and active states, dark readable text, muted secondary text, and restrained green/blue/red semantic indicators.
- Preserve the actual RACE logo and current theme tokens from the repository. Do not approximate the logo with text or use a made-up replacement.
- Comfortable whitespace, consistent edges and vertical rhythm, compact but readable sections, subtle elevation, sensible grouping, and consistent icon sizing/stroke.
- Reuse the app's current design tokens/components wherever possible. Do not create a second visual system for these pages.
- Make the app feel like a professional field-operations product, not a promotional website. Avoid oversized hero images, decorative banners, unnecessary explanatory paragraphs, excessive cards, repetitive trust claims, and long scrolls made of redundant sections.
- Give every screen one clear primary purpose and at most one visually dominant primary action.
- Use consistent status semantics everywhere. For example, do not style “Under review,” “Approved,” “Rejected,” and “Payout pending” as interchangeable states.
- Reference-board values such as names, phone numbers, driver IDs, dates, ratings, completed-job counts, balances, bank details, earnings, distances, and notification contents are illustrative. **Never hardcode them.** Bind real API/store data, or use clearly designated demo fixtures only inside the existing demo mode.
- Avoid using generated photos of identity documents as actual product assets. Document previews in a real app must come from the user's selected/uploaded file, with sensitive information appropriately protected.

### Design-system implementation
Before writing new UI, inspect existing colors, typography, spacing, radii, icon library, input/button components, status badges, sheets/modals, and navigation header. Prefer updating/reusing a shared component over styling the same thing independently on every page.

Use a consistent sizing rhythm and touch targets appropriate for mobile. Ensure text contrast and scaling. Respect safe areas and Android system bars. Do not use emoji as a substitute for the icon system in production UI unless the project already uses that intentionally.

---

# 3. REQUIRED FIRST ACTION: REPOSITORY AUDIT

Before implementation, inspect and summarize internally (and in the final report briefly):

1. `package.json`, Expo SDK/React Native versions, installed animation/navigation/icon/map/image/document-picker packages, and scripts for type-check, lint, and tests.
2. Root app navigator, `PartnerNavigator`, auth/registration navigators, tab routes, route parameter types, and whether a notification route/deep link already exists.
3. Existing Account/Profile screen, any edit-profile/vehicle/documents/earnings/payout/notifications/settings/support screens, modals, and reusable components. Search before creating new files.
4. Relevant API services, query/mutation hooks, TypeScript models, stores, query keys, error handling, pagination conventions, upload methods, and mock/demo fallback behavior.
5. Existing push/local notification registration, unread count, notification preferences, and notification event payload formats, if any.
6. Existing verification states and rules for online eligibility, bank payout readiness, role-specific fields, and document requirements.
7. Existing header, bottom navigation, keyboard handling, animation and theme conventions.

Make a concise inventory: **already exists / partially exists / missing / backend not supported / needs product decision**. Then proceed with safe work. Do not ask the user to re-send data that is already present in the code or provided documentation.

If something is not supported by current APIs, do not fake a successful live feature. Build a graceful read-only/disabled/explanatory state only when appropriate and document the missing contract. Do not create arbitrary endpoints, new notification payload schemas, fake balances, or mock success responses in production mode.

---

# 4. GLOBAL NAVIGATION AND INTERACTION RULES

## 4.1 Main tabs and headers
- Keep exactly the existing top-level tab architecture unless the repository proves otherwise. Do not add Profile, Earnings, Notifications, Documents, or Settings as new bottom tabs merely because they have a screen.
- Dashboard, Jobs, and Account should use a consistent root-tab header pattern and active-tab appearance.
- Notifications should normally open from the existing bell/notification entry point if one is present, and may also be linked from Account. Use one canonical Notifications route rather than duplicate implementations.
- Secondary pages (Edit Profile, Documents, Earnings, Settings, Help, Vehicle Details, payout details) should follow one consistent subpage header: back affordance, clear title, optional right-side action only when needed. Use the shared header component if available.
- Show bottom navigation on root tab destinations only, unless the existing navigation explicitly keeps it on a class of child screens. Hide it for focused workflows such as active-trip execution, registration wizards, auth, full-screen document capture, and modal/action-sheet flows when covering it would reduce focus or conflict with native navigation.
- Never manually draw a second bottom bar inside a screen that is already inside the tab navigator.
- Back behavior must respect the navigation stack. Do not send a user to Dashboard arbitrarily when they expect to return to the previous screen.
- Back from an edited form with unsaved changes must warn the user; Back from a read-only screen should be immediate.

## 4.2 Motion and tactile feedback
- Audit the installed dependencies first. Use the project's existing navigation transitions and animation stack. Do not add a library merely to animate a button.
- Prefer subtle, short feedback: button press state, sheet easing, tab/route transitions, skeleton/loading transitions, and a small success acknowledgement when useful. Avoid springy, bouncy, continuous or decorative animations that delay work.
- Typical guidance: control feedback around 100–160 ms; small state change around 150–220 ms; screen/sheet transitions around 180–280 ms. Treat these as targets, not arbitrary timers to add everywhere. Follow current library/platform defaults when they feel better and are performant.
- Do not animate full-page content unnecessarily. Do not animate a map marker so aggressively that it looks like the GPS position is false. Do not run celebratory confetti after every save. One subtle success feedback is enough.
- Avoid blocking interactions during a nonessential animation. Respect reduced-motion/accessibility preferences if the app supports them.
- Use haptics only if a compatible package is already installed or can be safely added within the app's SDK/build setup, and only for meaningful events such as a successful critical action; never vibrate on every render.

## 4.3 Loading, error, empty and offline states
Every API-driven screen must handle:
- Initial load (skeleton or calm progress indicator; avoid blank white content).
- Refresh/retry.
- Empty state that explains what the user can do next.
- API error with an honest message and retry action.
- Offline/stale content behavior consistent with existing app conventions.
- Mutation in progress with duplicate-submit prevention.
- Mutation failure preserving the user's input and current state.
- Success only after real confirmation from the server or a clearly labeled local-only action.

Never report “saved”, “accepted”, “approved”, “paid”, “read” or “completed” before the relevant persisted state is confirmed. Do not swallow errors or erase user-entered data after a failed request.

## 4.4 Keyboard and forms
- Use the appropriate keyboard type and `returnKeyType` per field. Mobile number uses numeric keypad; email uses email keyboard; IFSC/vehicle identifiers use suitable text capitalization and input normalization; passwords are secure text by default with an accessible show/hide affordance.
- Use `onSubmitEditing`/focus chaining where logical. When a field receives focus, scroll it into view; ensure the active input, validation message, and Continue/Save CTA are not hidden behind the keyboard or Android navigation area.
- Keep labels visible. Do not rely on placeholders as field labels.
- Preserve drafts across steps and failed API calls using the existing registration/profile store patterns.
- Validate locally for immediate feedback, then rely on authoritative server validation for final state. Don't show a green valid state until enough validation exists to justify it.

---

# 5. SCREEN SPECIFICATIONS

The two attached visual reference boards suggest a screen family. Inspect the current app and implement the supported screens in the order below. Reuse existing pages where they already exist; do not produce duplicate route/screen files for the same feature.

## Screen A — Account / Profile Overview (root Account tab)
**Purpose:** A single, predictable place to manage the authenticated partner account.

### Driver view
- Profile photo or initials avatar; name; Driver / Self Driver / Vendor Driver label as actually known; non-sensitive driver identifier only if the product exposes it; account/verification status.
- Compact stats row only if values exist from the API: rating, completed jobs/trips, experience. Hide absent metrics rather than showing zeros or invented values.
- Grouped navigation rows for relevant areas, e.g. Personal Information, Vehicle Information, Documents & Verification, Earnings & Payouts, Notifications, Help & Support, Settings.
- Show each item's real status where available: approved, pending review, action required, payout setup pending. Avoid duplicating the same status in multiple cards.
- A clearly separated Log out action near the bottom, with confirmation.

### Vendor / Fleet view
- Business/owner identity and real verification status.
- Relevant routes to Business Profile, Vendor Drivers, Vendor Vehicles, Verification Status, Bank/Payouts, Notifications, Help & Support, and Settings, but only if the screen/routes exist or are properly implemented.
- Do not show a vendor's fleet metrics or driver-management actions in a Vendor Driver's personal account just because that user works for a vendor.

### Behavior
- Lists navigate through canonical routes and preserve the correct Driver/Vendor role.
- Profile identity is not repeated in multiple decorative cards.
- If avatar editing exists, open a native/image-picker flow and show upload progress and failure handling. If no upload API exists, don't present a fake successful photo upload.

## Screen B — Edit Personal Profile
**Purpose:** Update allowed personal fields without allowing unauthorized edits to identity fields.

- Use the existing model and schema. Do not remove fields required by the current backend or driver/vendor registration process.
- Full name, email, date of birth, city/address/languages/emergency contact: render only the fields that exist and are appropriate to this role and current API. Clearly label optional fields.
- A phone number verified through authentication should be read-only unless there is a supported change-number flow. Explain how to change it if such a flow exists.
- Use native pickers/selectors for date, city, language and other enumerated fields when suitable.
- Include Save Changes as the single primary CTA; keep it disabled until a valid change exists or while saving, as consistent with current controls.
- On save failure, preserve edits and show a useful error. On save success, update or invalidate the relevant query/store and provide subtle success feedback.
- Warn before leaving if there are unsaved changes. Do not silently discard a draft.
- Protect personal data: don't log it, expose it in debug labels, or place it in notification previews unnecessarily.

## Screen C — Vehicle Information / Edit Vehicle
**Purpose:** Review and update the Driver's registered vehicle without confusing it with Vendor fleet management.

- Driver: show selected vehicle type, registration number, RC/vehicle metadata supported by the API, insurance status/expiry if available, and the verification state.
- If the driver can operate multiple vehicles, use the existing data model and routes rather than assuming a single vehicle.
- Vendor fleet vehicle management belongs to the existing Vendor Vehicles screen; do not reuse a driver's single-vehicle edit form for the fleet list.
- Use appropriate vehicle category selection, consistent registration-number formatting and field validation. Don't imply that an identifier is verified when the backend has not verified it.
- Vehicle photo/document replace flows must use real upload APIs and show upload/review state.

## Screen D — Documents & Verification Status
**Purpose:** Explain whether each document is missing, uploaded, under review, approved, rejected, expired, or conditionally required.

- Start with one concise overall status summary, e.g. “Action required”, “Under review” or “All required documents approved”, based on real backend state.
- List documents in clear groups: **Required for review**, **Only if applicable**, and **Before first payout**. Group membership must come from actual registration/compliance/business rules, not arbitrary design assumptions.
- A document row can show document type, human-readable requirement, status badge, upload date/expiry only if available, and a contextual action (Upload, View, Replace, Re-upload).
- For rejected documents, show the real rejection reason and a direct correction path. For expired documents, request a valid replacement.
- Upload flow: open a bottom sheet/action sheet with Take Photo / Choose from Gallery / Choose File where these options are supported. Ask Android/iOS permissions just-in-time and explain why. Allow preview, remove/replace before submission if supported, retry failed upload, show progress, and prevent duplicate uploads.
- Validate accepted formats/size according to the actual upload API. Do not invent a file-size limit. Display the limit from app configuration or the backend contract.
- Do not expose full Aadhaar, PAN, bank numbers, or document scans in list rows. Use masked identifiers or document type/status. Do not copy sample document pictures from the design board into the live app.
- Distinguish “document uploaded” from “document approved” and from “driver eligible to go online”. These are separate statuses.

## Screen E — Earnings & Payouts
**Purpose:** Let the Driver understand what was earned, what is pending, and which payouts actually occurred.

- Reuse earnings APIs already used by the dashboard when possible; don't create parallel calculations or duplicate business logic in the UI.
- Use a date range selector only where supported (e.g. this week / month). Show total earnings, completed job count, breakdown and recent trip/payout list only for returned fields.
- Keep **Earnings** and **Payouts** logically distinct. Job earnings are not automatically equivalent to money already transferred to the bank.
- Use charts only when there are sufficient real data points. Provide an accessible textual equivalent and useful empty state when there is no earnings history.
- A payout item may show amount, date and status only as provided by the payout API. Do not claim a transfer has been completed based solely on a local action.
- Bank/payout setup should clearly show if it is incomplete, pending verification or ready. Mask bank account numbers, never show all digits after saving, and never log account details.
- If earnings/payout APIs don't exist, do not invent data or a fake chart. Show the existing supported information or report the missing API explicitly.

## Screen F — Notifications Inbox
**Purpose:** One canonical inbox for real partner events.

### Layout
- Header with title and a Mark all as read action only if supported.
- Optional small category chips such as All, Jobs, Account/Verification, Earnings/Payments. Only include categories that correspond to real event types; avoid a long horizontal filter bar on a narrow device.
- Chronologically grouped list (e.g. Today / Yesterday / Earlier), one item per event, with restrained semantic icon/color, concise title, one useful detail, timestamp, and unread indicator.
- Avoid multiple notification rows that duplicate the same event.

### Event handling / navigation
- New job/request: open the relevant Jobs request/offer only if it is still valid; if expired or already claimed, show an honest stale/unavailable state.
- Job accepted / assigned / trip status: open the canonical active-job or job-detail route with its real booking ID.
- Document reviewed/rejected/approved: open the matching document or verification details, not an arbitrary Dashboard route.
- Payout event: open Earnings/Payout details only if the route and API exist.
- Account/security events: open their relevant settings/details only if supported.
- If a notification includes a deep link, validate its target and auth/role before navigating. The app must safely fall back if the target item is missing.
- Respect notification tap behavior when the app is foregrounded, backgrounded, or cold-started. Do not create duplicate screens or lose the pending destination while authentication is restored.
- Mark a single notification read on open only if that matches the API behavior; mark-all must call the real mutation when present. If read state is local-only, be explicit and consistent.
- Do not render customer personal data, a one-time OTP, bank data or other sensitive information in notification preview text.

### Required states
- Loading, new/unread list, all-read list, no notifications, failed fetch/retry, pull-to-refresh, pagination/load-more if supported, and mark-read mutation error.

## Screen G — Notification Preferences
Keep this separate from the notification inbox. The inbox shows events; preferences controls what the user chooses to receive.

- Group only the preferences that the app/backend can actually control, such as job updates, account/verification events and payout updates. Marketing/promotions should not appear unless there is a real supported preference and consent policy.
- Do not confuse app-level notification preferences with Android OS notification permission. If permission is denied, explain the limitation and provide an action to open system settings only when implemented correctly.
- Each toggle needs a saving state or clear optimistic rollback on failure. Do not display a toggle as persisted when saving failed.

## Screen H — Account / App Settings
Use a compact list grouped into relevant sections, for example:
- **Account:** Profile, Documents, Bank & Payouts, Change password only where the account's actual authentication supports it.
- **Preferences:** Notifications, Language, Theme only if implemented, Location/permission status.
- **Support & legal:** Help & Support, Terms, Privacy Policy.
- **About:** App version and build only when available through the project configuration.
- **Session:** Log out.

Rules:
- Do not show “Change Password” to an OTP-only account unless the actual auth flow supports it. Vendor Driver credentials may be vendor-managed; handle that according to the real product policy.
- Do not show fake dark-mode/language switches that visually toggle but do not change the app. If a feature is unavailable, omit it or clearly mark it unavailable according to product direction.
- For location permissions, show a status and rationale; request permission only when the user invokes a feature that needs it. Do not open OS settings repeatedly without explaining why.
- Role switch/preview buttons in the source may be development-only. Inspect `UI_PREVIEW_MODE` and related config. Never expose test role-switching as a production feature unless explicitly supported by product/auth rules.

## Screen I — Help & Support
- Keep the top-level page focused: searchable help topics only if there is a real FAQ/help dataset, then a small number of real contact methods (Call, in-app chat, WhatsApp, email) based on configured channels.
- Use valid configured phone numbers/URLs; never copy a number from a generated screenshot into production.
- Common categories may include Login & Account, Jobs & Trips, Documents & Verification, Earnings & Payouts, and App/Location Issues if those subjects are supported.
- On selecting a help item, open useful content or a working contact action, not a dead-end placeholder.
- Handle unavailable network and failed support requests honestly.

## Screen J — Bank & Payout Details
- Show setup status and minimal form fields that the existing payout API requires (e.g. account holder, account number, IFSC; PAN only when required by the actual payout/tax policy).
- Validate IFSC/account input locally and via backend. Normalize IFSC capitalization only if safe. Provide masked review before submit and a confirmation/error state.
- Show account verification/payout status from backend. Keep full account data out of logs and UI after initial entry; use masking.
- Do not promise a payout timeline or successful bank verification unless the API/business policy supplies it.

## Screen K — Trip / Job History
- Reuse the canonical Jobs/booking models and details route. Filters such as All, Completed, Cancelled should exist only if the API defines those statuses.
- List job/booking reference, service, completion/status, date, relevant route summary and fare/earnings only when available.
- Tapping a row opens its detail. Handle missing/removed items and stale state gracefully.
- Don't calculate or display a made-up driver rating, trip count or average earning.

## Screen L — Logout Confirmation
- Use a native-feeling alert/dialog or existing shared confirmation modal.
- Say what will happen plainly, with Cancel as a safe action and Log out as the destructive action.
- Prevent duplicate logout taps. Clear auth/session data using the existing centralized logout method, then navigate through the existing root auth state. Do not manually navigate while stale tokens remain in stores.
- Never display the user's credentials or sensitive session details.

## Supporting components and states from the reference boards
Implement/reuse these as reusable components, not one-off divergent patterns:
1. **Image/document source sheet** — camera, gallery, file picker, preview, cancel, upload progress, permission denied, retry.
2. **Permission education UI** — clear reason, Allow/Not now; do not repeatedly prompt after denial. Link to OS settings only when applicable.
3. **Network error/offline state** — concise offline message, Retry, optional read-only/stale state if supported. Never show a network error full-screen when an inline error is enough.
4. **Success feedback** — compact toast/banner or short subtle success state; avoid full-screen interruption for a simple field save.
5. **Language selector** — implement only if localization is already configured or can be integrated consistently; selecting a language must actually change language.
6. **Settings toggles** — accessible labels, current persisted value, saving/failure behavior.
7. **Unread count/indicator** — derived from real unread data; don't use hardcoded badges.

---

# 6. ROLE-BASED DATA AND PRIVACY RULES

- The same Account root may render Driver- or Vendor-specific rows, but only for the currently authenticated `user.role` and real permissions.
- A Vendor Driver must not gain access to fleet owner screens simply because their employment relation points to a Vendor. Authorization must be enforced by route/UI and backend, not merely hidden visually.
- Do not infer a user is verified from a successful OTP login. Login verification and partner KYC/document verification are separate.
- Do not infer “eligible to go online” from documents merely being uploaded. Use the actual verification/availability rules.
- Keep sensitive personal information, identity documents and bank data minimized and masked. Never log credentials, access tokens, OTPs, full bank-account numbers, or document contents.
- Do not reuse example names, IDs, cities, job references, prices, ratings, timestamps, bank details or phone numbers from mockups as live copy.
- Follow existing API auth/role ownership rules. A Driver should never fetch a different Driver's account or notifications by changing a route parameter.

---

# 7. COMPONENT AND FILE ORGANIZATION

First follow the existing structure. If reusable components already exist, extend them. If the repository supports a shared partner component layer, prefer appropriately scoped components such as:

- `PartnerScreenHeader`
- `PartnerStatusBadge`
- `PartnerListRow`
- `PartnerSectionHeader`
- `PartnerEmptyState`
- `PartnerErrorState`
- `PartnerLoadingState` / skeleton
- `PartnerConfirmationDialog`
- `PartnerUploadActionSheet`
- `PartnerDocumentRow`
- `PartnerProfileSummary`
- `PartnerNotificationItem`
- `PartnerFormField`

These are conceptual names, not a mandate to duplicate components with these exact names. Search for equivalents first. Keep components small and typed; avoid one giant conditional component with a large number of nested inline branches. Keep role-specific content modular.

Reuse existing query hooks and mutation methods, invalidate/update cache through the current data pattern, and keep the app's existing state architecture. Do not refactor Redux/Zustand duplication or replace React Query as part of a cosmetic task unless a concrete correctness issue makes it necessary; report such architecture concerns separately.

---

# 8. ANIMATION / TRANSITION DETAILS FOR THESE SCREENS

- List-row navigation: standard navigation transition; preserve native back gesture and previous scroll position where possible.
- Profile save: button enters loading, disables duplicate submission, then shows small success feedback after server success. Avoid a full-screen success page for a minor edit.
- Document upload: display a per-document progress/status so a large file does not make the whole screen appear frozen. If upload fails, offer Retry/Replace without losing the rest of the form.
- Notification tap: subtle pressed state; route only after resolving the valid target; show a stale-item message if it no longer exists.
- Toggle: provide immediate visual feedback, but roll back if persistence fails (unless the existing mutation pattern deliberately waits for server confirmation).
- Bottom sheet: use the current installed/native sheet system, with sensible safe-area/keyboard treatment and dismiss behavior. No decorative overshoot.
- Logout: subtle dialog fade/scale only if the existing modal system uses it; preserve predictable Cancel behavior.
- Loading/empty/error transitions should not shift the whole layout repeatedly. Prefer stable skeleton shapes or reserved space.
- Do not introduce always-running loops, excessive shadows/blur, animated charts on every render, or expensive repeated SVG/image remounts.

---

# 9. ACCEPTANCE CRITERIA

The work is not complete until the relevant items below are checked:

## Navigation
- Account is reachable from the existing root tab.
- Notifications are reachable from the canonical bell/menu entry and/or Account row without duplicate routes.
- Back returns to the expected previous screen; tab navigation remains consistent.
- Deep links from supported notifications route to the correct role-aware target.
- Vendor Driver does not access Vendor Owner-only screens.

## Data and behavior
- Screens use current authenticated user's real data or explicit dev fixtures only in dev/demo mode.
- All buttons, rows, toggles, filters and links have working behavior; no decorative or fake interaction remains.
- Save/update/upload/read/payout/logout success only appears after valid confirmation.
- Failed requests preserve user data and show retryable errors.
- Empty lists are intentional and helpful.
- Sensitive data is masked and not logged.

## UI and accessibility
- Shared header, back arrow, typography, icons, spacing, fields, status badges, CTA style and bottom-tab behavior are consistent.
- Safe area and keyboard don't cover active fields or primary actions.
- Touch targets are comfortably tappable; text remains legible at supported font scales.
- Screens don't repeat the same verification/trust/status block unnecessarily.
- Long lists scroll smoothly; list items have stable keys; expensive work is not repeated on every render.

## Engineering
- No unrelated architecture overhaul.
- No new package without checking compatibility with the project's Expo SDK and current build workflow.
- Run available type-check/lint/tests. If a check cannot run, state why; don't claim it passed.
- Manually inspect the relevant route transitions and both Driver and Vendor conditional views when possible.

---

# 10. IMPLEMENTATION PLAN AND EXPECTED REPORT

Work in this order:

1. Audit repository and produce a concise screen/route/API matrix: Existing / Partial / Missing / Backend unsupported.
2. Confirm current shared components and actual data contract; make an implementation plan that protects working flows.
3. Refine the Account/Profile root screen and connect current supported destinations.
4. Implement/refine Edit Profile, Vehicle Information and Documents/Verification routes that are supported and needed from Account.
5. Implement/refine Notifications Inbox and notification routing/read state according to actual event/API support.
6. Implement/refine Earnings/Payouts, Settings, Help & Support, Trip History and confirmation/permission/upload/error/success states according to existing support.
7. Check Driver, Self Driver, Vendor Driver and Vendor/Fleet Owner differences. Do not apply Driver screens to Vendor users by default.
8. Run checks and review visual/navigation consistency.

At completion, report:
- Screens/routes found and changed.
- Existing vs newly implemented screens.
- Reusable components created or reused.
- Actual APIs/hooks and state stores used.
- Any unavailable backend event, endpoint, permission or product rule that prevented a feature from being real.
- Commands/tests run and their result.
- Remaining issues, with priority.

Do not claim that a route, notification, upload, preference, payment, or backend state works unless you verified it. Prefer a smaller set of complete, connected, reliable screens over a broad set of beautiful but disconnected placeholders.

---

# 11. VISUAL REFERENCES ATTACHED

Read both attached images before implementation:

- `references/reference-board-01-account-settings.png` — broader screen family: Profile, Edit Profile, Notifications, Settings, Earnings/Wallet, Help & Support, logout confirmation, language selection, notification preferences, upload sheet, permission prompt, network error, and success feedback.
- `references/reference-board-02-profile-earnings-notifications.png` — alternate layout for Profile Overview, Edit Profile, Documents, Earnings/Payouts, Notifications, Settings, Help & Support, Bank/Payout Details, Vehicle Information, Trip History and logout confirmation.

Use the boards to infer consistency, density, grouping and component patterns. Do not implement the whole board as a single collage or composite page. Implement each real screen in its correct app route. Reconcile both boards with current architecture: when an element is visual-only or unsupported, omit it or mark it clearly as requiring backend/product support. Never treat sample data in a board as real.

**Start by inspecting the repository. Then implement and connect the highest-value supported flows while preserving RACE Partner's existing architecture and behavior.**
