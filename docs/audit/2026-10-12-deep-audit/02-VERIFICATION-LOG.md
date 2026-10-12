# 02 — Verification Log (what I actually ran)

Everything below was executed on **2026-10-12** in this workspace. Exit codes were captured with `set -o pipefail` + `PIPESTATUS` (a filtered output is never treated as a pass). Nothing was changed to make a check pass.

---

## 1. Checks that RAN and passed

| # | Check | Command | Result |
|---|-------|---------|--------|
| V1 | Partner app types (re-run **after** the parallel edits) | `cd "mobile application" && npx tsc --noEmit` | **exit 0** |
| V2 | Customer app types | `cd "customer application" && npx tsc --noEmit` | **exit 0** |
| V3 | Admin web types | `cd race-admin && npx tsc --noEmit -p apps/admin-web/tsconfig.app.json` | **exit 0** |
| V4 | Backend types | `cd backend && npx tsc --noEmit` | **exit 0** (run earlier this session; `find backend/src -newermt 13:40` → empty, i.e. the tree is unchanged, so the result still covers the current code) |
| V5 | Backend endpoint extraction | `python3 route_scan.py` → `_evidence/backend-route-map.txt` | 159 endpoints enumerated with middleware chains (390 lines of raw evidence) |
| V6 | Client call-site extraction | grep for `API_ENDPOINTS.*`, literal and template `/api/v1/...` paths across all 3 clients | used/orphan/dead tables in `13-API-CONNECTION-MATRIX.md` |
| V7 | Orphan/unused endpoint cross-check | targeted `grep -l` per endpoint + hand-resolution of template paths (`${API_ENDPOINTS.x}/cancel`, `` `/vendors/${id}/documents/${key}` ``) | Orphan list produced; **two earlier suspicions were corrected this way** (subscriptions/cancel and vendorBookingOffers ARE used) |
| V8 | Runtime check — driver verification derivation | `npx tsx` fixtures over `buildDriverVerification` (7 states) | all states/steps/labels correct (previous task, same module tree) |
| V9 | Runtime check — `GET /profile` payload | `npx tsx` with a stubbed repository calling the **real** `profileService.getProfile` | `driverProfile` returned with the exact shape the client types expect; **no** `loginId`/`passwordHash` leak; customers unaffected |
| V10 | Doc link integrity | Python link resolver over all 16 audit docs | **0 broken internal links** |
| V11 | "No code was modified" check | `git status --porcelain -uall` + `find <source dirs> -newermt <audit start>` | Only `docs/audit/…` + `.agents/state/ACTIVE.md` written by this audit; every modified source file belongs to the parallel process (see §3) |

## 2. Checks that RAN and produced a finding (failing as designed)

| # | Check | Result | Interpretation |
|---|-------|--------|----------------|
| V12 | Are the 2 existing test files runnable? | `vitest`/`jest` **not installed** (no binary in any `node_modules/.bin`), no test config, no `test` script in the monorepo | The two `*.test.ts` files import from `'vitest'` but **cannot execute** ⇒ **0 runnable automated tests in the repo** (bug register BUG-36, refined) |
| V13 | Do the partner app's new account screens use mock mode? | no `UI_PREVIEW_MODE` import, no direct `API_ENDPOINTS.*` reference | Mock-risk count stays 40 sites; those screens' own wiring is **not audited** (`21-§7`) |
| V14 | Is any admin map library present? | `google.maps` / `@react-google-maps` / `leaflet` / `MapContainer` → no hits | Confirms "no admin map" independently of the older gap report |
| V15 | Camera available for QR scan? | `expo-camera` / `expo-barcode-scanner` / vision-camera absent from `package.json`; no `CameraView`/`BarCodeScanner` in `src` | QR scan **cannot** work (BUG-06) |

## 3. Conditions that changed during the audit (affect how to read the numbers)

| Event | Evidence | Effect |
|-------|----------|--------|
| A parallel process edited the partner app while the audit ran | 22 files under `mobile application/src` with mtime after the scan start; screen count 32 → **38** | Partner-app findings describe the pre-change tree; new screens listed as **not audited** in `21-§7`. V1 was re-run **after** those edits (still exit 0) |
| An external commit landed mid-session | `git log` → `7ce2f3c "docs: add deep audit reports and partner app screens and services"` (contains my first 11 documents + partner app screens) | Some audit documents are already committed by that process, not by me |
| Backend tree did not change during the audit | `find backend/src -newermt 13:40` → empty | V4 remains valid without a re-run |

