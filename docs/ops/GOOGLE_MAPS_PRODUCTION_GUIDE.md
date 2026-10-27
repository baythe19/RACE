# RACE — Google Maps Production Architecture & Deployment Guide

> **Target Audience:** Engineering, DevOps, Cloud Architects, and QA.  
> **Applicable Surfaces:** Customer Mobile (`customer application/`), Partner Mobile (`mobile application/`), Admin Web (`race-admin/apps/admin-web/`), Backend API (`backend/`).

---

## 1. Overview & Service Inventory

RACE utilizes Google Maps Platform APIs across all four surfaces to power roadside assistance discovery, real-time driver dispatch, driver route navigation, and accurate distance-based fare calculations.

| API / SDK | Primary Surface | Purpose | Cost Optimization Strategy |
|:---|:---|:---|:---|
| **Maps SDK for Android** | Partner & Customer Mobile | Embedded vector map, live GPS driver marker, pickup/dropoff pins | Keystore SHA-1 restricted; hardware-accelerated rendering |
| **Maps SDK for iOS** | Partner & Customer Mobile | iOS native vector maps | Bundle ID restricted; map view lifecycle recycling |
| **Places API (New)** | Customer & Partner Mobile | Auto-complete address search, reverse geocoding | Session tokens (`sessionToken`) for grouped queries |
| **Directions API** | Backend API & Mobile Client | Route polyline generation, highway vs local road routing | Server-side routing with Redis TTL cache (5-minute TTL per coordinate pair) |
| **Distance Matrix API** | Backend API | Initial driver dispatch ETA & distance ranking | Bounded radius filtering (15km/30km) before calling Distance Matrix |
| **Native Navigation Intent** | Partner Mobile | Turn-by-turn turn-by-turn driver navigation | Zero Google Maps API cost (delegates to external Google Maps app) |

---

## 2. Google Cloud Platform (GCP) Console Setup

### 2.1 Project & Billing Configuration
1. Go to **Google Cloud Console** (`https://console.cloud.google.com/`).
2. Select or create project: `race-production-maps`.
3. Link a verified billing account.
4. Set up a **Budget & Alert**:
   - Monthly alert at 50%, 80%, 100%, and 120% of expected monthly map budget (e.g., ₹15,000 / $180).

### 2.2 Enabling Required APIs
Under **APIs & Services > Library**, enable:
- [x] **Maps SDK for Android**
- [x] **Maps SDK for iOS**
- [x] **Places API (New)**
- [x] **Geocoding API**
- [x] **Directions API**
- [x] **Distance Matrix API**
- [x] **Maps JavaScript API** (for Admin Web dashboard)

---

## 3. Production API Keys & Restriction Best Practices

> **CRITICAL SECURITY RULE:** Never deploy an unrestricted Google Maps API key to production mobile apps or public repositories. Unrestricted keys can be extracted and abused, leading to catastrophic billing spikes.

Create **three separate API keys** in Google Cloud Console:

### Key 1: Mobile Client Key (`EXPO_PUBLIC_GOOGLE_MAPS_KEY`)
- **Scope:** Used in Customer App and Partner App.
- **Application Restrictions:**
  - **Android:** Restrict by Package Name + SHA-1 Fingerprint:
    - Package: `com.race.customer`, SHA-1: `<EAS_BUILD_PRODUCTION_SHA1>`
    - Package: `com.race.partner`, SHA-1: `<EAS_BUILD_PRODUCTION_SHA1>`
    - Package: `com.race.customer`, SHA-1: `<LOCAL_DEBUG_KEYSTORE_SHA1>` (Dev only)
    - Package: `com.race.partner`, SHA-1: `<LOCAL_DEBUG_KEYSTORE_SHA1>` (Dev only)
  - **iOS:** Restrict by Bundle Identifier:
    - `com.race.customer`
    - `com.race.partner`
- **API Restrictions:**
  - Restrict strictly to: *Maps SDK for Android*, *Maps SDK for iOS*, *Places API (New)*, *Geocoding API*.

