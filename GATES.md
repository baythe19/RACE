# Gates: in-app driver trip navigation

OWNS: mobile application/src/services/driver/tripNavigation.ts, mobile application/scripts/verify-trip-navigation.mjs, mobile application/src/components/booking/LiveTripMap.tsx, mobile application/src/screens/partner/driver/DriverActiveJobScreen.tsx

Scope: Driver active job stays inside the app, routes driver to pickup, then after OTP routes pickup to drop, and never opens Google Maps.

- [x] G1: Trip leg math matches the two-leg ride-hailing flow
  CHECK: npx tsx scripts/verify-trip-navigation.mjs math
  EXPECT: TRIP_MATH_OK
  CWD: mobile application
  EVIDENCE: automatic-evidence=v1; definition-sha256=94ce57485db72d67741fb28196207ddb43d81fedfa2f84073002961bbc5b5a93; exit=0; EXPECT=matched; output-sha256=42e947e939fdd2fe61a5e71c86d30eba1b7cb7cf1c159d43f7dbb6950cada68e; output-bytes=13; shell=/bin/sh; cwd=/workspaces/RACE/mobile application; path=2b7281c7f1d9/43 entries

- [x] G2: Active job screen has no external Google Maps redirect
  CHECK: npx tsx scripts/verify-trip-navigation.mjs screen
  EXPECT: NO_EXTERNAL_MAPS_OK
  CWD: mobile application
  EVIDENCE: automatic-evidence=v1; definition-sha256=3667106fe9d202a8a428f20d55285fa16b38f18e30e5c41b04b5e2e12401a865; exit=0; EXPECT=matched; output-sha256=ac5234caf238d9a596b1eddaf71020a15688c0c467e71299db451904a23845c3; output-bytes=20; shell=/bin/sh; cwd=/workspaces/RACE/mobile application; path=2b7281c7f1d9/43 entries
