# RACE — MVP launch checklist (priority order)

**Target tier for local pilot:** MVP-A (working MVP on real data, stub advance OK, UPI/cash at trip end).

Legend: ✅ Done in repo · ⚠ Partial · ❌ Open · 🔶 Policy / scope choice

## P0 — Must pass before any pilot user

| ID | Item | Status | Evidence / notes |
|----|------|--------|------------------|
| P0-1 | Core towing E2E on local API | ✅ | Create → CONFIRMED (stub advance) → vendor assign → driver trip |
| P0-2 | Partner preview mocks **off** in default `.env` | ✅ | `EXPO_PUBLIC_UI_PREVIEW_MODE=false` |
| P0-3 | Customer OTP skip **off** | ✅ | `EXPO_PUBLIC_SKIP_OTP_AUTH=false` |
| P0-4 | Stub payments allowed in **dev** only | ✅ | `ALLOW_STUB_PAYMENTS=true` + `assertStubPaymentsEnabled` |
| P0-5 | Payment webhook **fail-closed** in production | ✅ | `productionGuard` + `paymentWebhook.ts` HMAC required |
| P0-6 | Driver registration sends **documents** to API | ✅ | `DriverRegistrationFlowScreen` `documents` payload |
| P0-7 | Vendor terms require checkbox | ✅ | `VendorReviewScreen` `acceptTerms: termsAccepted` |
| P0-8 | Server-side service area (pickup) | ✅ | `serviceability.ts` on towing/driver create |
| P0-9 | No mock token after real driver register | ✅ | Session refresh; mock only if `UI_PREVIEW_MUTATIONS` |
| P0-11 | Customer QA FAB opt-in only | ✅ | `customerQa.ts` — not forced on in `__DEV__` |
| P0-12 | Roadside marketing matches availability API | ✅ | `RoadsideAssistanceScreen`, `RoadsideSelectServiceScreen` |
| P0-13 | Stub advance honesty on confirm screen | ✅ | `TowingAdvancePaymentScreen` copy |

## P1 — Trust & ops (before scaling pilot)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P1-1 | Admin KPIs from towing + driver collections | ⚠ | Aggregates include legacy `bookings` (often empty) — KPIs still correct if sums include all three |
| P1-2 | Real SMS OTP on prod numbers | ⚠ | HanuSMS + `OTP_PEPPER`; dev whitelist `9000000001` |
| P1-3 | Kill partner **mock mutation** on API error | ✅ | Gated on `UI_PREVIEW_MUTATIONS` only |
| P1-4 | Mongo TTL on OTP / activity logs | ✅ | `otpLog.ts`, `activityLog.ts` |
| P1-5 | Automated test suite in CI | ❌ | Ad-hoc `tsx` scripts only |
| P1-6 | Crash reporting (Sentry) | ❌ | Recommended for MVP-B |
| P1-7 | Background driver GPS stream | ⚠ | Socket + foreground updates; full background task partial |

## P2 — Product honesty (marketing = reality)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P2-1 | Roadside non-towing services | ⚠ | UI shows Coming soon + blocks book; backend still unbuilt |
| P2-2 | QR camera scan | ❌ | Share/open URL works; no barcode camera |
| P2-3 | Subscriptions recurring pay | ❌ | Plans list; gateway stub |
| P2-4 | Full-time driver enquiry-only screen | ⚠ | Hide or wire API |
| P2-5 | Placebo profile screens (PIN-only) | ⚠ | Remove or wire |

## P3 — Full production revenue (post-pilot)

| ID | Item | Status |
|----|------|--------|
| P3-1 | Razorpay/Cashfree order + webhook | ❌ |
| P3-2 | `ALLOW_STUB_PAYMENTS` false in prod | 🔶 |
| P3-3 | Load test + on-call runbook | ❌ |
| P3-4 | Partner + iOS store releases | ⚠ Partner APK path partial |

## Commands (verification gate)

```bash
cd backend && npm run lint
cd "../customer application" && npx tsc --noEmit
cd "../mobile application" && npx tsc --noEmit
curl -sf http://localhost:3000/health
```

Last updated: 2026-10-29 (MVP local /goal session).
