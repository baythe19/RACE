# Driver Navigation and Live-Tracking Research

**Reviewed:** 17 October 2026
**Repository:** teamwebstarts-cmyk/RACE, branch v4.5.0-uichanges, HEAD 2ec7f33
**Scope:** Partner active-job navigation, routing providers, GPS reporting, customer live tracking, Expo/native integration.

This is a read-only code audit and vendor-documentation research. No navigation SDK has been built or device-tested in this review.

## Recommendation

The driver map is currently a visual simulation; the app does have a useful GPS/socket foundation. The feature is **not ready to be described as real navigation**.

Recommended path:

1. **Pilot/MVP:** open the real destination in Google Maps for ordinary road guidance while RACE remains authoritative for job state and live tracking. For jobs where truck restrictions matter, test Mappls trucking navigation around Bhubaneswar. Do not call Google's regular car route truck-safe.
2. **RACE live map:** replace the SVG route simulation with the existing react-native-maps renderer, real driver location and active-stage destination. Obtain road geometry/ETA through a backend route-provider adapter; keep server API keys on the backend.
3. **Embedded turn-by-turn:** first do a native-build compatibility spike for Google's official React Native Navigation SDK. This app is Expo SDK 57 / React Native 0.86.3; Google's current RN package is verified with RN 0.87+, requires new architecture/native setup, and remains Beta. There are no checked-in ios/ or android/ folders, so this requires Expo prebuild/config-plugin work and a custom development build; a Peach-only JS preview cannot validate it.
4. **Truck routing in India:** Google documents large-vehicle routing as available only in contiguous US and Japan, not India. Mappls documents truck routing and a Mappls-app deep link using mode=trucking. If truck restrictions are a launch requirement, confirm coverage, contract and routes against RACE tow vehicles before choosing a source of truth.

A map renderer and a turn-by-turn engine are separate capabilities. react-native-maps renders a map; it does not navigate.

## Code audit

### Driver screen and map

- mobile application/src/screens/partner/driver/DriverActiveJobScreen.tsx imports LiveTripMap but actually renders DeliveryNavMap in both active-job map placements (around lines 774 and 923). The unused import plus route state/callback create the impression that the real map is connected when it is not.
- Location reporting is enabled for DRIVER_EN_ROUTE, DRIVER_ARRIVED and IN_PROGRESS (around line 473). Pickup/drop-off coordinates are read from the booking payload (around lines 478–481).
- The rendered map receives Bhubaneswar fallback labels, 5.4 km fallback distance and 12-minute fallback duration (around lines 774–779 and 923–928). These must never be shown as live route facts. isNavigating toggles visual state only; it does not start a navigation session.
- mobile application/src/components/booking/DeliveryNavMap.tsx draws a fixed SVG street illustration and named Bhubaneswar roads. Its driver marker and ETA/distance advance on a two-second timer, independent of GPS or actual route progress (around lines 68–100 and 161–175). Keep it only as an explicitly labelled UI preview, or remove it from production active jobs.
- mobile application/src/components/booking/LiveTripMap.tsx is a genuine native map renderer with user location and markers. Its optional route calls the legacy Directions REST endpoint directly from the client with a Maps key, is disabled by default (routeApiEnabled=false), and routes pickup-to-drop-off rather than driver-to-current-stage destination (around lines 38–42 and 163–200). It may draw a straight line when no road route exists; that must not be labelled navigable.
- The app key is provided to native Maps config and also exposed through app.config.extra. Client Maps SDK keys are visible by nature and must be restricted by app identity and allowed SDK APIs. Use a separate server-only key for Routes web-service calls; never put it in EXPO_PUBLIC_*, app.config.extra or the app bundle.

### GPS, backend and customer tracking

- mobile application/src/hooks/useDriverLocationReporting.ts uses a shared ref-counted reporter to avoid duplicate writes from mounted tabs. It takes a balanced-accuracy foreground location and PATCHes about every 12 seconds, then reports again when the app returns active (around lines 8–10 and 58–89).
- This is useful foreground reporting, not a background-location service. The project has expo-location but no expo-task-manager. Config contains location permission text but no background task. Expo background tracking needs a top-level task, background permissions/native configuration and a development/production native build; do not claim it works while backgrounded/killed until physical-device tests prove it.
- Backend persists driver coordinates and emits driver:location to the active booking socket room; customer app subscribes to it. This is a strong base. The customer tracking client currently supplies a fixed 15-minute ETA for socket location events; derive ETA from the routing provider or show it as unavailable.
- GPS can suggest “near pickup/drop-off”; it must never auto-confirm arrival, OTP, service start or completion. Keep status changes server-authoritative.

