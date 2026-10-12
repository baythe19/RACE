# RACE Partner App — Motion, Interaction, Maps & GPS Standard

**Version:** 1.0  
**Product:** RACE Partner Mobile App (Driver + Vendor)  
**Stack stated by product documentation:** Expo SDK 57 / React Native 0.86  
**Purpose:** A reusable implementation standard for smooth, predictable, low-lag interaction across existing screens and future screens.

---

## 1. The design principle

RACE should feel calm, responsive, trustworthy and operationally clear. The goal is **not to animate everything**. The goal is for every action to respond immediately, every screen transition to preserve context, and every job-state change to be unmistakable.

Borrow interaction principles from mature driver/dispatch apps such as Uber Driver and Rapido Captain: clear request decisions, prominent navigation and current task, legible trip stages, and concise feedback. Do not copy their branding, proprietary layouts, wording or assets. RACE remains its own product.

### Product context that must remain intact

- This is the separate **RACE Partner** app, not the Customer app.
- One codebase serves two roles: **Driver** and **Vendor/Fleet owner**.
- Driver priorities: availability, incoming requests, accept/decline, navigation to pickup, arrival, customer 4-digit trip OTP, service in progress, completion, earnings and safety.
- Vendor priorities are different: incoming booking leads, assigning vehicles, managing drivers/vehicles, verification and payouts.
- The codebase already has API and demo/mock fallback behavior plus existing auth, navigation, state and driver-location hooks. Inspect and reuse these before introducing new abstractions.
- Never assume a feature, API field, route, event, permission or status exists just because a mockup shows it. Verify it in the repository and backend contract first.

## 2. Recommended stack for the stated Expo SDK 57 project

**First inspect `package.json`, lockfile, app config, navigator, map component and current location/socket hooks.** Avoid duplicate libraries. Use `npx expo install <package>` for Expo-managed packages so compatible versions are selected for the project's SDK.

| Capability | Default recommendation | Notes |
|---|---|---|
| Standard in-app map | `react-native-maps` | Best low-friction starting point for this Expo project. Expo docs list it as included in Expo Go; it uses Google Maps on Android and Apple Maps or Google Maps on iOS. Expo Go is good for initial validation; production builds need the correct native map configuration/API keys. |
| Foreground device location | `expo-location` | Use for permission checks, current position and foreground subscriptions. Stop watchers when the relevant task ends. |
| Background location while an active job runs | `expo-location` + `expo-task-manager` and a **development/production build** | Expo Go does **not** support background location methods. Requires platform config and permissions. Do not promise reliable background GPS while testing only in Expo Go. |
| UI animation | `react-native-reanimated` | Recommended for interactive/high-frequency animated UI when already compatible. SDK 57 docs show Reanimated 4.5.1 and installation with `npx expo install react-native-reanimated react-native-worklets`; follow the version actually resolved for the project. |
| Complex touch gestures | `react-native-gesture-handler` | Use only for gestures that help the workflow (e.g. deliberate sheet drag). SDK 57 docs list it as included in Expo Go. Do not add swipe-only actions where a clear button is safer. |
| Haptics | `expo-haptics` | Optional, restrained confirmation feedback. Install with `npx expo install expo-haptics`; check the resolved version and real-device behavior. |
| Navigation transitions | Existing navigation implementation, preferably its existing native-stack transitions if already installed | Do not migrate from React Navigation to Expo Router or vice versa for animation polish alone. Preserve current route names and back-stack semantics. |
| Turn-by-turn navigation | Initially open the installed navigation app via a platform map URL/link if that matches product scope | `react-native-maps` displays a map; it is not by itself a full turn-by-turn navigation engine. Full embedded navigation is a separate native-SDK/product decision and must be proven in a development build. |
| Routes, ETA, distance | Existing backend route service or a chosen routing API, validated against actual contracts | Keep provider secrets server-side. Don't build a new routing provider into the app without approval, API-key restrictions, budget and fallback strategy. |

### Map library decision

