# 60 — Client Document vs Build (independently re-verified)

This document does **not** repeat `docs/client/CLIENT_DOC_VS_BUILD.md`. It **re-verifies** it against today's code and records where that report is now **outdated**, where it is confirmed, and what it misses.

Reference: `clintdoc.md` (client, 238 lines), `clint project doc .md` (517 lines), previous report `docs/client/CLIENT_DOC_VS_BUILD.md` (10 modules, overall **57/100**).

---

## 1. Module-level re-score (2026-10-12) [V]

| # | Client module | Previous | **Now** | Change | Why |
|---|---------------|---------:|--------:|--------|-----|
| 1 | Customer App Registration | 78 | **78** | = | OTP is now **real by default** (skip flag off) — small plus; PIN/password still dead UI (BUG-21), profile photo still URL-only |
| 2 | Customer Home Services | 72 | **76** | ↑ | `towingMode` (`instant/scheduled/emergency`) is now a **validated, stored** booking attribute (`towingBookingValidator.ts:17-25`, sent from `serviceBookingPayload.ts:66-70`) and driver bookings store `driverServiceType` (`part_time/full_time/outstation/night`) |
| 3 | Towing Company (Vendor) Registration | 69 | **70** | = | Company KYC + admin approval real; bank/MSME/agreement still thin; document **privacy** newly flagged (BUG-02) |
| 4 | Tow Truck Driver Registration | 38 | **36** | ↓ | Documents are now **included** in the payload but as **local device URIs** → still unusable (`DriverReviewScreen.tsx:86-90`), and the form now **fabricates** missing KYC fields (BUG-16) |
| 5 | Full-Time Driver Registration | 28 | **26** | ↓ | No separate flow, **and** the enquiry screen has **no API call and no navigation** — a literal dead end (`DriverEnquiryScreen.tsx`) |
| 6 | Part-Time Driver Registration | 28 | **32** | ↑ | `driverServiceType:'part_time'` is validated/stored by the API even though the UI does not differentiate the flow |
| 7 | Subscription Module | 52 | **54** | ↑ | Customer plans + subscribe **and cancel** are wired (`subscriptionApi.ts:85`); paying is still the stub; vendor plans still absent |
| 8 | QR Emergency Vehicle Module | 42 | **30** | ↓ | Stronger negative evidence: **no camera library is installed** in the customer app, so scanning cannot work (BUG-06); the backend QR API (`/api/v1/qr/*`) is additionally **unauthenticated and unused by every client** (BUG-19) |
| 9 | Admin Panel | 58 | **55** | ↓ | Document **viewing** endpoints are unused (approve blind), no audit-log UI, no map, KPIs sum three collections (BUG-07/17/26) |
| 10 | Future Expansion Modules | Later | Later | = | Still correctly deferred |

**Independently computed overall (launch spec): ~57/100** — the gains in modules 2/6/7 are cancelled by the sharper findings in 4/5/8/9. The previous report's headline was accurate; its details are now partly stale.

## 2. Previous report's claims — re-verified one by one [V]