## Provider comparison

| Option | Good fit | Limitation |
| --- | --- | --- |
| Google Maps deep link / installed app | Fastest genuine turn-by-turn fallback; avoids building a turn engine | Leaves RACE; ordinary driving directions are not truck-specific |
| Google Navigation SDK React Native package | Embedded Google turn-by-turn UI/events | Beta; current package needs RN 0.87+ and new architecture; project is RN 0.86.3 and CNG. Native setup, permissions and build work required. Google's RN wrapper itself is outside Maps Platform SLA/support/deprecation guarantees. |
| Google Routes API + react-native-maps | RACE-owned map, road polyline, traffic ETA and preview | Not turn-by-turn alone; Google LVR truck routing unavailable in India; web-service calls belong behind backend |
| Mappls routing + Mappls app deep link | India-focused heavy-vehicle route candidate; docs describe truck profile and deep link that starts Mappls navigation in trucking mode | Direction Widget docs establish route widget/profile, not a complete embedded RN navigation session. Deep link leaves RACE. Confirm Odisha restrictions, commercial access and support. |
| HERE Routing | Commercial alternative worth testing for multi-country fleets | HERE's published full and motorway truck-restriction lists do not include India; global truck mode does not prove Indian restriction coverage |

### India / truck fit

Google Navigation SDK has ordinary driving-directions coverage for India. That is not the same as truck-safe routing. Google Routes API Large Vehicle Routing says its coverage is contiguous US and Japan only, and warns that even a supported-area result can partially ignore restrictions.

Mappls documents truck/heavy-vehicle routing inputs such as height, weight, width, length and axle load. Its route API lists truck resources route_adv and route_eta; the React Native Direction Widget lists a TRUCKING profile. The Mappls-app deep-link docs list isNav=true and mode=trucking. This is a strong reason to run a local pilot, not a safety guarantee. Test representative tow trucks, known low bridges, weight limits, restricted roads, exact pickup access and peak/night conditions; ask Mappls to confirm Odisha restrictions coverage in writing.

## Target design

~~~mermaid
flowchart LR
  Driver[Partner app: GPS + navigation UI] -->|authenticated route request| API[RACE backend route adapter]
  API -->|server-only key| Provider[Google Routes or Mappls]
  Provider -->|geometry, ETA, maneuvers/token| API
  API -->|route metadata| Driver
  Driver -->|filtered location, accuracy, heading, timestamp| API
  API -->|persist + authorized socket event| Customer[Customer live trip map]
  API -->|server-authoritative status/OTP| Booking[Booking state]
~~~

Use a provider-neutral backend operation, for example computeDriverRoute(origin, destination, vehicleProfile, locale). Normalize road geometry, distance, traffic ETA, available maneuvers, provider, calculation time, warnings/restriction flags and optional opaque navigation token. Never return/log provider credentials.

## Route and tracking algorithm

1. Choose destination from server job status: DRIVER_EN_ROUTE → pickup; DRIVER_ARRIVED/OTP → stop guidance and wait for backend action; IN_PROGRESS → drop-off if present; COMPLETED → stop guidance/reporting. Missing coordinates should show an address and an explicit retry/open-map action, never fabricated Bhubaneswar points.
2. Start from a fresh GPS fix and valid destination. Reject invalid, stale or poor-accuracy fixes using configurable thresholds; expose timestamp/accuracy so UI can show delayed location.
3. Let the native navigation SDK own maneuvers/rerouting if available. Draw only provider-returned road geometry; never call a straight line a route.
4. Send booking ID, lat/lon, accuracy, heading, speed, device timestamp and server receive timestamp. Throttle by time and movement, deduplicate points and back off on network errors. Tune intervals after battery/latency tests.
5. Re-route on stage/destination change or meaningful off-route events, with cooldown/retry limits to avoid billing loops.
6. Geofencing may prompt the driver but never changes booking state. Customer ETA comes from a provider/server calculation, not a fixed 15 minutes.

## Security, privacy, operations

- Separate mobile SDK keys from server route keys. Restrict mobile keys to app identity and necessary APIs; restrict server keys to required services/environment. Add usage quotas and billing alerts.
- Authenticate route calls and verify driver assignment. Validate coordinates server-side. Rate-limit route and location traffic; cache only where provider terms allow.
- Report location only online/on active jobs and stop on completion/logout. Explain purpose before asking for OS location permission; ask for background permission only when the product needs it.
- Show stale/offline status and retry. Never silently substitute fake tracking in production.
- Test physical Android and iPhone, weak network, denied permissions, background/foreground, force-stop/relaunch, GPS disabled, missing coordinates, provider errors/quotas, reroutes and all job stages. Peach screenshots cannot validate native navigation, voice, background tracking or billing.