1. **Start with `react-native-maps`** for the in-app map, pickup/drop markers, route polyline, camera framing and recenter button. This is the most compatible starting point with the stated Expo Go workflow.
2. Do not switch to `expo-maps` solely because it is Expo-owned: current SDK 57 docs mark Expo Maps alpha and not available in Expo Go.
3. Do not switch to `@rnmapbox/maps` unless the product intentionally chooses Mapbox styles/routing and accepts a custom development build; the library is not available in Expo Go because it requires native code.
4. For MVP, keep in-app route context simple and use external Google Maps/navigation app for actual turn-by-turn if required. If RACE later requires fully embedded navigation, run a technical spike comparing Google Navigation SDK and Mapbox Navigation on target devices, route quality in India, licensing/cost, rerouting, background behavior and Expo native integration before choosing.
5. Configure production map keys correctly and restrict keys to Android package/signing certificate and iOS bundle identifier. Never commit unrestricted keys or server routing secrets.

## 3. Motion tokens: consistent, subtle, not decorative

Create one shared token source after checking the existing design system. These are starting defaults, not reasons to rewrite all screens at once.

| Token | Initial target | Use |
|---|---:|---|
| `tapFeedback` | 80–120 ms | Pressed scale/colour response, usually scale to 0.98 or a small tonal change |
| `microTransition` | 120–180 ms | Icon/state/label changes |
| `contentTransition` | 160–220 ms | Small cards or inline status changes |
| `screenTransition` | Prefer native stack default; otherwise ~200–300 ms | Push/pop between standard screens |
| `sheetTransition` | ~220–300 ms | Bottom sheet open/close/snap |
| `successEmphasis` | ~180–260 ms | Check icon or compact success state, once |
| GPS marker interpolation | Smooth between real samples; tune by device testing | Visual marker movement only, not fabricated coordinates sent to server |

### Easing and properties

- Prefer native navigation transitions and composited properties: `opacity`, `translateX`, `translateY`, and `scale`.
- Prefer one short ease-out for entering and ease-in for exiting; use spring behavior only where it communicates a physical drag or sheet settle.
- Avoid animating large shadows, blur, full-screen background gradients, map camera, and multiple layout dimensions at once. Don't animate height/layout on every GPS update.
- No continuous bounce, pulse, shimmer or floating icons merely to make the screen feel alive.
- Do not stagger every card on every screen visit. If entrance animation is helpful, animate one meaningful section or use a very subtle short fade/slide.
- Do not block a critical task behind an animation. Mutation/loading feedback must start immediately; backend state remains authoritative.
- Respect reduced-motion/accessibility preferences when practical. Where motion is reduced, use immediate state change or a simple fade.

## 4. Shared interaction patterns

### Pressable buttons and cards

- Give immediate visual press feedback. Prevent accidental double submission for network mutations.
- For asynchronous primary actions, switch to a loading state, disable repeat taps, and restore an actionable state on error.
- Keep error messages persistent enough to read and close to the relevant field/action. Do not use an animation instead of an error message.
- Only cards that are actually navigable should look pressable. Don't make a whole card pressable if it contains multiple independent actions without clear hit areas.

### Screen navigation and headers

- Reuse the current header component, insets and back behavior. Keep title alignment, back-button target, icon sizes and action spacing consistent.
- Use native stack transitions for normal push/pop. Modal tasks such as OTP confirmation or quick decisions may use a native modal/bottom sheet pattern consistent with the current app.
- Returning from a child screen should preserve list filters, scroll position and relevant draft state where safe.
- Do not display the primary bottom tabs on focused active-job/OTP modal surfaces if they compete with map and task actions. Hide them only for screens that truly need focused execution, and ensure the back action returns to the correct active-job state.
- If an active job exists, opening Home/Jobs must keep a persistent path back to it; do not lose the current job context.

### Input and keyboard

- Use correct keyboard types: numeric for OTP/phone, appropriate text/email keyboards for those fields, secure entry for passwords.
- Focus order must be predictable; use Next/Done actions. Scroll focused fields above the keyboard, including on smaller Android phones.
- Bottom CTA must remain accessible above the keyboard or the form must scroll to reveal it. Respect safe areas and Android navigation bars.
- Don't clear a user's valid input after a recoverable server error. Inline validation should explain how to fix the field.
- For 4-digit customer trip OTP, use a numeric keypad, 4 digits only, visible focus, paste/one-time-code support if technically available, clear invalid-code feedback and a disabled/loading action during verification. Keep this distinct from the 6-digit login OTP.

### Sheets, dialogs and confirmations

