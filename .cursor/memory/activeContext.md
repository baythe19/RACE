# Active context

Updated: 2026-10-16

## Current focus

**Vendor (partner) app UI flow check — done 2026-10-16.** Full flow audited live in Peach sim (docs/DEVICE_FREE_PREVIEW.md) against `partner app/flow.md` boards: Welcome → Vendor demo login → Dashboard → Jobs → Assign Job → Vehicles (list/menu/Add) → Drivers (list/Add 2-step). Backend untouched (UI preview mode).

## Vendor UI fixes shipped (2026-10-16, branch 3.5.0-new-driver-screeens, tsc exit 0, all verified in sim)

1. `PartnerScreenLayout.tsx`: footer/bottomBar overlap fix — scroll content paddingBottom now measures real overlay height via onLayout (Assign screen "Approve" bar was covering the last vehicle card).
2. `VendorDriversScreen.tsx`: Add-Driver step-1 now uses the shared `validate()` + inline red error banner ("X (+N more field(s) need attention)") next to Continue; removed duplicated local validation. Step-2 shows required-documents banner + submitCreate blocks with Alert when required docs (license, Aadhaar, police verification) are missing.
3. `mockPartnerData.ts`: MOCK_JOB_OFFERS status DRIVER_ASSIGNED → ACCEPTED — Home "Incoming leads" no longer shows vendor-unapproved bookings as if a driver were already on them (flow.md: no duplicate/contradictory state between Home and Jobs).
4. **Board-match redesign (`race-vendor-ui-implementation-prompt/reference-images/01…png`):** `PartnerHomeScreen.tsx` rebuilt to the reference board — leads module (truck badge, "N new leads", View-all→), lead cards (VehicleTypeArtwork thumb, #ref, pickup→drop, outline "Review lead" pill, ₹/Est. Fare right col), earnings card ("Total earnings (this week)" + This-week pill + big ₹ + growth% + SVG sparkline w/ area fill, dashed baseline, peak dot, Mon–Sun), 3 separate white fleet tiles (Drivers/Vehicles/Jobs w/ colored dot status), shortcut chips row (Manage drivers/vehicles/Verification), header "Vendor Fleet" pill removed (avatar name+chevron only). `PartnerJobsScreen.tsx`: compact filter chips (all 6 visible: All/New/Nearby/Assigned/In progress/Completed, horizontally scrollable).
5. Honest-data rule kept: growth% only when today>0 && baseline>0; chart only when totals exist; no fabricated numbers.
6. **User refinement round (2026-10-16 evening) — `PartnerHomeScreen.tsx`:** removed `shadows.card` from all vendor Home cards (bellBtn, earningsCard, actionCard, statusCard, fleetTile — border-only cards now, per user "shadow bahut extra"); earnings chart made full-bleed (`chartBlock` negative margins -16px to cancel card padding, width 328, days-row padded); header per board (bell red-dot badge when leads>0, avatar 30px, name 12px firstName-only — was full "Bikram Keshari Rout" 117px). Cached-bundle note: header changes needed Metro restart with `--clear` + fresh `peach open` to show; plain `peach do reload` served stale bundle.

## Peach sim operating notes (2026-10-16)

- Sims die when their host browser/playwright tab closes; a stray `peach use` on a dead id fails. Recovery: `DISPLAY=:99 peach open 8082` (Xvfb must run: `Xvfb :99 -screen 0 1280x900x24 &`), then `peach list` → `peach use <live id>` → `peach wait ready`. Multiple stale sims pile up; pick the one that shows the app (`peach describe` contains "RACE"/lead text).
- Hot reload after edits: usually automatic; force with `peach do reload`. Metro restart (`pkill -f "expo start --port 8082"` then `npx expo start --port 8082`) kills all sims — reopen needed. `--clear` flag + pkill combo killed the new process too; avoid.

## ⭐ PROVEN RUNBOOK — partner app UI in user's browser (2026-10-16 pm, user-verified)

This is the ONLY sequence that worked. Follow it exactly next time; do not improvise.

**Why previous attempts failed (do not repeat):**
- Redbox "could not reach fetch proxy at https://127.0.0.1:33059" = the per-open fetch proxy died. Cause: `peach open` run inside a piped/`timeout`-wrapped shell command got killed when the command ended, taking the proxy with it. **Fix: run `peach open` detached (`nohup … & disown`).**
- Short URL `http://localhost:7668/rn/8082` lands on the dev-client "Connect / No dev servers found" screen — dead end, never use it.
- In-sim "React Native" dev-client icon + typing port/URL (even 8082) never connects (dev-client scan can't reach Metro from the sim). Never use.
- `peach dev` does NOT exist in CLI 0.1.1594; `peach preview` needs Peach login. Both dead ends.
- `peach shell`/positional sim args silently open NEW sims; always target with `--sim <id>`.

**Runbook (each step verified):**
1. Metro: `cd "mobile application" && nohup npx expo start --port 8082 > /tmp/metro-8082.log 2>&1 & disown` — detached, or it dies with the terminal. Check: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8082/status` → 200.
2. Fresh sim + stable URL: `cd "mobile application" && nohup peach open 8082 --no-describe > /tmp/peach-open.log 2>&1 & disown` (detached keeps the fetch proxy alive). Grab URL: `grep -oE '"url": "[^"]+"' /tmp/peach-open.log | cut -d'"' -f4`. This is a `302e…runtime.localhost:7668` URL with `fetchProxyOrigin` + `bundle=` params — it changes every run, never bookmark it.
3. Show user: navigate the CURSOR BROWSER (browser_navigate, `position: "active"` so the tab is visible) to that full URL. User watches this tab; do NOT involve Simple Browser.
4. Verify: `peach list --all` → newest sim (`loaded: bundle …8082`), then `peach describe --sim <id>` → expect "RACE" / "PARTNER" / "Bikram" text. `peach get errors 3 --sim <id>` → empty. First load ~60 s (bundle compiles); if redbox, tap-text "Retry" once, else re-run step 2.
5. If Metro was down when redbox appeared: restart Metro (step 1) and redo step 2 (URL is proxy-bound; old URL dies with its proxy).
6. Drive the app via `peach do tap-text --sim <id> …`, screenshot via `peach screenshot --sim <id> out.png`. Confirm screen before claiming success.
- Useful: `peach close <id>` for zombie sims (docs: piled-up sims starve the box). `peach claim` (600 s lease) helps but sims still die if their host tab closes.

## Vendor UI issues found, NOT fixed (pending user call)

- Home vs Jobs same-booking duplication: Home lead card #TOW-10048 also exists in Jobs list (IN PROGRESS). flow.md says leads and assigned jobs should not repeat across sections. Needs a product decision on canonical filter (offers endpoint already excludes? mock-only?).
- Vehicle card shows type 3× (badge chip + "Tata 407 • Flatbed" + meta row). Cosmetic dedupe candidate.
- Native modules are disabled in Peach (expo-image-picker/camera/document-picker upload sheet may not fully work in sim preview), so document upload via file-picker could not be exercised beyond UI.

## Customer app UI/UX (standing)

Redesign one screen at a time when the user names it. Design source is `.agents/uiux/`. Preserve behavior, APIs, and navigation unless the user asks otherwise.

## Branch

`v2.5.2-development`

## Last done

- 2026-10-07: Service nav header is shared (`ServiceNavHeader`) across Services, Towing, Driver, Roadside, and More. Detail heroes use the same artwork card as the Services list (`ServiceCategoryArtCard`).

## Last done (user-confirmed design)

Already redesigned and treated as the visual baseline:

- Onboarding
- Sign up
- Sign in
- Home
- Service pages (Services, Towing, Driver, Roadside, More, location picker)

Do not restyle those unless the user asks.

## Next

Wait for the next named customer screen. Before coding: screen goal, one primary CTA, keep/remove, states, then implement against existing theme tokens.

## Device-free preview (added 2026-10-16)

No phone needed for app preview anymore: **Peach browser simulator** — setup, daily commands, agent/QA verbs, and gotchas live in `docs/DEVICE_FREE_PREVIEW.md`. Proven on the customer app (onboarding + taps + live API). Partner app doctor-checked same day (13 supported, only expo-location 80% / expo-status-bar inert); later that day the full partner flow was driven end-to-end in Peach (welcome → vendor login → mock login → dashboard → jobs → accept trip; use `peach claim` to stop sim auto-close, map tiles stay blank).

## Design tokens (customer)

Primary `#F5A800`, page `#FFFFFF` / `#F7F7F5`, text `#1A1A1A` / `#666666`, success `#22C55E`, error `#EF4444`. Spacing `screenPadding 20`, button height `54`, card radius `20`. Tabs: Home, Bookings, SOS (Call), Services, Profile.

## Quick refs

| Surface | URL / ID |
|---------|-----------|
| API | `https://race-api-w361.onrender.com` |
| Admin | `https://race-admin-six.vercel.app` |
| EAS | `@webstarts/race-service`, projectId `277981d5-5046-4288-8c91-672aab158419` |

## Do not

- Touch partner, admin, or backend for this design pass.
- Push/merge to `main` or old release branches.
- Invent backend fields or fake capabilities for visual reasons.
- Commit `.env` or secrets.
