# Gates: partner driver active-job and jobs polish

OWNS: mobile application/src/components/booking/LiveTripMap.tsx, mobile application/src/screens/partner/driver/DriverActiveJobScreen.tsx, mobile application/src/screens/partner/driver/DriverJobsScreen.tsx, mobile application/app.config.js, mobile application/src/theme/driverUi.ts, .agents/state/ACTIVE.md

Scope: Make the partner driver's active map and Jobs list flow stable, data-aware, and visually aligned with the supplied boards.

- [x] G1: Partner mobile TypeScript compiles after the flow changes.
  CHECK: npm run lint -- --pretty false && echo PARTNER_TSC_PASS
  EXPECT: PARTNER_TSC_PASS
  CWD: mobile application
  EVIDENCE: automatic-evidence=v1; definition-sha256=d249415b8543cec40789deb3136a7d3863e2fff58670610cdc1420bc10092236; exit=0; EXPECT=matched; output-sha256=fa6eab4cbef4ee11131409ecc3b471fb973d77c2c91d159e43a805ff746517e0; output-bytes=82; shell=/bin/sh; cwd=/workspaces/RACE/mobile application; path=1c4fce328d2c/41 entries

- [x] G2: The worktree has no whitespace errors in the touched implementation.
  CHECK: git diff --check && echo PARTNER_DIFF_CHECK_PASS
  EXPECT: PARTNER_DIFF_CHECK_PASS
  CWD: .
  EVIDENCE: automatic-evidence=v1; definition-sha256=500385649206a494cf4b2a78dde2bb3f3ad73d134e8447e9386f3b82bd6d1438; exit=0; EXPECT=matched; output-sha256=87df6d623d7e4fb16559a6756e13e55e8bf885e6e43734f147e5b4cf53f5f09f; output-bytes=24; shell=/bin/sh; cwd=/workspaces/RACE; path=1c4fce328d2c/41 entries

- [x] G3: Expo can export the partner Android bundle after map/config changes.
  CHECK: npx expo export --platform android && echo PARTNER_ANDROID_EXPORT_PASS
  EXPECT: PARTNER_ANDROID_EXPORT_PASS
  CWD: mobile application
  EVIDENCE: automatic-evidence=v1; definition-sha256=9d79bb140cc8ffa9921424b66a92a5d51056062014246c2c84ea4e95ae7b588d; exit=0; EXPECT=matched; output-sha256=a2cb0a7b50f949ccc4c17f42a016fbae74bde8ccf5e5d3d632a4ecd1b2a4b5c8; output-bytes=5599; shell=/bin/sh; cwd=/workspaces/RACE/mobile application; path=1c4fce328d2c/41 entries

- [ ] G4: Active-job map and Jobs interaction are manually rendered and checked on a device or simulator.
  EVIDENCE: pending; no local emulator is currently available.
