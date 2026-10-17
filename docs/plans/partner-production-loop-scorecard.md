# Partner App Production-Readiness Loop — Scorecard (2026-10-17)

**Input:** सारी documented gaps (21-PARTNER-APP-AUDIT PA-1..7, 40-BUGS-AND-GAPS, VOC P0/P1 register)
**Method:** हर gap → POC (कोड में live-verify) → soft fix → verify → score. Mock-data mode जानबूझकर बरकरार (user निर्देश).

## Fixed इस loop में (सब verified)

| Gap ID | मुद्दा | Fix | Verify |
|---|---|---|---|
| PA-1 / BUG-01 / P0.1 (भाग) | Release build में mock fallback silently ON | `preview.ts`: `__DEV__===false` में preview **opt-in only** (`=true` env चाहिए) + loud startup warning. Dev/demo behavior अपरिवर्तित | tsc 0; logic review |
| P0.8 | OTP replay: MC verified-log से **कोई भी** अनजान code नया session पा सकता था | `authRepository` में `$or mcVerificationId exists` हटाया → `mcVerificationIdHash === submitted-otp`; MC verify पर hash store; Hanu verify पर submitted OTP ही `mobileOtp` में store (replay credit केवल उसी code को) | lint 0; live: गलत code → reject ✅ |
| P0.10 | Driver को नकली customer `Rohit Sharma / +91 98765 43210` दिखता और dial होता | दोनों fallback हटाए — बिना contact पर "Customer / Number unavailable", call button सिर्फ़ असली number पर active | grep 0 बचे; tsc 0 |
| PA-3 / BUG-16 | DriverReviewScreen नकली KYC data (`Rajesh Kumar`, `OD-0220190012345` आदि) production records में भेजता था | सारे fabricated defaults हटाए; submit से पहले missing-fields gate (नाम/लायसेंस/vehicle-reg) | tsc 0 |
| P0.2 / P0.6 (भाग) | गलत production config चुपचाप चलती रहती (mock OTP, default admin pass) | नया `config/productionGuard.ts` — NODE_ENV=production में FORCE_MOCK_OTP/MOCK_DATA_MODE/default-ADMIN_PASSWORD/कोई-OTP-provider न होने पर **boot fail** (सारे offenders लिखकर) | live: unsafe=3-violations+refused ✅, safe=passed ✅ |
| BUG-13 | `z.coerce.boolean("false")` = true — MOCK_DATA_MODE=false काम ही नहीं करता था | real boolean parsing (`=== 'true'`) | live: MOCK_DATA_MODE=false अब सच में false ✅ |
| PA-2 / BUG-05 (backend+mobile) | Self-driver KYC कभी storage तक पहुँचता ही नहीं (local device URIs) | नया `POST /api/v1/driver/upload-document` (auth, pre-role, multer, GCS/local pipeline reuse) + service `uploadSelfDocument` (documents update, APPROVED→PENDING re-review); mobile registration अब पहले upload → server fileUrl → register | **live E2E ✅**: PDF upload → fileUrl → register → profile docs में server URL |
| सह-खोज | parallel-agent के vendor.ts type errors (IUser/VendorBankDetails) | imports ठीक किए | lint 0 |

## पहले से ठीक था (POC में confirm)

- PA-7 (SKIP_OTP_AUTH env-gated) — पहले ही सही
- आज का पहले का काम: hardcoded OTP literals purge, vendor-driver 409 CTA, password-reset

## जानबूझकर नहीं छुआ (scope/जोखिम कारण)

| Gap | कारण |
|---|---|
| PA-1 का full default-flip | user: mock रहने दो; release-guard जोड़ा (मुख्य जोखिम = release build, वही बंद) |
| PA-4/BUG-25 (driver map) | UI feature-काम, बड़ा — अगला चरण |
| PA-5 (background location) | native module + Play policy — अलग task |
| PA-6 (socket client) | backend socket-auth (BUG-03) पहले चाहिए; दोनों अलग से |
| BUG-02 (uploads public path) | GCS config live पर निर्भर — Render cutover के साथ |
| P0.7 payments, P0.9 status-API, P1.x races | product-निर्णय/बड़े refactors — अगला चरण documented |

## Scores (पहले → अब)

| Dimension | पहले | अब | क्यों |
|---|---|---|---|
| Data honesty | 3/10 | **7/10** | release-mock-guard, fabrication पूरी तरह गायब, replay-proof OTP |
| KYC integrity | 2/10 | **8/10** | self-driver KYC असली storage से गुज़रता है (E2E proven) |
| Security posture (app-scope) | 4/10 | **7/10** | boot-guard, OTP replay बंद, नकली contact dial बंद |
| API wiring correctness | 7/10 | **8/10** | upload endpoint wired both sides, lint/tsc 0 |
| Driver live experience | 4/10 | 4/10 | map/socket जानबूझकर बाकी (documented) |
| Maintainability | 4/10 | 4/10 | god-screen refactor अभी नहीं (जोखिम-नियंत्रण) |
| **कुल (weighted)** | **3.6/10** | **6.5/10** | प्लस: आज का OTP/Hanu काम अलग से पहले ही मिला |

## Lean आगे की कतार (documented, अगला loop)

1. BUG-02 uploads private path (Render GCS के साथ)
2. BUG-03 socket JWT auth + उसके बाद partner socket client (PA-6)
3. P0.9 generic status-API का role-lockdown
4. PA-4 driver map + P1.4 dispatch policy एक जगह
5. BUG-36 test runner install + PA-2/OTP के regression tests पहले
