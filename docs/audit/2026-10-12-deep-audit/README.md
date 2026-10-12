# RACE — Deep Audit (documentation only)

**Date:** 2026-10-12 · **Branch:** `3.0.0-driver-app-development` · **Author:** audit pass (read-only)
**Scope:** backend API, database, all three client surfaces (customer app, partner app, admin web), their connections, security, bugs, gaps, test cases, client-doc conformance, scoring.

> **This audit changed no code.** Every claim is backed by `file:line` or a command output. Repair work is listed as a *proposal*, not applied.

---

## 1. Why this audit exists

Previous reports (`docs/client/CLIENT_DOC_VS_BUILD.md` — overall **57/100**) answered "did we build what the client wrote?".
This audit answers three different questions the team still cannot answer from one place:

1. **How good is the backend as an engineering artefact** (structure, validation, auth, error handling, storage, realtime, deployability)?
2. **How well are the three clients actually connected to it** — which endpoints are live, which are orphaned, which client calls are dead?
3. **What exactly will break for a real user** (bugs, security holes, DB integrity, missing states), and **how do we test it**?

## 2. Documents

| # | File | What it answers |
|---|------|-----------------|
| 01 | [`01-SCORECARD.md`](./01-SCORECARD.md) | Two-level scored rubric (done ⇒ score / not done ⇒ score) per surface + overall readiness |
| 02 | [`00-EXECUTIVE-SUMMARY.md`](./00-EXECUTIVE-SUMMARY.md) | One page: scores, top risks, quick wins, what is genuinely good |
| 03 | [`10-BACKEND-AUDIT.md`](./10-BACKEND-AUDIT.md) | Route inventory, middleware, services, controllers, validation, errors, storage, sockets, env, scripts |
| 04 | [`11-DATABASE-AUDIT.md`](./11-DATABASE-AUDIT.md) | 26 models, relations, indexes, data-integrity risks, orphan fields |
| 05 | [`12-SECURITY-AUDIT.md`](./12-SECURITY-AUDIT.md) | Auth, OTP, JWT, admin/RBAC, uploads, PII, sockets, CORS, rate limits, secrets |
| 06 | [`13-API-CONNECTION-MATRIX.md`](./13-API-CONNECTION-MATRIX.md) | Every endpoint × every client: used / unused / dead call |
| 07 | [`14-MAPS-LOCATION-AUDIT.md`](./14-MAPS-LOCATION-AUDIT.md) | Google Maps + geolocation: backend, customer, partner, admin |
| 08 | [`20-CUSTOMER-APP-AUDIT.md`](./20-CUSTOMER-APP-AUDIT.md) | Customer surface: screens, flows, wiring, UI/UX, gaps |
| 09 | [`21-PARTNER-APP-AUDIT.md`](./21-PARTNER-APP-AUDIT.md) | Partner surface: vendor company, vendor driver, self driver |
| 10 | [`22-ADMIN-WEB-AUDIT.md`](./22-ADMIN-WEB-AUDIT.md) | Admin surface: pages, what is shown vs missing, over-engineering |
| 11 | [`30-UIUX-PAGE-INVENTORY.md`](./30-UIUX-PAGE-INVENTORY.md) | Page-by-page component inventory + what belongs / what does not |
| 12 | [`40-BUGS-AND-GAPS.md`](./40-BUGS-AND-GAPS.md) | Numbered defect register with severity, evidence, impact |
| 13 | [`50-TEST-CASES.md`](./50-TEST-CASES.md) | Executable test catalogue (API + 3 clients) incl. negative/security cases |
| 14 | [`60-CLIENT-DOC-CONFORMANCE.md`](./60-CLIENT-DOC-CONFORMANCE.md) | Client document vs build, re-verified independently |
| 15 | [`70-ROADMAP-QUICK-WINS.md`](./70-ROADMAP-QUICK-WINS.md) | Quick wins, do-not-do list, sequencing |

Raw evidence: [`_evidence/backend-route-map.txt`](./_evidence/backend-route-map.txt)

## 3. Confidence legend (used in every document)

| Tag | Meaning |
|-----|---------|
| **[V]** Verified | I read the exact code / ran the command; `file:line` given |
| **[O]** Observed | Derived from an exhaustive grep or generated inventory |
| **[I]** Inferred | Reasoning from code shape; not executed |
| **[X]** Not verified | Needs a device, a live DB, or a payment/SMS vendor account |

**Known environment limits for this audit:** no MongoDB reachable, no simulator/emulator, no browser, no SMS/payment sandbox. Anything tagged **[X]** is listed as a limitation, never as a pass.

## 4. Repo shape at audit time

| Surface | Folder | Files (.ts/.tsx) | Tests |
|---------|--------|-----------------|-------|
| Customer mobile (Expo 57 / RN 0.86) | `customer application/` | 337 | 0 |
| Partner mobile (Expo 57 / RN 0.86) | `mobile application/` | 244 | 0 |
| Admin web (Vite + Turbo) | `race-admin/` | 127 | 2 |
| Backend API (Express 5) | `backend/` | 241 | 0 |
| Deploy | `deploy/` | PM2 + nginx | — |

**2 test files exist in the entire repository** — `race-admin/packages/utils/src/permissions.test.ts` and `race-admin/apps/admin-web/src/__tests__/dashboard.test.ts`. [O]
