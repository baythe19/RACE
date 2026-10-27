# Client document vs what is built

Senior 1-pager: [`CLIENT_DOC_VS_BUILD_SHORT.md`](CLIENT_DOC_VS_BUILD_SHORT.md).

Source of truth for “what the client asked”: root `clintdoc.md` (the file you shared).  
Source of truth for “what exists”: this branch `v2.0.1-cleanup` — customer app, partner app, admin web, backend.

Live production VM is still on old branch `release/13July26`. This report is about **the code in this workspace**, not a claim that production already matches it.

---

## How to read this report

| Label | Meaning |
|--------|---------|
| **Done** | Live screen + it actually saves / calls the API. Usable. |
| **Partial** | Screen or API exists, but a client point is missing, not saved, or only half-wired. |
| **Stub** | Looks built (button, page, “success”) but is demo / hardcoded / fake payment. |
| **Missing** | Client asked; we did not find it on the live path. |
| **Later** | Client listed it as future. Not a launch failure if the home screen only *shows* it. |

**Score** is 0–100 for that module: Done = 100, Partial = 50, Stub = 20, Missing = 0. “Later” items are **not** counted against the current-product score.

**Confidence:** High = file/API checked this session. Medium = related files support it. Low = thin evidence.

OVERALL_SCORE_LINE: 57 / 100

That is: **about half the written client spec is really working end-to-end.** Many more labels exist on screens (~three-quarters of names). Production-ready (real OTP, real pay, real QR scan, real tracking) is **lower** than 57.

SCORE_TABLE

| # | Client module | Score | Confidence | One-line reality |
|---|---------------|------:|------------|------------------|
| 1 | Customer App Registration | 78 | High | OTP + profile + vehicles work; PIN/password are demo; photo upload is weak |
| 2 | Customer Home Screen Services | 72 | High | Catalog matches; towing/driver *types* are mostly UI labels; roadside is strongest |
| 3 | Towing Service Vendor Registration | 69 | High | Company signup works; bank fields, MSME, real agreement, background check do not |
| 4 | Towing Vehicle Driver Registration | 38 | High | One combined driver form; documents collected then **not sent** to API |
| 5 | Full-Time Driver Registration | 28 | High | No separate flow; experience / languages / reference not live |
| 6 | Part-Time Driver Registration | 28 | High | No separate flow; hourly/daily/night/weekend availability not live |
| 7 | Subscription Module | 52 | High | Customer plan names match; paying is stub; vendor benefits almost unused |
| 8 | QR Emergency Vehicle Module | 42 | High | QR is generated; scanning is a fake tap, not a real camera decode |
| 9 | Admin Panel | 58 | High | Lists/approve/docs exist; live map, real money, honest reports do not |
| 10 | Future Expansion Modules | — | High | Correctly **Later**; listed on More Services, not bookable |

---

## Overall picture

**What is actually a product today**

- Three surfaces talk to one backend: **customer phone app**, **partner phone app** (vendor + driver), **admin website**.
- Customer can sign up with phone OTP (when skip is off), fill profile, add vehicles, get a QR image, book **towing / on-demand driver / four roadside jobs**, see a subscription picker.
- Partner can register as **company (vendor)** or **driver**, wait for admin, then see jobs (vendor can add fleet drivers/vehicles).
- Admin can list customers / vendors / drivers / bookings, approve partners, look at documents.

**What looks finished but is not**

- **Payments** (advance/final, wallet, admin finance) — stub.
- **PIN / password** — local demo, not real login.
- **QR scan for emergency** — animation + tap, no camera.
- **Live tracking** — Socket pieces exist; admin map is static; customer tracking is a scaffold.
- **Towing Instant / Emergency** and **driver Part-Time / Outstation / Night** — home cards exist; backend mostly does **not** store those types.
- **Full-time driver hire** — enquiry screen only, no booking.
- **Driver KYC documents** — upload UI, submit payload skips them.

**What the client said “later”** (Car wash, ambulance, EV, insurance, referrals, AI chatbot, Odia, etc.) — shown as coming soon. That matches the client’s *Future* list. Do not treat those as broken MVP unless you decide they are now in-scope.

Client file ends at “Recommended Launch Structure (MVP)” with **no MVP bullets**. So this report uses the numbered modules as the full ask.

