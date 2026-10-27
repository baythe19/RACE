# 01 — Scorecard & Rubric

**How to read:** every area is scored twice —
**IF DONE** = points awarded when the capability exists and is verified,
**IF NOT DONE** = points actually awarded today (partial credit where something half-works).
Weights reflect **launch impact**, not code volume.

Confidence: **[V]** verified from code, **[O]** inventory/grep, **[I]** inferred, **[X]** not verifiable here (no DB/device/browser).

---

## 1. Platform summary

| Surface / dimension | Weight | IF DONE | TODAY | Grade band |
|---------------------|-------:|--------:|------:|-----------|
| Backend API | 15% | 10.0 | **6.1** | Demo-ready |
| Database & data integrity | 10% | 10.0 | **5.2** | Prototype |
| Security | 15% | 10.0 | **5.1** | Prototype ⚠️ |
| API connections (client ⇄ API) | 10% | 10.0 | **6.6** | Demo-ready |
| Maps / location / realtime | 5% | 10.0 | **4.1** | Prototype |
| Customer app | 15% | 10.0 | **6.3** | Demo-ready |
| Partner app (vendor + driver) | 15% | 10.0 | **5.9** | Demo-ready |
| Admin web | 10% | 10.0 | **5.5** | Demo-ready |
| Client-doc conformance | 5% | 10.0 | **5.8** | Demo-ready |
| **WEIGHTED PLATFORM SCORE** | 100% | 10.0 | **5.8 / 10** | **Pilot/demo-ready — not launch-ready** |

**Independent cross-check [O]:** the earlier client-facing gap report scored the same build **57/100**. Two different methods (client-spec coverage vs engineering/security/connection depth) converge on **≈57–58%**. That is a strong signal the number is honest.

### Readiness bands used

| Band | Range | Meaning |
|------|-------|---------|
| Production-grade | 9.0–10 | Ships to real users with normal ops |
| Launch-ready with caveats | 7.0–8.9 | Ships after a short fix list |
| **Demo / pilot-ready** | **5.0–6.9** | Convincing on stage, risky with real money/PII |
| Prototype | 3.0–4.9 | Core flow works in parts |
| Skeleton | 0–2.9 | Structure only |

**Launch readiness (real users, real money, real KYC) = 3.6/10** — because Security (5.1), Payments (1/10 in the backend rubric) and Verification integrity (driver docs broken, admins approve blind) are the launch-critical dimensions.

---

## 2. Two-level rubric, item by item

### 2.1 Backend (weight 15%) — today 6.1

| Capability | IF DONE | IF NOT | Today | Confidence |
|-----------|--------:|-------:|------:|-----------|
| Layered structure, no parallel modules | 10 | 3 | 9 | [V] |
| Zod validation on all mutations | 10 | 2 | 10 | [V] |
| Uniform error contract (no leak) | 10 | 3 | 9 | [V] |
| User auth (role lock, rotation, provider OTP) | 10 | 2 | 8 | [V] |
| Admin auth hardening | 10 | 0 | 2 | [V] |
| Upload privacy & validation depth | 10 | 0 | 2 | [V] |
| Socket authorization | 10 | 0 | 1 | [V] |
| Real payment gateway | 10 | 0 | 1 | [V] |
| Automated tests | 10 | 0 | 0.5 | [V] |
| Observability (logs/metrics/health) | 10 | 3 | 6 | [V] |

### 2.2 Database (10%) — 5.2

| Capability | IF DONE | IF NOT | Today |
|-----------|--------:|-------:|------:|
| Single booking source of truth | 10 | 3 | 3 |
| Refs resolve to registered models | 10 | 2 | 2 |
| Hot-path indexes | 10 | 4 | 9 |
| Migration discipline | 10 | 0 | 6 |
| KYC single source of truth | 10 | 3 | 3 |
| PII at rest (docs, OTP) | 10 | 2 | 4 |

### 2.3 Security (15%) — 5.1

| Capability | IF DONE | IF NOT | Today |
|-----------|--------:|-------:|------:|
| Admin identity not hardcoded + rate-limited login | 10 | 0 | 1 |
| Document URLs require auth/signature | 10 | 0 | 1 |
| Socket auth + room authorization | 10 | 0 | 2 |
| User auth (role lock, rotation, provider OTP) | 10 | 0 | 8 |
| Upload validation beyond MIME | 10 | 2 | 3 |
| CORS locked to known origins | 10 | 3 | 4 |
| Per-surface secret separation | 10 | 4 | 4 |

### 2.4 Connections (10%) — 6.6

