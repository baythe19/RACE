# Customer App — Inner-Screens UI Audit (Location/Booking flows)

> Date: 2026-10-19 · Branch: `changes-v6-partner-role-dispatch` · Sim: Peach `a3` (port 8081)
> Scope: user-perfected screens (Onboarding/Dashboard/Services grid) ke **baad** wali sab flows — booking end-to-end, SOS, notifications, headers, loaders, images, dead-ends.
> Screenshots: `docs/plans/customer-audit/` (14 captures)

---

## A. Booking flow — Towing (end-to-end, PASSED with notes)

| Step | Screen | Result | Evidence |
|---|---|---|---|
| 1 | Towing Service (Instant/Scheduled/Emergency + fare) | ✅ | `towing-service.png` |
| 2 | Step-1 Vehicle & tow type | ✅ vehicle cards + Flatbed/Wheel-lift choose | `booking-step1-vehicle.png` |
| 3 | Step-2 Pickup & drop | ⚠️ **"Distance: 0 km"** despite pickup+drop filled — distance calc mock me fail | `booking-step2-location.png` |
| 4 | Step-3 Review | ✅ **Honest fallback**: "Distance unavailable — flat estimate applied"; full summary+fare | `booking-step3-review.png` |
| 5 | Advance payment (₹150 = 30%) | ✅ UPI/Cash options, Pay 30% label clear | `booking-advance-pay.png` |
| 6 | **Booking Confirmed** 🎉 | ✅ `#TOW-21479`, ETA 30–60 min, breakdown | `booking-confirmed.png` |
| 7 | Track Booking → | ❌ **LIVE TRACKING SCREEN ALMOST EMPTY** — sirf "Live Tracking" header, koi map/status/ETA/driver info nahi. Dead-end feel | `tracking-empty-issue.png` |

**Booking flow verdict:** core flow solid hai; tracking screen customer-side sabse weak link hai (vendor-side tracking wahi hai jo humne vendor audit me dekha — customer wale me mock layer hi nahi hai).

## B. SOS flow (USER KA COMPLAINT CONFIRMED)

- **Black UI root cause:** `src/constants/sosTheme.ts` — `bg: '#000000'`, cards `#141414`. Poori screen intentionally dark theme par hai jabki app white hai. User ko personally pasand nahi — **redesign needed (user call)**.
- Layout issues live capture me: tab bar SOS screen par hide ho jata hai; screen ka upper area renderme truncated dikh raha tha (`sos-black-ui.png`).
- **Dead-end risk:** SOS se bahar nikalne ka sirf invisible top-right X hai (`[tap] @(397,45)`) — Home/Services tap karne par bhi SOS hi raha (tab bar hi nahi hai). Sirf X dhundhne se exit hota hai.
- SOS content data (contacts, vehicle "Toyota Innova Crysta MH12…", "Rahul Kumar") **DEMO defaults** hain — `SosDetailsContext` ka default data. Real user data nahi.
- Runtime errors: SOS par 4× Axios 401 (unhandled rejections) — API calls bina token fail ho rahi hain.

## C. Bookings tab (FIXED LIVE)

- **Bug:** API fail hone par error banner + "No bookings yet" empty state **dono ek saath** dikhte the (`bookings-error-dup-issue.png`).
- **Fix:** `BookingsScreen.tsx` `isEmpty` me `!loadError` condition. **Live verified**: ab error kam hota hai to sirf sections + honest lines (`bookings-after-fix.png`).
- Note: mock session me bookings list API 401 deta hai (load error legitimate) — per booking jo humne banayi (#TOW-21479) bhi list me nahi aayi. Real-session par wapas test karna hoga.

## D. Roadside flow (Issue: Coming-soon dead end)

- Outer screen par sab 4 services ke **active "Book Now"** buttons; andar jaake sab **"Coming soon"** (`roadside-coming-soon.png`) — false lead.
- "Coming soon" select karke bhi wizard aage (Location step tak) chala jaata hai — backend me roadside sirf towing-mapped hai (`available:false` for others).
- **Suggestion (P2 UI):** Coming-soon services par "Book Now" hatao/deisable + "Notify me" chip; ya outer screen me hi "Coming soon" badge.

## E. Notifications screen (Issue: stale OTP message)

- Notifications kholte hi **purana OTP error toast** dikha: "This code has expired. Tap Resend OTP…" (`notifications-stale-otp.png`) — auth flow ka error message galat screen par leak ho raha hai. Ek global toast/alert state ka cleanup-on-navigate missing hai (P2).

## F. Headers consistency

- Services inner screens (Towing/Roadside) ka-header pattern same: centered title (services style), back chevron left. ✅
- Bookings/Profile tab screens ka `TabRootHeader` (title+subtitle+bell+avatar) bhi consistent. ✅
- SOS header alag (black, no title) — intentional but user-confusing; SOS redesign me include karo.

## G. Loaders/skeletons per page

| Page | Loader | Note |
|---|---|---|
| Bookings | ✅ ActivityIndicator "Loading bookings…" | + pull-to-refresh |
| Tracking (customer) | ❌ koi skeleton nahi — screen blank rehti hai jab tak data nahi | issue D |
| Towing/Roadside service screens | N/A (static content, fast) | — |
| Step screens (1/2/3) | N/A (local forms) | — |
| Profile | ✅ sections render fast; spinner nahi chahiye tha | OK |

## H. Services images slow-load (FIXED)

- **Root cause:** 4 card images 1200×848 @ 160–218 KB (progressive JPEG) — card par sirf ~450×290dp render hota hai. 
- **Fix:** all 4 resized → 900px, quality 80 → **261 KB total (was 751 KB, −65%).** (commit isme include)
-伐 suggestion: `expo-image` with `cachePolicy:"memory-disk"` + `recyclingKey` for further snappiness (dependency change, later).

## I. Profile menu

- Poori menu render hui: Personal Info, My Vehicles, SOS Details, Saved Locations, Payment Methods, Notifications, Wallet ₹0, Premium badges (`profile.png`). ✅
- Wallet ₹0 + "Premium/Member" mock — harmless preview data.

---

## Priority fixes list

| # | Issue | Priority | Status |
|---|---|---|---|
| 1 | Bookings: error + "empty" dono ek saath | P1 | ✅ **FIXED** (`bookings-after-fix.png`) |
| 2 | Service card images slow (751 KB total) | P2 | ✅ **FIXED** (261 KB, −65%) |
| 3 | Customer Live Tracking screen almost empty (no map mock/status) | **P1** | open — tracking mock fixture (vendor jaisa) customer side bhi chahiye |
| 4 | SOS black UI + unseen exit (top-right X only) + tab hidden | **P1** | open — redesign needs user's design call |
| 5 | Roadside "Coming soon" lekin Book Now active | P2 | open |
| 6 | Notifications par stale OTP error toast | P2 | open |
| 7 | SOS screen par 4× unhandled 401 | P2 | open |
| 8 | Step-2 "Distance: 0 km" (mock distance calc) | P3 | open (real Maps session se solve) |

## Kis order me karein

1. Tracking mock fixture customer side (P1, chhota) — tracking screen turant demo-ready
2. SOS redesign (user ka design call: light theme? same white Card style?) 
3. Coming-soon Book Now disable + stale toast cleanup
4. Real-session re-run (bookings list + tracking with real data)
