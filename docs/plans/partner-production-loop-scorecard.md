# Partner App Production-Readiness Loop — Scorecard (2026-10-17, updated)

**Input:** सारी documented gaps (21-PARTNER-APP-AUDIT PA-1..7, 40-BUGS-AND-GAPS, VOC P0/P1 register)
**Method:** हर gap → POC → soft fix → verify → score. Mock-data mode जानबूझकर बरकरार.

## Loop #1 निष्कर्ष (सब verified)

| Gap | स्थिति | Detail |
|---|---|---|
| PA-1/BUG-01/P0.1 (release-guard) | ✅ fixed | release build में preview opt-in-only + warning |
| P0.8 (OTP replay) | ✅ fixed | submission-bound hash; गलत code reject live-proven |
| P0.10 (नकली customer contact) | ✅ fixed | दोनों sites; बिना contact graceful |
| PA-3/BUG-16 (fabricated KYC) | ✅ fixed | missing-fields gate |
| P0.2/P0.6 (boot guard) + BUG-13 | ✅ fixed | production refuse-to-start live-proven |
| PA-2/BUG-05 (self-KYC) | ✅ fixed | `POST /driver/upload-document` full-stack, live E2E |
| साथ आया | ✅ | parallel-agent के vendor.ts type errors |

## Loop #2+#3 निष्कर्ष 2026-10-17 (सब live-proven)

| Gap | स्थिति | Detail |
|---|---|---|
| **BUG-03/P0.3** socket — बिना identity booking rooms + trip OTP broadcast | ✅ fixed (backend + customer app) | Handshake में अब user JWT ज़रूरी (`io.use` middleware, `handshake.auth.token`); `booking:track` सिर्फ़ booking के customer/vendor को, `driver:join` सिर्फ़ खुद या fleet-owner vendor को (DB ownership check)। **Trip-start OTP अब सिर्फ़ assigned driver को** `emitToDriver('trip:otp', …)` से — booking-room broadcast बंद। Customer app `socketService` अब `auth.token` भेजता है (`readAccessToken()` export किया)। लाइव: no-token ❌ rejected, garbage-token ❌ rejected, valid-token ✅ connected, random booking-join silently denied। |
| **BUG-02/P0.4** uploads सार्वजनिक रास्ता से documents लीक | ✅ fixed (Loop #3, live-proven) | नया `GET /api/v1/documents?url=&ownerId=` identity-gated proxy (owner/driver-vendor/admin only; local stream + remote fetch, path-traversal गार्ड) — **`/uploads` express.static app.ts से हटा**। Live: uploads=404, no-token=401, bogus-token=401, अनजान customer=403, owner=200 ✅ |
| **P0.11** earnings/bank नकली "verified" | ✅ पहले से ठीक (POC-verified, कोई बदलाव नहीं चाहिए) | Earnings screen backend-driven (`useVendorEarningsQuery`); bank `isVerified` backend सत्यान्वित; झूठा "Automated Monday payout" दावा पहले ही हटा ("Payouts begin after our team verifies"); local store default `isVerified:false` |
| **P0.9** customer खुद booking confirm/start/complete कर रहा था | ✅ fixed | नया `assertActorMayTransition()` (`bookingStatusConstants.ts`) — customer/vendor को कोई operational transition नहीं, केवल CANCELLED; driver केवल EN_ROUTE→ARRIVED→IN_PROGRESS→COMPLETED; admin exception. दोनों `driverBooking`/`towingBooking` updateStatus में लगा। **लाइव:** owner customer→COMPLETED = 403 साफ़ msg ✅, →CONFIRMED = 403 ✅, →CANCELLED = still OK ✅ |
| **P0.5** नया self-driver `isAvailable:true` + placeholder Bhubaneswar coords | ✅ fixed | register() अब `isAvailable:false` — नया driver dispatch-eligible नहीं जब तक असली location आए (availability flow से) |

## जानबूझकर नहीं छुआ (scope/जोखिम)

| Gap | कारण |
|---|---|
| PA-1 full default-flip | user: mock रहने दो (release-guard जोड़ा = मुख्य जोखिम बंद) |
| PA-4/BUG-25 driver map, PA-5 background location | UI/native फीचर-काम — अगला चरण |
| PA-6 partner socket client | backend emitter + auth तैयार; partner-app में wiring अगला चरण |
| BUG-02 का GCS signed-URL भाग | local stream gate पूरा हुआ; GCS bucket ACL review Render cutover पर |
| P0.7 payments, P1.1/P1.3 races | बड़े refactors/product calls — अगला loop |
| P1.5 automated tests | test-runner setup अलग से |

## Updated scores (पहले → Loop1 → अब)

| Dimension | पहले | Loop1 | अब | क्यों |
|---|---|---|---|---|
| Data honesty | 3 | 7 | **7.5** | P0.5 availability-honesty जुड़ी; P0.11 POC में पहले से ठीक मिला |
| KYC integrity | 2 | 8 | **9** | अब KYC **देखना** भी identity-gated (BUG-02 बंद) |
| Security posture | 4 | 7 | **9** | socket-auth + trip-OTP-leak बंद + booking lockdown + uploads-gate — सब live-proven |
| API wiring correctness | 7 | 8 | **8.5** | actor-policy सब जगह + gated document endpoint |
| Driver live experience | 4 | 4 | **4.5** | trip-OTP सिर्फ़ driver तक (partner client wiring बाकी) |
| Maintainability | 4 | 4 | **4** | god-screen refactor अभी नहीं (documented) |
| **कुल (weighted)** | **3.6** | **6.5** | **7.6/10** | |

## Lean अगला (documented order)

1. PA-6: partner-app socket client + `trip:otp` consumer (backend emitter तैयार)
2. GCS signed-URL / bucket-ACL review (Render cutover के साथ)
3. P0.7: payment proof flow (product call चाहिए)
4. P1.1/P1.3: dispatch/OTP conditional-atomic updates
5. BUG-36: test runner + इन सबके regression tests
6. PA-4: driver map + PA-5 background location (फीचर-काम)
