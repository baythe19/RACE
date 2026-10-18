# V6 Partner App Audit — Real-User UI Test + Target-Flow Ledger

> Branch: `changes-v6-partner-role-dispatch` · HEAD at audit: `2d84a3f` · Date: 2026-10-18
> **UPDATE (same day, fixes):** P0-1/P0-2/P0-3 + P1 batch + P2 cleanup are now FIXED and verified — see "Fix log" at the bottom. Fix commits: `2293925`, `1616aa5`, `26dea1e`, `3048b83`, `bb1a6cc`, `1b06ace`. DB-backed E2E: **15/15 checks passed** (`backend npx tsx src/scripts/verify-driver-ack-e2e.ts` against local mongo:7).
> Method: Peach simulator (mock/QA mode), aapke dikhaye gaye target flow (full prompt in chat) vs. code + live UI.
> Code refs are `file:line` on this branch. All screenshots: `docs/plans/v6-audit/`.
> Captured screens (13): driver `dashboard / jobs / active-job / my-vendor / registration / registration-step2`; vendor `home / jobs / assign / drivers-memberships / vehicles / notifications / tracking-error`.

---

## Part 1 — UI walkthrough results (real-user test)

| # | Screen | Result | Evidence / Notes |
|---|--------|--------|------------------|
| 1 | Welcome + role selection | ✅ | Sirf 2 roles: Driver / Towing Vendor ✓ |
| 2 | Driver login (OTP) | ✅ | Single OTP path; vendor-driver password CTA gone |
| 3 | Driver registration (4 steps) | ✅ | Personal → Driver Details → Documents → Review; mobile "Verified" badge; vehicle optional |
| 4 | Driver Dashboard | ✅ | LIVE toggle, earnings chart, request cards. Screenshot: `driver-dashboard.png` |
| 5 | Driver Jobs | ✅ | 2 driver-hire offers (#DRV-10048/49), Accept/Decline. Screenshot: `driver-jobs.png` |
| 6 | Accept → Active Job | ✅ | EN ROUTE TO PICKUP, honest "Number unavailable" when mock customer missing. Screenshot: `driver-active-job.png` |
| 7 | **My Vendor tab (naya)** | ⚠️ | Dedicated page exists ✓ but shows "Some vendor information could not load" in mock session; no invitation-notification deep-link. Screenshot: `driver-my-vendor.png` |
| 8 | Vendor Home | ✅ | Fleet summary (Drivers/Vehicles/Jobs), 2 driver-hire leads |
| 9 | Vendor Jobs + filters | ✅ | New(1)/In-progress(2)/Completed(1); "Assign Driver & Vehicle"; testIDs |
| 10 | **Vendor Assign screen** | ✅/⚠️ | Driver section + fleet vehicle radio + confirm. Towing without eligible driver shows honest empty + "Manage Drivers" CTA (`vendor-assign.png`). **Empty-state par bhi vehicle-only confirm ka risk — dekho L-2** |
| 11 | **Vendor Job Tracking (naya)** | ⚠️ | Screen exists ✓ but mock session में "Tracking could not load" (`vendor-tracking-error.png`) — API 404 in mock (real session needs test). **Real bug: pre-accept tracking allowed — see L-1** |
| 12 | Vendor Vehicles | ✅ | Total/Available/In-service, search, filters. `vendor-vehicles.png` |
| 13 | Vendor Notifications | ✅ | Filters (Job Updates / Drivers & Vehicles / …), mark-all-read. `vendor-notifications.png` |
| 14 | Invitation notifications on driver side | ❌ | Membership event type Notifications UI mein drop hota hai (audit doc bhi yahi kehta hai); invite aane par driver ko koi dedicated alert/screen nahi — sirf Notifications list item |

**Runtime errors during walkthrough:** 0 app errors in Peach console.

---

## Part 2 — Requirement ledger (target flow vs implementation)

Legend: ✅ implemented · 🟡 partial · ❌ missing. Backend = `backend/src`, Partner = `mobile application/src`.

| # | Requirement (aapka flow) | Status | Evidence | Kya baaki |
|---|--------------------------|--------|----------|-----------|
| R1 | Partner app mein do roles — **Towing Vendor** aur **Driver** | ✅ | `PartnerWelcomeScreen.tsx` (Driver / Towing Vendor radios); UI test #1 | — |
| R2 | Driver **sirf driver** — vehicle optional | ✅ | `driverRegistrationDocuments.ts` (required = DL, photo, govt ID; RC/insurance hataye); reg UI "vehicle optional" | Registration submit ka DB+E2E test pending |
| R3 | Driver **customer bhi ho sakta hai** (coexistence) | 🟡 | Backend `capabilities[]` (`models/src/user.ts:49`, `auth/src/roles.ts`) + `driverSelf.ts` adds driver without dropping customer | UI grievance: app-area switching nahi — `PartnerAppNavigator` scalar `user.role` par chalta hai (capabilities unused client-side) |
| R4 | Driver ko **sirf driver-hire requests**, towing nahi | 🟡 | Independent offers filter driver-hire only (`driverAssignment.ts:295-297` — verified in focused audit) | Client-side no filter (API par bharosa); regression test nahi |
| R5 | Vendor ko **towing + driver-hire dono** requests | ✅ | Vendor home/Jobs mein dono lead types dikhe (UI #8-9); backend listOpenBookingOffers forVendorId | — |
| R6 | **Vendor driver ko ID/password nahi dega** (credential flow removed) | ✅ nav | `PartnerAuthNavigator.tsx` se `PartnerDriverAuthMode` + `PartnerVendorDriverLogin` removed; backend vendorDrivers credential routes removed | 🟡 Dead files abhi bhi disk par (L-9); backend legacy `vendorUserId` path still dispatch authorize karta hai (R11 overlap) |
| R7 | **Vendor driver search karega (naam/phone) → invite** (driver ki permission se) | 🟡 | `vendorMembershipApi.ts` + `VendorDriverMembershipsScreen` — **phone-only** invite; consent = driver accept/decline (`driverVendorMembership.ts:169-223`) | Name-search + opt-in discoverability endpoint ❌; invite-specific rate limit ❌; UI me search field sirf phone |
| R8 | **Driver ke app mein naya page jab vendor se connect ho** — vendor details, vendor ki jobs, assigned gaadi | 🟡 | `DriverMyVendorScreen` dedicated tab ✓ (UI #7): membership, invitations, vendor-assigned work | Vendor **details** (naam/contact) display thin in mock; connect hone par **push/dedicated notification** nahi — sirf polling (20s) |
| R9 | **Vendor assign ek driver + vehicle (towing) / driver-only (driver-hire)** | ✅/🟡 | `VendorAssignJobScreen` service-aware ✓ (UI #10); validator superRefine towing→vehicle required | Assign = **immediate EN_ROUTE**, driver ka job-level accept nahi (L-1); vehicle reservation server-side ❌ (L-3) |
| R10 | **Vendor full tracking** — driver position, gaadi uthayi?, pickup hua? | 🟡 | `VendorBookingTrackingScreen` + `getBookingTracking` (`vendorBookings.ts:85-135`): status, driverLocation (fresh-gated), statusHistory, fleet label | Pre-accept tracking allowed (bug L-1); milestones UI = statusHistory text, pickup-done/dropped explicit confirm steps vendor view mein nahi; mock session test E2E pending |
| R11 | Legacy vendor-link bypass band ho | ❌ | `driverAssignment.ts:554-570` + `vendorBookings.ts:270-277` — `driverProfile.vendorUserId` ab bhi authorize karta hai | Migration/membership-only enforcement pending |

### Score by area (weight: correctness>coverage>polish)

| Area | Score | Note |
|---|---|---|
| Role model & entry (R1-R3) | 8/10 | R3 client-side gap |
| Driver flow (R2, R4) | 7.5/10 | Client filter + E2E missing |
| Membership/invite (R7, R8) | 6.5/10 | Search narrow, notifications weak |
| Vendor dispatch (R5, R6, R9) | 6/10 | Cred-UI gone ✓ but L-1/L-3 |
| Tracking (R10) | 6/10 | Pre-accept + thin milestones |

---

## Part 3 — Limitations catalog (rechecked)

### P0 (production dispatch unsafe)
- **L-1 · Per-job driver acknowledgement missing (target-flow violation).** Vendor assign booking ko seedha `DRIVER_EN_ROUTE` likh deta hai — `driverAssignment.ts:611-635` (`status:'DRIVER_EN_ROUTE'` + dono history entries ek saath) aur `:667` emit. Client bhi `DRIVER_ASSIGNED` ko active maanta hai (`driverBookingStatus.ts:13-18`). Accept/decline/timeout screen kahin nahi.
- **L-2 · Confirm bina driver ke possible.** Assign UI `vendorConfirmAssignment` testID vehicle select ke saath reachable; backend towing par driver required hai (validator), par UX empty-driver state se confirm tak ka clear block nahi — error-dependent.
- **L-3 · Fleet vehicle server-side reservation nahi.** `VendorAssignJobScreen.tsx:48-63` sirf client-side `reservedVehicleIds` (booking list se); backend sirf open-assignment par status/delete block karta hai (`vendorVehicles.ts:63-78`), concurrent assign race open.
- **L-4 · `driverId` refs `User` hain ya legacy?** v5 se chala aa raha ref-model mismatch (`vendorId/driverId ref 'Vendor'/'Driver'` vs live `User`) — populate risks (v6 mein naya nahi, par ab bhi khula).

### P1
- **L-5 · Membership socket invalidation nahi** — `useVendorRealtimeSync.ts:22-48` membership/invitation keys invalidate nahi karta; My Vendor/driver invite 20s polling par.
- **L-6 · Global location write booking-guard se pehle** — `services/src/driver.ts:119-128` `User.currentLocation` update → phir booking-scoped fields guarded (`:136-153`). Privacy rule: validation pehle hona chahiye.
- **L-7 · Invite lifecycle adhoora** — `EXPIRED` enum hai, expiry timestamp/worker nahi; stale PENDING driver ka one-vendor lock rok sakta hai (`driverVendorMembership.ts:90`).
- **L-8 · Vendor mock PII store defaults** — `partnerRegistrationStore.ts:105-148` vendor docs abhi bhi Unsplash/mock PII defaults; driver side saaf.
- **L-9 · Dead screens retained** — `PartnerDriverAuthModeScreen`, `PartnerVendorDriverLoginScreen`, `VendorDriversScreen`, `PartnerActiveJobScreen` (vendor path), `PartnerRoleSelectionScreen` — nav se bahar par disk par; stale `PartnerAuthStackParamList` types.
- **L-10 · Invitation notification UX** — membership event type API response se drop; driver ko invite aane par dedicated page/notification route nahi (sirf Notifications list), My Vendor tap-route nahi.
- **L-11 · Legacy Booking (admin) + server-side projection gaps** — customer legacy trips absent, admin service rows bare-ID keys (audit doc §308).
- **L-12 · Admin vendor detail full bank number expose** (VENDORS_VIEW) — mask server-side needed (audit doc §288).

### P2
- Mock-session tracking/payout 404s dikhte hain (honest errors ✓, par E2E proof pending).
- Assign screen heading inconsistent: "Assign driver & vehicle" vs card "Assign Driver & Vehicle".
- `PartnerHomeScreen` legacy `useVendorFleetDriversQuery` (membership-based counts se mismatch possible).
- Driver registration "Driver Details" stepper ✓ par submit success feedback basic.

---

## Part 4 — Target flow (aslok) vs current — flow map

**Driver (target):** register (no vehicle needed) → verified → sirf driver-hire job requests → accept → customer pickup/drop → (vendor se connect ho to) My Vendor page: vendor details + vendor jobs + assigned vehicle + invitation alerts.

**Current:** register ✅ (vehicle optional) → verified ✅ → offers driver-hire-only backend-enforced 🟡 (no client filter/test) — **accept ✅** — My Vendor page 🟡 (thin details, no push, polling only).

**Vendor (target):** register + vehicles add → towing + driver-hire requests → towing par **gaadi assign** +事先-connected verified driver search/invite se add → driver+vehicle assign → **full tracking** (position, gaadi uthayi, pickup confirm).

**Current:** register+vehicles ✅ → dono request types ✅ → invite **phone-only** 🟡 (naam-search ❌, consent ✅) → assign 🟡 (immediate EN_ROUTE — driver ack ❌, vehicle reservation ❌) → tracking 🟡 (screen ✅, pre-accept bug, milestones thin, E2E pending).

---

## Part 5 — Kya change karna hoga (priority order)

1. **Driver job-ack state machine** — vendor assign `DRIVER_ASSIGNED` par ruke; driver Accept/Decline(+timeout) ke baad hi `DRIVER_EN_ROUTE`; driver Jobs mein pending-accept UI; tracking only post-accept.
2. **Server-side vehicle reservation** — atomic conditional update on vehicle (like driver reservation), concurrent-claim test.
3. **Membership-only dispatch** — legacy `vendorUserId` ko history-only; feed+claim sirf ACTIVE membership.
4. **Driver discovery** — opt-in discoverability + name/phone masked search + rate limit + audit log.
5. **Membership realtime + notification deep-link** — socket invalidation + typed membership notification driver Notifications → My Vendor route.
6. **Invite expiry worker + resend**.
7. **Location privacy** — booking-validation pehle, global write baad mein.
8. **UI/UX cleanups** — mock PII vendor defaults remove; dead screens remove ya archive; capabilities-based app-area switching (R3); labels unify.

## Verification evidence gap (honest)

- UI: mock/QA session — real MongoDB/Render session par invite→assign→tracking E2E **nahi** chala (ya to DB nahi tha ya vendor-ID mismatch). Real-session E2E = next gate.
- Push notification, background location, physical device — untouched.
- `vendor-assign.png` header text aur `vendor-tracking-error.png` mock-404 is report mein intentionally documented hain.

---

## Fix log (same day, after audit)

| Fix | Commit | Verified by |
|---|---|---|
| **P0-1** Vendor assign ab DRIVER_ASSIGNED par rukta hai; driver accept (Jobs se "Accept trip") hi trip start karta hai + tabhi trip:otp emit hota hai; Active Job screen DRIVER_ASSIGNED par pending-accept gate dikhata hai; Jobs mein assigned card ab "Accept trip / Decline" | `2293925` | E2E ✅ (checks 1,1a,1b,2,3,3a,3b) + partner tsc 0 + backend tsc 0 |
| **P0-1 (tracking)** Vendor tracking driver location sirf post-accept (EN_ROUTE+) deta hai; pre-accept `driverLocation: null` | `2293925` | E2E ✅ (check 4a, 4b) |
| **P0-2** Atomic fleet-vehicle reservation: conditional `findOneAndUpdate` on ACTIVE vehicle (`activeBookingId` pin) + cross-collection clash check; driver reject / cancel / complete / release sab vehicle free karte hain | `1616aa5` | E2E ✅ (checks 5, 5a, 7a, 7b) |
| **P0-3** Membership-only dispatch: claim Authorization sirf ACTIVE membership se; connected driver un-routed marketplace claim block; feed routing membership-driven; deprecated assignBooking legacy bypass removed | `26dea1e` | E2E ✅ (check 6) + `audit:partner-v6` PASSED |
| **P1** Membership/invitation caches socket-invalidated (vendor+driver); invites expire (`VENDOR_INVITATION_TTL_DAYS`, lazy sweeps on invite/respond/list); location update ab booking-validation FIRST, global `User.currentLocation` sirf non-booking fallback; registration store ke saare mock PII/bank/Unsplash defaults empty | `3048b83` | backend+partner tsc 0 |
| **P2** Dead credential screens `.audit-removed` (compile se bahar, files preserved); `PartnerAuthStackParamList` se dead routes; vendor Jobs mein DRIVER_ASSIGNED ab Track action nahi dikhata (post-accept only) | `bb1a6cc` | partner tsc 0 |

**E2E proof (local mongo:7, script `backend/src/scripts/verify-driver-ack-e2e.ts`): 15/15 PASSED.**

### Ab bhi khula (next gates)

1. Peach UI ka seeded **vendor-assigned pending-accept card** mock me nahi hai (mock sirf EN_ROUTE seed karta hai) — assigned-state visual QA ke liye mock seed chahiye ya real-session test.
2. Real-session (Render API) invite→assign→ack→tracking E2E + push/background-location device tests.
3. Vendor invitation notification ka My Vendor deep-link (abhi sirf list item).
4. Name-based driver discovery + rate limits (R7 ka bacha hua hissa).
5. Admin bank-number masking (L-12) — backend+admin UI.

---

## Location-101 test (vendor + driver, mock-data walkthrough)

**Scope:** driver location kaise share hota hai, vendor app mein kaisa dikhta hai, tracking screen ka poora UX. Neeche sab evidence Peach sim se, screenshots `docs/plans/v6-audit/` mein.

### A. Driver side — location share kaise hota hai

| Kya | Result | Evidence |
|---|---|---|
| Reporting engine | ✅ Singleton 12s interval, min 4s gap — dashboard+active-job dono subscribe karte hain, double-write guard hai | `useDriverLocationReporting.ts:9-103` |
| Permission/GPS handling | ✅ permission_denied aur services_disabled alag health states, retry button dashboard card par | `useDriverLocationReporting.ts:34-60` |
| Gating | ✅ Sirf `isApproved && isOnline` par report hota hai — offline driver location nahi bhejta | `DriverDashboardScreen.tsx:930` |
| Health UX | ✅ "You're online / LIVE" green → toggle off → "You're offline" (screenshot `driver-dashboard-offline.png`); wapas online → LIVE restore | UI test live |
| Send path | ✅ Fix capture → store → `PATCH /driver/location`; backend booking-scoped write first (post-accept only), global fallback | `driverApi.ts:153`, `driver.ts:updateLocation` |

### B. Vendor side — location kaisi dikhti hai

| Kya | Result | Evidence |
|---|---|---|
| Tracking screen | ✅ Map (pickup/drop/driver marker + destination switch at pickup), driver card + call button, fleet vehicle label, freshness line, progress timeline | `VendorBookingTrackingScreen.tsx`, screenshot `vendor-tracking-live-mock.png` |
| Freshness rule | ✅ Location sirf EN_ROUTE/ARRIVED/IN_PROGRESS + ≤90s old hone par dikhti hai; warna map hide | Backend `vendorBookings.ts:105-113` |
| Polling | ✅ Tracking 5s auto-refetch (error par 15s), foreground-only | `useVendorBookingsQueries.ts:57` |
| Mock coverage | ✅ (NAYA) tracking mock fixture — live EN_ROUTE trip, fresh fix, real timeline; pehle ye screen mock me "could not load" thi | `vendorBookingsApi.ts` buildMockTracking, screenshot `vendor-tracking-live-mock.png` |

### C. Mock se chalaya gaya poora flow

1. Vendor → Drivers tab: **roster ab realistic** — Rakesh Sahoo (Tow Driver, Active, rating), Debasis Naik (Full-Time, busy), pending invitation card (screenshot `vendor-drivers-roster-mock.png`)
2. Invite by phone → pending card UI + "already on fleet" duplicate guard (screenshot `vendor-invite-pending.png`)
3. Driver mode → My Vendor membership + invitation lifecycle (preview state machine wired)
4. Vendor Jobs → "Track assigned job" → **tracking screen live**: Emergency Towing, Driver En Route, Tata 407, Rakesh Sahoo +91…, call button, map, "Driver location updated 0 sec ago", progress timeline
5. Driver accept → Active Job EN ROUTE TO PICKUP + Arrived at pickup CTA (screenshot `driver-active-job-mock.png`)
6. Offline/online toggle ke dono states verified

### D. Is walkthrough me fix hua

- **Tracking mock fixture** (`vendorBookingsApi.ts`) — mock session me tracking screen pehli baar poori live dikhti hai
- **Freshness counter tick** (`VendorBookingTrackingScreen.tsx`) — "updated N sec ago" ab har second tick karta hai (pehle sirf refetch par badalta tha); >45s par amber "checking for a newer fix…" warning

**Verified:** t1=2s → t+6s=4s counter tick (no refetch), Peach 0 errors, partner tsc 0.

### E. Improvement suggestions (user-perspective, priority)

| # | Suggestion | Kyun (user ki nazar se) | Priority |
|---|---|---|---|
| 1 | **ETA to pickup** tracking card par (distance/duration from Maps API) | Vendor sirf "en route" nahi, "5 min away" janna chahta hai — abhi sirf marker | P1 |
| 2 | **Location age badge map par** (chip: "live"/"12s old") | Sirf neeche text se pata chalta hai; map dekhte waqt awareness zero | P1 |
| 3 | **Push on accept/arrived** (vendor ko) — ab 5s polling | Assigned job par vendor ko turant pata chale ki driver ne accept kiya | P1 |
| 4 | Driver reporting frequency adaptive (12s → 5s jab EN_ROUTE) | Idle me battery bachao, trip me sharper tracking | P2 |
| 5 | **Stale-location auto-hide toast** ("Driver's network is weak") | Ab bas amber line; user ko samajh nahi aata ki aage kya hoga | P2 |
| 6 | Track screen se **call + cancel** ek card me | Do alag jagah — emergency me operations slow | P2 |
| 7 | **Trip history replay** (poora din ka rasta) | Dispute/payout proof ke liye vendor chahta hai | P3 |
| 8 | Driver side **battery/BG-location** honest banner | Background me permission deny hone par silent fail | P2 |

> Note: 1, 2, 3 backend nirdhar (Maps billing, FCM wiring) — UI-only nahi.
