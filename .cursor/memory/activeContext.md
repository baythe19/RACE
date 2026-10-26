# Active context

Updated: 2026-10-26 (night)

## Current focus

**2026-10-26 (logo overhaul, partner + customer):** Sab logo/splash/icon assets transparent-bg pe shift. (1) `race-logo-full/logo/splash-header/logo-transparent` (dono apps `src/assets/images/`) — white matte flood-fill se hata (script `/tmp/make_transparent.py`, backups `*.bak-white` same folder). (2) Partner+customer `app.config.js`: splash `splash-icon.png` + `backgroundColor '#FFFFFF'` (pehle `logo.png` + `#232323` black tha — user complaint); icon + adaptiveIcon foreground `icon-1024.png` (naya amber `#F5A800` rounded-square + gear-art logo, generate kiya), adaptiveIcon bg `#F5A800`. (3) Square logo Previously 64x64 forced — ab aspect-correct: customer `BrandLogo` (230/480), `AccountTypeScreen` top logo px(150), partner `LocationSelectorSheet.logo` 132x63. Partner `tsc` 0, customer `tsc` 0; Android bundle 200 (10.9MB). Partner Metro ngrok tunnel live: `exp://collision-modified-spur.ngrok-free.dev` (`EXPO_PACKAGER_PROXY_URL` env se `:8082` suffix bug fix — manifest ab clean URL deta hai). App-icon/splash config sirf native build (EAS/prebuild) me dikhega — Expo Go me purana icon rubber-band nahi hoga.

**2026-10-26 (test mode):** Build pause. Partner + backend only for manual/Expo Go test. Mongo+Redis up; backend `:3000`; partner Metro `:8082`.

**2026-10-26 (drop pay + vendor jobs):** Vendor towing jobs ± vehicle; assign needs ACTIVE vehicle. Drop: arrival → customer popup+notification → Cash/UPI/in-app → SMS OTP → driver OTP → complete. Backend, partner, customer `tsc` clean.

## Previous focus

**2026-10-27 (filter-pill bloat fix):** EMPTY-CENTER fix ne hi filter pills andar khinch liye tha — `content: flexGrow:1` + horizontal ScrollView = pills poori screen jäätthe. Fix: `content` flexGrow hata diya (VendorVehicles + Fleet Drivers); `empty` ko `flexGrow:1` (not flex) diya — empty centering bani rahegi, pills normal size. Side fixes ek purane bundle crash ke dauraan mile: `VendorAssignJobScreen` missing `cardTopRow` style add (duplicate mila, consolidated), duplicate removed; Metro cache clear + fresh sim `7784af46` pe "no errors". Note: peach reload cached broken page show karta raha — fresh `peach open` hi kaam aaya.

**2026-10-26 (already-submitted vendor flow):** Root cause: backend `vendorService.register` 409 "already submitted" deta tha, aur app Submit pe registry dubara call karta tha. Fixes: (1) `register` ab idempotent — pending/approved app ka data wapas (200/201), draft/changes_requested pe hi update. (2) `VendorReviewScreen.submit` pehle `getVendorStatus()` check karta hai — existing submitted/approved app → seedha `finishPartnerSignup` + PartnerMain. (3) Login `SKIP_OTP_AUTH` path — `isApprovedPartner` (profileCompleted + !onboardingRequired) → `goToPartnerMain()`, guru registration wizard. E2E: `+919812345670` (approved vendor) login OTP `onboardingRequired:false` + duplicate register 201 with original data. Backend restarted, tsc/app clean.

**2026-10-26 (summary tiles + empty states):** PartnerJobs vendor summary tiles सिकुए — icon 30, title 12.5, meta 9, count md, ताकि "Tap to review & assign" / "Assigned & underway" tile के अंदर दिखे। Empty states अब **vertically centered**: `AppScreenLayout` पर नया `growContent` prop (contentContainer flexGrow:1) + list/empty `flex:1, justifyContent:'center'` — PartnerJobs (No jobs yet / No trips yet), VendorVehicles, Fleet Drivers, Notifications, DriverJobs (司机 EmptyState तीनों segments). `PartnerScreenLayout` पहले से flexGrow tha. tsc 0, Peach no errors.

