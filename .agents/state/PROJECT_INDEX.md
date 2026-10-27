# RACE — Project Index

> Navigational reference. Read to orient. Do not inline all files — use this to decide what to read next.

---

## Repository Root

```
/workspaces/RACE/
├── AGENTS.md                        # Always-on agent instructions
├── .agents/                         # Agent context infrastructure (new)
│   ├── state/ACTIVE.md              # Current session state (read first)
│   ├── state/PROJECT_INDEX.md       # This file
│   ├── state/DECISIONS_INDEX.md     # Decision records index
│   ├── decisions/ADR-*.md           # Individual architecture decisions
│   ├── rules/                       # Modular agent rules
│   └── skills/                      # Focused agent skills
├── .cursor/                         # Legacy agent config (still valid)
│   ├── memory/                      # activeContext, learnings, progress, decisions
│   ├── rules/                       # MDC rules (all alwaysApply)
│   └── skills/                      # Cursor skills
├── backend/                         # Express 5 + TypeScript API
├── customer application/            # Customer Expo app
├── mobile application/              # Partner Expo app
├── race-admin/                      # Admin Vite Turbo monorepo
├── deploy/                          # GCP VM shell scripts
├── docs/                            # Project documentation
└── clintdoc.md                      # Client original spec (source of truth)
```

---

## Surface: Backend (`backend/`)

**Entry:** `src/index.ts` → `src/app.ts`
**Pattern:** `controller/src/ → services/src/ → models/src/`
**Structure doc:** `backend/src/STRUCTURE.md`

| Path | Purpose |
|------|---------|
| `src/index.ts` | Bootstrap: DB, Redis, HTTP, Socket.IO |
| `src/app.ts` | Express factory + global middleware |
| `src/config/` | Env, Redis, GCS, hardcoded-admin |
| `src/auth/src/` | JWT re-exports + role constants |
| `src/controller/src/` | HTTP routers + controllers (incl. `admin/`) |
| `src/middleware/src/` | auth.ts, role.ts, adminAuth.ts |
| `src/models/src/` | Mongoose schemas |
| `src/services/src/` | Business logic (incl. `admin/`, `bookings/`) |
| `src/database/` | Connection, indexes, seeds, seed-data/ |
| `src/scripts/` | One-off maintenance (comprehensive-audit.ts) |
| `src/storage/src/` | GCS file storage |
| `src/utils/src/` | jwt, errors, logger, helpers |

**Key models:** `user.ts`, `towingBooking.ts`, `driverBooking.ts`, `booking.ts` (legacy), `vendor.ts`, `driver.ts`, `vehicle.ts`, `service.ts`

**API prefixes:**
- `/health` — ops
- `/api/v1/*` — mobile apps
- `/api/v1/admin/*` — admin panel

**Run:** `npm run dev` (port 3000) | **Lint:** `npm run lint`

---

## Surface: Admin Web (`race-admin/`)

**Type:** Turbo monorepo
**App:** `apps/admin-web/` (Vite, React 19, port 3001)
**Packages:** `packages/api`, `packages/ui`, `packages/types`, `packages/constants`, `packages/config`, `packages/utils`
**State:** Zustand + TanStack Query (NOT Redux)
**API client:** `@race/api` → `http://localhost:3000/api/v1/admin/*`

**Run:** `npm run dev` from `race-admin/` | **Lint:** check tsconfig

---

## Surface: Customer App (`customer application/`)

**Type:** Expo 57, React Native 0.86.3
**Entry:** `App.tsx` → `src/navigation/` → `AuthNavigator` / `RootNavigator`
**Known:** `MainNavigator` is a leftover — do not delete without import graph check.
**API:** `src/api/` using axios; base URL from `EXPO_PUBLIC_API_URL` or `app.config.js` GCP IP

| Path | Purpose |
|------|---------|
| `src/screens/auth/` | OTP login, onboarding |
| `src/screens/booking/` | Booking flows |
| `src/screens/home/` | Service selection |
| `src/navigation/` | AuthNavigator, RootNavigator, (MainNavigator leftover) |
| `src/redux/` | Redux store (some state) |
| `src/store/` | Additional state |
| `src/api/` | Axios clients |
| `src/hooks/` | Custom hooks |

**Run:** `npx expo start` | **Lint:** `npx tsc --noEmit`

---

## Surface: Partner App (`mobile application/`)

**Type:** Expo 57, React Native 0.86.3
**Entry:** `App.tsx` → `src/navigation/PartnerAppNavigator`

| Path | Purpose |
|------|---------|
| `src/screens/partner/auth/` | Partner login (OTP) |
| `src/screens/partner/` | Job management, KYC, vehicles |
| `src/navigation/` | PartnerAppNavigator |
| `src/redux/` | Redux store |
| `src/api/` | Axios clients |

**Run:** `npx expo start` | **Lint:** `npx tsc --noEmit`

---

## Integrations

| Service | Purpose | Notes |
|---------|---------|-------|
| MongoDB 7 | Primary DB | `race-service` DB name; local container port 27017 |
| Redis / ioredis | Cache | Configured via `backend/src/config/` |
| Twilio | SMS OTP | Working; Twilio trial 21608 error on VPS |
| GCS | File storage | `@google-cloud/storage` |
| Socket.IO 4 | Real-time | Connected at backend startup |
| GCP VM | Hosting | `race-server`; still on `release/13July26` |

---

## Build / Test / Dev Commands

| Command | Folder | Purpose |
|---------|--------|---------|
| `npm run dev` | `backend/` | Start API dev server |
| `npm run lint` | `backend/` | TypeScript typecheck |
| `npm run seed` | `backend/` | Seed platform data |
| `npm run seed:fresh` | `backend/` | Reset + seed mock data |
| `tsx src/scripts/comprehensive-audit.ts` | `backend/` | 40-case system audit |
| `npm run dev` | `race-admin/` | Start admin web |
| `npx expo start` | each app folder | Start Expo dev server |

---

## Documentation

| File | Purpose | Size |
|------|---------|------|
| `docs/client/CLIENT_OVERVIEW.md` | Product overview | ~3KB |
| `docs/client/CLIENT_FEATURES.md` | Feature detail | ~10KB |
| `docs/client/CLIENT_USER_FLOWS.md` | User flows | ~9KB |
| `docs/client/CLIENT_DOC_VS_BUILD.md` | Full gap analysis | ~22KB (large!) |
| `docs/RACE_REMAINING_WORK_AND_GAPS.md` | Work backlog | ~24KB (large!) |
| `docs/SYSTEM_AUDIT_AND_TEST_CASES.md` | Audit results | ~16KB (large!) |
| `docs/MOCK_TESTING_PLAYBOOK.md` | Testing guide | ~4KB |
| `clintdoc.md` | Client spec | ~4KB |
| `backend/src/STRUCTURE.md` | Backend layout | ~2KB |

> **Load large docs only when directly relevant to the current task.**