---

## How the apps connect

```text
Customer app  -- phone OTP / JWT -->  Backend API  (:3000, nginx :80)
Partner app   -- phone OTP / JWT -->  same API  (vendor + driver routes)
Admin web     -- email + password -->  /api/v1/admin  (one hardcoded env admin)

MongoDB (Atlas)   = users, vehicles, bookings, vendors, drivers, plans
Redis             = OTP / rate-limit / cache
Socket.IO         = intended live driver GPS + booking status
Twilio + Gmail    = OTP SMS / email (prod Twilio trial already failed once)
```

| Journey | Client intent | Happening now? |
|---------|---------------|----------------|
| Customer OTP → profile → vehicle → QR | Yes | **Partial.** OTP skip is `true` in both apps (dev bypass). QR image yes; scan no. |
| Customer books towing → partner gets job → admin sees it | Yes | **Partial.** Booking creates `TowingBooking`. Assign mix of auto + vendor + admin. Admin also still has an old `Booking` list. |
| Customer books driver (4 types) | Four products | **Partial.** Full-time = enquiry. Other three = same booking, type not saved. |
| Roadside 4 jobs | Yes | **Mostly yes** (availability can mark some coming-soon). |
| Vendor KYC → admin approve → jobs | Yes | **Partial.** Company docs upload. Driver self-register docs not posted. |
| QR scan → call owner / SOS / towing | Yes | **No (stub scan).** SOS alert API exists from Call tab without a real QR. |
| Pay fare / commission / refund | Yes | **Stub.** Customer payment screen marks success locally. Admin finance is mostly seed numbers. |
| Live map for ops | Yes | **No on admin.** Partner can post location; customer track screens exist; not ops-live. |

**Important split:** mobile bookings use **TowingBooking** and **DriverBooking**. Some admin reports still count an older **Booking** collection. That is why admin numbers can look empty or wrong even when the apps have jobs.

---

## 1. Customer App Registration

Customer live path: `App.tsx` → `RootNavigator` → `AuthNavigator` + home tabs (`MainTabNavigator`).  
(`AppNavigator` / `MainNavigator` are leftover, not the live app.)

| Client point | Status | Score | What’s there | What’s left |
|--------------|--------|------:|--------------|-------------|
| Mobile number | Done | 100 | Login screen → send OTP | Turn off `SKIP_OTP_AUTH` for real OTP |
| OTP verification | Done | 100 | Verify OTP API | Same skip flag; prod Twilio trial 502 on unverified numbers |
| Full name | Done | 100 | Profile wizard | — |
| Email (optional) | Partial | 50 | Field exists | App **requires** email; client said optional |
| Gender (optional) | Done | 100 | Chips in wizard | — |
| Profile photo (optional) | Partial | 50 | URL text field | No camera/gallery upload |
| Date of birth (optional) | Done | 100 | Wizard | — |
| Emergency contact | Done | 100 | Number + name/relationship | — |
| Address | Done | 100 | Wizard | — |
| Create PIN / password | Stub | 20 | Settings PIN vs demo `1234`; change password = alert | Not used for login (OTP only); not stored on user |
| Vehicle registration (multi) | Done | 100 | Add first + add more | — |
| Vehicle type / number / brand / model / colour / fuel | Done | 100 | Forms + `Vehicle` model | — |
| Vehicle photo (optional) | Partial | 50 | Onboarding can take a URL | Later “add vehicle” has no photo |
| QR per vehicle | Done | 100 | Created on save; shown after add | Scan flow is a different module (weak) |

**Module score 78.** Work: real OTP, optional email, real photo, real PIN or drop it from the product story.

---

## 2. Customer Home Screen Services

Home loads the catalog from `/api/v1/services`. Seed names **match the client list** (19 services).

### A. Towing Service

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Instant Towing | Partial | 50 | Card + booking with no schedule. Backend has **no** “instant” flag |
| Scheduled Towing | Done | 100 | Sends `scheduledAt` |
| Emergency Towing | Partial | 50 | Same path as Instant. **No** emergency/priority on booking |

Equipment (flatbed / wheel lift) is an extra step the client doc did not name. Fine as extra; it must not replace Instant/Scheduled/Emergency.