### Key 2: Backend API Key (`GOOGLE_MAPS_SERVER_KEY`)
- **Scope:** Used inside `backend/src/services/` for routing, dispatch ranking, and geocoding.
- **Application Restrictions:**
  - **IP Addresses:** Add production VPS / GCP Cloud Run static egress IPs:
    - `34.xxx.xxx.xxx` (GCP production VM)
- **API Restrictions:**
  - Restrict strictly to: *Directions API*, *Distance Matrix API*, *Geocoding API*.

### Key 3: Admin Web Dashboard Key (`VITE_GOOGLE_MAPS_API_KEY`)
- **Scope:** Used inside `race-admin/apps/admin-web/` for live fleet dispatch tracking.
- **Application Restrictions:**
  - **HTTP Referrers:**
    - `https://admin.raceindia.com/*`
    - `https://*.race.co.in/*`
    - `http://localhost:3001/*` (Dev only)
- **API Restrictions:**
  - Restrict strictly to: *Maps JavaScript API*, *Geocoding API*.

---

## 4. High-Volume Driver Navigation: Architecture

### 4.1 Native Google Maps Turn-by-Turn Intent (Zero API Cost)
During active towing transit, running embedded in-app navigation 100% of the time consumes high battery, overheats mobile devices, and drains Google Maps dynamic session credits.

Instead, RACE Partner Mobile provides a direct native deep-link intent in `DriverActiveJobScreen.tsx`:

```ts
const openNavigation = (lat: number, lng: number, label: string) => {
  const scheme = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
    android: `google.navigation:q=${lat},${lng}&mode=d`,
  });
  Linking.openURL(scheme);
};
```
- **Why this is optimal:**
  1. Drivers get Google's native turn-by-turn voice navigation with live traffic re-routing and speed trap warnings.
  2. **Cost:** ₹0. Native OS intent calls external Google Maps directly.
  3. **Multi-tasking & Lockscreen Alerts:** With our background socket keep-alive and `expo-notifications`, if a booking update or cancellation happens while the driver is navigating inside Google Maps, a heads-up pop-up alert appears over Google Maps and on the device lock screen!

### 4.2 Throttled GPS Tracking & Sockets
To prevent overwhelming the backend server and exhausting database writes:
1. **Distance Filter:** Partner driver GPS updates are throttled with `distanceFilter: 15` (meters).
2. **Time Interval:** Driver location is broadcast over WebSockets every **4,000ms** (4 seconds) only when in `DRIVER_EN_ROUTE` or `IN_PROGRESS` statuses.
3. **Room-Scoped Delivery:** GPS coordinates are piped only to the active `booking:track` socket room for that specific customer, rather than a global socket broadcast.

---

## 5. Cost Optimization & Quota Protection Checklist

1. **Places Autocomplete Session Tokens:**
   - Always group character keystrokes into a single session token (`sessionToken=UUID`). When the user taps a selected result, Pass the same session token to `Places Details`. Google bills this as a single "Autocomplete Session" instead of billing per individual letter keystroke.
2. **Server-Side Polyline Caching:**
   - Cache decoded route polylines between common pickup corridors and dropoff repair hubs in Redis with a 5-minute TTL.
3. **Static Map Thumbnails for History:**
   - In booking history lists, render static map snapshot URLs (`https://maps.googleapis.com/maps/api/staticmap?...`) or lightweight vector SVGs instead of full interactive map widgets.
4. **Billing Threshold Automation:**
   - Configure GCP Cloud Functions to send automated Slack / WhatsApp alerts to the engineering lead if API usage exceeds 80% of daily quota.

---

## 6. How to Extract SHA-1 Fingerprint for EAS Production Build

```bash
# 1. Login to Expo EAS
npx eas-cli login

# 2. View production Android Keystore credentials
npx eas-cli credentials -p android

# 3. Locate the 'SHA-1 Fingerprint' (e.g. 14:6A:B8:31:...)
# 4. Paste this SHA-1 into GCP Console under 'Maps SDK for Android' key restrictions.
```
