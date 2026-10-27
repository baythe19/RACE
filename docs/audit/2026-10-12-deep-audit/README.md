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
| — | [`00-EXECUTIVE-SUMMARY.md`](./00-EXECUTIVE-SUMMARY.md) | One page: scores, top risks, quick wins, what is genuinely good |
| 01 | [`01-SCORECARD.md`](./01-SCORECARD.md) | Two-level scored rubric (done ⇒ score / not done ⇒ score) per surface + overall readiness |
| 02 | [`02-VERIFICATION-LOG.md`](./02-VERIFICATION-LOG.md) | Exactly what was executed (commands + exit codes), what changed mid-audit, what could not run, **and the self-review corrections (§6)** |
| 03 | [`10-BACKEND-AUDIT.md`](./10-BACKEND-AUDIT.md) | Route inventory, middleware, services, controllers, validation, errors, storage, sockets, env, scripts |
| 04 | [`11-DATABASE-AUDIT.md`](./11-DATABASE-AUDIT.md) | 26 models, relations, indexes, data-integrity risks, orphan fields |
| 05 | [`12-SECURITY-AUDIT.md`](./12-SECURITY-AUDIT.md) | Auth, OTP, JWT, admin/RBAC, uploads, PII, sockets, CORS, rate limits, secrets |
| 06 | [`13-API-CONNECTION-MATRIX.md`](./13-API-CONNECTION-MATRIX.md) | Every endpoint × every client: used / unused / dead call |
| 07 | [`14-MAPS-LOCATION-AUDIT.md`](./14-MAPS-LOCATION-AUDIT.md) | Google Maps + geolocation: backend, customer, partner, admin |
| 07b | [`15-DEPLOY-OPS-AUDIT.md`](./15-DEPLOY-OPS-AUDIT.md) | How the platform ships: VM bootstrap, PM2, nginx, deploy path, CI, secrets, backups — **added in self-review** |
| 08 | [`20-CUSTOMER-APP-AUDIT.md`](./20-CUSTOMER-APP-AUDIT.md) | Customer surface: screens, flows, wiring, UI/UX, gaps |
| 09 | [`21-PARTNER-APP-AUDIT.md`](./21-PARTNER-APP-AUDIT.md) | Partner surface: vendor company, vendor driver, self driver |
| 10 | [`22-ADMIN-WEB-AUDIT.md`](./22-ADMIN-WEB-AUDIT.md) | Admin surface: pages, what is shown vs missing, over-engineering |
| 11 | [`30-UIUX-PAGE-INVENTORY.md`](./30-UIUX-PAGE-INVENTORY.md) | Page-by-page component inventory + what belongs / what does not |
| 12 | [`40-BUGS-AND-GAPS.md`](./40-BUGS-AND-GAPS.md) | Numbered defect register with severity, evidence, impact |
| 13 | [`50-TEST-CASES.md`](./50-TEST-CASES.md) | Executable test catalogue (API + 3 clients) incl. negative/security cases |
| 14 | [`60-CLIENT-DOC-CONFORMANCE.md`](./60-CLIENT-DOC-CONFORMANCE.md) | Client document vs build, re-verified independently |
| 15 | [`70-ROADMAP-QUICK-WINS.md`](./70-ROADMAP-QUICK-WINS.md) | Quick wins, do-not-do list, sequencing |
| 16 | [`80-IMPLEMENTATION-PLAN.md`](./80-IMPLEMENTATION-PLAN.md) | **The plan:** phases 0–6, priority-ordered, each item with POC, files/endpoints/env connection, effort, verification and exit criteria |
| 17 | [`81-SCORING-ONLY.md`](./81-SCORING-ONLY.md) | **Scores only:** every area and every rubric item, weights, roll-up arithmetic, severity counts, phase targets |
| 18 | [`82-MVP-DEFINITION-AND-BUILD-PLAN.md`](./82-MVP-DEFINITION-AND-BUILD-PLAN.md) | **MVP only:** what "MVP" means here, three MVP tiers (demo / working / pilot-hardened), the scope cut-line, per-surface completeness, the seven end-to-end journeys with their exact connections, the MVP work list with effort, and a ~50-check acceptance script |

Raw evidence: [`_evidence/backend-route-map.txt`](./_evidence/backend-route-map.txt)

**Headline (corrected in self-review):** platform **5.8/10**, launch readiness **3.6/10**, ops (advisory) **1.1/10**;
backend **171 route registrations / 136 unique paths**; client wiring **88%** (customer 88%, partner 100%, admin 81%);
**0 dead client calls**; findings **48** (6 S1 · 14 S2 · 16 S3 · 12 gaps).

## 3. Confidence legend (used in every document)

| Tag | Meaning |
|-----|---------|
| **[V]** Verified | I read the exact code / ran the command; `file:line` given |
| **[O]** Observed | Derived from an exhaustive grep or generated inventory |
| **[I]** Inferred | Reasoning from code shape; not executed |
| **[X]** Not verified | Needs a device, a live DB, or a payment/SMS vendor account |

**Known environment limits for this audit:** no MongoDB reachable, no simulator/emulator, no browser, no SMS/payment sandbox. Anything tagged **[X]** is listed as a limitation, never as a pass.

> **Branch drift (recorded later, while writing `82`):** documents `00`–`81` were produced on `3.0.0-driver-app-development`. The tree was on **`3.5.0-new-driver-screeens`** when `82` was written, and `PartnerHomeScreen.tsx` / `PartnerJobsScreen.tsx` / `VendorAssignJobScreen.tsx` had uncommitted UI edits. Scope conclusions are unaffected; line references for those three files may drift. `82-§0` carries the detail.

## 3b. Scope & snapshot caveat (read before quoting numbers)

- This audit is a **snapshot of the tree between 13:40 and 13:56 on 2026-10-12**.
- **A parallel process was actively editing the partner app during the window** — 22 files under `mobile application/src` changed after the scan started, and an external commit (`7ce2f3c`) landed several of my documents mid-session. New partner screens that appeared after the scan (earnings, bank details, trip history, settings, notifications, help support + 6 dialogs) are listed in [`21-PARTNER-APP-AUDIT.md` §7](./21-PARTNER-APP-AUDIT.md#7-post-scan-addendum) and were **not** audited.
- No source file was modified by this audit. Only `docs/audit/2026-10-12-deep-audit/**` and a memory note in `.agents/state/ACTIVE.md` were written (verified with `find … -newermt` + `git status`).
- Where a partner-app number is quoted (e.g. "40 mock fallback sites", "32 screens"), assume it describes the pre-addendum tree; the addendum records what changed.

## 4. Repo shape at audit time

| Surface | Folder | Files (.ts/.tsx) | Tests |
|---------|--------|-----------------|-------|
| Customer mobile (Expo 57 / RN 0.86) | `customer application/` | 337 | 0 |
| Partner mobile (Expo 57 / RN 0.86) | `mobile application/` | 244 | 0 |
| Admin web (Vite + Turbo) | `race-admin/` | 127 | 0 runnable (2 stub files, no runner installed) |
| Backend API (Express 5) | `backend/` | 241 | 0 |
| Deploy | `deploy/` | PM2 + nginx | — |

**0 runnable automated tests in the entire repository.** Two `*.test.ts` files exist (`race-admin/packages/utils/src/permissions.test.ts`, `race-admin/apps/admin-web/src/__tests__/dashboard.test.ts`) but they import from `'vitest'`, which is **not installed** in any workspace, and there is no test script or test config (verified: `ls node_modules/.bin | grep vitest` → empty). [V]
