# 14 — Maps & Location Integration Audit

**Question answered:** *how is map/location integrated across the three apps and the backend, and what is real vs decorative?*

---

## 1. Backend [V]

| Item | State | Evidence |
|------|-------|----------|
| Provider | **Google Maps Distance Matrix API** (HTTP, server-side) | `services/src/googleMaps.ts:36-45` |
| Key | `GOOGLE_MAPS_API_KEY` optional in env schema | `config/env.ts:31` |
| Behaviour without key | returns gracefully (`if (!env.GOOGLE_MAPS_API_KEY?.trim())` early return) ⇒ **distance-based fare silently degrades** | `googleMaps.ts:27` |
| Used by | fare estimation for towing/driver (`services/src/fare.ts`) | `fareRoutes.ts:9-10` |
| Caching | none — every fare preview is a billed external call | `googleMaps.ts` (no cache layer) |
| Geocoding / Places / Directions / Roads / ETA | **not used** | grep found only Distance Matrix |
| Driver location storage | `users.currentLocation {lat,lng,updatedAt}` | `models/src/user.ts:55`, `driver.ts:120` |
| Live broadcast | Socket.IO `driver:location` into `booking:<id>` room | `services/src/socket.ts:60-73` |
| Tracking REST fallback | `GET /bookings/{towing,driver}/:id/tracking` | route map |

**Risk [V]:** fare endpoints are **public and unauthenticated** (`fareRoutes.ts:9-10`) while each call spends a paid Google API request ⇒ quota/cost abuse (SEC-10). No server-side caching or debounce.

## 2. Customer app [V/O]

| Screen/component | Map usage | Assessment |
|------------------|-----------|------------|
| `components/booking/LiveTripMap.tsx` | react-native-maps `MapView` | Live trip visual |
| `components/booking/LocationPickerMap.tsx` | MapView for pickup/drop | ✅ real picker |
| `components/common/LocationPickerModal.tsx` | wraps the picker | ✅ |
| `screens/booking/driver/DriverPickupScreen.tsx` | MapView | ✅ |
| `services/socketService.ts` | socket.io-client | only client with socket wiring ⇒ live tracking path exists here |
| Live tracking screens (`booking/LiveTrackingScreen.tsx`, `TowingDriverOnWayScreen`, `DriverOnWayScreen`, `RoadsideHelpOnWayScreen`) | consume tracking data | Needs device run to confirm socket vs poll behaviour **[X]** |

**Not verified:** whether Google Maps API keys are provided per platform in `app.config.js`; whether `PROVIDER_GOOGLE` is set on Android (needed for real Android map rendering). **[X]**

## 3. Partner app [V/O]

| Item | State |
|------|-------|
| Map components present | `components/booking/LiveTripMap.tsx`, `LocationPickerMap.tsx`, `components/common/LocationPickerModal.tsx` |
| Driver dashboard / active job | **no map** in `DriverDashboardScreen` (1445 lines) or `DriverActiveJobScreen` — a driver cannot see route/pickup on a map during the job **[V]** |
| Location permission flow | implemented with health states (`hooks/useDriverLocationReporting.ts`, `store/driverPresenceStore`) |
| Background location | **not** used (no `expo-location` background task / task-manager registration found) ⇒ location stops when the app is backgrounded; the app re-reports on foreground **[V]** |
| Socket | **no socket.io-client in the partner app**; job/offer freshness relies on polling (offers 8 s, active job 10 s, jobs 15 s) **[V]** |

**Operational consequence:** a driver navigating the last 500 m with the phone screen off stops updating the customer's map. This is the single most visible "this is a demo" behaviour in the field, and it is a **product decision**, not a bug: implementing background updates needs `expo-task-manager` + `expo-location` background config + store-review justification.

## 4. Admin web [V]

| Item | State |
|------|-------|
| Map library | **none** — grep for `google.maps`, `@react-google-maps/*`, `leaflet`, `MapContainer` returns zero hits in `apps/admin-web` and `packages/**` |
| Live ops view | not present (no fleet map, no live bookings map) |
| Location data shown | addresses in booking/vendor/driver detail tables only |

This independently re-confirms the client-gap doc's "admin live map missing" claim.

## 5. Integration quality matrix

| Layer | Distance/fare | Live tracking | Pickers | Admin map | Background |
|-------|---------------|---------------|---------|-----------|-----------|
| Backend | ✅ real (key-dependent) | ✅ emits | n/a | ❌ | n/a |
| Customer app | ✅ | ⚠️ exists, unverified on device **[X]** | ✅ | ❌ | ⚠️ n/a |
| Partner app | ✅ | ❌ no map on job screens | ✅ | ❌ | ❌ no background |
| Admin | n/a | ❌ | n/a | ❌ none | n/a |

## 6. Proposals (not applied)

| # | Proposal | Why | Effort |
|---|----------|-----|--------|
| M1 | Cache Distance Matrix results per (pickup,drop) rounded to ~100 m for N minutes | Cuts Google spend and prevents abuse via public fare endpoints | S |
| M2 | Require auth + rate limit on `/fare/*` | Stops quota abuse | S |
| M3 | Add a map + route line to the driver's active-job screen | Driver usability is the weakest link in the live experience | M |
| M4 | Background location during an active job only | Customer trust; scope with store policy | M–L |
| M5 | Admin "live ops" map from open bookings + driver `currentLocation` | The client asked for it; data already exists | M |
| M6 | Move live tracking off polling where possible (partner app already uses sockets on backend) | Battery + freshness | M |

## 7. Maps score

| Area | Weight | Score |
|------|-------:|------:|
| Backend geo capability (distance) | 25% | 7/10 |
| Customer live tracking | 25% | 6/10 (exists, unverified) |
| Partner in-job map | 20% | 3/10 |
| Admin ops map | 20% | 0/10 |
| Cost/abuse protection | 10% | 2/10 |
| **Weighted** | 100% | **4.1/10** |
