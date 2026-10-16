# RACE Partner ऐप — MVP Readiness और समाधान रिपोर्ट

**Audit snapshot:** 16 अक्टूबर 2026
**Repository:** [`teamwebstarts-cmyk/RACE`](https://github.com/teamwebstarts-cmyk/RACE)
**जाँची गई branch/commit:** `3.5.0-new-driver-screeens` / `33a524e` (14 अक्टूबर 2026)
**दायरा:** Partner app, संबंधित backend/API, booking/dispatch, OTP, uploads, deployment config और MVP संचालन प्रवाह।
**निर्णय:** **अभी वास्तविक ग्राहकों के लिए MVP launch पर NO-GO; सीमित internal demo/staging के लिए GO, यदि mock-mode को स्पष्ट रूप से demo तक सीमित रखें।**

## यह रिपोर्ट क्या कहती है

कोड में ग्राहक/partner booking, vendor द्वारा driver चुनना, driver app, trip status और OTP जैसी MVP की मुख्य इमारत मौजूद है। लेकिन इस समय release को सुरक्षित और भरोसेमंद कहने के लिए कुछ blocker हैं: preview login/OTP defaults, OTP का log/response में निकलना, बिना identity जाँचे live socket rooms join होना और booking OTP का broadcast, local upload fallback से documents static route पर serve होना, तथा driver/vehicle reservation और trip state में race conditions। इनका मतलब यह नहीं कि हर production environment में exploit या incident हुआ है; इसका मतलब है कि repository के मौजूदा व्यवहार पर भरोसा करके live pilot खोलना उचित नहीं।

रिपोर्ट हर gap के लिए observable evidence, exact implementation direction, acceptance tests, और win/loss trade-off देती है। इसे code review और launch checklist की तरह पढ़ें। यह source code में कोई बदलाव नहीं करती।

## निर्णय और confidence

- **Internal demo:** **GO, सीमित उपयोग के लिए।** वर्तमान Codespace partner Expo server port 8082 पर चल रहा था और ignored local `mobile application/.env` में preview तथा permissive UI test mode `true` थे। Demo accounts/test data के लिए यह ठीक है; इसे customer build या shared public preview न मानें।
- **Closed MVP pilot:** **अभी NO-GO।** नीचे दिए P0 security, release configuration और booking consistency gates पहले pass होने चाहिए। इसके बाद एक शहर/छोटे service area में सीमित pilot चलाया जा सकता है।
- **Broad public launch:** **इस audit के आधार पर NO-GO।** Payment/settlement, support operations, service reliability, privacy controls और measured field performance को अभी पूर्ण रूप से प्रमाणित नहीं किया गया।
- **Confidence:** code-path findings पर मध्यम-उच्च; live data, cloud account config और field behavior पर सीमित।

### VOC का अर्थ और सीमा

यहाँ **VOC (Voice of Customer)** का अर्थ Voice of Customer है। इस रिपोर्ट में VOC को ग्राहक, vendor, driver और ops की **जाँचने योग्य जरूरतों/परिकल्पनाओं** और interview plan के रूप में शामिल किया गया है। वास्तविक customers/drivers के interview या survey इस audit में नहीं हुए; इसलिए उनकी बात को verified feedback नहीं कहा गया है।

## Audit boundary और तरीके

यह review latest उपलब्ध Codespace checkout/branch और उसके source/configuration पर static inspection, repository scripts/typechecks, तथा app के public health endpoint के सीमित read-only check पर आधारित है। Production database में query/write, cloud console/EAS account inspection, secrets की disclosure, deployment, या user data की inspection नहीं की गई। कोई source file modify नहीं की गई।

जाँची गई branch audit के समय `origin` के साथ synced थी। Checkout में दूसरे ongoing work के uncommitted changes मौजूद थे; वे इस review से पहले से थे और सुरक्षित रखे गए। इसलिए किसी live working tree को साफ़ baseline मानकर बदलाव न करें। `mobile application/.env` git-ignored है: Codespace में उसका वर्तमान preview behavior देखा गया, पर वह clean clone या EAS build में स्वतः मौजूद होने का प्रमाण नहीं है। Remote EAS environments/profile values अज्ञात हैं।

### क्या चलाकर/पढ़कर देखा गया

- Backend और mobile TypeScript typechecks pass हुए। ये type correctness का सीमित संकेत हैं, security या end-to-end correctness का प्रमाण नहीं।
- Backend में meaningful automated test suite नहीं मिला; `backend/__tests__` में केवल placeholder है और backend package में test script नहीं है। Mobile में preview/UI-mode के scripts हैं, पर इस review में end-to-end device workflow प्रमाणित नहीं हुआ।
- `https://race-api-w361.onrender.com/health` ने HTTP 200 और `status: ok` लौटाया। यह endpoint dependency readiness, database write/read, SMS, sockets या booking flow सिद्ध नहीं करता।
- Environment defaults/config और code paths का निरीक्षण किया। Secret values रिपोर्ट में प्रकाशित नहीं हैं।

### महत्त्व और प्राथमिकता

- **P0 — Pilot blocker:** गलत identity/access, OTP bypass/leak, private identity documents का exposure, या booking/driver ownership में गंभीर integrity जोखिम। Pilot खोलने से पहले बंद करें।
- **P1 — Pilot readiness:** खराब signal, retries, stale state, monitoring, support या recovery में ऐसी कमी जो सीमित pilot में भरोसे/काम को तोड़ सकती है। Pilot से पहले implement/test करें या स्पष्ट manual fallback के साथ सीमित करें।
- **P2 — Scale/quality:** शुरुआती छोटे pilot को रोकना जरूरी नहीं, लेकिन विस्तार से पहले व्यवस्थित करें।

## MVP को किस सीमित promise के साथ शुरू करें

पहला MVP एक service area, सीमित service types और एक नियंत्रित operations team तक रखें। ग्राहक को request स्वीकार होने, जिम्मेदार vendor/driver, ETA/status और मदद पाने का भरोसेमंद रास्ता दें। Vendor को साफ़ accept/reject और assignment दें। Driver को task, address/contact, arrival/completion के स्पष्ट कदम और खराब network का recovery path दें। Ops को stuck job, document review और dispute हल करने का dashboard/process दें।

शुरुआती pilot में ये बातें जानबूझकर सीमित रखें:

- **एक शहर/छोटा क्षेत्र:** उपलब्ध vendor/driver capacity के बाहर request रोकें या waitlist करें; झूठा “बुक हो गया” न दिखाएँ। लाभ: सेवा गुणवत्ता और response समय मापना आसान। लागत: coverage छोटा और शुरुआती growth धीमी।
- **Manual onboarding/KYC review:** दस्तावेज़/vehicle approval ops द्वारा verify हो; automated approval का दावा न करें। लाभ: शुरुआती गलत profile कम। लागत: ops समय और approval delay।
- **Manual payment/settlement reconciliation, जहाँ product/legal setup अधूरा हो:** app में payment complete न दिखाएँ जब तक वास्तविक provider confirmation न हो। लाभ: fake-paid स्थिति और reconciliation mismatch से बचाव। लागत: launch में manual काम, cash/UPI policy और customer communication स्पष्ट करनी होगी।
- **GPS को सुविधा मानें, निर्णायक प्रमाण नहीं:** fresh location और accuracy उपयोग करें; पुराना GPS हो तो vendor dispatch/driver call fallback। लाभ: stale coordinates पर गलत dispatch कम। लागत: कुछ manual verification और कभी slow assignment।
- **हर state change का audit trail और support contact:** user को status दिखाएँ; ops को actor/time/reason दिखाएँ। लाभ: dispute का उत्तर। लागत: शुरुआती schema/logging काम।

MVP का win केवल app store पर चलना नहीं है। असली win है: हर request या तो सही owner को assign हो, या स्पष्ट रूप से reject/cancel हो; कोई दो jobs एक ही unavailable resource को न दें; trip proof सुरक्षित रहे; और user को stuck होने पर मदद मिले।

## P0 — Pilot खोलने से पहले बंद करें

### P0.1 — Partner app का preview/permissive mode release में गलती से सक्रिय हो सकता है

**सबूत:** `mobile application/src/constants/preview.ts` में `UI_PREVIEW_MODE` और permissive preview behavior defaults `true` हैं जब तक environment variable ठीक से `false` न हो। `uiPreviewMode.ts` mock tokens देता है; `authService.ts` API error पर preview में mock OTP/token लौटा सकता है; OTP screen catch path preview/permissive mode में mock session या fixed codes (`123456` / `000000`) स्वीकार करता है। `PartnerLoginScreen.tsx` preview UI दिखाता है। Codespace की git-ignored `.env` ने दोनों preview flags `true` रखे और port 8082 पर Expo server चल रहा था। `app.config.js` API URL की fallback value live Render API है। `eas.json` का `production` नाम वाला profile APK बनाता है और explicit EAS `environment` सेट नहीं करता। EAS cloud environment values इस audit में सत्यापित नहीं हुए।

**जोखिम:** Demo login या API failure fallback गलती से वास्तविक build में रहे तो user identity असली नहीं रहती। Preview build live API को hit करे तो demo traffic production data को छू सकता है। केवल profile का नाम `production` होना सुरक्षित environment की गारंटी नहीं।

**ठोस समाधान:**

1. Preview UI और mock auth को केवल explicit `EXPO_PUBLIC_UI_PREVIEW_MODE=true` + अलग demo app variant/identifier में चालू करें; default `false` रखें। Release config में app startup/build step पर hard assertion लगाएँ: `NODE_ENV=production` या `APP_VARIANT=production` में preview/permissive/mock flags true हों तो build fail हो।
2. Authentication service में network/API error को mock login में न बदलें। Demo login अलग mock adapter/app target में रहे; production target में कोई fixed OTP या static token स्वीकार न हो।
3. EAS profiles में `development`, `preview`, `production` को explicit `environment` दें। Preview को staging API + internal distribution दें; Play release को production env + store distribution/AAB दें। CI में built JS/config में mock strings/flags की release scan करें।
4. `app.config.js` में production API URL को explicit required env बनाएं। Missing `EXPO_PUBLIC_API_URL` पर production build fail हो; dev/preview को production API fallback न मिले। URL `EXPO_PUBLIC_` में होने के कारण public है—इसमें secret कभी न रखें।
5. अलग application IDs/package names से demo/staging/production install अलग रखें; release artifact पर variant, API host और commit SHA दिखाने वाला build manifest रखें।

**स्वीकृति जाँच:** production bundle में preview mode false; API error पर login fail-closed; `123456`/`000000` से auth असफल; missing API URL और mock=true के साथ production build fail; staging build production database/API पर request न करे। इन checks को CI में हर release पर चलाएँ।

**लाभ:** Demo और live customer identity अलग; accidental production leak की संभावना कम। **लागत:** तीन build environments, CI checks और release discipline बनाए रखना।

### P0.2 — OTP development code/log production-capable backend path में लौट सकता है

**सबूत:** `backend/src/services/src/otp.ts` में MessageCentral केवल configured होने पर उपयोग होता है; अन्यथा (या `FORCE_MOCK_OTP=true`) OTP database में रखा जाता है, server log में लिखा जाता है और `devOtp` response में लौटाया जाता है। इस fallback के सामने स्पष्ट `NODE_ENV !== production` hard stop नहीं है। Production resend/verify limits केवल `NODE_ENV` ठीक `production` होने पर लागू होते हैं; schema default `development` है। Universal test code non-production तक सीमित है, लेकिन generated `devOtp` fallback उससे अलग मुद्दा है।

**जोखिम:** गलत env/secret/configuration में OTP logs/API response तक पहुँच सकता है और login control टूट सकता है। Default development env production deployment में रह गया तो rate limits/controls भी बदल सकते हैं।

**ठोस समाधान:**

1. Backend boot-time config validation: production में `NODE_ENV=production`, real OTP provider credentials, `FORCE_MOCK_OTP=false`; किसी कमी पर process start fail। Production `sendOtp` response में केवल opaque request/reference ID, `devOtp` कभी नहीं।
2. Mock provider को development-only module/interface में रखें; production import/config में fail closed। OTP, auth header, phone, full token log न करें; structured log में request ID और provider status रखें।
3. Short expiry (उदाहरण 5 मिनट—product/security choice), single use, per-phone + per-IP/device resend/verify throttles, cooldown, attempt lock/risk monitoring जोड़ें। OTP को plaintext न रखें; कम entropy OTP के लिए सिर्फ hash पर्याप्त नहीं—provider verification reference या server-side secret से keyed HMAC उपयोग करें। Success पर consume करें। New resend पुराने code को invalidate करे और failed-attempt count reset न करे।
4. Provider outage पर OTP bypass नहीं; clear retry/error और ops alert। Low-risk pilot में SMS स्वीकार कर सकते हैं, पर SMS/PSTN SIM-swap/interception risk वाला factor है; high-risk action के लिए stronger auth/fallback roadmap रखें।

**स्वीकृति जाँच:** production env में provider missing/force mock true से boot fail; API body/log में OTP न मिले; expiry, replay, rate limit और concurrent verify tests pass; SMS outage से session न बने; resend के बाद पुराना OTP invalid।

**लाभ:** account takeover risk कम और support/audit संभव। **लागत:** SMS cost/latency, provider integration, throttling UX और secrets rotation।

### P0.3 — Socket.IO identity/room membership जाँचे बिना booking events और trip OTP देता है

**सबूत:** `backend/src/services/src/socket.ts` में handshake authentication नहीं दिखता। Client events में आए `driverId`/`bookingId` को room names में join किया जाता है; server membership/role जाँच नहीं करता। Booking event payload उस room में broadcast होता है। `driverAssignment.ts` trip start OTP को booking room में emit करता है।

**जोखिम:** Socket endpoint तक पहुँचने वाला client guessed/known booking ID से room join कर सकता है और booking/status/location-संबंधित events या trip-start OTP सुन सकता है। OTP को shared booking room में broadcast करना उस व्यक्ति तक भी पहुँचा सकता है जिसे trip शुरू करने का अधिकार नहीं। यह code-path risk है; audit में exploit attempt नहीं किया गया।

**ठोस समाधान:**

1. Socket handshake पर JWT verify करें; issuer/audience/expiry validate; connection से server-side principal (`userId`, role) निकालें। Client-supplied driver/vendor identity पर भरोसा न करें। Token revoke/expiry पर disconnect strategy रखें।
2. Room join server-side authorization function से करें: booking DB से load, principal उस booking का assigned driver/vendor/admin/customer है यह जाँच, और role के अनुसार न्यूनतम event subscribe। Unauthorized join reject + audit करें। Opaque booking ID को authorization न मानें।
3. Trip OTP को generic booking room से हटाएँ। केवल authorized driver को short-lived, one-time challenge/secure API से दें; log/event payload में OTP न रखें। OTP verify server-side state transition के साथ atomic हो।
4. CORS origin list को allowlist करें; याद रखें CORS authorization नहीं है। Socket event payload schema/size validate, per-user event rate limit, disconnect cleanup और security tests जोड़ें।

**स्वीकृति जाँच:** no token/expired token reject; customer दूसरे booking room को join न कर सके; driver दूसरे driver की booking न पढ़ सके; trip OTP केवल assigned driver को सही समय पर मिले और reuse न हो; valid reconnect अनुमत हो।

**लाभ:** real-time updates का उपयोग access-controlled तरीके से। **लागत:** token lifecycle, DB authorization और reconnect tests का अतिरिक्त काम; unauthorized clients के लिए कुछ realtime features बंद होंगे।

### P0.4 — Local upload fallback के documents unauthenticated static route से उपलब्ध हो सकते हैं

**सबूत:** `backend/src/storage/src/index.ts` GCS न होने/fail होने पर local upload path पर fallback करता है। `backend/src/app.ts` `/uploads` को `express.static` से serve करता है और इस route पर auth middleware नहीं दिखा। Storage upload में MIME type client-declared value से आता है; content signature/sniffing validation प्रमाणित नहीं हुई। GCS URL plain `storage.googleapis.com` format में बनता है, पर bucket IAM/public access configuration इस audit में नहीं देखी गई—इसलिए actual GCS object public होने का दावा नहीं है।

**जोखिम:** local fallback में driver/vendor identity documents publicly fetchable हो सकते हैं। गलत content-type से malicious file upload या downstream viewer risk है। GCS access policy का परिणाम cloud config पर निर्भर है।

**ठोस समाधान:**

1. KYC/identity objects को public static route से कभी serve न करें। `/uploads` में private document storage बंद करें; legacy local uploads को private directory में migrate करें, access log बनाकर migration सत्यापित करें और unauthenticated route हटाएँ।
2. Private GCS bucket, Uniform Bucket-Level Access (UBLA) और Public Access Prevention की configuration सत्यापित करें। App/service account के least-privilege IAM roles रखें। Document review/download के लिए auth + ownership/role authorization के बाद 5 मिनट जैसे छोटे TTL का signed URL दें। Signed URL bearer credential है—URL log/analytics/referrer में न जाए।
3. File extension/MIME allowlist के साथ file signature जांचें, size limit, random object key, malware scan/quarantine और secure download headers (`Content-Disposition: attachment`, `nosniff`) लगाएँ। Client से आए filename को path/object key न बनाएं।
4. GCS unavailable हो तो sensitive upload को fail closed करें और retry/pending status दें; local public fallback नहीं। Logs में object contents/URLs/tokens न लिखें।

**स्वीकृति जाँच:** unauthenticated request से किसी KYC object तक पहुँच नहीं; vendor A दूसरे vendor के docs न पढ़ सके; signed URL expiry पर fail; MIME spoof/oversized/malware test reject/quarantine; GCS outage पर private fallback नहीं; bucket policy inventory saved।

**लाभ:** KYC privacy और regulatory/customer trust। **लागत:** private bucket/IAM setup, scanner/ops workflow, temporary links की UX तथा migration effort।

### P0.5 — गैर-production environment में driver auto-approval और placeholder availability

**सबूत:** `backend/src/services/src/vendorDrivers.ts` में driver create/link behavior `NODE_ENV !== production` पर auto-approval कर सकता है; नए driver fields `isVerified:true`, `isAvailable:true` और fixed Bhubaneswar coordinates से शुरू हो सकते हैं। Dispatch को `APPROVED` status चाहिए, इसलिए exact approval field behavior paths के बीच एकरूपता से test होना चाहिए। Backend env schema default development है।

**जोखिम:** गलत deployment mode में unreviewed driver dispatch योग्य हो सकता है या fake location/vendor capacity दिखेगी। Production label/profile को runtime `NODE_ENV` का पर्याय नहीं माना जा सकता।

**ठोस समाधान:** driver onboarding state machine `PENDING_DOCUMENTS → UNDER_REVIEW → APPROVED/REJECTED/SUSPENDED` बनाएं। Approval केवल authorized ops role करे, actor/time/reason log हो। `isVerified` और `isAvailable` creation default false; location unknown/null जब तक device fresh fix न भेजे। Dispatch eligibility `status=APPROVED`, valid docs, active vendor, active vehicle/driver link और fresh location policy पर एक ही shared function से तय हो। Production boot guard `NODE_ENV`, `MOCK_DATA_MODE` और demo flags validate करे।

**स्वीकृति जाँच:** production mode में नया driver approval के बिना किसी dispatch path से assign न हो; dev mode पर भी mock driver केवल demo tenant में हो; stale/null location live assignment में न गिनी जाए; approval action audit हो।

**लाभ:** वास्तविक supply और verified provider का सही अर्थ। **लागत:** onboarding धीमी, ops review workload और extra state/support screens।

### P0.6 — Production admin default और permissive configuration जोखिम

**सबूत:** Backend env config में weak demo admin-password fallback तथा `CORS_ORIGIN: *` और `MOCK_DATA_MODE: true` जैसे permissive defaults दिखाई दिए। इस audit में वास्तविक deployed values या default password यहाँ disclose/verify नहीं किए गए।

**जोखिम:** गलत secret provisioning/config में admin path अनुमानित credential से चल सकता है; permissive CORS अपने आप access नहीं देता, पर browser origins का दायरा अनावश्यक रूप से खुला रहता है। Mock mode real operational data को confuse कर सकता है।

**ठोस समाधान:** सभी required production secrets के लिए startup validation और secret manager; default admin credential पूरी तरह हटाएँ, bootstrap admin one-time invite/rotation से बनाएँ; MFA/role-based access; CORS exact production domains allowlist; admin routes पर rate limits, audit logs, session expiry; `MOCK_DATA_MODE=false` production assertion। Config validation output में केवल key missing/invalid का नाम, secret value नहीं।

**स्वीकृति जाँच:** missing admin secret/production CORS/mock false न होने पर boot fail; default password से कोई admin login न हो; unknown origin browser request reject; admin actions actor/time/IP/request ID के साथ audit हों।

**लाभ:** account takeover/accidental mock data का जोखिम घटेगा। **लागत:** secret rotation, admin MFA setup और deployment configuration को सख्ती से चलाना।

## P1 — Pilot quality और recovery gates

### P1.1 — दो अलग bookings एक ही driver को concurrent dispatch में मिल सकती हैं

**सबूत:** `backend/src/services/src/bookings/driverAssignment.ts` पहले driver को read करके `isAvailable`/`activeBookingId` check करता है। Booking row पर conditional `findOneAndUpdate` उसी booking की दोहरी claim रोकने का प्रयास करता है। फिर driver record `findByIdAndUpdate` से unavailable/active booking set होता है—इस update में availability अभी भी true होने की condition नहीं। दो अलग booking requests एक ही पुरानी availability देख कर दोनों अपनी booking claim कर सकती हैं और driver का active booking reference overwrite हो सकता है।

**ठोस समाधान:** यदि MongoDB Atlas topology replica set/sharded है तो transaction में driver availability reservation और booking assignment दोनों करें, conditionally update करें, और दोनों में से कोई fail हो तो rollback। Transaction उपलब्ध न हो तो driver को पहले atomic conditional reservation (`isAvailable=true` और no active booking) से claim करें, booking CAS करें, failure पर idempotent rollback/lease-expiry recovery चलाएँ। दोनों विकल्पों में stable idempotency key और audit event रखें।

**स्वीकृति जाँच:** एक driver + दो simultaneous bookings में ठीक एक reservation सफल; दो drivers + एक booking में एक owner; process crash बीच में हो तो reservation TTL/reconciler से recover; duplicate request retry समान परिणाम दे। Load test में invariant `driver.activeBookingId` और booking assignment मेल खाएँ।

**लाभ:** driver double-booking और खोई booking कम। **लागत:** transaction/compensation logic, retry handling और Atlas topology की पुष्टि।

### P1.2 — Vendor vehicle assignment reservation/overlap सुरक्षित नहीं दिखती

**सबूत:** `backend/src/services/src/vendorBookings.ts` vehicle ownership, existence और ACTIVE status जांचकर booking में `assignedFleetVehicleId` लिखता है; active booking overlap/reservation को atomic रूप से रोकना स्पष्ट नहीं। `vendorVehicles` removal service active booking guard के बिना वाहन हटाने का रास्ता दे सकती है।

**ठोस समाधान:** Driver और vehicle को एक ही assignment invariant का भाग बनाएं। Vehicle पर active reservation pointer/lease या reservation collection रखें; booking window overlap के लिए server-side canonical timezone/interval logic रखें। Claim conditional/transactional हो। Vehicle deactivate/remove तभी हो जब active/future bookings न हों, या ops reassignment flow पूरा हो।

**स्वीकृति जाँच:** एक vehicle दो overlapping bookings में assign न हो; concurrent vendor assignment पर एक जीत; assigned vehicle deactivate/remove fail या पहले सुरक्षित reassignment; cancellation/completion पर reservation idempotently release।

**लाभ:** vendor की असली fleet क्षमता और customer promise मेल खाएँ। **लागत:** booking time windows, timezone और cancellation rules की स्पष्ट product policy चाहिए।

### P1.3 — OTP trip start और booking status में read-check-write race

**सबूत:** `vendorBookings.ts` में OTP verify path status `DRIVER_ARRIVED` check करता है, फिर बाद में booking ID से update करता है। Update filter में वही prior status/OTP-unused predicate होने का प्रमाण नहीं; parallel verify/cancel/status request stale read के बाद race कर सकते हैं।

**ठोस समाधान:** Status transition को explicit state machine बनाएं और conditional atomic update करें: `bookingId + expectedStatus + otpChallengeId + notConsumed + expiry` से एक ही operation में OTP consume तथा `IN_PROGRESS` transition हो। OTP plaintext न रखें। Transition idempotency key, actor, timestamp और reason record करें। External event/notification commit के बाद transactional outbox से भेजें ताकि DB commit और event emit अलग-अलग न टूटें।

**स्वीकृति जाँच:** OTP का दो concurrent verify में सिर्फ एक success; OTP expiry/replay fail; cancel और start race में एक documented transition जीते; committed status event एक बार पहुँचे और retry duplicate side effect न करे।

**लाभ:** trip proof और support history भरोसेमंद। **लागत:** state machine/outbox implementation और migration/testing।

### P1.4 — Location freshness और service eligibility में dispatch नियम अस्पष्ट

**सबूत:** `driverAssignment.ts` current location के आधार पर distance निकालता है, पर fix कितना पुराना है (`updatedAt`) यह enforce नहीं करता। Vendor-routed jobs के लिए radius behavior अलग/skip होता है। Open booking offer path में approved/availability check है, लेकिन service eligibility false होने पर same-vendor driver को reject न करने वाला branch है। यह product exception हो सकता है, इसलिए इसे confirmed bug नहीं, contract ambiguity मानें।

**ठोस समाधान:** Dispatch policy एक जगह पर define करें: location max age/accuracy, service-type certification, vendor territory, driver/vehicle approval, availability, distance/radius, required equipment। Vendor override चाहिए तो explicit permission + reason + audit event; silent bypass नहीं। Stale fix पर dispatch रोकें या vendor/ops manual confirmation माँगें। Customer को availability/ETA का honest status दें।

**स्वीकृति जाँच:** stale/null/low-accuracy GPS policy लागू; ineligible service-type driver reject या authorized override audit; vendor-routed और open-market flows समान documented rule पर; policy boundary tests।

**लाभ:** गलत driver assignment और ETA miss कम। **लागत:** कुछ valid assignments reject हो सकती हैं, इसलिए supply/coverage rate घट सकता है; ops override संभालना होगा।

### P1.5 — Automated backend behavior tests अनुपस्थित हैं

**सबूत:** Backend `__tests__` placeholder के अलावा meaningful suite और package test script नहीं मिला। Typecheck pass होता है, पर assignment concurrency, auth boundaries, OTP और state transition के automated regression tests नहीं।

**ठोस समाधान:** CI में lint/typecheck के साथ test runner और disposable test DB/replica set जोड़ें। सबसे पहले auth/OTP, role authorization, upload privacy, booking transitions, one-driver-one-active-booking, one-vehicle-one-overlapping-booking और retry/idempotency integration tests लिखें। Socket tests में attacker identity/room join cases शामिल हों। Seeded fixtures deterministic हों; production data tests में न आए। Release branch पर test failure block करे।

**स्वीकृति जाँच:** P0/P1 acceptance tests CI में reproducible pass; concurrency tests repeated runs; test artifacts failure logs में OTP/token/document content न छापें।

**लाभ:** अगली change पर blocker वापस न आए। **लागत:** test DB/setup और initial authoring समय; CI थोड़ा धीमा।

### P1.6 — `/health` केवल process-जैसा green signal देता है

**सबूत:** Public `/health` ने 200 लौटाया; endpoint response `status: ok` है। इससे database, queue/provider, upload bucket, auth config या booking write/read सिद्ध नहीं।

**ठोस समाधान:** अलग `/livez` process/event-loop liveness और `/readyz` readiness endpoint दें। Readiness में database connectivity और आवश्यक runtime config (और यदि MVP के लिए अनिवार्य हों तो queue/storage) check हों; third-party SMS outage के कारण process liveness fail न करें। Health response में secret/PII न दें। Render deployment alerts में readiness failure, DB saturation, 5xx, OTP delivery failure और stuck bookings जोड़ें। Uptime monitor से periodic synthetic booking flow staging में चलाएँ।

**स्वीकृति जाँच:** DB disconnect पर readiness 503, पर liveness 200; reconnect पर readiness लौटे; health endpoint secrets न expose करे; alert actionable हो और staging synthetic flow end-to-end report करे।

**लाभ:** false-green launch signal घटेगा और incident जल्दी दिखेगा। **लागत:** probes/alerts एवं synthetic monitoring चलाने का खर्च।

### P1.7 — Startup `syncIndexes()` schema mismatch पर live indexes drop कर सकता है

**सबूत:** `backend/src/database/src/indexes.ts` startup में models पर `syncIndexes()` चलाता है। Mongoose `syncIndexes()` schema में न मिले DB indexes को drop कर सकता है। `VendorDocument` model में `{vendorId, documentType}` unique index घोषित है, पर explicit `MODELS` ensure list में वह model शामिल नहीं दिखा। Mongoose `autoIndex` enabled हो तो व्यवहार अतिरिक्त रूप से प्रभावित हो सकता है; live DB में वास्तविक index inventory इस audit में नहीं देखी गई। इसलिए index missing/drop को observed production incident नहीं कहें।

**ठोस समाधान:** Startup पर destructive sync बंद करें। Versioned DB migrations/explicit createIndex scripts अपनाएँ; migration में पहले current index inventory और duplicate data check; unique constraint से पहले duplicates resolve; drop अलग reviewed migration में। `VendorDocument` सहित सभी critical indexes का expected-vs-actual check read-only readiness/CI में। Production migration backup/rollback plan के साथ चलाएँ।

**स्वीकृति जाँच:** production startup किसी index को auto-drop न करे; migration dry-run current DB पर diff दिखाए; vendor document duplicate insert reject; backup/restore tested।

**लाभ:** अनजाने data integrity/performance regressions से सुरक्षा। **लागत:** schema migration discipline और release step।

### P1.8 — Booking की दो persistence/flow variants की ownership और invariants स्पष्ट करें

**सबूत:** Backend में vendor-facing bookings और driver assignment/open-booking flows अलग modules में हैं। मौजूदा code paths में status/ownership checks और event emissions समान रूप से enforce हो रहे हैं या नहीं, automated cross-path tests नहीं मिले।

**ठोस समाधान:** एक canonical booking state machine और shared transition service बनाएं; REST, socket, admin, vendor और driver command उसी policy से गुजरें। हर transition में expected current state, actor permission, idempotency key, DB update और audit/outbox event हो। अगर अलग collections जानबूझकर हैं तो source-of-truth, synchronization, retention और reconciliation spec लिखें।

**स्वीकृति जाँच:** हर role के लिए allowed/forbidden transition matrix; किसी alternate API/socket route से rule bypass न हो; periodic reconciler orphan/contradictory assignment बताए।

**लाभ:** एक flow सही करने पर दूसरा कमजोर नहीं रहता। **लागत:** shared domain layer और कुछ refactor/migration।

### P1.9 — Payment और settlement को MVP boundary में साफ़ रखें

**सबूत:** `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md` और `docs/RACE_REMAINING_WORK_AND_GAPS.md` payment/settlement अधूरा/stubbed बताते हैं। Audit ने payment gateway या live merchant account verify नहीं किया।

**ठोस समाधान:** पहले तय करें कि pilot में payment app के बाहर (manual/cash/UPI) होगा या integrated। Manual हो तो app status `PAYMENT_PENDING_MANUAL`/`SETTLEMENT_PENDING` जैसे साफ़ states दिखाए, receipt/reference और reconciliation owner हो; “PAID” केवल verified evidence पर। Integrated हो तो provider webhook signature verification, idempotency, refund/cancel/reconciliation, failure handling, ledger entries और sandbox-to-production verification पूरा करें। Card/UPI data स्वयं store न करें; provider-hosted flow उपयोग करें।

**स्वीकृति जाँच:** duplicate webhook से duplicate charge/ledger entry नहीं; failed/unknown payment booking को falsely paid न करे; refund/partial/cancel path documented और tested; daily reconciliation में totals match।

**लाभ:** वित्तीय भरोसा और disputes के लिए evidence। **लागत:** integrated payments कई अतिरिक्त सप्ताह और compliance/ops work ले सकते हैं। Manual pilot तेज है, लेकिन collection/reconciliation staff चाहिए।

### P1.10 — Failure/support operations product flow में first-class नहीं हैं

**समस्या/evidence:** Source में booking/driver status primitives हैं, लेकिन इस audit में end-to-end ops console, stuck-job queue, contact/escalation SLA, document review queue और reconciliation runbook को पूर्णतः प्रमाणित नहीं किया गया। यह absence-of-evidence है; कुछ UI या external process मौजूद हो सकता है।

**ठोस समाधान:** Pilot runbook में एक ops owner/on-call, booking search by public reference, state timeline, vendor/driver contact, safe reassignment/cancel/refund/manual settlement actions और audit log रखें। Explicit exception queue: unassigned, vendor accepted/no driver, driver offline/no-show, OTP delay, customer unreachable, duplicate reservation, payment mismatch, KYC rejected. हर exception का owner, next action, customer message, escalation deadline और closure reason। DB edits को सामान्य support प्रक्रिया न बनाएं।

**स्वीकृति जाँच:** tabletop exercises में प्रत्येक exception resolve; ops role अपने scope से बाहर data नहीं देखे; reassignment और refund audit; customer को update delivery recorded; on-call contact working।

**लाभ:** field failure पर product “अटक” कर गायब नहीं होता। **लागत:** human staffing, admin UI/runbook maintenance और सीमित operating hours।

## P2 — Scale से पहले करें

- **Auditability/retention:** PII-minimal structured audit logs, actor/request ID, retention schedule और access review। OTP, full auth tokens, KYC content redact हों।
- **Privacy lifecycle:** KYC retention/deletion policy, consent notice, export/delete workflow और vendor/driver access review तय करें। Applicable jurisdiction/legal obligations की विशेषज्ञ से पुष्टि आवश्यक है।
- **Service reliability:** API timeouts, retries with backoff/jitter, circuit breaker for providers, queue/outbox, rate limiting, DB backups/restore drill तथा incident runbook।
- **Performance:** index/query plan audit, socket fan-out bounds, pagination और load target निर्धारित करें। Pilot data आने से पहले speculative scale optimization न करें।
- **Accessibility/field UX:** low-network states, readable touch targets, regional language/content, battery/network behavior और actual Android device testing।
- **Release governance:** signed artifacts, staged rollout, rollback plan, crash/error telemetry with privacy filters, dependency/update cadence।

## सुझाया गया पूरा MVP flow

नीचे का flow product contract की तरह लें। वर्तमान source में कुछ चरण मौजूद हैं; यह तालिका बताती है कि pilot में end-to-end भरोसेमंद परिणाम के लिए हर चरण पर कौन-सा नियम और recovery चाहिए।

| चरण | User को क्या दिखे | Backend invariant / exact behavior | Failure और recovery |
|---|---|---|---|
| 1. Request बनाना | Service, pickup/address, समय और अनुमानित कीमत; coverage स्पष्ट | Authenticated customer; input validation; request idempotency key; server-side price/coverage calculation; request `REQUESTED` में persist | Coverage/supply नहीं तो request confirm न करें; save fail पर retry same key से duplicate booking न बनाए |
| 2. Supply check | “Vendor खोज रहे हैं” और यथार्थ समयसीमा | केवल active vendor + approved/fresh eligible driver/vehicle की capacity; stale GPS को fresh न मानें | कोई supply नहीं तो waitlist/alternate time/cancel विकल्प, ops alert; false confirmed status नहीं |
| 3. Vendor offer | Vendor को job details न्यूनतम आवश्यक मात्रा में; accept/reject deadline | Authorized vendor principal; atomic offer claim/expiry; accept/reject idempotent; offer audit | Timeout पर next eligible vendor/ops queue; एक ही booking दो vendor confirm न करें |
| 4. Driver/vehicle assignment | Customer को assigned provider और ETA; vendor को उपलब्ध resources | एक transaction या CAS reservation में booking + driver + vehicle ownership; eligibility, non-overlap, availability condition | Concurrent assignment में एक विजेता; हारने वाले को fresh list; crash/partial write पर compensating recovery/reconciler |
| 5. Driver en route | Driver को navigation/contact; customer को status/ETA updates | Socket handshake JWT; room membership authorize; server source of truth; location timestamp + accuracy | Offline/reconnect पर latest authorized snapshot fetch; stale GPS पर ETA “अज्ञात/अपडेट pending”; ops fallback |
| 6. Arrival | Customer/driver को arrived status और OTP delivery state | Driver assignment verify; OTP short TTL, one-use challenge; code logs/events में नहीं; attempts limit | SMS delay हो तो resend cooldown/support; OTP bypass/fixed test code नहीं; customer unreachable पर cancel/escalation policy |
| 7. Trip start | स्पष्ट “trip शुरू हुई” status | Conditional atomic `DRIVER_ARRIVED → IN_PROGRESS`; OTP consume और status transition एक ही atomic boundary में; event outbox | Concurrent start/cancel में एक transition; retry same result; stale command reject |
| 8. Completion | Completion proof, final amount और support/contact | Assigned driver/vendor only; completion command idempotent; timestamp/evidence/privacy policy; `IN_PROGRESS → COMPLETED` | No network पर durable retry; duplicate command से duplicate invoice/payment नहीं; dispute में ops hold |
| 9. Payment/settlement | Manual/integrated method और pending/paid status साफ़ | `PAID` केवल verified provider/manual reconciliation evidence; ledger/event idempotent | Timeout/unknown को `PENDING` रखें; refund/dispute owner और reconciliation queue |
| 10. Feedback/support/close | Rating/issue report और reference ID | Booking immutable timeline; least-privilege support; contact details redact; close reason | Complaint/stuck state SLA पर ops queue; user को status update; unsafe DB edit की जगह audited action |

### Canonical state machine का न्यूनतम रूप

`REQUESTED → OFFERED → VENDOR_ACCEPTED → ASSIGNED → DRIVER_EN_ROUTE → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED → SETTLEMENT_PENDING → CLOSED`.

हर stage से defined `CANCELLED`, `EXPIRED`, `REASSIGNMENT_REQUIRED` या `DISPUTED` exception transition की जरूरत है। कौन-सी role कौन-सा transition कर सकती है, यह allowlist हो। Status को client से मनमाना set न करवाएँ। Transition API हमेशा `(bookingId, expectedState, actor, idempotencyKey)` के आधार पर काम करे और append-only timeline रखे। Actual business statuses existing implementation से अलग हो सकते हैं; migration में mapping और old clients compatibility पहले तय करें।

## VOC: क्या सुनना/परखना है

ये नीचे **hypotheses** हैं, verified user statements नहीं। पहले 2 सप्ताह में 20 interviews/field observations सुझाए गए हैं: 5 ग्राहक (जिन्होंने service ली और जो drop-off हुए), 5 vendor dispatchers/owners, 8 drivers, 2 ops/support। साथ में 20–30 वास्तविक completed pilot jobs को usability/ops सीख के लिए देखें—यह statistical proof नहीं है। हर participant से वर्तमान workaround, सबसे हाल की वास्तविक घटना, भरोसे/सुरक्षा की चिंता और किस outcome पर वे सेवा दोबारा इस्तेमाल करेंगे पूछें। Leading प्रश्न और “क्या आपको यह feature पसंद है?” जैसे काल्पनिक प्रश्न कम रखें।

| समूह | जाँचने योग्य VOC hypothesis | संभावित product response | Win / loss या लागत |
|---|---|---|---|
| ग्राहक | पहली चिंता “कौन आएगा, कब आएगा, कितना लगेगा और मदद कैसे मिलेगी?” हो सकती है | vendor/driver पहचान, ETA confidence, price breakdown, booking reference और in-app/call support | भरोसा/fulfillment बढ़ेगा; अनुमान गलत हो तो भरोसा ज्यादा टूटता है—ETA uncertainty साफ़ दिखानी होगी |
| Vendor | उपयोगी lead की जानकारी और driver/fleet capacity साफ़ हो तो जल्दी accept करेंगे | service/location/time/price summary; accept deadline; driver/vehicle availability; reject reason; payout status | conversion/ops स्पष्ट; अधिक details privacy/security तथा vendor training की लागत |
| Driver | नेटवर्क कमजोर, address अस्पष्ट या customer unreachable होने पर job चलाने का रास्ता चाहिए | offline-tolerant task snapshot, call/contact permission, map deep link, arrival/OTP retry और escalation | field completion बेहतर; PII exposure कम रखने के लिए access expiry और contact masking चाहिए |
| Ops/support | “कौन owner है, क्यों stuck है, अगला safe action क्या है?” सबसे अहम हो सकता है | exception queue, timeline, safe reassignment/cancel/refund, audit trail, owner/SLA | manual recovery तेज; dedicated staffing/admin UI लागत और privileged access risk |

### Interview guide (कम समय में असली pain निकालें)

**ग्राहक:** पिछली बार ऐसा वाहन/सेवा कैसे ढूँढी? request के बाद सबसे ज्यादा इंतज़ार/अनिश्चितता कहाँ हुई? किस क्षण लगा कि booking असली है? कोई provider न आए तो आज क्या करते हैं? driver की पहचान/location और OTP के बारे में क्या भरोसा चाहिए? आखिरी बार cancel/refund या dispute में क्या हुआ? भाषा, call और payment में क्या बाधा है?

**Vendor:** रोज़ lead कैसे आती है और कौन accept करता है? कौन-सी जानकारी के बिना job reject करते हैं? driver और vehicle availability अभी कहाँ track होती है? peak time में double booking कैसे पकड़ते हैं? late/no-show की जिम्मेदारी किसकी? payout कब और कैसे reconcile होता है? app unavailable होने पर workaround क्या है?

**Driver:** task लेते समय कौन-सी जानकारी जरूरी है? खराब नेटवर्क में क्या बंद हो जाता है? pickup pin गलत/ग्राहक जवाब न दे तो क्या करते हैं? OTP/SMS कब अटकता है? कौन-सा कदम गलत दबने या accidental start/completion का खतरा है? आपको customer data कितनी देर चाहिए? earning/status पर सबसे ज्यादा अस्पष्टता कहाँ है?

**Ops/support:** कौन-सी exception सबसे अधिक आती है? stuck booking पहचानने में कितना समय? बिना DB edit के कौन-से action चाहिए? किस निर्णय के लिए approval जरूरी? document rejection/dispute/payment mismatch कौन बंद करता है? रात/छुट्टी में escalation कौन लेता है? incident के बाद timeline में कौन-सा evidence चाहिए?

### Pilot में मापें (प्रस्तावित targets, existing performance नहीं)

| Metric | Pilot baseline कैसे लें | प्रस्तावित early gate |
|---|---|---|
| Request persistence | client submission बनाम durable booking record | ≥99% successful submission; retry से duplicate booking शून्य |
| Fulfillment | accepted requests में completed jobs; केवल घोषित coverage में | शुरुआती target ≥80%; पहले coverage/supply baseline निकालें, इसे market benchmark न मानें |
| Vendor response | offer से accept/reject तक median और p90 | पहले 20–30 jobs में baseline; pilot SLA product/ops द्वारा तय |
| Arrival/on-time | promised window बनाम arrival timestamp | ≥90% agreed window में; no-show अलग गिनें |
| OTP completion | arrival attempts में successful verified starts | ≥98%; SMS delivery delay/retry अलग track |
| Status accuracy | app state बनाम ops/customer verified reality | ≥99%; हर mismatch investigate |
| Assignment integrity | concurrent booking/driver/vehicle conflicts | **शून्य** conflicting active reservations |
| Privacy/security | unauthorized doc/socket access, OTP leak | **शून्य** incidents; release security tests pass |
| Support recovery | stuck issue open से owner/closure तक | हर exception का owner; pilot hours में agreed response SLA |
| Customer trust | post-job short survey + complaint reason | baseline + qualitative themes; small sample से व्यापक दावा नहीं |

छोटा sample केवल सीखने में मदद करेगा; ये thresholds suggested operational gates हैं, statistical confidence/market validation नहीं। Failed/cancelled requests को denominator से हटाकर fulfillment बढ़ा हुआ न दिखाएँ; कारण के हिसाब से segment करें।

## MVP launch gates और test matrix

| Gate | Evidence चाहिए | Owner (सुझाव) | निर्णय |
|---|---|---|---|
| Release isolation | EAS production env explicit; preview/mock/permissive false; production API URL; build scan | Mobile + release | Fail = no customer build |
| OTP/auth | Production provider/config guard; OTP response/log scrubbed; expiry/replay/rate tests | Backend + security | Fail = no sign-in |
| Socket access | JWT handshake; authorized room joins; OTP private path; cross-tenant negative tests | Backend | Fail = realtime disabled / no pilot |
| KYC privacy | Local public fallback removed; bucket IAM/UBLA/PAP verified; signed access; upload validation | Backend + cloud ops | Fail = no document onboarding |
| Driver approval | Production boot guard; approval state machine; fresh location policy; audit | Backend + ops | Fail = no dispatch |
| Assignment integrity | One-driver/one-vehicle concurrency & crash recovery pass | Backend | Fail = no live booking |
| Booking state | Atomic OTP/state transitions; idempotency/outbox or equivalent; cross-role transition tests | Backend | Fail = no trip execution |
| Payment boundary | Manual policy and reconciliation owner, or complete provider/webhook/refund flow | Product + ops | Ambiguous payment state = no launch |
| Operational support | Exception queue/runbook, owner/on-call, cancellation/reassignment path, customer messages | Ops + product | No recovery = pilot scope too broad |
| Observability | Liveness/readiness, alert route, redacted logs, DB backup and restore drill | Backend + ops | No incident signal/restore = no real users |
| VOC/field usability | Interviews and actual-device field tests; critical findings triaged | Product + QA | Critical usability blocker unresolved = no pilot |
| Pilot stop rules | Capacity, hours, service area, cancellation/refund policy, incident contact published | Product + ops | Publish before inviting users |

### Test scenarios जो CI/QA में अनिवार्य हों

1. Production build preview/permissive flags true या API URL missing होने पर fail होता है; mock OTP release artifact में usable नहीं।
2. OTP: expiry, wrong-attempt lock, resend cooldown, concurrent verify, replay, provider timeout, provider disabled, phone/IP throttle; secret/log redaction assertion।
3. Access: unauthenticated socket, expired token, guessed booking ID, another vendor/driver/customer booking, admin-only action, KYC cross-tenant URL।
4. Upload: unsupported signature, oversized file, path traversal filename, scanner failure, GCS outage, private local fallback, expired signed URL।
5. Concurrency: same driver/two bookings; same vehicle/overlapping bookings; two drivers/same booking; cancellation against assignment; duplicate HTTP retry; process crash after first reservation step।
6. State machine: duplicate arrival/start/complete, OTP and cancel race, role attempting forbidden transition, out-of-order socket command, outbox retry, stale client state refresh।
7. Field/network: Android low-end device, app kill/reopen, slow/absent network, GPS permission off/stale/low accuracy, SMS delay, customer unreachable and vendor no-show।
8. Ops/payment: no supply, manual reassignment, cancellation/refund, pending payment, duplicate webhook (यदि gateway), settlement mismatch, complaint escalation and audit review।

## Exact delivery sequence और अनुमानित समय

यह estimate repository changes + implementation/test के लिए engineering time है, guaranteed deadline नहीं। Assumes one experienced backend/mobile engineer, existing deployment access and a product/ops decision-maker available; legal/payment-provider procurement नहीं गिना।

| क्रम | Work package | Estimate | Parallelism / exit |
|---|---|---:|---|
| 0 | Environment inventory, production threat/config review, booking state contract, Atlas topology और pilot scope sign-off | 1–2 engineer-days | बाकी काम से पहले; live secrets expose किए बिना config owner verification |
| 1 | Release/mock isolation, explicit EAS env/API target, build assertions/admin secrets/CORS guard | 1–2 days | Mobile + backend partly parallel; real staging artifact proof |
| 2 | OTP hardening + provider failure behavior + rate limits/log scrubbing | 2–3 days | Backend; automated security tests |
| 3 | Socket auth/room authorization/private OTP | 2–4 days | Backend; cross-role tests |
| 4 | Private KYC storage, no local public fallback, signature validation and access policy | 2–4 days | Cloud IAM and upload migration coordination |
| 5 | Driver/vehicle transactional reservation, state transition idempotency/outbox | 3–5 days | Backend; Atlas transactions/topology validation; concurrency suite |
| 6 | Approval/fresh location/eligibility policy and ops exception flow | 2–4 days | Product + ops policy before implementation |
| 7 | CI integration tests, readiness/alerts, backup/restore and deployment runbook | 2–4 days | Can overlap after APIs stabilize |
| 8 | VOC interviews, actual-device field QA, 20–30 job pilot and go/no-go review | 3–7 calendar days | Calendar time; engineering not fully parallel |

Core technical hardening roughly **15–28 engineer-days**; field validation and coordination roughly **3–7 calendar days** and may overlap. One engineer with normal review/ops availability: approximately **3–6 weeks** elapsed. Two engineers plus QA/ops can aim for **2–4 weeks**, if architecture decisions, EAS/cloud access, SMS provider and Atlas topology are ready. Payment gateway integration, legal review, major UX redesign or data migration can extend beyond this estimate. A manual-payment, one-city pilot is the fastest credible route; it still must pass P0 gates.

### Win/loss choices

| Choice | Win | Loss / cost | MVP recommendation |
|---|---|---|---|
| One-city/limited-hours pilot | Supply density, manageable support, quick learning | Small market and capacity ceiling | Yes; publish area/hours and stop rules |
| Manual KYC and settlement | Human verification and faster start than full automation | Ops labor, slower turnaround | Yes, if audit and named owners exist |
| SMS OTP | Familiar, broad reach | Delivery cost, SIM-swap/interception, delay | Accept for low-risk pilot with strict OTP controls and support fallback |
| Strong real-time sockets | Fast status updates | Auth/reconnect complexity | Keep, but no anonymous rooms; polling fallback can reduce blast radius |
| Private signed document access | Privacy and least privilege | IAM/key/link-expiry operations | Required before real document collection |
| Manual dispatch fallback | Operational continuity when automation/GPS fails | Slower, staffing and human error | Yes as explicit exception, not invisible backdoor |
| Defer integrated payment | Faster constrained pilot | Manual reconciliation and user friction | Only if payment status is transparent and responsibility assigned |

## Source code evidence map

Line numbers are based on the audit snapshot; line numbers may move in later commits.

| विषय | Repository path | निरीक्षण |
|---|---|---|
| Preview flags and mock tokens | `mobile application/src/constants/preview.ts`; `src/config/uiPreviewMode.ts` | Preview/permissive defaults, mock auth payload |
| Auth fallback/fixed OTP UI | `mobile application/src/services/authService.ts`; `src/screens/partner/PartnerOtpVerificationScreen.tsx`; `PartnerLoginScreen.tsx` | API failure path और preview login behavior |
| EAS/app config | `mobile application/eas.json`; `mobile application/app.config.js` | Profile distribution/env और API fallback |
| OTP provider/fallback | `backend/src/services/src/otp.ts` | optional provider, dev OTP response/log, env-gated limit paths |
| Socket auth/rooms/events | `backend/src/services/src/socket.ts` | handshake, client room join और booking broadcast paths |
| Driver assignment race | `backend/src/services/src/bookings/driverAssignment.ts` | availability read, booking CAS, driver write, OTP event |
| Vendor booking/OTP/vehicle | `backend/src/services/src/vendorBookings.ts` | vehicle check/assignment और OTP status update |
| Vehicle lifecycle | `backend/src/services/src/vendorVehiclesService.ts` (repo filename capitalization may differ) | active booking guard review target |
| Driver approval defaults | `backend/src/services/src/vendorDrivers.ts` | non-production approval/verification/availability/location values |
| Upload fallback/static serving | `backend/src/storage/src/index.ts`; `backend/src/app.ts`; `backend/src/middleware/upload.ts` | GCS/local fallback, static route, MIME handling |
| Index synchronization | `backend/src/database/src/indexes.ts`; `backend/src/models/src/vendorDocument.ts` | syncIndexes startup list और declared unique index |
| Health / env / payment docs | `backend/src/app.ts`; backend env schema; `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md`; `docs/RACE_REMAINING_WORK_AND_GAPS.md` | health scope, defaults और payment scope evidence |

## तकनीकी निर्णयों के लिए प्राथमिक स्रोत

यहाँ links solution design को support करते हैं; ये RACE deployment settings का प्रमाण नहीं हैं। जहाँ policy choice है (उदाहरण OTP TTL 5 मिनट, pilot thresholds), उसे suggested design कहा गया है।

- Expo `EXPO_PUBLIC_` variables app bundle में inline/public होते हैं; secrets वहाँ नहीं रखने चाहिए: [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
- EAS build environment/profile और environment selection स्पष्ट रखें: [Using EAS environment variables](https://docs.expo.dev/eas/environment-variables/usage/), [EAS build configuration](https://docs.expo.dev/build/eas-json/)
- Android distribution में internal APK और store AAB अलग use cases हैं; Play submission credentials का प्रकार verify करें: [Build APKs for Android emulators and devices](https://docs.expo.dev/build-reference/apk/), [Submit to Google Play](https://docs.expo.dev/submit/android/)
- OTP/MFA में short validity, single use, attempt limiting तथा SMS/PSTN की सीमाएँ: [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- Socket authentication middleware और rooms को authorization से सुरक्षित करना application की जिम्मेदारी है: [Socket.IO middlewares](https://socket.io/docs/v4/middlewares/), [Socket.IO rooms](https://socket.io/docs/v4/rooms/)
- GCS signed URLs और bucket access controls: [Signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls), [Uniform bucket-level access](https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access), [Public access prevention](https://docs.cloud.google.com/storage/docs/public-access-prevention)
- Mongoose `syncIndexes()` schema से absent indexes drop कर सकता है; `autoIndex` production behavior भी verify करें: [Mongoose Model API](https://mongoosejs.com/docs/api/model.html#Model.syncIndexes), [Mongoose schema options](https://mongoosejs.com/docs/guide.html#option-autoIndex)
- MongoDB multi-document transactions deployment topology और operational cost के साथ plan करें: [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- Health probe में liveness और readiness अलग semantics रखते हैं; यहाँ वही operational distinction लागू करने की सलाह है, Kubernetes अपनाने की नहीं: [Kubernetes liveness, readiness and startup probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- REST/API access control, validation और CORS को authentication/authorization का विकल्प न मानें: [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

### अनिश्चितताएँ और जिनकी अलग verification बाकी है

1. **Live MongoDB data/indexes:** database में duplicates, current index inventory, transaction-capable topology, backup freshness और restore time verify नहीं किए गए। पहले read-only inventory लें; startup `syncIndexes()` को production में चलाकर “देखने” की कोशिश न करें।
2. **EAS account/cloud env:** remote `preview`/`production` variables, credentials, current production artifact और app-store state इस audit में नहीं देखे। Checked-in profile और Codespace `.env` केवल code/workspace evidence हैं।
3. **GCS IAM/public access:** code local fallback risk दिखाता है; actual bucket policy, object ACL, UBLA, Public Access Prevention और service account permissions cloud owner से verify हों।
4. **SMS provider:** MessageCentral account, sender/template approval, delivery metrics, quotas और outage behavior live verify नहीं।
5. **Legal/product:** KYC retention/consent, driver screening requirements, payment/refund rules, insurance/liability और launch jurisdiction की विशेषज्ञ समीक्षा आवश्यक है। इस report का उद्देश्य legal opinion देना नहीं।
6. **Field VOC and reliability:** कोई वास्तविक interview, production traffic, device matrix, Android release build या 20–30-job pilot sample नहीं किया गया। Metrics targets proposed हैं।
7. **Payment integration:** gateway/webhook/provider account की live status सत्यापित नहीं; docs में stub/remaining work evidence के आधार पर इसे launch scope में अधूरा मानें जब तक test evidence न मिले।

## Go/No-Go निष्कर्ष

**अभी customer-facing MVP: NO-GO.** सबसे पहले P0.1–P0.6 release isolation, OTP, socket authorization, document privacy, driver approval और admin/config defaults बंद करें। उसके बाद P1.1–P1.4 reservation/state correctness के concurrency tests pass होने चाहिए। बाकी P1 work के लिए named owner, tested manual fallback और explicit pilot scope चाहिए।

**सीमित internal demo: GO**, बशर्ते वह demo data/authorized testers तक सीमित हो और live customer/KYC/payment न संभाले। Demo को Codespace preview flag से पहचानें; उसे production readiness evidence न मानें।

जब gates pass हों, एक घोषित service area और support hours के साथ 20–30 jobs का learning pilot करें; हर exception दर्ज करें, metrics को अलग customer/vendor/driver cohorts में देखें, और pilot के बाद evidence-based go/no-go करें। इससे “MVP-ready” का निर्णय code मौजूद होने के बजाय सफल और सुरक्षित पूरे user journey पर आधारित होगा।