- Use a bottom sheet for contextual details while preserving the screen/map behind it; use a blocking dialog only for a genuinely blocking or destructive decision.
- A sheet must not cover its own close affordance or the primary CTA. Drag gestures cannot conflict with map pan/zoom or vertical scrolling.
- Do not add confirmation dialogs to every action. Confirm destructive actions or actions that are expensive/irreversible; use one clear state transition for routine navigation.

### Loading, empty, error and success states

- Use skeletons only when the layout is known and the wait is long enough to justify them. Otherwise use a compact spinner/progress indicator with a clear message.
- Empty states should say what is happening and the next useful action (e.g. “No requests yet — go online to receive nearby requests” only if availability is actually off).
- Offline/API errors should preserve existing information and offer retry. Don't present stale GPS as live: show “Updating location…” or “Location signal weak” when applicable.
- Success: one concise check/colour transition and optional success haptic. Avoid confetti for routine job actions.
- Never display success before the backend confirms the mutation.

## 5. Driver job state machine and expected UI behavior

The UI must reflect server/backend state; it must not invent state transitions based only on a tap.

| State | Driver sees | Primary action | Result/state rule |
|---|---|---|---|
| Offline | Offline status and a clear availability control | Go online | Request permission if needed; only show Online after the availability mutation succeeds |
| Online / waiting | Receiving-nearby-requests state; concise earnings/request summary | View jobs / go offline | Use push/realtime mechanism already implemented; don't poll GPS continuously without a product need |
| Incoming request | Time-limited request surface from real incoming event; service, pickup distance, route context and earnings when supplied by API | Accept / Decline | Timer/expiry must use server-provided expiry when available. If accept loses a race, explain that the request is no longer available and refresh gracefully |
| Accept pending | Button loading, request card locked against repeat taps | None until resolved | Do not optimistically treat the job as accepted before server confirmation |
| Accepted / En route to pickup | Focused map, pickup marker/address, route/ETA if available, call and Navigate actions, stage indicator | Arrived at pickup | Preserve job ID and stage on back/resume; external navigation handoff must return to the same active job |
| Arrived at pickup | Arrival confirmed and a clear prompt to get the customer's trip code | Verify trip OTP / Start service | Validate 4-digit customer OTP through the current backend flow; never log/display OTP in production or analytics |
| In progress | Route/drop location, customer contact, job/service summary and location-sharing status | Complete job | Continue valid location reporting per active-job policy; use the existing location hook/socket unless code proves it is missing |
| Completion pending | Loading/disabled complete action | Wait/retry safely | API errors must not mark the job complete locally. Use an idempotent request or server refresh to avoid duplicate completion |
| Completed | Compact success, confirmed final fare/earnings summary and job details | Back to Home / View details | Stop active-job location tracking only after completion is confirmed and backend lifecycle says the trip is finished |
| Job cancelled/expired/unavailable | Clear status and explanation | Return to Jobs | Avoid stranded screen or invisible job; refresh authoritative job list/state |

### Incoming request interaction

- Trigger only from a real backend event/API result.
- Make service type, pickup area/distance, approximate time and estimated earnings visible when the payload supplies them. Don't fabricate amounts, ETA, or distances.
- If request expiry is supported, show a restrained countdown. The server remains authoritative.
- Don't vibrate repeatedly or animate the entire screen. Use one subtle attention cue and optional one-time notification haptic.
- Declining removes/dismisses the offer only after the correct backend behavior is confirmed; preserve any required reason flow if one exists.

### Active trip layout

- Map gets most of the available space; bottom sheet carries job details and the next action.
- Sheet has a compact/collapsed state and an expanded detail state when useful. Its drag gesture must not hijack map gestures.
- Recenter control appears after the driver pans the map. Don't continually snap the camera back while the user is examining the route.
- Show “last updated” or a stale/weak signal indicator when location data is old; never imply live tracking if updates are failing.
- Active-job top bar should prioritize booking ID/stage and essential call/help actions, not a large generic header.

## 6. Maps and GPS: architecture and reliability

### Data flow

1. `expo-location` obtains **the driver's device location** with permissions appropriate to the active screen/job state.
2. Existing `useDriverLocationReporting` / Socket.IO or existing API hook sends real samples according to the established backend contract. Inspect it before writing a replacement.
3. Backend job state and customer-provided pickup/drop coordinates remain authoritative. Do not infer the customer's live location from the driver's GPS. Only display customer live location if the customer app/backend explicitly shares it and the API contract supports it.
4. Map renders driver marker, pickup/drop markers and route polyline from real coordinates. Interpolate marker rendering between received points for perceived smoothness; never upload interpolated/fake points as actual GPS.
5. Routing/ETA should use the current approved provider/API, with clear fallback when unavailable.

