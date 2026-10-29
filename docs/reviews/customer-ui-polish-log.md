# Customer UI polish log

> Living checklist so we do not miss screens.  
> Branch: `v2.5.2-development`  
> Started: 2026-10-04  
> Source review: [customer-app-ui-ux-review.md](./customer-app-ui-ux-review.md)

## Work order (screen-by-screen)

| # | Screen / flow | Status | Notes |
|---|---------------|--------|-------|
| 1 | Splash → Onboarding carousel (image slides) | **Done** | Soft crossfade + refined slides (cropped existing photos, lighter type, feature chips, gold Next) |
| 2 | Splash → Login (AccountType) | **Done** | Same soft exit→enter; `initial: true`; AccountType back → Splash |
| 3 | AccountType (Get Started / Already a User) | **Done (transitions)** | Soft enter; form steps use `slide_from_right`; back button |
| 4 | MobileNumber (login / signup phone) | **Done (transitions)** | `slide_from_right`; back → AccountType or Splash |
| 5 | OtpVerification | **Partial** | Fade + back already wired; **live path skips OTP** (`SKIP_OTP_AUTH = true`) — UI polish later when OTP re-enabled |
| 6 | ProfileWizard / AddFirstVehicle | Pending | Next after auth entry polish |
| 7 | Home / Services | Pending | From UX review P0 honesty items |
| 8 | Booking funnels | Pending | |
| 9 | Profile / SOS / QR | Pending | |

## Recheck — Splash + onboarding (2026-10-04)

Verified in code (`tsc --noEmit` clean):