## 4. Checks that COULD NOT run (stated as limitations, never as passes)

| # | Check | Blocker | What it would prove |
|---|-------|---------|---------------------|
| X1 | `cd backend && npm run seed:fresh && npx tsx src/scripts/comprehensive-audit.ts` | **MongoDB unreachable** in this environment | End-to-end API/DB behaviour, seeded flows |
| X2 | Any KPI reconciliation (`adminDashboard` totals vs collections) | depends on X1 | Bug DB-2 / BUG-07 magnitude |
| X3 | `explain()` / index-usage and 10k-row query timings (TC-NFR-02) | depends on X1 | Whether admin aggregates COLLSCAN |
| X4 | Device runs of both mobile apps (TC-CUS-*, TC-PTR-*) | **no simulator/emulator/device** here | Real rendering, permissions, background location, socket tracking, keyboard/scroll behaviour |
| X5 | Browser run of admin web (TC-AWM-*) | no browser | Rendered pages, guards, console errors |
| X6 | Real payment + real SMS OTP journeys | no gateway/SMS sandbox credentials | Money path and provider round trip (both are stubs/mock-capable by design) |
| X7 | `npm audit` / dependency CVE sweep (TC-SEC-09) | not executed (network/time) | Third-party vulnerability counts |
| X8 | Load/soak behaviour (TC-NFR-01, TC-NFR-04) | not executed | p95 latency, Google quota, cold-start TTI |

## 5. Audit-method transparency

- Scored numbers are **derived from inspected code**, not from running the product. Every score row in `01-SCORECARD.md` traces to a `40-BUGS-AND-GAPS.md` entry or a per-surface section.
- Where a claim depends on X1–X8 it is tagged `[X]` in the source document.
- Any statement I could not tie to a file, a command, or a grep was removed rather than softened.

## 6. Self-review (second pass) — three counting bugs found in my own work, and what changed

I re-ran the quantitative parts of this audit against the code and **found three flaws in my own extractors**. The published numbers were wrong. Everything below is the corrected state; the affected documents were edited in place.

### 6.1 What was wrong

| # | Flaw | Symptom | Root cause |
|---|------|---------|-----------|
| C1 | Mount table used file paths **without the `.ts` suffix** | 12 routers (`vendor`, `driver`, `bookings/towing`, `bookings/driver`, `qr`, `sos`, `fare`, …) were skipped ⇒ backend "159 endpoints" and partner app "~31 available" | Key lookup mismatch in the extractor, not in the code |
| C2 | Client matching compared `:p` against Express `:id` | 19 client paths reported as "no backend route" (all false) | Param naming not normalised on both sides |
| C3 | Admin call-sites matched only when a generic was present and shallow; shared paths matched only when quoted | 7 endpoints reported as orphans that clients call by **string concatenation** (`${API_ENDPOINTS.x}/cancel`), plus missed admin calls with nested generics | Regex, not code |

### 6.2 Corrected numbers (each one independently re-counted twice)

| Quantity | Published first pass | **Corrected** | How it is now verified |
|----------|---------------------:|--------------:|------------------------|
| Backend routes | "≈159 endpoints" | **171 route registrations / 136 unique paths** across 33 route files + 1 inline | `grep -cE "router\.(get\|post\|put\|patch\|delete)\("` per file summing to 170, plus the inline `GET /api/v1/profile/wallet`; a separate mount-aware parser independently returns 171/136 |
| Backend paths referenced by some client | 106/159 = 67% | **119/136 = 88%** | Mount-aware parse + literal **and** concatenation-aware client scan; 17 orphans hand-verified against service modules |
| Customer app wiring | 85% | **46/52 = 88%** | Same |
| Partner app wiring | 87% | **27/27 = 100%** (vendor + driver paths) | Same |
| Admin web wiring | 52% | **46/57 = 81%** | All `'/...'` literals in `race-admin/packages/api/src/services/*.ts` enumerated (46) and matched; list printed and eyeballed |
| Client calls with no backend route | 0 (unchanged) | **0** | Confirmed after C2 fix — the 19 earlier hits were artifacts |
| Connections score | 6.2 | **6.6** | Rubric item "endpoint has a consumer" 5 → 7 on the corrected coverage |
| Platform score | 5.7 | **5.8** (weighted 5.76) | `01-SCORECARD.md#3` arithmetic redone |

