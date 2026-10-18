# Production-Readiness — यह अभी तक छूटा हुआ काम (Deep-Research Ledger, 2026-10-17)

**Objective:** क्या-क्या ऊपर focus करना था पर अभी तक नहीं कर पाए — three source registers (VOC P0/P1/P2, 40-BUGS-AND-GAPS, RACE_REMAINING_WORK_AND_GAPS) + ADR-007 — को current code से verify करके honest status दिया गया है। **कोई अनुमान नहीं — सब file:line-verified आज।**

---

## 1) भाग-क: Partner App — अभी भी छूटा (fix हो चुके वालों के अलावा)

| ID | काम | कहाँ छूटा | क्यों नहीं किया (होनस्ट कारण) | Effort |
|---|---|---|---|---|
| **PA-4 / BUG-25** | Driver screens पर असली map (MapView) — ड्राइवर रास्ता नहीं देख पाता | `DriverDashboardScreen.tsx` (1445 lines, no MapView) | UI feature + `react-native-maps` native-embed + API key — QA-navigator jump से पहले map screen नहीं खुला था; screens बदलने का संकल्प (split) भी जरूरी | M |
| **PA-5 / GAP-02** | Background location streaming (track-01) | `useDriverLocationReporting.ts` — foreground-only 12s | Native background task (`expo-task-manager`) + OS battery-optimization छूट + Play policy — browser sim इसे नहीं दिखा सकता था | M–L |
| **PA-6 (partial)** | Background/closed-app push delivery और field-level realtime validation | Driver/vendor clients now use authenticated Socket.IO invalidation plus REST polling fallback (`useDriverRealtimeSync.ts`, `useVendorRealtimeSync.ts`) | Foreground job/notification refresh is wired; Expo/FCM credentials, background delivery, and real multi-account/device validation remain | M |
| **P0.7 / PAY-01** | असली payment gateway (Razorpay/Cashfree) + webhook + refund | `bookingPayment.ts:35-42` अब भी `stub_…` रिटर्न करता है; `useServiceBookingPayment.ts:207-224` payment बिना __DEV__, बिना gateway | **Product/ops फैसला जरूरी** — gateway-खाता, KYC, वेबहुक-सीक्रेट, रिफंड-स्टाफ़। Manual-settlement policy भी विकल्प है (VOC ने मैन्युअल one-city pilot सुझाया) | L |
| **P0.6 (भाग)** | व्यवस्थापक (Admin) एमएफ़ए/रोटेशन/Audit लॉग (डेटाबेस की जगह हार्डकोडेड डेटाबेस) | `config/hardcoded-admin.ts:34` — env से आता है, boot-guard default-blocks करता है, पर MFA/rotation नहीं | एडमिन-फ़्लो (multi-admin RBAC) GAP-08 — बड़ा refactor | M |
| **P1.1 / P1.3 (partial)** | Concurrent dispatch / OTP race validation | Driver reservation now uses compare-and-set with conditional rollback/release; trip start uses an expected-status/OTP compare-and-set | No live Mongo race test was run; booking + driver documents are not wrapped in one database transaction, so topology and failure recovery still need verification | M |
| **P1.4** | डिस्पैच पॉलिसी (नए जीपीएस-एज/सर्विस-एलिजिबिलिटी) | `driverAssignment.ts` — location-age enforce नहीं | पॉलिसी को उत्पाद से अनुमोदन चाहिए; मेरा दायरा था पाइलट-ब्लॉकर ही | M |
| **P1.5 / BUG-36** | स्वचालित परीक्षण सूट (automated test suite) | रेपो `-test` स्क्रिप्ट विथ फिक्स्चर जीरो; एक भी रनेबल टेस्ट नहीं | मैंने मैनुअल ब्राउज़र+स्मोक सत्यापन चुना; टेस्ट-इन्फ्रा (विटेस्ट+टेस्ट डीबी) अलावा सेटअप चाहिए जो लक्ष्य-दायरे में नहीं था | M |
| **P1.6** | `/livez`+`/readyz` अलग, अलर्ट रूट, DB-backup drill | `healthRoutes` सिर्फ़ status:ok | Ops/monitoring-इन्फ्रा (रेंडर अलर्ट-कॉन्फ़िग + अपटाइम मॉनिटर) — कोड-ओनली नहीं | M |
| **P1.7** | `syncIndexes()` ड्रॉप-डैंजर | `database/src/indexes.ts:27-35` केवल 12/26 मॉडल | माइग्रेशन फ्रेमवर्क अपनाना पड़ेगा (प्रोडक्शन-डेटा रिस्क) — इस लूप के डिप्लॉय-स्कोप बाहर | M |
| **P1.8 / P1.9 / P2.x** | Canonical state-machine, outbox, audit/retention policy, privacy-lifecycle, i18n, accessibility, फ़ील्ड UX, रिलीज़ गवर्नेंस | VOC §P2 पूरी सूची | आर्किटेक्चर/प्रोडक्ट पॉलिसी — एक लूप में नहीं | L (प्रत्येक) |