### Suggested location policy (tune to current backend and field tests)

- **Offline:** stop active GPS watchers/reporting unless an explicit product requirement says otherwise.
- **Online with no active job:** prefer low-frequency/need-based location for nearby dispatch; don't continuously request highest accuracy just to animate a dashboard.
- **Active job in foreground:** use a more responsive update profile configured by time/distance and target accuracy, then tune on low/mid-range Android hardware and real roads.
- **App backgrounded during active job:** background location needs `expo-task-manager`, config plugins/platform permissions and a development/production build. Expo docs explicitly say background location methods are not supported in Expo Go. On Android, OS/manufacturer battery rules can affect it; do not promise tracking after force-stop/termination.
- Stop subscriptions/tasks after active job completion or logout according to policy; clean up watchers on unmount and state changes.
- Avoid launching multiple watchers from repeated renders. Track subscription/task lifecycle centrally.
- Discard impossible jumps/outlier readings by checking accuracy, timestamp, speed plausibility and current state; keep last-known position as a temporary fallback and mark it stale.
- Throttle UI rerenders and network sends intentionally; make update interval/distance configurable rather than scattered magic numbers.
- Ask for permissions just-in-time with a human explanation. Request foreground permission first; request background permission only when a real background active-job feature requires it.
- A permission denial must not create a dead end: explain which feature is affected and offer a settings route or a limited fallback where safe.

### Map failure and offline states

Provide UI for: map loading, tile/API failure, no valid coordinates, location permission denied, GPS disabled, poor accuracy, stale last update, route unavailable and network disconnected. Keep pickup/drop text addresses visible when the map fails. The driver must still understand the task even if map tiles or a route fail to load.

### Do not do

- Do not call `getCurrentPositionAsync` in a rapid loop to simulate live tracking.
- Do not mount/remount the whole `MapView` on every location update.
- Do not run route recalculation on every raw GPS tick. Recalculate by meaningful movement/deviation or provider policy.
- Do not animate map camera constantly or rotate it aggressively without a proven navigation requirement.
- Do not request background location at first app launch if it isn't needed at that moment.
- Do not put unrestricted API keys in source control or route-provider secrets in the client.
- Do not swap map providers without discussing native build, billing, API key and offline behavior impact.

## 7. Performance rules

- Target consistent 60 FPS on representative devices where possible; a frame at 60 FPS has about 16.7 ms available. Measure before/after; do not claim “smooth” without testing.
- Keep heavy formatting, route calculations, image processing and large data transforms off hot render paths.
- Use `FlatList` for longer request/job/history lists, stable keys, memoized row items where useful, and measured list virtualization settings. Don't render dozens of complex cards in a plain `ScrollView` without checking cost.
- Keep map marker updates isolated from dashboard state; avoid a full screen render every time GPS changes.
- Use optimized appropriately-sized local/compressed imagery. No huge hero image above active-trip controls.
- Prefer transform/opacity animations. Avoid layout thrashing and repeated expensive shadows.
- Don't add a second animation/gesture library if an installed, supported one already does the job.
- Test on a mid/low-range Android physical device, not only emulator or high-end device.

## 8. Haptics and feedback policy

Use haptic feedback only for meaningful milestones, if `expo-haptics` is installed/approved:

- Light impact: an explicitly user-initiated selection/important press, not every button in every list.
- Success notification: server-confirmed job accepted, trip OTP verified, or job completed (optional; settings/system may suppress it).
- Warning/error: very restrained and only when meaningful.
- Never vibrate on every GPS point, timer tick, rerender, or routine animation.
- Haptics must never be the only signal; also show visible text/status for accessibility.

## 9. Navigation and screen-level choreography

- Standard screen push/pop: use existing stack animation; no custom transition unless there is a clear problem to solve.
- Dashboard → Jobs: preserve tab state/filters and scroll position when feasible.
- Request card → Active job: clear transition after backend acceptance; don't show two overlapping pages.
- Active map → OTP: present a bottom sheet or modal over the current job context, then return to the same map after success/error.
- Active trip → external Maps: use deep link, handle app-not-installed/no-route fallback and resume current job cleanly.
- In-progress → completed: show loading on the action, await server confirmation, then a short confirmation state or completion screen; avoid long celebration delays.
- Back behavior during an active job must never accidentally cancel or reset the job. If the action is truly destructive, ask for confirmation and explain the consequence.