| Check | Result |
|-------|--------|
| Native Splash↔Auth animation | **`none`** + Auth `presentation: 'transparentModal'` |
| No white flash between Splash → Onboarding | Splash stays painted; SoftScreenFade crossfades over it (no exit-to-white) |
| No scale / bubble / vertical jump | SoftScreenFade + matched translucent StatusBar |
| Splash Get Started → `Onboarding` with `initial: true` | Present |
| Splash Login → `AccountType` with `initial: true` | Present |
| Onboarding horizontal `pagingEnabled` FlatList | Present |
| Next / swipe / dots move slides both ways | Present |
| Hardware back: slide→prev, first→leave onboarding | Present |
| Leave onboarding: Auth `goBack` first (AccountType path), else Splash | **Fixed on recheck** |
| Onboarding → AccountType (“Let's Go” / Skip) | Fade (Auth stack 200ms) |

## Recheck — Login / signup (2026-10-04)

Live path (not leftover `LoginScreen` / `CreateAccountScreen`):

```
Splash
  ├─ Get Started → Onboarding → AccountType → MobileNumber → (OTP skipped) → profile…
  └─ Login       → AccountType → MobileNumber → (OTP skipped) → …
```

| Check | Result |
|-------|--------|
| Auth stack default `animation: 'fade'` (200ms) | Present — covers AccountType ↔ MobileNumber ↔ OTP |
| AccountType → MobileNumber (signup + login) | Same `MobileNumber`; signup sets Redux path |
| MobileNumber back | Auth goBack, else parent → Splash |
| AccountType back to Splash | **Added** visible back when parent can pop |
| OtpVerification back | `goBack` present (screen unused while SKIP_OTP) |
| Leftover `LoginScreen` / `OTPScreen` / password screens | **Not in live AuthNavigator** — do not polish until deleted or quarantined |

## Intentionally not done yet (do not forget)

- [ ] Splash still uses invisible hotspot CTAs on stretch bitmap (UX review P0) — transition-only this pass
- [ ] Re-enable OTP UI when product asks (`SKIP_OTP_AUTH`)
- [ ] AccountType IA/copy polish (Get Started vs Already a User both → phone)
- [ ] Photo URL / gender default in ProfileWizard
- [ ] Home “Book now” / Request Help honesty
- [ ] Quarantine MainNavigator leftovers

## Files touched (this UI polish thread)

- `customer application/src/screens/auth/SplashScreen.tsx`
- `customer application/src/screens/auth/OnboardingScreen.tsx`
- `customer application/src/screens/auth/AccountTypeScreen.tsx`
- `customer application/src/screens/auth/MobileNumberScreen.tsx`
- `customer application/src/navigation/RootNavigator.tsx`
- `customer application/src/navigation/AuthNavigator.tsx`

## Profile stack polish — 2026-10-27/29 (agent session)

Scope requested by user: Profile page (head card + wallet + menu), and header
consistency across Personal Information / My Vehicles / all profile stack
screens. Source material: 9 live screenshots from the user's iOS simulator.

### Round 1 — Profile page structure

| # | Item | What changed | File |
|---|------|--------------|------|
| 1 | Profile head card | Avatar left; name 16px extrabold + inline pencil edit; phone and email as clean grey lines below; Verified badge moved into the left column with a subtle green border; Premium block converted from a split column plus divider into a standalone gold pill on the right | `ProfileScreen.tsx` |
| 2 | Wallet card | Grey flat box → brand gold-tinted card: rupee icon inside a white circle on the left, balance in 19px extrabold dark text (was small orange), and a "Top Up" pill button on the right (same Payment Methods destination) | `ProfileScreen.tsx` |
| 3 | Header unification | `AppStackHeader` rewritten to match `TabRootHeader` (the Bookings header): 18px extrabold left-aligned title, 11px grey subtitle directly beneath, matching line heights and paddings. Previously the title was centered, which clashed with every tab page | `AppStackHeader.tsx` |
| 4 | Reach | All 14 profile sub-screens (Personal Information, My Vehicles, SOS Details, Saved Locations, Payment Methods, Notifications, Help & Support, QR, Settings, Change mobile/password/PIN, subscription screens) inherit the new header automatically; auth flow (`AuthFormLayout`) also uses it | layout + screens |

### Round 2 — UX defects from live testing (9 screenshots)

| # | Defect observed | Fix |
|---|-----------------|-----|
| 1 | Tapping Date of Birth opened the calendar **and** the text keyboard stayed open on top (screenshot pair) | `FormField.tsx`: picker-style fields (`onPress` present) now set `showSoftInputOnFocus={false}` and `focusable={false}` — the keyboard can never open for read-only fields, and any previously open keyboard blurs when the picker opens |
| 2 | Gender used a native `Alert.alert` action sheet; Relationship likewise; both also fought with the keyboard | New `SelectOptionModal` — a centered dialog in the same design language as the DOB calendar (white card, rounded 18, options with a gold border and check mark on the selected value, Cancel row). Gender on Personal Information and Relationship in Emergency Contact now use it |
| 3 | Back arrow inconsistent across headers — some bare, some inside an outlined circle | Removed the circle/border; every stack header now shows the plain `ArrowLeft` (22px, dark, 2.4 stroke) — user directive: "कहीं पे भी outline नहीं होना चाहिए, सिर्फ back arrow" |
| 4 | Premium pill rendered wrapped onto three lines with a stray chevron | Compact pill: crown icon + single-line "PREMIUM" label (8.5px bold, numberOfLines=1), chevron removed |
| 5 | Verified badge too rounded | Radius 12 → 6 (square-ish), label shortened to "Verified" |
| 6 | Large avatar icon felt odd next to no photo | Kept as the avatar placeholder (UserRound in gold circle, 62px) — placeholder is intentional; it only appears when no photo is uploaded. Sized so the card contents align |

### Verification

- `tsc --noEmit` on customer app: **clean for all files touched in this session**
  (two pre-existing errors exist in `BookingFlowHeader.tsx` /
  `TowingAdvancePaymentScreen.tsx` from a parallel booking-flow workstream —
  not introduced here)
- Metro bundle build: 200 on port 8081
- Backend untouched in this round; admin panel untouched in this round

### Open items carried forward (from user, not yet done)

- [ ] Page-to-page **transitions** should use a professional standard animation
      across the profile stack (partially exists for auth stack: `slide_from_right`)
- [ ] Any screen still showing **mock data** must show real data, with a loader
      while loading and a proper empty/error state when the API fails
- [ ] My Vehicles screen: header now consistent, but the list/cards themselves
      have not been re-polished in this pass
- [ ] Payment Methods: gold wallet banner exists; card list empty state could
      use the same Treatment as the wallet card (gold icon circle)

### Context ledger — screenshots ↔ fixes (nothing dropped)

| Screenshot (user, 2026-10-29 ~00:22–00:35) | What it showed | Covered by |
|-------------------------------------------|----------------|-----------|
| 1. Profile page ( notifications row highlighted ) | Head card misalignment, Premium split-column, flat wallet | Round 1 items 1–2 |
| 2. Payment Methods | Gold banner already fine; noted for list state | Open item, carried forward |
| 3. Personal Information (form top) | Header centered vs Bookings; fields fine | Round 1 item 3 |
| 4. Bookings page (reference — copy this header) | 18px extrabold left title + grey subtitle | Round 1 item 3 (matched) |
| 5. DOB calendar + keyboard both open | Keyboard did not close on picker open | Round 2 item 1 |
| 6. DOB calendar closed state (clean) | Confirmed desired end state | Round 2 item 1 (achieved) |
| 7. Select Gender native alert | Alert-based picker felt cheap | Round 2 item 2 |
| 8. Select Relationship native alert | Same as above, plus keyboard behind | Round 2 items 1–2 |
| 9. Relationship picker over keyboard | Same root cause as 5 | Round 2 items 1–2 |


### Round 3 — Page transitions + edit redirect (2026-10-29, user feedback)

User report: moving between pages felt "घटिया" — one page floating over
another instead of a proper push; and saving an edit (e.g. Personal
Information) did not return you anywhere sensible.

| # | Change | Where |
|---|--------|-------|
| 1 | Every stack now uses the professional standard push: `animation: 'slide_from_right'`, 280ms, `gestureDirection: 'horizontal'` — new card slides in from the right, previous page eases left. Applied to **Profile (16 screens), Bookings, Call, and the shared `stackScreenOptions`** (Home + Services inherit) | `AppNavigator.tsx` |
| 2 | Personal Information save → profile store refreshed (`fetchProfile`) → "Saved" alert OK → **`goBack()` to Profile**, so the edited data is visible immediately. Standard form-pop flow | `PersonalInformationScreen.tsx` |

Verification: `tsc --noEmit` clean (excluding the two pre-existing
booking-flow errors), Metro bundle 200.

Note: profile stack previously had NO animation config — it used the native
default (modal-ish float on iOS), which is what the user described as "one
page over another".

### Round 4 — half-screen slide artifact + keyboard scroll (2026-10-29)

User screenshot during Profile → Personal Information push showed the new
page sliding over a **half-rendered previous page** (skeleton) — looked broken.

| # | Finding | Fix |
|---|---------|-----|
| 1 | Profile stack had no `contentStyle` background — during the slide the transparent gap exposed the previous skeleton | `contentStyle: { backgroundColor: colors.background }` + `animationTypeForReplace: 'push'` on Profile stack and shared stack options |
| 2 | Inputs could hide behind the keyboard — `keyboardAvoiding` was opt-in and only AddVehicle/PersonalInformation passed it | `ProfileSubScreenLayout` now **defaults `keyboardAvoiding = true`** (forms everywhere get it; screens without inputs can opt out). `AppScreenLayout` KAV documented — iOS padding, native adjustResize on Android |
| 3 | Keyboard must never open for read-only pickers (kept from round 2) | Already covered by `showSoftInputOnFocus={false}` + `focusable={false}` in FormField |

Verification: `tsc --noEmit` clean (excluding 2 pre-existing booking-flow
errors), Metro bundle 200.

### Round 5 — Vehicle screens keyboard flow (2026-10-29)

User: "vehicle page me har input, har form keyboard ke saath properly respond kare — kuch bhi gadbad nahi hona chahiye."

| Screen | What was fixed |
|--------|----------------|
| AddVehicle | 3 टेक्स्ट inputs (Number → Brand → Model) में **next-flow** wired: `returnKeyType` next/done, `submitBehavior`, `onSubmitEditing` अगले इनपुट पर फोकस, आखिरी (Model) से सीधे **submit**। Number field: `autoCorrect={false}`। Custom Color: पहले बेकार Alert आता था → अब "More" टैप करते ही input दिखता है और **ऑटो-फोकस** होता है (120ms setTimeout)। सब inputs में `autoCorrect={false}` |
| EditVehicle | Field component अपग्रेड: ref + `returnKeyType` + `submitBehavior` + `onSubmitEditing` सपोर्ट। Number → Brand → Model → Color → submit **चेन** कि गई। `keyboardShouldPersistTaps="handled"` पहले से था ✅ |
| Layout | `AppScreenLayout` का स्क्रॉलव्यू `keyboardShouldPersistTaps="handled"` पहले से है ✅; `ProfileSubScreenLayout` डिफ़ॉल्ट `keyboardAvoiding: true` (राउंड 4) से AddVehicle/EditVehicle कवर हैं |

टाइप-चेक क्लीन है (2 पहले से मौजूद बुकिंग-फ़्लो त्रुटियों के अलावा)। मेट्रो बंडल 200.

### Round 6 — My Vehicles list + Add Vehicle form redesign (2026-10-29)

User screenshots: list page cards खिंचे हुए (QR badge title के ऊपर, Add card नीचे बड़ा), Add form
flat/unorganized list जैसा।

**My Vehicles list:**
| Change | Detail |
|--------|--------|
| Add button → header right | Gold pill "＋ Add Vehicle" अब header में (हमेशा दिखता है, scroll करने पर भी) |
| Add card → empty-state only | बड़ा dashed "Add your first vehicle" कार्ड सिर्फ तब जब कोई vehicle नहीं — vehicles हों तो duplicate कार्ड नहीं |
| Card interior | QR chip अब right column में नीचे (Primary badge के नीचे clear gap), title के ऊपर नहीं; image 96→84; action row (View QR | Edit) को top border के साथ footer-style |
| QR info banner | आखिर में रहता है, spacing normalized |

**Add Vehicle form — organized sections:**
| Section | Contents |
|---------|----------|
| 1. Vehicle identity | Type grid, Subtype chips, Number, Brand, Model |
| 2. Colour & fuel | Color picker + custom, Fuel chips |
| 3. Photo | Dashed upload area |

हर section एक bordered card में (`styles.sectionCard` — bg, border, radius 16, padding 14)।
SectionLabel अब uppercase 13px extrabold headings।

Fixes during restructure: missing `StyleSheet` import (crash would happen at render),
section card closes balanced. tsc clean, Metro bundle 200.

### Round 6b — visible spec chips (2026-10-29)

User: "UI same hi dikh raha hai" — round 6 के structural changes को visible
में translate किया:

- Vehicle card specs (fuel / color / type) अब **grey chip badges** हैं
  (चपटे टेक्स्ट की जगह गोल पट्टियाँ) — कार्ड अब बहुत अधिक structured दिखता है
- View QR अब गोल्ड + Edit गहरा, बीच में डिवाइडर।