### 6.3 Claims that were softened or corrected

| Claim | First pass | Corrected |
|-------|-----------|-----------|
| Partner app socket | "no `socket.io-client` in the partner app" | `socket.io-client@^4.8.3` **is** a dependency but is never imported ⇒ dead dep + polling only (`14-§…`, PA-6) |
| `PUT/DELETE /profile/locations/:id` orphan | "**Unconfirmed** — treat as verify before quoting" | **Not an orphan** — called from `customer application/src/services/profile/locationApi.ts:82,89` |
| `POST /subscriptions/cancel`, `PATCH /notifications/read-all`, `GET+PATCH /notifications/preferences`, `DELETE /payment-methods/:id`, `POST /bookings/*/:id/rating` | listed as orphans | **Not orphans** — all called via template concatenation; owner files cited in `13-§5` |
| `GET /admin/notifications`, `GET /admin/transactions`, `GET/POST/DELETE /admin/bookings`, `/admin/customers|vendors|drivers` create paths | listed as orphans | **Not orphans** — wired (`notification.service.ts:24`, `finance.service.ts:54`, `booking.service.ts`, `vendors.service.ts`, …) |

### 6.4 Additional checks run in this pass

| # | Check | Command | Result |
|---|-------|---------|--------|
| V16 | Are real secrets committed? | `git ls-files \| grep -iE "\.env\|secret\|credential"` | Only `.env.example` ×4 (backend, both apps, admin-web). **No `.env` tracked** ⇒ no leaked credentials in git. All four examples enumerate keys only — see `82`/plan §7 for the required values |
| V17 | Is there CI? | `ls .github/workflows` | **No `.github/workflows`** ⇒ zero automated gates on PRs; every check in this log is manual |
| V18 | What ships the backend? | `find deploy -type f` | 5 files: `deploy-backend.sh`, `deploy-admin.sh`, `gcp-vm-setup.sh`, `setup-admin-nginx.sh`, `ecosystem.config.cjs` (PM2) — audited for the first time in this pass: `15-DEPLOY-OPS-AUDIT.md` |
| V19 | Test files in the partner app | `find "mobile application/src" -name "*.test.*" -o -name "*.spec.*"` | **empty** — confirms BUG-36: the repo has 2 test files (both in `race-admin`), 0 runnable tests |
| V19b | Is the test runner declared, not just installed? | `grep -rn '"vitest"' race-admin/package.json race-admin/apps/admin-web/package.json race-admin/packages/*/package.json backend/package.json` | **no hits** ⇒ `vitest` is neither declared nor installed; the two test files that `import 'vitest'` cannot run even after `npm ci` |
| V20 | Background-location capability | `grep -rn "TaskManager\|startLocationUpdatesAsync\|ACCESS_BACKGROUND"` in partner app | **empty** ⇒ no background location at all (supports the "3/10" maps item) |

### 6.5 Residual uncertainty after the fix

- "Referenced in client code" **includes definition-only entries** in `config/api.ts`; a path can be referenced yet unreachable from any screen (vendor trip-OTP). UI-reachability gaps are therefore tracked separately in `13-§6`.
- Method-level (GET vs DELETE) coverage is **not** scored: the mobile clients set HTTP methods dynamically, so per-method matching is not reliable by grep. Where a method matters it is stated explicitly.
- The partner app changed mid-audit (22 files, 32 → 38 screens). Counts in 6.2 reflect the **post-change** tree for wiring; app-behaviour findings for the 6 new screens remain unaudited (`21-§7`).
- The parallel editor was **still active during this self-review pass**: at the time of writing, `git status` showed uncommitted edits to `mobile application/src/screens/partner/{PartnerHomeScreen,PartnerJobsScreen,VendorAssignJobScreen}.tsx` that the audit did not make and has not reviewed. Treat those three screens as drifted from this document until read.
