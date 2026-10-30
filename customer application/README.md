# RACE Customer Application

Standalone Expo app for RACE customers (book towing, driver, roadside assistance, manage profile and vehicles).

## Setup

```bash
cd "customer application"
cp .env.example .env
npm install
npm start
```

## Environment

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps Platform key (enable **Maps SDK** iOS/Android, **Routes API** or **Directions API**, **Places API**, **Geocoding API**) |

## App identity

- **Name:** RACE Customer
- **Bundle ID:** `com.racecar.customer`
- **Scheme:** `race-customer`

## Related apps

- **Partner app:** `../mobile application` (drivers & vendors)