| Capability | IF DONE | IF NOT | Today |
|-----------|--------:|-------:|------:|
| Endpoint has a consumer or is documented internal | 10 | 3 | 7 |
| No dead/mismatched client paths | 10 | 5 | 9 |
| Auth/role contract per surface | 10 | 3 | 8 |
| Admin can exercise the lifecycle it owns | 10 | 2 | 3 |
| Partner can complete every job step in-app | 10 | 2 | 6 |

### 2.5 Maps / realtime (5%) — 4.1

| Capability | IF DONE | IF NOT | Today |
|-----------|--------:|-------:|------:|
| Backend distance/fare real | 10 | 3 | 7 |
| Customer live tracking verified | 10 | 3 | 6 [X] |
| Partner in-job map + background location | 10 | 2 | 3 |
| Admin ops map | 10 | 0 | 0 |
| Cost/abuse protection | 10 | 2 | 2 |

### 2.6 Customer app (15%) — 6.3

| Capability | IF DONE | IF NOT | Today |
|-----------|--------:|-------:|------:|
| Real OTP login (flag off by default) | 10 | 0 | 9 |
| Booking flows wired to real API | 10 | 2 | 8 |
| Real payment | 10 | 0 | 1 |
| Working QR scan | 10 | 3 | 1 |
| No dead auth UI | 10 | 5 | 3 |
| Loading/empty/error states | 10 | 4 | 7 |

### 2.7 Partner app (15%) — 5.9

| Capability | IF DONE | IF NOT | Today |
|-----------|--------:|-------:|------:|
| Real data in production builds (mock off) | 10 | 0 | 1 |
| Driver KYC uploaded for real | 10 | 2 | 2 |
| Driver job cycle end-to-end | 10 | 3 | 8 |
| Approval gating + honest status screens | 10 | 3 | 9 |
| Background location during a job | 10 | 4 | 3 |
| Vendor supervision of running jobs | 10 | 3 | 4 |

### 2.8 Admin web (10%) — 5.5

| Capability | IF DONE | IF NOT | Today |
|-----------|--------:|-------:|------:|
| Approve after viewing the document | 10 | 0 | 1 |
| Audit trail visible | 10 | 0 | 1 |
| Multi-admin with enforced RBAC | 10 | 2 | 2 |
| KPIs from one booking source | 10 | 2 | 2 |
| Live ops map + realtime alerts | 10 | 0 | 1 |
| Clean architecture/scaffolding | 10 | 4 | 9 |

---

## 3. Weighted roll-up maths (for review)

```
0.15×6.1  (backend)        = 0.92
0.10×5.2  (database)       = 0.52
0.15×5.1  (security)       = 0.77
0.10×6.6  (connections)    = 0.66
0.05×4.1  (maps)           = 0.21
0.15×6.3  (customer app)   = 0.95
0.15×5.9  (partner app)    = 0.89
0.10×5.5  (admin web)      = 0.55
0.05×5.8  (client conformance) = 0.29
                             ------
                             5.76 / 10   → 5.8
```

If the ten quick wins in `70-ROADMAP-QUICK-WINS.md` land (≈2–4 days of work), the score moves to roughly:

| Area | Now | After QW-1…QW-6 only |
|------|----:|---------------------:|
| Security | 5.1 | **6.8** |
| Partner app | 5.9 | **7.6** |
| Backend | 6.1 | **6.6** |
| **Platform** | **5.8** | **6.4** |

## 4. What would move the needle most (ranked by score gain per effort)

| Rank | Action | Score gain | Effort |
|------|--------|-----------|--------|
| 1 | Preview mode off by default (QW-1) | +0.4 platform, +1.7 partner app | 1 line |
| 2 | Admin credential + rate limit (QW-2) | +0.3 platform, +1.0 security | ~10 lines |
| 3 | Private document storage (QW-3) | +0.3 platform | ~20 lines |
| 4 | Socket auth (QW-4) | +0.2 platform | ~40 lines |
| 5 | Document viewing in admin (A1/W1) | +0.2 platform, +1.3 admin | 1 screen |
| 6 | Single booking source for KPIs (A3) | +0.2 platform, +1.0 admin, +0.6 DB | 1–2 weeks |
| 7 | Real gateway (Phase 4) | +0.5 platform | 4–6 weeks |

## 5. Evidence index

Every score above traces to a row in:
`10-BACKEND-AUDIT.md` · `11-DATABASE-AUDIT.md` · `12-SECURITY-AUDIT.md` · `13-API-CONNECTION-MATRIX.md` · `14-MAPS-LOCATION-AUDIT.md` · `20/21/22` app audits · `40-BUGS-AND-GAPS.md` · `60-CLIENT-DOC-CONFORMANCE.md` · raw `_evidence/backend-route-map.txt`.