### B. Driver Service

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Part-Time Driver | Partial | 50 | Books generic driver hire; type **not stored** |
| Full-Time Driver | Stub | 20 | UI → **enquiry only**, no booking API |
| Outstation Driver | Partial | 50 | Same booking as part-time |
| Night Driver | Partial | 50 | Same booking as part-time |

### C. Roadside Assistance

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Flat tyre | Done | 100 | Select → location → create roadside booking |
| Battery jump start | Done | 100 | Same |
| Fuel delivery | Done | 100 | Same |
| Minor repairs | Done | 100 | Same; API can mark coming-soon |

### D. Future Services (on home)

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Car wash, inspection, insurance, EV charging, ambulance, corporate fleet, pickup & drop, mechanic on demand | Later | — | Shown on More Services / seed `future`. Not bookable. Matches “future” in the client doc |

**Module score 72** (A+B+C only). Strongest customer booking area: roadside. Weakest: driver types and emergency towing as real products.

---

## 3. Towing Service Vendor Registration

Partner live path: `PartnerAppNavigator` → vendor wizard (business → address → documents → review).  
Role pick is only **Vendor** or **Driver** — not four partner types.

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Business name | Done | 100 | Submitted on register |
| Owner name | Done | 100 | |
| Mobile number | Done | 100 | From OTP |
| Email ID | Partial | 50 | Optional in app |
| Business address | Done | 100 | |
| Aadhaar | Done | 100 | Uploaded |
| PAN | Done | 100 | |
| GST (optional) | Done | 100 | Optional upload |
| Shop & Establishment | Partial | 50 | Called “Business Registration Certificate” |
| MSME / Udyam (optional) | Stub | 20 | Only in unused wizard config |
| Bank account details | Stub | 20 | No holder/account/IFSC form |
| Cancelled cheque | Done | 100 | Upload |
| Selfie verification | Partial | 50 | Profile photo mapped; no dedicated selfie step on live path |
| Agreement acceptance | Stub | 20 | `acceptTerms: true` hardcoded — no checkbox |
| Background verification | Stub | 20 | Admin stage in schema; partner does not go through a check |

**Module score 69.** Company onboarding is the best partner flow. Bank + legal agreement + background are the holes.

---

## 4. Towing Vehicle Driver Registration

There is **no** separate “tow truck driver” signup. It is the **same driver wizard**. Type is guessed from vehicle text (“tow” → Tow Driver).

Documents **are required on the documents screen**, then **Driver Review does not send them**. Submit is name, address, vehicle number, and RC stuffed into `licenseNo`. City is hardcoded **Bhubaneswar**. DOB collected, not sent. Emergency contact **missing**.

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Full name, mobile, address | Done | 100 | |
| Date of birth | Partial | 50 | UI only |
| Emergency contact | Missing | 0 | |
| Aadhaar, PAN, DL, photo | Partial | 50 | Collected, not posted |
| Commercial DL | Partial | 50 | Label is plain “Driving License” |
| Police verification | Missing | 0 | Not on self-register list |
| Medical (optional) | Missing | 0 | |
| Bank holder / account / IFSC | Stub | 20 | Passbook slot only; not in submit |
| Vehicle RC / number / type | Partial | 50 | Type yes; RC misused as license |
| Vehicle photos | Partial | 50 | Slot, not posted |
| Commercial permit, insurance cert, fitness, PUC | Stub / Missing | 10 | Backend knows some types; live form does not |

Vendor **fleet** “add driver / add vehicle” is a second, thinner form (type chips include Tow Driver). Still not the full client pack.

**Module score 38.** This is a top gap: KYC UI that does not reach the server.

---

## 5. Full-Time Driver Registration

Client asked a **dedicated** full-time driver pack (experience, previous employer, languages, reference, medical optional).

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Separate full-time signup | Missing | 0 | Combined wizard only |
| Name / mobile / address | Done | 100 | Shared driver form |
| DOB / emergency | Partial / Missing | 25 | Same as §4 |
| Aadhaar, PAN, DL, photo, police | Partial / Missing | 30 | Same as §4 |
| Years of experience | Stub | 20 | Schema / unused wizard |
| Vehicle categories driven | Stub | 20 | |
| Previous employer | Stub | 20 | |
| Languages known | Stub | 20 | |
| Bank details | Stub | 20 | |
| Medical (optional) | Stub | 20 | |
| Reference contact | Stub | 20 | |