## 10. Accessibility and real-world conditions

- Maintain readable type, contrast, 44–48 dp touch targets where practical, explicit labels, and accessible status text.
- Respect system font scaling without clipping the main action.
- Support permission denied, approximate location, no GPS, weak mobile data, slow API, API 401/session expiry, duplicate job event, job expired, location stale, and app foreground/background/resume.
- Give critical actions both text and icon; don't communicate job status with color alone.
- Avoid tiny map controls near screen edges or under Android system navigation bars.

## 11. Implementation workflow for the coding agent

Before coding:
1. Read this standard, the RACE Partner architecture audit and the existing design system/skill files.
2. Inspect relevant screen, navigator, API types, Redux/Zustand stores, React Query hooks, socket listeners and current map/location code.
3. Identify available route/status fields and the backend's authoritative transitions.
4. Inspect installed packages and Expo config. Run the project's existing diagnostics/typecheck/lint command if available.
5. Produce a brief “current behavior → intended behavior → files to change → risks” plan.

During coding:
1. Reuse established RACE components and tokens; extract a shared component only if at least two real screens need it.
2. Implement one coherent behavior at a time. Do not redesign unrelated screens.
3. Preserve live/demo mode separation and current API contracts.
4. Handle all relevant loading/error/empty/success/permission/connection states.
5. Add only dependencies that are needed and compatible; use `npx expo install` for Expo packages.

After coding:
1. Run typecheck/lint/tests available in the repository.
2. Test screen transitions, Android back, keyboard overlap, repeated taps, app resume, slow network and failure cases.
3. Test map/GPS on a physical Android device and with permissions/GPS/network toggled.
4. Report exactly what changed, files changed, packages added, commands run, limitations and what needs a development build. Never state a test passed if it wasn't run.

## 12. Acceptance checklist

- [ ] No duplicate location watchers or socket listeners.
- [ ] Online/offline UI reflects server success, not a local toggle alone.
- [ ] Accept/start/complete cannot be submitted repeatedly while pending.
- [ ] Job transitions come from the backend and recover after app resume.
- [ ] Login OTP and 4-digit customer trip OTP are separate.
- [ ] Map remains mounted during ordinary GPS changes; marker motion is visually smooth but truthful.
- [ ] GPS/map/API failure states are visible and actionable.
- [ ] Background tracking requirements are tested in a development build, not inferred from Expo Go.
- [ ] No background location tracking runs after job completion unless a documented feature requires it.
- [ ] No excessive bounce/confetti/continuous decorative motion.
- [ ] Headers, CTA placement, insets and tab visibility follow existing RACE rules.
- [ ] Reduced motion, larger text, Android back and keyboard behavior are usable.
- [ ] Final result is checked on a physical Android device.

## Official references checked

- Expo SDK 57 — `react-native-maps`: https://docs.expo.dev/versions/latest/sdk/map-view/
- Expo SDK 57 — Location: https://docs.expo.dev/versions/latest/sdk/location/
- Expo SDK 57 — Reanimated: https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/
- Expo SDK 57 — Gesture Handler: https://docs.expo.dev/versions/v57.0.0/sdk/gesture-handler/
- Expo — Development builds vs Expo Go: https://docs.expo.dev/develop/development-builds/faq/
- Expo — Splash screen timing/config reference: https://docs.expo.dev/versions/latest/sdk/splash-screen/
- React Native — Performance overview: https://reactnative.dev/docs/performance
- React Native — FlatList optimization: https://reactnative.dev/docs/optimizing-flatlist-configuration
- Reanimated — Entering/exiting animations: https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/
- Reanimated — Performance guide: https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/
- Uber Driver — Request acceptance and trip lifecycle overview: https://www.uber.com/us/en/drive/driver-app/
- Rapido Captain — current app listing: https://play.google.com/store/apps/details?gl=IN&id=com.rapido.rider

**Version note:** Framework docs change over time. Re-check the project's actual lockfile and official SDK 57 docs before upgrading. This document favors `npx expo install` rather than hardcoded package versions because the installed dependency graph is authoritative for the repository.