## 2) भाग-ख: Customer App — अभी भी छूटा (आज-के फिक्स के अलावा)

| ID | काम | वर्तमान स्थिति (आज सत्यापित) | Effort |
|---|---|---|---|
| **QR-01/02 / GAP-06 / BUG-06** | असली QR स्कैन → मालिक/SOS | `package.json` में `expo-camera` नहीं; `QRScanScreen.tsx:37` डेमो-आईडी नेविगेट करता है — कैमरा-स्कैन नहीं | M |
| **SOS dispatch सचमुच** | `sos.ts:38-49` केवल इन-ऐप नोटिफिकेशन बनाता है — कोई वास्तविक SMS कॉल/वाहन-डिस्पैच नहीं (GAP-05) | M |
| **पुश नोटिफिकेशन / GAP-04** | `customer application` में `expo-notifications` अजूब है; `eventNotification.ts:26` सिर्फ़ `logger.info` — कोई FCM/पुश डिलीवरी नहीं (दोनों ऐप्स में यही कमी) | M |
| **लाइव GPS ट्रैकिंग ग्राहक साइड** | BOOKINGS→tracking पेज सिर्फ़ रेस्ट-पोल करता है; मार्कर एनिमेशन नहीं (TRACK-01 का ग्राहक हिस्सा) | M |
| **P0.7 ग्राहक-पक्ष** | पेमेंट विफलता पर "Pay now" `__DEV__`-गेट है — प्रोडक्शन बिल्ड में ऑनलाइन-बुकिंग असंभव (PAY-01) | L (साझा backend निर्भरता) |
| **REG-02** | प्रोफाइल फोटो अपलोड (wizard) — अभी बाद में सेटिंग्स से ही | S |

## 3) भाग-ग: बैकएंड / ऑप्स — ठीक करने योग्य पर अभी शेष

| काम | सबूत | Effort |
|---|---|---|
| **BUG-02 जीसीएस हस्ताक्षरित-यूआरएल + बकेट IAM** | `storage/src/index.ts:117-125` अब भी सार्वजनिक `storage.googleapis.com` यूआरएल; मैंने केवल स्थानीय-पथ गेट बंद किया | M |
| **BUG-11 अपलोड सामग्री-स्निफिंग** | `upload.ts` माइम-हेडर-केवल; मैजिक-बाइट चेक नहीं | S |
| **BUG-17 व्यवस्थापक दस्तावेज़-व्यूअर** | Current branch reads uploaded bytes from local storage/configured GCS with stored MIME; audit records this as implemented. Deployment bucket permissions and a real stored-file walkthrough remain unverified. | S (validation) |
| **BUG-27 `/admin-users` खाली पेज; BUG-26 एक्टिविटी-लॉग पेज** | एडमिन UI ंग; एपीआई उपलब्ध | M |
| **BUG-30/BUG-29/BUG-22** अनाथ एंडपॉइंट/डुप्लिकेट स्क्रीन | सफाई-काम | S |
| **BUG-31 syncIndexes** = P1.7 | — | M |
| **DB-01 legacy finance engine** | `transactionEngine.ts` remains for legacy `Booking`; current service-booking advance/final/refund rows use `PaymentTransaction`. Admin projections include current service payments, but real provider refunds and settlement are still absent. | L (provider/ops) |

