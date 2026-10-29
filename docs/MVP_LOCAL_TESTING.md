# RACE — MVP local testing (backend + apps)

Use this when you want **real API data** on your machine — not Render, not UI preview mocks.

## Quick start

```bash
# 1) Data + API
docker start race-mongo race-redis 2>/dev/null || docker compose -f backend/docker-compose.yml up -d
cd backend && npm install && npm run dev                            # :3000

# 2) Customer app
cd "customer application" && npm install
cp .env.example .env   # then set EXPO_PUBLIC_API_URL=http://localhost:3000
npx expo start --port 8081

# 3) Partner app (second terminal)
cd "mobile application" && npm install
# .env should already have EXPO_PUBLIC_UI_PREVIEW_MODE=false
npx expo start --port 8082

# 4) Admin (optional)
cd race-admin && npm install && npm run dev                         # :3001
# VITE_API_URL=http://localhost:3000/api/v1
```

Health check: `curl -s http://localhost:3000/health`

## Required env (MVP local)

### Backend (`backend/.env`)

| Variable | MVP local value | Why |
|----------|-----------------|-----|
| `NODE_ENV` | `development` | Enables dev OTP + stub payments |
| `MONGODB_URI` | `mongodb://localhost:27017/race` (or compose) | Same DB name as seed scripts |
| `ALLOW_STUB_PAYMENTS` | `true` | Advance/final verify works without Razorpay |
| `MOCK_DATA_MODE` | `false` | No universal OTP on real numbers |
| `TEST_OTP_WHITELIST` | QA numbers only | `9000000001`… use OTP `123456` in dev |

Optional but recommended for webhook tests: `PAYMENT_WEBHOOK_SECRET` ≥ 32 chars (HMAC enforced when set, even in dev).

### Customer (`customer application/.env`)

| Variable | MVP local value |
|----------|-----------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` (use LAN IP if physical device) |
| `EXPO_PUBLIC_SKIP_OTP_AUTH` | `false` |
| `EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW` | `false` |
| `EXPO_PUBLIC_UI_QA_NAVIGATOR` | `false` |

### Partner (`mobile application/.env`)

| Variable | MVP local value |
|----------|-----------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` |
| `EXPO_PUBLIC_UI_PREVIEW_MODE` | `false` |
| `EXPO_PUBLIC_UI_PREVIEW_MUTATIONS` | `false` |
| `EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE` | `false` |
| `EXPO_PUBLIC_UI_QA_NAVIGATOR` | `false` |

For **UI-only walkthroughs** (no backend), copy `mobile application/.env.testing` — never ship that profile to stores.

## MVP test script (happy path)

1. **Customer** — OTP login (whitelist number or HanuSMS). Book **instant towing** inside Bhubaneswar service area (pickup geofence enforced server-side).
2. **Confirm booking** — stub advance marks booking `CONFIRMED` when `ALLOW_STUB_PAYMENTS=true`.
3. **Partner vendor** — login, open job offers, approve + assign driver/vehicle.
4. **Partner driver** — accept job, trip OTP at pickup, complete dropoff; customer pays via **UPI/cash** flow (no in-app gateway required for MVP).
5. **Admin** — dashboard KPIs include `towingbookings` + `driverbookings` (legacy `bookings` may be empty).

## MVP dispatch model (no bidding yet)

- **Towing / roadside on-site:** confirmed jobs appear on **vendor** open offers. **First vendor to assign** a connected driver wins; the job leaves other vendors’ lists (socket `vendor:jobs-updated`).
- **Driver hire:** open offers go to matching **independent** drivers (part-time / full-time / outstation+night rules). No price bidding in MVP.
- **Payments:** stub advance/final only (`ALLOW_STUB_PAYMENTS=true`). No Razorpay in this demo path.
- **Cancel:** simple demo rules — full stub refund before partner is en route; no tiered fee matrix in the app yet.

## What is intentionally stub / out of scope for MVP local

- In-app Razorpay / card rails (settlement = UPI QR + cash to driver; advance is stub verify).
- **Bidding / auction** on jobs (assign-first-wins only).
- Production tiered cancellation fees (MVP uses simplified demo policy).
- Real camera QR scan (vehicle QR via API URL / share still works).
- Automated payouts to partner bank (profile bank fields + ledger only).

Roadside battery/tyre/fuel/repair: book via customer app when availability API marks them on; vendor assigns **mechanic only** (no tow truck required for on-site assist).

## Verify before you call it “MVP ready locally”

```bash
cd backend && npm run lint
cd "../customer application" && npx tsc --noEmit
cd "../mobile application" && npx tsc --noEmit
```

Optional smoke after API is up:

```bash
cd backend && npm run mvp:smoke
```

Incident steps: `docs/MVP_INCIDENT_RUNBOOK.md`

## Checklist cross-reference

See `docs/MVP_LAUNCH_CHECKLIST.md` for priority-ordered gaps vs production; this doc is the **local run** slice only.
