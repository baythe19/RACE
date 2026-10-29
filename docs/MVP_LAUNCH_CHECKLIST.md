# RACE — MVP launch checklist (priority order)

**Target tier for local pilot:** MVP-A (working MVP on real data, stub advance OK, UPI/cash at trip end).

Legend: ✅ Done in repo · ⚠ Partial / ops · ❌ Open · 🔶 Post-pilot policy

## P0 — Must pass before any pilot user

| ID | Item | Status |
|----|------|--------|
| P0-1 | Core towing E2E on local API | ✅ |
| P0-2 | Partner preview mocks off in default `.env` | ✅ |
| P0-3 | Customer OTP skip off | ✅ |
| P0-4 | Stub payments in dev (`ALLOW_STUB_PAYMENTS`) | ✅ |
| P0-5 | Payment webhook fail-closed in production | ✅ |
| P0-6 | Driver registration sends documents | ✅ |
| P0-7 | Vendor terms checkbox | ✅ |
| P0-8 | Server-side service area (pickup) | ✅ |
| P0-9 | No mock token after real driver register | ✅ |
| P0-10 | Local runbook | ✅ `docs/MVP_LOCAL_TESTING.md` |
| P0-11 | Customer QA FAB opt-in only | ✅ |
| P0-12 | Roadside marketing = availability API | ✅ |
| P0-13 | Stub advance honesty on confirm | ✅ |

## P1 — Trust & ops

| ID | Item | Status |
|----|------|--------|
| P1-1 | Admin recent bookings = towing + driver only | ✅ |
| P1-2 | Real SMS OTP on prod numbers | ⚠ Configure HanuSMS on Render |
| P1-3 | Partner mock mutations gated | ✅ |
| P1-4 | Mongo TTL on OTP / activity logs | ✅ |
| P1-5 | Automated smoke script | ✅ `npm run mvp:smoke` |
| P1-6 | Crash reporting (Sentry) | 🔶 Post MVP-B |
| P1-7 | Driver GPS (foreground + background task) | ✅ `useDriverLocationReporting` |
| P1-8 | Incident runbook | ✅ `docs/MVP_INCIDENT_RUNBOOK.md` |

## P2 — Product honesty

| ID | Item | Status |
|----|------|--------|
| P2-1 | Roadside non-towing bookable | ✅ Flat-fare `RSV-*` via towing pipeline |
| P2-2 | QR camera scan | ✅ `expo-camera` + no fake default vehicle id |
| P2-3 | Subscriptions recurring pay | ⚠ Stub + honest MVP copy on plans screen |
| P2-4 | Full-time driver bookable | ✅ Same wizard as other driver types |
| P2-5 | PIN screens | ✅ Wired to `setPin` API (OTP remains primary login) |

## P3 — Full production revenue (post-pilot)

| ID | Item | Status |
|----|------|--------|
| P3-1 | Razorpay/Cashfree + webhook feed | 🔶 By design after pilot |
| P3-2 | `ALLOW_STUB_PAYMENTS` false in prod | 🔶 |
| P3-3 | Load test + formal on-call | 🔶 Runbook only for now |
| P3-4 | Partner + iOS store releases | ⚠ Customer APK path documented |

## Verification gate

```bash
cd backend && npm run lint && npm run mvp:smoke
cd "../customer application" && npx tsc --noEmit
cd "../mobile application" && npx tsc --noEmit
curl -sf http://localhost:3000/health
```

Last updated: 2026-10-29 (remaining gaps pass).