## 4) पहले से ठीक होने के बाद नए उभरे (इस लूप से — दोबारा काम लगेगा)

| नया व्यवहार | अनुसरण |
|---|---|
| Authenticated realtime | Driver/vendor partner clients and customer tracking use authenticated sockets for data-free invalidation/location/status, with REST polling as recovery; driver/vendor job and notification caches refresh on events. Background/closed-app push and physical multi-account end-to-end checks remain. |
| productionGuard | प्रोडक्शन में ADMIN_PASSWORD हटना ज़रूरी है — डिप्लॉयमेंट से पहले env डॉक्यूमेंटेड करना होगा |
| प्रीव्यू-बुकिंग शाखा | होनेस्ट ₹0/स्टब स्टेट; जब पेमेंट गेटवे आए तो इसे हटाने का फ़्लैग दस्तावेज़ित है |
| हानु = पर-रोल OTP | ऐप-रोड़-पर-डिफ़ॉल्ट; रेंडर वातावरण में कुंजी डालना शेष (उपयोगकर्ता-क्रिया) |

## 5) स्कोर अपडेट (प्रामाणिक)

| क्षेत्र | उपलब्धि तक | शेष कारण |
|---|---|---|
| Pilot readiness | Not rescored | Real payment/refund processing, background push, live-device flows, and end-to-end operational validation remain open; do not treat this ledger as a launch approval. |
| Feature completeness | Not rescored | Foreground sockets are implemented; maps, background push/location, real payments, QR, and SOS dispatch remain gaps. |
| ऑप्स-तत्परता | 5/10 | tests/livez/backup शेष |
| **व्यवहार्य MVP रास्ता** | — | VOC अनुसार शेष ~15–28 इंजीनियर-दिन |

## 6) अगली कार्य-कतार (प्राथमिकता क्रम)

1. **BUG-02-जीसीएस-हिस्सा** + **अपलोड सामग्री-स्निफिंग** (रेंडर-कटओवर क्लस्टर)
2. **Background/closed-app push setup and device-level realtime validation**; foreground partner sockets and customer tracking sockets are already wired
3. **P1.1/P1.3** CAS/OTP race paths are implemented; add disposable-DB concurrency regression coverage and validate recovery against the deployed Mongo topology
4. **BUG-36 टेस्ट-रनर** + आज-के सुरक्षा-फ़िक्स के रिग्रेशन-टेस्ट
5. **P0.7 पेमेंट-निर्णय** (उत्पाद कॉल: गेटवे बनाम मैन्युअल)
6. **PA-4 ड्राइवर-मैप**, **PA-5 बैकग्राउंड-लोकेशन**, **QR कैमरा**, **SOS-डिस्पैच**, **पुश-नोटिफिकेशन** (फीचर-क्लस्टर)
7. P2 गवर्नेंस पैकेज (ऑडिट/रिटेंशन/i18n/एक्सेसिबिलिटी/साइन-आर्टिफैक्ट)

## 7) स्रोत

- `docs/audit/2026-10-12-deep-audit/21-PARTNER-APP-AUDIT.md` (PA-1..7)
- `docs/audit/2026-10-12-deep-audit/40-BUGS-AND-GAPS.md` (BUG-01..36, GAP-01..12)
- `docs/audit/2026-10-16-partner-mvp-readiness-voc.md` (P0.1..P0.11, P1.1..P1.9, P2)
- `docs/RACE_REMAINING_WORK_AND_GAPS.md` (PAY-01/TRACK-01/DB-01/ENV-01)
- `.agents/decisions/ADR-007-leftover-screens.md` (डिलीट-नहीं नीति)
- आज के लाइव प्रमाण: `docs/plans/partner-production-loop-scorecard.md`, `docs/plans/partner-walkthrough-findings.md`