**2026-10-26 (fleet drivers UI):** `VendorDriverMembershipsScreen` rewritten in the Vehicles screen design — same header (back + "Fleet Drivers" + amber Add driver pill), 3 stat cards (Total / Available / On duty), search box (name/phone/code), filter pills (All / Available / On duty / Pending), identical card anatomy: amber initials thumb + extrabold name + driverCode badge + phone + city/joined/rating spec row + ⋮ menu, bottom row mini-avatar + status line + status pill (Pending / On duty / Available), type badge + Call + Assign job chip row. ⋮ opens the Vehicles-style bottom sheet (Assign to job / Call driver / Remove). Job picker sheet kept. Data = real memberships API. tsc 0, Peach reload 0 errors.

**2026-10-26 (expo-notifications redbox):** Android runtime पुराना — native `ExpoTopicSubscriptionModule` missing, जबकि `expo-notifications@57.0.24` आज install हुआ (barrel import तुरंत `requireNativeModule` call करता था)। Fix: `build/TopicSubscriptionModule.android.js` null-safe stub (`requireOptionalNativeModule` + no-op fallback), plus idempotent `scripts/patch-expo-notifications.js` wired as `postinstall`. Topic APIs app में unused. Proper fix eventually = fresh dev-client/preview build (expo prebuild). Metro index.ts import-order crash lines (260629→260422) बाकी cycle/eval frames थे — module अब load होता है।

**2026-10-26 (partner navigation):** Back/stack fixes — `VendorAssignJob` on Jobs+Drivers+Account stacks; assign success `goBack()`; Account tab re-tap → main; map: `mobile application/docs/PARTNER_NAVIGATION.md`.

**2026-10-26 (partner real backend mode):** `mobile application/.env` — preview flags off, API `http://localhost:3000`.

**2026-10-26 (dialog unification):** Zero `Alert.alert` in partner — `usePartnerDialog` hook; migrated 25+ screens; custom bottom sheets for doc-type/relationship pickers.

**2026-10-26 (driver trip gates):** Active job restores from server status. Completion requires drop arrival + customer payment confirm + SMS code. Driver app does not receive that code.

## Proven runbook — partner Metro via ngrok on phone (2026-10-26)

- Metro must know public URL: `EXPO_PACKAGER_PROXY_URL='https://<sub>.ngrok-free.dev' REACT_NATIVE_PACKAGER_HOSTNAME='<sub>.ngrok-free.dev' npx expo start --port 8082`
- Start ngrok AFTER Metro URL known; ngrok UI API `curl 127.0.0.1:4040/api/tunnels` for URL. Free static domain needs dashboard claim.
- Verify: `curl -H 'Accept: multipart/mixed' https://<sub>.ngrok-free.dev/` → manifest `launchAsset.url` must NOT contain `:8082`.
- cloudflared also installed `~/.local/bin/cloudflared` (free tunnel `--url http://127.0.0.1:8082`).

## Device-free preview

Peach browser sim: `docs/DEVICE_FREE_PREVIEW.md`; runbook `.cursor/memory/partner-run-steps.md`. Peach WebGL needs `--use-angle=swiftshader`; compositor 2D only — black screen = WebGL2 fail, use headless chromium + Xvfb absent → CLI driver.

## Quick refs

| Surface | URL / ID |
|---------|-----------|
| API (local) | `http://localhost:3000` |
| API (Render) | `https://race-api-w361.onrender.com` |
| Admin | `https://race-admin-six.vercel.app` |
| EAS partner | projectId `7ec95498-c8a2-44c4-a013-f7a44f95c367` |
| EAS customer | `@webstarts/race-service`, projectId `277981d5-5046-4288-8c91-672aab158419` |

## Branch

`v7.0.0-major-update` (fork `origin` = baythe19; upstream `teamwebstarts-cmyk/RACE`; PR #2 open — official merge pending user)

## Do not

- Push/merge to `main` / frozen release branches.
- Commit `.env` or secrets.
- Touch admin/backend for logo visual pass.
