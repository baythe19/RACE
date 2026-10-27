# Partner App Browser Walkthrough — Findings & Fixes (2026-10-17, Loop #4)

**Method:** Peach sim (c2) + Cursor Browser — असली user जैसे taps से हर screen खोला, defect मिले तो code fix + re-verify. Mock-data mode (`EXPO_PUBLIC_UI_PREVIEW_MODE=true`).

## Screens tested (सब live)

| Screen | परिणाम |
|---|---|
| Driver Dashboard (Om) | ✅ Availability toggle, earnings chart, 2 requests, tab-bar |
| Driver Jobs → Accept | ✅ Offer cards, Decline/Accept |
| Active Job (En-route) | ✅ Map controls, route card, Сall button (masked customer) |
| Arrived → OTP screen | ✅ "Confirm customer pickup" + 4-digit boxes |
| OTP verify (1234) | ✅ → In-progress screen |
| In-progress → Complete → Confirm dialog | ✅ → "Job completed" + ₹1,200 |
| Earnings (driver पोस्ट-ट्रिप) | ✅ ₹1,200 real अपडेट |
| Account (driver) | ✅ Profile, rows |
| Vendor Login | ✅ Role-change, 1-Tap mock entries |
| **Vendor Home (Bikram)** | ✅ 2 leads, leads cards, earnings ₹4,250 |
| Vendor Jobs + filters | ✅ New leads card, counts, filters |
| **Vendor Assign flow** | ✅ vehicle select → "Booking approved with fleet vehicle" |
| Vendor Drivers | ✅ stats, search, filters |
| Vendor Vehicles | ✅ stats, list |
| Notifications | ✅ फ़िल्टर tabs, मार्क-ऑल-रीड |
| Help & Support | ✅ सर्च, 24x7 कॉल, WhatsApp, topics |
| Vendor Registration (steps 1-3) | ✅ tracker, prefill, Continue |
| Account (vendor) — पूरा menu | ✅ rows & nav |
| Trip History | ✅ All/Completed/Cancelled फ़िल्टर्स, real rows |

## Defects मिले + Fixes (सब re-verified live)

| # | Defect | Fix | Re-verify |
|---|---|---|---|
| 1 | "Location not updating" banner (boot पर transient) | **कोई code change नहीं** — Retry tap से ok हो गया; error→retry→ok mechanism सही | banner 0 |
| 2 | OTP input में testID गायब — ऑटोमेशन type नहीं कर पा रहा था | `testID="tripOtpInput"` (`DriverActiveJobScreen.tsx:1561`) | `type-into` से "1234" टाइप हुआ → verify पास ✅ |
| 3 | Bank & Payouts: "Could not load" डेड रिट्रायट स्क्रीन (mock-token 401) | `vendorApi.getPayoutAccount` में preview-fallback: 404 **या 401** पर demo सेव्ड-अकाउंट (masked, pending) | लाइव: पूरा फॉर्म + "Pending" बैज ✅ |
| 4 | UI QA Navigator sheet सिर्फ़ 195px (maxHeight % Modal host में collapse) | `UiTestNavigator.tsx` modalSheet — `height: 640` absolute | लाइव: sheet expanded, screen-list दिखी ✅ |
| 5 | Earnings: "Could not load" (उसी 401 कारण) | `getVendorEarnings` preview-fallback → होनस्ट ₹0 + empty chart | लाइव: ₹0 + 7-day चार्ट ✅ |

## Notes / अगला

- Peach कस्टम-कीपैड taps `shell-overlay` में अटकते हैं — **testID-driven `type-into` ही automation का सही तरीका है** (नया testID जोड़ने का यही कारण)
- Trip OTP **customer side REST से role-gated मिलता है** (regression-checked — Loop2 fix सही था)
- Partner-app `trip:otp` socket consumer अगला (backend emitter तैयार)
- **Gates:** partner tsc 0 · backend lint 0 (हर fix के बाद)
