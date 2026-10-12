# 70 — Quick Wins, Do-Not-Do List & Sequencing

Everything here is a **proposal**. Nothing was implemented.

---

## 1. Quick wins (high impact, low effort)

| # | Change | Effort | Impact | Touch point |
|---|--------|--------|--------|-------------|
| QW-1 | Make preview/mock mode **opt-in**: `process.env.EXPO_PUBLIC_UI_PREVIEW_MODE === 'true'` (partner app) | 1 line | 🔴 Removes fabricated jobs/earnings from any build where the flag is not set | `mobile application/src/constants/preview.ts:6-7` |
| QW-2 | Remove the `ADMIN_PASSWORD` default; `env.ts` must fail when unset; add `authRateLimiter` to `POST /admin/auth/login` | ~10 lines | 🔴 Closes the platform-takeover path | `config/env.ts:34`, `controller/src/admin/adminAuthRoutes.ts:15` |
| QW-3 | Stop serving `/uploads` publicly; serve documents through the existing admin document routes (or signed URLs) | ~20 lines | 🔴 KYC confidentiality | `app.ts:32`, `storage/src/index.ts` |
| QW-4 | Add `io.use()` JWT auth + verify room ownership before `join` | ~40 lines | 🔴 Stops live-tracking leak | `services/src/socket.ts` |
| QW-5 | Set `CORS_ORIGIN` explicitly per environment; refuse `*` in production | config | 🟠 Removes reflected-origin exposure | `config/env.ts:24` |
| QW-6 | Reject `tokenType:'admin'` in the user `authMiddleware` | 3 lines | 🟠 Token confusion | `middleware/src/auth.ts` |
| QW-7 | Show "—" instead of hardcoded fallbacks in admin detail views | few lines | 🟡 Trust | `components/vendors/vendor-detail-content.tsx:226` |
| QW-8 | Delete or wire the 4 customer PIN/password screens | S | 🟡 Removes dead UI from review builds | `customer application/src/screens/auth/*` |
| QW-9 | Add an admin Activity Log page (endpoint already exists) | ~1 page | 🟠 Ops/audit value with near-zero backend work | `GET /api/v1/admin/activity-logs` |
| QW-10 | Cache Distance Matrix responses + require auth on `/fare/*` | ~30 lines | 🟠 Cost/quota abuse | `services/src/googleMaps.ts`, `fareRoutes.ts` |
| QW-11 | Make `MOCK_DATA_MODE` parse booleans explicitly (`"true"`) | 1 line | 🟠 Prevents the `"false" === true` trap | `config/env.ts:37` |
| QW-12 | Gate `ServiceComingSoon`/`Placeholder` screens behind a build flag | S | 🟡 Preview honesty | `customer application/src/navigation/AppNavigator.tsx:371,429` |

**If only four things get done:** QW-1, QW-2, QW-3, QW-4.

## 2. Do NOT do (yet)

| Item | Why not now |
|------|-------------|
| Build more admin **charts/reports** | Their data source is wrong (three collections). Fix the source first — polish is wasted otherwise |
| Build more **settings** fields | The backend stores one settings doc; unused fields create drift |
| Extend the **settings/profile** admin pages | The admin identity is env-based; profile editing is meaningless until real admin accounts exist |
| Add **more** mock/preview modes | 40 fallback sites already mask failures; more hides more |
| Start **i18n (Odia)** | Client marked it "later"; it is a large sweep across 90+ screens |
| Build **vendor subscriptions/commission tiers** | Requires the payment/commission engine to exist first |
| Rebuild the **QR feature** before fixing the camera gap decision | Decide first: real scan vs SOS-only entry point |
| Rewrite the **customer payment screens** | Gateway choice must come first (razorpay/stripe/phonepe); the UI is already shaped for it |
| Split the god-screens purely for aesthetics | Do it while touching them for a functional reason — not as a standalone refactor sprint |

## 3. Sequencing proposal (dependency-aware)

### Phase 0 — Integrity (days)
QW-1 → QW-2 → QW-3 → QW-4 → QW-5 → QW-6. *Exit test: partner app shows real errors with the API down; documents require auth; sockets reject anonymous clients; admin login is rate-limited and password-free by default.*

### Phase 1 — Make verification real (1–2 weeks)
- Driver document upload path for self-registration (BUG-05) + remove fabricated defaults (BUG-16).
- Admin document **viewing** in vendor/driver review (BUG-17) with signed URLs.
- Activity log page (QW-9).

*Exit test: a real driver can submit KYC end-to-end and an admin can approve after seeing the document.*

### Phase 2 — Data truth (1–2 weeks)
- Choose the booking source of truth; migrate/limit legacy `Booking`; fix admin KPI queries and label demo rows (BUG-07/09).
- Fix refs (`ref:'User'` or real models) (BUG-08).
- Add the regression tests from `50-TEST-CASES.md §Cases that should be automated first`.

*Exit test: dashboard totals reconcile with `towingbookings + driverbookings` only.*

### Phase 3 — Live operations (2–4 weeks)
- Admin live ops map (open bookings + driver locations), reusing the existing socket events.
- Partner job map + background location during an active job.
- Vendor active-jobs supervision view.

*Exit test: ops can watch a job from created → completed without leaving the admin.*

### Phase 4 — Money (4+ weeks, vendor-dependent)
- Real gateway (advance + final), refunds, commissions, vendor payout ledger, invoices.
- Admin finance from real transactions only.

*Exit test: one real payment end-to-end with a reconcilable ledger entry.*

### Phase 5 — Product depth
Roadside detail/tracking, driver hire types as distinct flows, vendor plans, push notifications, QR decision, i18n.

## 4. Risk register for the plan

| Risk | Why it matters | Mitigation |
|------|----------------|-----------|
| Mock mode left on in a build | Users see fake jobs; trust destroyed in one demo | QW-1 + a CI/env assertion in `app.config.js` |
| Document leak discovered after real KYC uploads | Legal exposure | QW-3 before onboarding real drivers |
| Payments started before data truth | Money recorded against wrong/duplicate bookings | Phase 2 before Phase 4 |
| Refactors without tests | Regressions invisible (no test net) | Automate the 6 high-value flows first |
| Driver app store review | Background location + camera permissions need justification text | Prepare store metadata before Phase 3 |

## 5. Effort summary (indicative, one focused team)

| Phase | Scope | Effort |
|-------|-------|--------|
| 0 | Integrity fixes | 2–4 days |
| 1 | Verification real | 1–2 weeks |
| 2 | Data truth + tests | 1–2 weeks |
| 3 | Live operations | 2–4 weeks |
| 4 | Payments & finance | 4–6 weeks |
| 5 | Product depth | ongoing |

**Verdict:** the platform is not "almost launch" — it is **Phase 0 + Phase 1 + Phase 4** away from a defensible first release, with Phase 2 required before Phase 4's numbers can be trusted.