| Claim in `CLIENT_DOC_VS_BUILD.md` | Verdict today | Evidence |
|----------------------------------|---------------|----------|
| "OTP can be skipped in the apps (`SKIP_OTP_AUTH`)" / "OTP skip is `true` in both apps" | ❌ **Outdated** | Both apps now read `process.env.EXPO_PUBLIC_SKIP_OTP_AUTH === 'true'` → default **false** (`MobileNumberScreen.tsx:61`, `PartnerLoginScreen.tsx:54`) |
| "Driver uploads documents on screen, then submit **does not send them**" | ⚠️ **Partly outdated** | Documents ARE in the register payload now, but each `url` is a local `file://…` URI → effectively unusable; **no upload endpoint exists for self-drivers** (`DriverReviewScreen.tsx:86-90`, only `/vendor/drivers/:id/upload-document`) |
| "Instant vs emergency towing … mostly UI, not stored as real products" | ❌ **Outdated** | `towingMode` enum is validated + stored, and the customer app sends it |
| "Four driver hire types are three products / type not saved" | ⚠️ **Partly outdated** | `driverServiceType` enum is validated + stored; the four *flows* are still not differentiated |
| "Full-time driver hire on customer side = enquiry only" | ✅ **Confirmed, worse** | `DriverEnquiryScreen` makes **no API call** at all — not even an enquiry record |
| "QR 'scan' does not use the camera" | ✅ **Confirmed, stronger** | No camera package installed anywhere in the app |
| "Payments, refunds, commissions — stub" | ✅ **Confirmed** | `bookingPayment.ts:35-42` returns `stub_*` |
| "Live tracking / admin live map — scaffold" | ✅ **Confirmed (customer side partial)** | Customer app has socket client + `LiveTripMap`; admin has **no map library at all**; partner app has no map on job screens |
| "Admin reports look at the wrong bookings" | ✅ **Confirmed with mechanism** | Dashboard/bookings sum legacy + towing + driver collections (`adminDashboard.ts:79-81,186-188`) |
| "Vendor plans in partner app missing" | ✅ **Confirmed** | No vendor subscription surface; admin subscription page is read-only |
| "Real KYC save" still needed | ✅ **Confirmed** | BUG-02 (public docs) + BUG-05 (driver docs) + BUG-17 (admins can't view) |
| "Admin can approve/reject; document review" | ⚠️ **Half-true** | PATCH review is wired; **GET view is not** — approval happens without seeing the file |

## 3. What the previous report did **not** cover (new in this audit)

| Area | New evidence | Impact on launch decision |
|------|--------------|---------------------------|
| Partner app mock data **on by default** (40 sites) | `constants/preview.ts:6-7` + service greps | A production APK can fake a working app — the highest-value single fix |
| Socket.IO has no auth; booking rooms are open | `services/src/socket.ts:17-36` | Live location/PII leak |
| Admin credential hardcoded with a default + no login rate limit | `hardcoded-admin.ts`, `adminRoutes` | Platform takeover risk |
| Uploaded KYC documents are publicly readable | `app.ts:32`, `storage/src/index.ts:68-72` | Legal/compliance exposure (DPDP) |
| `ref: 'Vendor'/'Driver'` models do not exist | `towingBooking.ts:122-123` etc. | Any new join crashes; schema lies |
| Zero automated tests; audit script is the only net | repo-wide grep | Every future change is manual regression |
| Admin wired to ~81% of its own API (46 of 57 paths; corrected from 52% — see `02-§6`) | orphan list | Verification/ops workflows incomplete: no document viewer, no audit log, no admin users, no plan edit/assign |
| Google fare endpoints public + uncached | `fareRoutes.ts:9-10`, `googleMaps.ts` | Cost/quota abuse |

## 4. Client-doc "journeys" re-scored

| Client journey | Previous | Now | Note |
|----------------|---------:|----:|------|
| Customer OTP → profile → vehicle → QR | Partial | **Partial (better)** | OTP now real; QR scan still impossible |
| Book towing → partner gets job → admin sees it | Partial | **Partial (better)** | `towingMode` stored; admin still mixes collections |
| Book driver (4 types) | Partial | **Partial (better)** | `driverServiceType` stored; full-time enquiry is a dead screen |
| Roadside 4 jobs | Mostly yes | **Mostly yes** | Still no per-booking detail/tracking endpoint |
| Vendor KYC → admin approve → jobs | Partial | **Partial (worse on privacy)** | Documents public + reviewers can't view them |
| QR scan → call owner / SOS / towing | No | **No** | Confirmed with stronger evidence |
| Pay fare / commission / refund | Stub | **Stub** | Unchanged |
| Live map for ops | No | **No** | Confirmed (no map lib in admin) |

## 5. Honest client-facing line for this audit

> The platform's **shell is complete and the engineering underneath is solid** — the API is layered, validated and gated, and the driver job cycle is real.
> What still separates this from a live product is a short list of **integrity issues** (mock data on by default, publicly readable KYC documents, unauthenticated live-tracking rooms, a hardcoded admin credential) plus the **hard products** the client asked for: payments, real QR/SOS, driver document upload, and admin ops visibility.
> The first four are days of work; the rest are the existing project's remaining phases.

## 6. Conformance scoring

| Dimension | Weight | Score |
|-----------|-------:|------:|
| Client spec implemented end-to-end (honest) | 40% | 5.8/10 (cross-check: 57/100 report) |
| Previous report accuracy after re-verification | 20% | 8/10 (2 stale claims, 1 half-stale) |
| Coverage of non-functional client expectations (security, data, ops) | 20% | 3/10 |
| Traceability (can we map every client point to code?) | 10% | 8/10 (route map + this audit make it possible) |
| Documentation quality across all three surfaces | 10% | 7/10 (three client docs + this set; backend `STRUCTURE.md` exists) |
| **Weighted** | 100% | **5.8/10** |