## Expo/SDK readiness and implementation gates

Partner dependencies are Expo ^57.0.0, React Native 0.86.3, react-native-maps 1.27.2 and expo-location ~57.0.20. No native ios/ or android/ project is checked in, consistent with Continuous Native Generation.

Google's current React Native Navigation SDK docs say tested with RN 0.87.0 and require RN 0.87+ with Fabric/TurboModules plus Android/iOS native configuration. README points earlier RN users to package 0.16.3, which still must be built against this exact Expo/RN toolchain. The package docs do not supply an Expo config plugin. Before adoption, build a disposable prebuild spike; verify Gradle/Kotlin, iOS package integration, deployment targets, keys, permissions and background mode; build/test both platforms; verify terms dialog, navigation lifecycle, route changes, arrival, voice, background and cleanup. Do not upgrade main Expo/RN solely for this package before the spike and dependency audit pass.

## Cost notes (Google India published rates)

Current published India pricing lists Compute Routes Essentials with a 70,000 free-usage cap, then $1.50/1,000 in its first paid tier. Navigation Request has a 7,000 free-usage cap, then $8/1,000 in its first paid tier. Google bills each destination passed to Navigation SDK setDestination(s) as an event, so multi-destination calls may count more than once. Verify live pricing and billing-account region before launch. Map rendering, Places, route compute and navigation are separate SKU families and should be estimated separately.

## Suggested sequence and acceptance

1. Remove simulated progress, hard-coded distance and fabricated ETA from production driver jobs.
2. Pilot Google Maps external navigation for ordinary driving; test Mappls trucking navigation for jobs where restrictions matter.
3. Verify booking pickup/drop-off coordinates and eliminate geography fallbacks.
4. Add an authenticated backend route adapter with server-only credentials, normalized responses, quota/rate limits, timeouts and safe fallbacks.
5. Replace SVG simulation with real map, actual driver marker, pickup/drop-off markers, provider polyline, stale-location state, recenter and stage-aware destination.
6. Harden foreground tracking with accuracy/heading/speed/timestamps; tune throttling from device measurements.
7. Add expo-task-manager/background permission only if required; configure prebuild and test OS restrictions on devices.
8. Do the embedded-navigation native compatibility spike. Use Google inside RACE only after native build gates pass. If truck-safe India routes are mandatory, evaluate a Mappls native bridge/provider rather than treating Google's regular car route as equivalent.

MVP passes when: pickup/drop-off stage routing is correct; no fake route/ETA/location appears; missing permission/coordinates fail clearly; customer location is authorized and freshness/ETA truthful; only server actions/OTP change status; rerouting is bounded; reporting stops at completion/logout; credentials and billing alerts are configured; Android and iOS physical-device tests pass.

## Official references

- [Google Navigation SDK for React Native (Beta), requirements and support status](https://github.com/googlemaps/react-native-navigation-sdk)
- [Google Navigation SDK country/region coverage](https://developers.google.com/maps/documentation/navigation/android-sdk/coverage-nav-sdk)
- [Google Routes API large-vehicle routing limits](https://developers.google.com/maps/documentation/routes/lvr)
- [Google Routes API route tokens](https://developers.google.com/maps/documentation/routes/route_token)
- [Google Maps Platform API-key security](https://developers.google.com/maps/api-security-best-practices)
- [Expo SDK 57 Location, background tasks and permissions](https://docs.expo.dev/versions/v57.0.0/sdk/location/)
- [Mappls React Native SDK](https://developer.mappls.com/documentation/sdk/react-native-sdk/)
- [Mappls React Native Direction Widget and truck profile](https://github.com/mappls-api/mappls-react-native-sdk/blob/main/docs/v2.0.0/Direction-Widget.md)
- [Mappls heavy-vehicle routing](https://developer.mappls.com/mapping/routing-for-heavy-vehicles/)
- [Mappls truck-routing API profile and constraints](https://developer.mappls.com/documentation/sdk/rest-apis/mappls-routing-api/readme/)
- [Mappls app deep links including trucking navigation](https://developer.mappls.com/mappls-apps/android/)
- [HERE truck-routing coverage](https://docs.here.com/routing/docs/routing-v8-truck-routing-coverage)
- [Google Maps Platform India pricing](https://developers.google.com/maps/billing-and-pricing/pricing-india)
- [Google Navigation billing events](https://developers.google.com/maps/billing-and-pricing/sku-details)
