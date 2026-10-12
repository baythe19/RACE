# 81 — Scoring Only

Numbers only. No narrative. Every score is 0–10. `IF DONE` = full credit, `IF NOT` = floor, `NOW` = awarded today.
Legend: `[V]` verified from code · `[O]` inventory/regex · `[I]` estimate · `[X]` not verifiable in this environment.
Source of every row: the matching document in this folder; arithmetic re-checked in `01-SCORECARD.md#3`.

---

## 1. Weighted platform score

| Area | Weight | IF DONE | NOW | Weighted |
|------|-------:|--------:|----:|---------:|
| Backend API | 0.15 | 10 | 6.1 | 0.915 |
| Database & data integrity | 0.10 | 10 | 5.2 | 0.520 |
| Security | 0.15 | 10 | 5.1 | 0.765 |
| API connections | 0.10 | 10 | 6.6 | 0.660 |
| Maps / location / realtime | 0.05 | 10 | 4.1 | 0.205 |
| Customer app | 0.15 | 10 | 6.3 | 0.945 |
| Partner app | 0.15 | 10 | 5.9 | 0.885 |
| Admin web | 0.10 | 10 | 5.5 | 0.550 |
| Client-doc conformance | 0.05 | 10 | 5.8 | 0.290 |
| **TOTAL** | **1.00** | **10.0** | — | **5.735 → 5.8** |

| Derived metric | Value |
|----------------|------:|
| Launch readiness (security + payments + verification integrity weighting) | **3.6 / 10** |
| Independent cross-check (client gap report) | **57 / 100** |
| Delta between the two methods | 1.0 pts |
| Ops / deploy area (**advisory, unweighted**) | **1.1 / 10** |
| Phase-0 only (4 blockers removed) target `[I]` | **6.5** |
| After 6 quick wins `[I]` | **6.4** |
| Best realistic after Phases 0–5 `[I]` | **8.7** |

---

## 2. Backend — 6.1 (weight 0.15)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Layered structure, no parallel modules | 10 | 3 | 9 | [V] |
| 2 | Zod validation on all mutations | 10 | 2 | 10 | [V] |
| 3 | Uniform error contract (no leak) | 10 | 3 | 9 | [V] |
| 4 | User auth (role lock, rotation, provider OTP) | 10 | 2 | 8 | [V] |
| 5 | Admin auth hardening | 10 | 0 | 2 | [V] |
| 6 | Upload privacy & validation depth | 10 | 0 | 2 | [V] |
| 7 | Socket authorization | 10 | 0 | 1 | [V] |
| 8 | Real payment gateway | 10 | 0 | 1 | [V] |
| 9 | Automated tests | 10 | 0 | 0.5 | [V] |
| 10 | Observability (logs/metrics/health) | 10 | 3 | 6 | [V] |
| | **Mean** | | | **6.1** | |

| Backend inventory | Count |
|-------------------|------:|
| Route files | 33 |
| Inline routes in `controller/src/index.ts` | 1 |
| Route registrations (path + method) | 171 |
| Unique paths | 136 |
| Mounted middleware stages in `app.ts` | 9 |
| Modules with Zod validation (sampled mutations) | all sampled |
| Endpoints with no client consumer | 17 |

---

## 3. Database — 5.2 (weight 0.10)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Single booking source of truth | 10 | 3 | 3 | [V] |
| 2 | Refs resolve to registered models | 10 | 2 | 2 | [V] |
| 3 | Hot-path indexes | 10 | 4 | 9 | [V] |
| 4 | Migration discipline | 10 | 0 | 6 | [V] |
| 5 | KYC single source of truth | 10 | 3 | 3 | [V] |
| 6 | PII at rest (documents, OTP) | 10 | 2 | 4 | [V] |
| | **Mean** | | | **5.2** | |

| Data inventory | Count |
|----------------|------:|
| Booking collections | 3 |
| Distinct booking status vocabularies | 2 |
| Models with `syncIndexes()` coverage | 12 of 26 |
| Ghost `ref`s (target model missing) | BUG-08 (`Vendor`, `Driver`) |
| Transactions attributable to new bookings | no (BUG-09) |

---

## 4. Security — 5.1 (weight 0.15)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Admin identity not hardcoded + rate-limited login | 10 | 0 | 1 | [V] |
| 2 | Document URLs require auth/signature | 10 | 0 | 1 | [V] |
| 3 | Socket auth + room authorization | 10 | 0 | 2 | [V] |
| 4 | User auth (role lock, rotation, provider OTP) | 10 | 0 | 8 | [V] |
| 5 | Upload validation beyond MIME | 10 | 2 | 3 | [V] |
| 6 | CORS locked to known origins | 10 | 3 | 4 | [V] |
| 7 | Per-surface secret separation | 10 | 4 | 4 | [V] |
| | **Mean** | | | **5.1** | |

