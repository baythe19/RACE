# Progress

## Done (partner day-one logic — 2026-10-26)

- [x] Pending review no longer blocks jobs, going online, or adding a vehicle
- [x] Vendor feed and assignment are towing-only, and empty until an active vehicle exists
- [x] Fleet drivers do not see open offers; they take vendor-assigned jobs only
- [x] Backend and partner `tsc` clean; offer-routing audit passed
- [ ] Live GPS, SMS OTP, and UPI were not run

## Handoff (in-app driver navigation — 2026-10-20)

- [x] Bhopal mock route, in-app turn-by-turn, single OTP, drop navigation, call-only trip sheet
- [x] MCP reconnect notes: `docs/ops/CURSOR_MCP_SETUP.md`
- [ ] Job completed summary after Complete job confirm
- [ ] Off-route wrong-turn retest
- [ ] Weak GPS sheet

## Done (partner mock APK audit — 2026-10-20)

- [x] Read-only EAS/Expo check: SDK/packages OK; mock SIP APK **not** ready (no EAS project, `__DEV__` kills preview, `eas.json` missing mock env). Build not started.

## Done (partner preview data — 2026-10-20)

- [x] Driver and vendor preview screens load fixtures immediately: jobs, notifications, earnings, payouts, fleet, bank

## In progress (customer UI redesign — 2026-10-07)

- [x] Design skill loaded: `.agents/uiux/SKILL.md`, `MOBILE_APP_PATTERNS.md`, `AGENT_QUICK_RULES.md`
- [x] User-confirmed done: onboarding, sign up, sign in, Home, service pages
- [ ] Remaining screens: one at a time, only when named (bookings, SOS, profile, booking flows, and others)

## Done (wizard hero lift + stepper gap — 2026-10-04)

- [x] Lifted step 1–3 heroes further above the overlapping card
- [x] Added gap between 1-2-3 stepper and title/subtitle on all three pages

## Done (profile wizard design match — 2026-10-04)

- [x] Blend hero SVGs into `#FFFEFC` behind RACE SERVICE / 1-2-3; no hard top line
- [x] Larger heroes, card moved down, more field gap
- [x] Removed Android elevation + opacity flash on Continue
- [x] Emergency `+91` prefix; vehicle type chips with icons in 3+1 layout
- [x] Gold CTA no longer uses unsupported SVG `%` height

## Done (customer UI polish — 2026-10-04)

- [x] Login/signup pixel layout from latest App.js; OTP screen matched to same cream/gold language
- [x] Login + Create account UI on `MobileNumberScreen` from supplied cream/road design (OTP flow unchanged)
- [x] Onboarding leftover bottom gap: content `space-between` + fuller 2-line subtitles on all 4 slides
- [x] Deep UI/UX review logged: `docs/reviews/customer-app-ui-ux-review.md`
- [x] Living polish checklist: `docs/reviews/customer-ui-polish-log.md`
- [x] Splash ↔ Auth soft fade; Onboarding paged slides (forward/back)
- [x] Login/signup path recheck: AccountType + MobileNumber fade + back → Splash
- [x] Fixed Onboarding leave: Auth stack back before popping Splash

## Done (v2.0.1-cleanup)

- [x] Map the inherited repo and freeze old branches
- [x] Put `release4Aug2026` code onto `main` (merge commit; trees match)
- [x] Delete leftover remote feature branches
- [x] Remove `customerweb/`, `partnerweb/`, `web application/`, `race-service/`
- [x] Agent rules + skills + memory bank
- [x] Unlazy skill vendored for long-task gates
- [x] Complementary skills: brainstorming, systematic-debugging, verification-before-completion, requesting-code-review, security-and-hardening
- [x] GCP IAP SSH to `race-server`; copied gitignored `.env`; log snapshot in `docs/ops/vps-snapshot-2026-09-05.md`
- [x] Client doc vs build gap report: `docs/client/CLIENT_DOC_VS_BUILD.md`
- [x] Local MongoDB container initialized and running on port 27017
- [x] Backend, Admin Web, Customer Mobile, and Partner Mobile dependencies installed and typechecked
- [x] Database seeded with platform data and demo drivers
- [x] All 4 services running concurrently in Codespace (ports 3000, 3001, 8081, 8082)
- [x] Customer mobile app upgraded to Expo SDK 57 for compatibility with latest Expo Go app
- [x] Seamless Codespace-to-phone tunnel configured with ngrok; documented in `docs/CODESPACE_PHONE_CONNECTION_PLAYBOOK.md`
- [x] Universal Mock OTP (`123456`) and full mock testing suite seeded and validated

## Known gaps (product — not started this branch)

- [ ] Real payment gateway (booking payments are stubs)
- [ ] Automated tests (`backend/src/__tests__` empty)
- [ ] Dual booking models (legacy `Booking` vs `TowingBooking`/`DriverBooking`)
- [ ] Customer-app leftover navigators/screens (kept on purpose)
- [ ] `SKIP_OTP_AUTH = true` on both Expo login screens
- [ ] Live map tracking still a scaffold
- [x] Customer auth sign-in/sign-up visual refresh implemented from supplied reference; typecheck + Android export pass

## Blocked

Nothing. Waiting on the next product task from the user.

- 2026-10-28: Customer UI QA FAB live at App root; OTP whitelist 9876543210→123456 API-verified; tsc 0.