**Module score 28.** On the **customer** side, hiring a full-time driver is also only an enquiry. Both sides of “full-time” are unfinished.

---

## 6. Part-Time Driver Registration

Same combined wizard. “Part-Time” only if vehicle type text contains `"part"`, or vendor fleet chip.

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Separate part-time signup | Missing | 0 | |
| Name / mobile / address | Done | 100 | |
| Emergency contact | Missing | 0 | |
| Documents | Partial | 50 | Same “not posted” issue |
| Hourly / daily / night / weekend availability | Stub | 20 | Schema only. Home “availability” = online for jobs, not these windows |
| Driving experience / vehicle categories | Stub | 20 | |
| Bank account + IFSC | Stub | 20 | |

**Module score 28.**

---

## 7. Subscription Module

### Customer

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Towing Basic / Premium / Family | Done | 100 | Same names in backend `DEFAULT_PLANS` + choose-plan screen |
| Driver Monthly / Corporate | Done | 100 | Corporate is more “contact us” than a paid pack |
| Pay for a plan | Stub | 20 | Subscribe API exists; money is not a real gateway |

### Vendor

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Reduced commission | Partial | 50 | Plan field + some commission math; **no partner subscribe screen** |
| Priority leads | Stub | 20 | Flag on plan seed; no routing |
| Featured listing | Stub | 20 | Flag only |
| Performance badge | Stub | 20 | Flag only |

**Module score 52.** Names match the client. Commercial behaviour does not.

---

## 8. QR Emergency Vehicle Module

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Unique QR per registered vehicle | Done | 100 | Saved on vehicle; shown after add |
| When scanned: contact owner | Partial | 50 | Copy on a dead/legacy screen; live scan does not decode a vehicle |
| Notify emergency contacts | Partial | 50 | SOS alert can notify; not tied to a scanned QR |
| Request towing | Partial | 50 | SOS / alerts, not a real towing booking from scan |
| Share emergency location | Partial | 50 | SOS alert with location |
| Access emergency assistance | Partial | 50 | Call tab SOS is real-ish API; QR page `handleScan` just opens SOS with **no camera** |

**Module score 42.** Generation is done. The client’s “when scanned” story is not.

---

## 9. Admin Panel

Admin live routes: dashboard, customers, vendors, drivers, bookings, financial, reports, subscriptions, notifications, settings. Login is **one email/password from server env**, not a staff-user table.

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Customer view / edit | Done | 100 | List + detail + create/edit/delete |
| Suspend accounts | Partial | 50 | Status in edit form; no clear Suspend action |
| Vendor approve / reject | Done | 100 | |
| Verify vendor documents | Done | 100 | |
| Driver approval | Done | 100 | |
| Driver performance monitoring | Partial | 50 | Rating shown; reviews list hardcoded empty; no KPI pack |
| Assign services | Partial | 50 | Assign driver works better than assign vendor; mixed old/new booking types |
| Track live status | Partial | 50 | Status timeline / dropdown. Map is **addresses**, not live GPS |
| Handle cancellations | Partial | 50 | Can set cancelled; dedicated cancel/refund API not what the UI uses |
| Payments | Stub | 20 | Stub gateway; finance page reads a ledger (often seed) |
| Commissions | Partial | 50 | Tab exists; not driven by live jobs |
| Refunds | Stub | 20 | “Razorpay pending” style stub |
| Subscription revenue | Partial | 50 | Tab; not real plan payments |
| Revenue / booking reports | Partial | 50 | Built, but often **legacy Booking only** — misses Towing/Driver jobs |
| Driver performance reports | Partial | 50 | Basic, not tied to new bookings |
| Customer analytics | Partial | 50 | Simple growth numbers |

**Module score 58.** Ops can approve people and open tickets. Ops **cannot** trust money or live map. Reports can lie because of two booking systems.

---

## 10. Future Expansion Modules

Client: add later without changing core.