| Security counters | Value |
|-------------------|------:|
| S1 blockers | 6 |
| Public/unauthenticated surfaces found | 4 (`/uploads`, `/qr/:id`, `/qr/:id/metadata`, `/fare/*`) |
| Auth mechanisms without rate limit | 1 (admin login) |
| JWT secrets shared between admin and user planes | yes (BUG-14) |
| Tracked files containing secrets | 0 (`02-V-16`) |
| CI security gates | 0 |

---

## 5. API connections — 6.6 (weight 0.10)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Endpoint has a consumer or is documented internal | 10 | 3 | 7 | [V] |
| 2 | No dead/mismatched client paths | 10 | 5 | 9 | [V] |
| 3 | Auth/role contract per surface | 10 | 3 | 8 | [V] |
| 4 | Admin can exercise the lifecycle it owns | 10 | 2 | 3 | [V] |
| 5 | Partner can complete every job step in-app | 10 | 2 | 6 | [V] |
| | **Mean** | | | **6.6** | |

| Wiring metric | Customer app | Partner app | Admin web | Total |
|---------------|-------------:|------------:|----------:|------:|
| Backend paths in scope | 52 | 27 | 57 | 136 |
| Referenced in client code | 46 | 27 | 46 | 119 |
| Not referenced | 6 | 0 | 11 | 17 |
| Coverage | 88% | 100% | 81% | 88% |
| Dead client calls | 0 | 0 | 0 | **0** |
| Client paths referencing a missing route | 0 | 0 | 0 | **0** |

| Correction ledger (self-review, `02-§6`) | First pass | Corrected |
|-------------------------------------------|-----------:|----------:|
| Backend endpoints | 159 | 171 regs / 136 paths |
| Referenced by some client | 106 (67%) | 119 (88%) |
| Customer app coverage | 85% | 88% |
| Partner app coverage | 87% | 100% |
| Admin web coverage | 52% | 81% |
| Orphans | 15+ (unverified) | 17 (hand-verified) |
| Connections score | 6.2 | 6.6 |

---

## 6. Maps / location / realtime — 4.1 (weight 0.05)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Backend distance/fare real | 10 | 3 | 7 | [V] |
| 2 | Customer live tracking verified | 10 | 3 | 6 | [X] |
| 3 | Partner in-job map + background location | 10 | 2 | 3 | [V] |
| 4 | Admin ops map | 10 | 0 | 0 | [V] |
| 5 | Cost/abuse protection (cache, throttle) | 10 | 2 | 2 | [V] |
| | **Mean** | | | **4.1** | |

| Map/realtime counters | Value |
|-----------------------|------:|
| Map libraries in customer app / partner app / admin | 1 / 1 / 0 |
| Background location APIs used in partner app | 0 |
| Socket client wired in customer app / partner app | yes / no (dep present, unused) |
| Socket room authorization | none |
| Partner polling intervals (offers / active job / jobs) | 8 s / 10 s / 15 s |

---

## 7. Customer app — 6.3 (weight 0.15)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Real OTP login (skip-flag off by default) | 10 | 0 | 9 | [V] |
| 2 | Booking flows wired to real API | 10 | 2 | 8 | [V] |
| 3 | Real payment | 10 | 0 | 1 | [V] |
| 4 | Working QR scan | 10 | 3 | 1 | [V] |
| 5 | No dead auth UI | 10 | 5 | 3 | [V] |
| 6 | Loading/empty/error states | 10 | 4 | 7 | [V] |
| | **Mean** | | | **6.3** | |

| Customer app counters | Value |
|----------------------|------:|
| Files (.ts/.tsx) | 337 |
| Screens | 43 |
| Dead auth screens/features | 4 (PIN, forgot, reset, change password) |
| Camera libraries present | 0 |
| UI test cases written / executed | 43 / 0 |
| Typecheck | exit 0 |

---

## 8. Partner app — 5.9 (weight 0.15)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Real data in production builds (mock off) | 10 | 0 | 1 | [V] |
| 2 | Driver KYC uploaded for real | 10 | 2 | 2 | [V] |
| 3 | Driver job cycle end-to-end | 10 | 3 | 8 | [V] |
| 4 | Approval gating + honest status screens | 10 | 3 | 9 | [V] |
| 5 | Background location during a job | 10 | 4 | 3 | [V] |
| 6 | Vendor supervision of running jobs | 10 | 3 | 4 | [V] |
| | **Mean** | | | **5.9** | |

