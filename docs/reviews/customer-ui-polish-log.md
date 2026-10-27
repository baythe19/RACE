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
