# Gates: vendor vehicles screen pixel-match (board 02)

OWNS: "mobile application/src/screens/partner/VendorVehiclesScreen.tsx", "mobile application/src/navigation/PartnerNavigator.tsx", "mobile application/src/components/navigation/StackBackButton.tsx", GATES.md

Scope: Match the Vendor Vehicles screen to the second reference board — truck image artwork in cards + stats icons, compact stat tiles (no gap), stacked header (back + centered title + Add vehicle), no outline box around back arrow, tighter card layout — with typecheck + lint + sim verification.

- [x] G1: Partner mobile TypeScript compiles after the screen changes.
  CHECK: (cd "/workspaces/RACE/mobile application" && npx tsc --noEmit) && echo VEHICLES_TSC_PASS
  EXPECT: VEHICLES_TSC_PASS
  EVIDENCE: manual — ran 2026-10-17 via Shell: `npx tsc --noEmit` exit 0, output `VEHICLES_TSC_PASS` (no errors). Verified alongside G2/G3 in one run; not run through gate-check.mjs (no approvals in this env), command + output recorded here verbatim.

- [x] G2: Header renders the stacked pattern on the Vehicles stack entry: back arrow without an outline button box, centered "Vendor vehicles" title, amber "+ Add vehicle" pill — visible in the running sim describe.
  CHECK: export PATH="$HOME/.local/bin:$PATH"; export DISPLAY=:99; peach describe --sim b1 | grep -E 'label="Go back"|Vendor vehicles|Add vehicle' | head -5 && echo VEHICLES_HEADER_OK
  EXPECT: VEHICLES_HEADER_OK
  EVIDENCE: manual — ran 2026-10-17 via Shell; describe emitted `label="Go back" @(22,62) 43x45` (bare hit area, no box node), `<view> label="Vendor vehicles"`, `<text> "Add vehicle" @(301,190)`; output ended `VEHICLES_HEADER_OK`. Screenshot `/tmp/shots/vehicles-new.png` reviewed visually — header matches the reference stack.

- [x] G3: Stat tiles render compactly with truck/check/wrench icons loaded from the same artwork used on Home leads (VehicleTypeArtwork), and vehicle cards show the truck artwork thumbnail instead of the plain icon tile.
  CHECK: export PATH="$HOME/.local/bin:$PATH"; export DISPLAY=:99; (peach describe --sim b1 | grep -E 'svgroot' | head -4) && echo VEHICLES_ART_OK
  EXPECT: VEHICLES_ART_OK
  EVIDENCE: manual — ran 2026-10-17 via Shell; stat tiles show svg artwork nodes (`22x15` car artwork in Total tile, 17x17 check/wrench), first vehicle card thumbnail is `56x39` VehicleTypeArtwork svg inside a 64x52 `#FFF7E6` tile; output ended `VEHICLES_ART_OK`. Visual check via screenshot: 3 compact tiles (110px) with no dead gap, cards match board 02 layout.

- [x] G4: The three reference stat tiles show Total/Available/In service semantics with no horizontal gap overflow: screenshot reviewed by agent and supplied to user.
  EVIDENCE: manual — describe shows exactly three tiles at x=21/139/257 (width 110, spacing 8 — total 367 < 402 viewport, no overflow), labels "Total" / "Available" / "In service". Full-window screenshot `/tmp/shots/vehicles-new.png` reviewed by agent; user receives the screenshot in chat for confirmation.