| Partner app counters | Value |
|---------------------|------:|
| Files (.ts/.tsx) | 244 |
| Screens (after mid-audit change) | 38 |
| Screens audited | 32 |
| Screens not audited | 6 |
| Mock fallback sites / service files | 40 / 15 |
| Test files under `src` | 0 |
| Typecheck (re-run after edits) | exit 0 |

---

## 9. Admin web — 5.5 (weight 0.10)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Approve after viewing the document | 10 | 0 | 1 | [V] |
| 2 | Audit trail visible | 10 | 0 | 1 | [V] |
| 3 | Multi-admin with enforced RBAC | 10 | 2 | 2 | [V] |
| 4 | KPIs from one booking source | 10 | 2 | 2 | [V] |
| 5 | Live ops map + realtime alerts | 10 | 0 | 1 | [V] |
| 6 | Clean architecture/scaffolding | 10 | 4 | 9 | [V] |
| | **Mean** | | | **5.5** | |

| Admin counters | Value |
|----------------|------:|
| Files (.ts/.tsx) | 127 |
| Pages in inventory | 20 |
| Pages with no API call | 1 (`/admin-users`, BUG-27) |
| Map libraries | 0 |
| API paths referenced / in scope | 46 / 57 (81%) |
| UI cases written / executed | 20 / 0 |
| Typecheck | exit 0 |
| Tests present | 2 files, runner **not installed** |

---

## 10. Client-doc conformance — 5.8 (weight 0.05)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Client spec implemented end-to-end (honest) | 10 | 0 | 5.8 | [V] |
| | **Mean** | | | **5.8** | |

| Conformance counters | Value |
|---------------------|------:|
| Client claims audited | all |
| Claims outdated | 2 |
| Claims half-stale | 1 |
| Spec coverage | 40% |

---

## 11. Deploy / Ops — 1.1 (advisory, currently unweighted)

| # | Capability | IF DONE | IF NOT | NOW | Conf |
|---|-----------|--------:|-------:|----:|------|
| 1 | Automated gate on every change (CI + tests) | 10 | 0 | 0 | [V] |
| 2 | Encrypted transport end to end | 10 | 0 | 0 | [V] |
| 3 | Deploy reversible, zero-downtime, seed-safe | 10 | 1 | 1 | [V] |
| 4 | Backups + tested restore | 10 | 0 | 0 | [V] |
| 5 | Monitoring, alerting, log rotation | 10 | 1 | 1 | [V] |
| 6 | Schema migration discipline | 10 | 1 | 4 | [V] |
| 7 | Secrets managed centrally | 10 | 2 | 2 | [V] |
| | **Mean** | | | **1.1** | |

| Ops counters | Value |
|--------------|------:|
| Deploy scripts | 5 |
| CI workflows | 0 |
| TLS endpoints | 0 of 2 |
| PM2 instances | 1 (fork) |
| Backup scripts | 0 |
| Monitoring configs | 0 |
| Log rotation configs | 0 |
| Destructive statements in the deploy path | 2 (`deleteMany` in `seed.ts`) |

---

## 12. Findings by severity

| Severity | Count | IDs |
|----------|------:|-----|
| S1 blocker | 6 | BUG-01 … BUG-06 |
| S2 major | 14 | BUG-07 … BUG-20 |
| S3 minor | 16 | BUG-21 … BUG-36 |
| Gaps (missing capability) | 12 | GAP-01 … GAP-12 |
| **Total findings** | **48** | |

| Blocker | Fixed today? | Phase that closes it |
|---------|--------------|---------------------|
| BUG-01 partner app mock data by default | no | 0 (W-01) |
| BUG-02 public KYC documents | no | 0 (W-02) |
| BUG-03 unauthenticated sockets | no | 0 (W-03) |
| BUG-04 hardcoded admin credential + no login limit | no | 0 (W-04) |
| BUG-05 self-driver KYC never stored | no | 1 (W-10) |
| BUG-06 QR scan cannot work | no | 1 (W-15) |

---

## 13. Verification status of this audit

| Check | Result |
|-------|--------|
| Backend types (`npm run lint`) | exit 0 |
| Customer app types | exit 0 |
| Partner app types (re-run post-edit) | exit 0 |
| Admin types | exit 0 |
| Automated tests runnable repo-wide | **0** |
| Internal doc links broken / checked | 0 / 29 |
| Source files changed by the audit | 0 |
| Checks that could not run | 8 (X1–X8) |
| Self-review corrections applied | 3 flaws, 8 published numbers corrected |
| Audit documents | 20 md files + 1 evidence file |