| Client point | Status | Score | Notes |
|--------------|--------|------:|-------|
| Mechanic / ambulance / EV / car wash / insurance partner registration | Later | — | Not built as partner types |
| Fleet management / corporate accounts | Later | — | Catalog labels only |
| Referral & rewards / loyalty points | Later | — | Missing |
| AI chatbot | Later | — | Missing |
| Multi-language (English, Hindi, Odia) | Later | — | Settings may mention language; Odia not a product |

Showing these on More Services is enough **until you pull them into MVP**.

---

## Database vs client (simple)

| Client idea | In Mongo today | Gap |
|-------------|----------------|-----|
| Customer + profile + PIN | `User` (profile fields) | No PIN/password |
| Many vehicles + QR | `Vehicle` + QR code | Scan unused |
| Towing / driver / roadside jobs | `TowingBooking`, `DriverBooking`; roadside often rides towing | Instant/Emergency/driver-type not first-class; leftover `Booking` for admin |
| Vendor company + docs | `Vendor` + documents | Bank fields unused |
| Three driver products | One `Driver` + guessed `driverType` | FT/PT/tow not three registrations |
| Subscriptions | `SubscriptionPlan` / `UserSubscription` | Payment stub |
| Admin staff | `Admin` model | **Login ignores it** (env user) |
| Money | `Transaction`, `PaymentTransaction`, wallet | Seed + stubs |
| SOS | Notifications from alert | No dispatch centre |

Production Atlas URI has **no database name**, so the live server has logged **`database: test`**. Education/local must not copy that blindly.

---

## Work queue

### Treat as done (keep, don’t rebuild)

- Customer OTP screens, profile (name, gender, DOB, address, emergency), multi-vehicle core fields, QR **generation**
- Home catalog including future **names**
- Roadside four bookings
- Scheduled towing
- Customer subscription **plan names**
- Vendor company name/owner/mobile/address + Aadhaar/PAN/GST/cheque
- Admin customer/vendor/driver lists, vendor/driver approve, document review

### Started — must finish (highest value)

1. Driver registration: **post the documents** (and DOB, emergency, real license).  
2. Persist **towing mode** (instant / scheduled / emergency) and **driver type** on the booking.  
3. Real **QR camera scan** → owner / SOS / towing.  
4. **Payments** (or honestly hide pay buttons).  
5. Admin **reports + finance** on Towing/Driver bookings, not only legacy `Booking`.  
6. Turn off **`SKIP_OTP_AUTH`** for any real test; fix Twilio (trial vs verified numbers).  
7. Customer **full-time driver** = real product or remove from bookable home.  
8. Live tracking: finish customer map **or** don’t promise it; admin map if ops need it.  
9. PIN/password: implement or remove from onboarding story.  
10. Vendor bank + agreement checkbox.  
11. Mongo database name (not `test`). `APP_BASE_URL` on VPS is still a laptop LAN IP.

### Not started (client asked now, not “later”)

- Separate full-time / part-time / tow-driver registration packs  
- Part-time availability windows  
- Full-time experience / languages / reference  
- MSME, fitness, PUC, commercial permit as first-class  
- Vendor subscription benefits in the partner app  
- Background verification process  
- Dedicated customer suspend control  
- Real refunds / commissions from live jobs  

### Later (client said later — don’t start unless you expand scope)

- Mechanic / ambulance / EV / wash / insurance partners  
- Corporate fleet, referral, loyalty, AI chatbot, Odia  

---

## Suggested order if we start fixing

1. **Honesty pass** — OTP skip, stub payments labelled, fake QR scan, driver docs not uploaded.  
2. **KYC pass** — driver (and remaining vendor) fields the client listed.  
3. **Booking truth pass** — types saved; admin sees the same jobs the phones create.  
4. **Money + tracking** — only after 1–3, or they will be built on the wrong data.

---

## Confidence and limits

- Compared against `clintdoc.md` and live navigators/APIs on `v2.0.1-cleanup`.  
- Did not click every admin button in a browser for this pass.  
- Did not treat `docs/client/CLIENT_FEATURES.md` as the client ask (that file describes the build; it is optimistic vs this audit).  
- Production logs (Twilio 502, Mongo `test`, LAN `APP_BASE_URL`) are extra ops facts, not extra client features.

This file is the single review copy. Issue list for later sprints can be copied from **Work queue** without re-auditing from scratch.
