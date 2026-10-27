# OTP Provider Migration: MessageCentral → HanuOTP (Vendor/Partner first)

**Created:** 2026-10-17 · **Status:** PLAN — awaiting user go-ahead + HANU API key
**Decision (user):** MessageCentral की जगह **HanuOTP** (http://api.hanuotp.in) का उपयोग। **पहले vendor + driver roles**, customer app अबी MC पर रहेगा — बाद में flip करेंगे।
**Trigger:** MC account credits ख़त्म (responseCode 508 "insufficient credits" — Render logs 2026-10-17 09:17–09:39 UTC), recharge नहीं हो रहा।

---

## 1. Provider comparison (researched 2026-10-17)

| | MessageCentral VerifyNow (current) | HanuOTP (new, non-DLT) |
|---|---|---|
| OTP generation | MC server-side | **हम generate करते हैं** (`OTP` param में भेजते हैं) |
| Verification | MC server-side (`validateOtp`) | **हमारे DB में digit-compare** (Hanu सिर्फ़ delivery करता है) |
| खाते में store | सिर्फ़ `verificationId` | भेजा हुआ OTP (हम hash करके रखेंगे) |
| Endpoint | `POST /verification/v3/send` + auth header | `GET /sms-otp.php?number=&OTP=&apikey=&templatesid=` |
| Route | DLT-registered (RACE header) | **Non-DLT** — sender ID numeric short-code (5NNNN…) दिखेगा, RACE header नहीं |
| Price | (MC plan) | ₹100 = 335 OTP (₹0.30) · ₹3,600 = 14,400 (₹0.25) · ₹5,000 = 27,780 (₹0.18) · credits lifetime validity · min ₹100 |
| Status API key | configured on Render | **USER से चाहिए** (Developer API section से generate) |
| Acceptance | customer-tested working | **un_verified third-party** (कोई independent reviews नहीं; एक OSS project इसे fallback के रूप में list करता है) — ₹100 से शुरू करके live probe करेंगे |

### Regulatory note (TRAI/TCCCPR, non-blocking)
Non-DLT route = international/ILDO path: sender ID numeric shortcode से replace होता है, DND scrubbing bypass. DLT-registered transactional route legal रूप से साफ़ है; non-DLT OTP आम चलता है पर formally gray. **User का explicit चुनाव** — risk documented, बाद में Hanu खुद DLT registration free देता है (₹5,000+ plans) अगर कभी चाहें।

---

## 2. Current architecture (verified, file:line)

```
mobile app → POST /api/v1/auth/send-otp {mobileNumber, role}
           → authRoutes.ts:16 (otpRateLimiter + authRateLimiter)
           → auth.ts:123 AuthService.sendOtp (role guards, driver-credential 409)
           → otp.ts:45 OtpService.sendOtp(mobileNumber)   ← role यहाँ आगे pass नहीं होता
                ├─ useMc (MC configured & !FORCE_MOCK_OTP) → mcSendOtp() → OtpLog{mcVerificationId}
                └─ else dev → generateOtp() → OtpLog{mobileOtp} + devOtp in response
POST /verify-otp → otp.ts:99 verifyOtp(mobileNumber, otp)
                ├─ MC path: mcValidateOtp (server-side)
                └─ local path: digit-compare log.mobileOtp (+ MOCK_UNIVERSAL_OTP non-prod)
```

Key facts:
- **Single shared OTP service** for customer + vendor + driver apps. Role-based routing ज़रूरी है क्योंकि user चाहता है customer अभी MC पर रहे।
- `generateOtp()` पहले से है (`utils/src/otp.ts` — crypto.randomInt, 6-digit) — reuse, no new crypto.
- OtpLog पहले से `mobileOtp` (dev में), `mobileAttempts`, `mobileOtpExpiry`, `mcVerificationId` fields रखता है।
- SMS सिर्फ़ OTP के लिए है — कोई और `sendSms` usage repo में नहीं (grep-verified)। admin push/SMS comments non-blocking.
- Mobile apps **zero change** — response shape same रहेगा।

## 3. Target design (role-routed provider)

```
OtpService.sendOtp(mobileNumber, role):
  provider = pick(mobileNumber, role):
    HANU_API_KEY set && role ∈ HANU_OTP_ROLES  → 'hanu'
    MC configured && !FORCE_MOCK_OTP           → 'messagecentral'
    else                                        → 'local-dev' (अपरिवर्तित)
  provider === 'hanu':
    otp = generateOtp(); store OtpLog{otpHash, expiry, provider:'hanu'}
    hanuSendOtp(mobile, otp)   // GET api.hanuotp.in/sms-otp.php (response logged, failures → 502)
    NO devOtp in response (prod semantics)
  provider === 'messagecentral': (अपरिवर्तित today behavior)
  provider === 'local-dev': (अपरिवर्तित)

OtpService.verifyOtp(mobileNumber, otp):
  log.provider:
    'messagecentral' → mcValidateOtp (अपरिवर्तित)
    'hanu' | 'local' → digit-compare against stored hash (attempts++ गलत पर; existing local path है)
```

Legend: नया कोड केवल `pick()` + hanu delivery + routing switches है। **कोई नया endpoint, कोई नया model नहीं।**

## 4. Exact file changes

| File | Change |
|---|---|
| `backend/src/utils/src/hanuSms.ts` **(नई फ़ाइल)** | `hanuSendOtp(to, otp)` — `GET {HANU_BASE_URL}/sms-otp.php?number=<10digit>&OTP=<otp>&apikey=<key>&templatesid=<HANU_TEMPLATE_ID|default>`; timeout 10s; response raw JSON/text log; non-2xx/parse-fail → `AppError(OTP_SEND_FAILED_USER_MESSAGE, 502)`; `isHanuConfigured()` |
| `backend/src/utils/src/sms.ts` | कोई व्यवहार परिवर्तन नहीं (MC untouched — customer के लिए ज़िंदा रहेगा) |
| `backend/src/services/src/otp.ts` | provider routing (ऊपर §3); `sendOtp(mobileNumber, role?)`; hanu path में OTP को **hash** करके store (sha256(otp + PEPPER)), verify में compare; attempts/expiry/invalidate अपरिवर्तित |
| `backend/src/models/src/otpLog.ts` | `provider?: 'messagecentral' \| 'hanu' \| 'local'`, `otpHash?: string` (दोनों optional — non-breaking schema) |
| `backend/src/services/src/auth.ts` | `otpService.sendOtp(mobileNumber, role)` (3 call sites) — verifyOtp में provider self-routing है |
| `backend/src/config/env.ts` | `HANU_API_KEY?`, `HANU_BASE_URL (default https://api.hanuotp.in)`, `HANU_TEMPLATE_ID (default 'default')`, `HANU_OTP_ROLES (default 'vendor,driver')`, `OTP_PEPPER?` (hash salt; fallback = MC_AUTH_TOKEN+slug) |
| `.env.example` + `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md` | नए env vars + cutover notes |
| **Mobile (दोनों apps)** | **कोई बदलाव नहीं** |

### Dev/mock behavior — अपरिवर्तित
`MOCK_DATA_MODE/MOCK_UNIVERSAL_OTP` non-prod paths waise hi rahenge; `devOtp` response में केवल local-dev mode (जब कोई provider configured ही नहीं)। Hanu path prod-strict है।

## 5. Execution plan (जब आप green दें)

**Phase 0 — आपसे (blocking):**
1. HanuOTP account (hanuotp.in) → Developer API section → **API key** मुझे दें
2. ₹100 recharge (335 OTP — testing के लिए काफ़ी; baad में ₹3,600 tier ₹0.25/OTP)

**Phase 1 — code (मैं, ~1 h):** §4 के files → `tsc --noEmit` + `npm run lint` gates।

**Phase 2 — live probe (मैं):** local backend + real key → `hanuSendOtp` को आपके number पर → SMS आए? → **response shape document** (docs में actual JSON sample) → verify round-trip। अगर response shape अजीब है तो parser fix (यही कारण probe पहले है)।

**Phase 3 — vendor E2E (Render, मैं):** Render env update (MCP `update_environment_variables` — आपकी मंज़ूरी से): `HANU_API_KEY`, `HANU_OTP_ROLES='vendor,driver'` → deploy → **वही 12-test suite** जो MC पर चलाया था, अब Hanu पर:
   - vendor OTP login (SMS आपके फोन पर — आप code बताएँ)
   - driver OTP login + resend-invalidate + wrong-OTP + expiry
   - **customer role अबी MC पर confirm** (same number, customer-role → MC path)
   - फिर Login ID/password E2E (SMS-free): vendor creates driver → driver-login → reset → re-login

**Phase 4 — customer cutover (बाद में, अलग से):** `HANU_OTP_ROLES` में `customer` जोड़ना = एक-line env flip; MC तब तक fallback ज़िंदा रहेगा।

**Rollback (किसी भी समय):** env से role हटाओ या `HANU_API_KEY` खाली — तुरंत पहले वाले provider पर। OtpLog.provider routing से पुराने pending OTPs भी सही verify होते रहेंगे।

## 6. जोखिम और स्पष्ट सीमाएँ (खुली बात)

| जोखिम | स्तर | Mitigation |
|---|---|---|
| HanuOTP अप्रमाणित प्रदाता (कोई रिव्यू नहीं) | मध्यम | ₹100 से शुरू; Phase 2 probe pass किए बिना Render पर नहीं जाएँगे; MC code ज़िंदा = instant rollback |
| Non-DLT sender = numeric shortcode (RACE header नहीं दिखेगा) | स्वीकृत (user ने चुना) | UI copy में यहीं है ("RACE" का जिक्र SMS template में कर सकते हैं — `templatesid=default` custom template से बदल सकते हैं) |
| OTP अब हमारे DB में (hash) | निम्न | sha256+pepper, 5-min expiry, attempts cap, resend-invalidate — सब मौजूदा mechanisms |
| GET URL में OTP (server logs में दिख सकता है) | निम्न | Hanu का ही design है (GET-only API); हमारे logger में OTP masked करेंगे |
| MC credits खत्म = customer app भी अटका है **अभी** | 🔴 active | यह migration vendor-first है; **customer के लिए MC recharge फिर भी चाहिए** या Phase 4 जल्दी करना होगा — user तय करेगा |

## 7. सफलता के मानक (gates)

1. `tsc --noEmit` backend 0; `npm run lint` 0
2. Phase-2 probe: SMS delivered + verify round-trip green locally
3. Phase-3: पूरा vendor/driver OTP flow + credential login पूरा हरा (12-test suite Hanu पर)
4. Customer role MC पर ही रहे (regression check)
5. Docs अपडेट (runbook + यह फ़ाइल actuals के साथ)
