import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  distanceToPathMeters,
  haversineKm,
  haversineMeters,
  legForJobStatus,
  shouldRefreshRoute,
} from '../src/services/driver/tripNavigation.ts';

const mode = process.argv[2];

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function verifyMath() {
  const masterCanteen = { latitude: 20.27, longitude: 85.84 };
  const nearby = { latitude: 20.2709, longitude: 85.84 };
  const meters = haversineMeters(masterCanteen, nearby);
  assert(meters > 80 && meters < 120, `expected about 100m, got ${meters}`);

  const far = haversineKm(
    { latitude: 20.2961, longitude: 85.8245 },
    { latitude: 20.3542, longitude: 85.8182 },
  );
  assert(far > 5 && far < 8, `expected a few km across the city, got ${far}`);

  assert(legForJobStatus('DRIVER_EN_ROUTE') === 'to_pickup', 'en route must target pickup');
  assert(legForJobStatus('DRIVER_ASSIGNED') === 'to_pickup', 'accepted-pending start still targets pickup');
  assert(legForJobStatus('DRIVER_ARRIVED') === 'to_pickup', 'OTP step stays on the pickup leg');
  assert(legForJobStatus('IN_PROGRESS') === 'to_drop', 'after OTP the leg is the drop');
  assert(legForJobStatus('COMPLETED') === 'idle', 'completed trip has no active leg');

  const path = [
    { latitude: 20.27, longitude: 85.84 },
    { latitude: 20.28, longitude: 85.84 },
  ];
  const onPath = distanceToPathMeters({ latitude: 20.275, longitude: 85.8402 }, path);
  const offPath = distanceToPathMeters({ latitude: 20.275, longitude: 85.85 }, path);
  assert(onPath < 40, `on-path distance too large: ${onPath}`);
  assert(offPath > 200, `off-path distance too small: ${offPath}`);

  const origin = { latitude: 20.271, longitude: 85.84 };
  assert(
    shouldRefreshRoute({
      now: 100_000,
      lastFetchedAt: null,
      lastOrigin: null,
      origin,
      path,
      destinationChanged: false,
    }) === true,
    'first fetch must refresh',
  );
  assert(
    shouldRefreshRoute({
      now: 105_000,
      lastFetchedAt: 100_000,
      lastOrigin: origin,
      origin: { latitude: 20.27105, longitude: 85.84 },
      path,
      destinationChanged: false,
    }) === false,
    'a tiny move inside the interval must not refresh',
  );
  assert(
    shouldRefreshRoute({
      now: 130_000,
      lastFetchedAt: 100_000,
      lastOrigin: origin,
      origin: { latitude: 20.275, longitude: 85.85 },
      path,
      destinationChanged: false,
    }) === true,
    'leaving the polyline must refresh',
  );
  assert(
    shouldRefreshRoute({
      now: 101_000,
      lastFetchedAt: 100_000,
      lastOrigin: origin,
      origin,
      path,
      destinationChanged: true,
    }) === true,
    'a new leg must refresh immediately',
  );

  const badPhrase = 'Open Google Maps directions';
  const containsRedirect = source =>
    source.includes(badPhrase) || source.includes('google.com/maps/dir');
  assert(containsRedirect(`button ${badPhrase}`) === true, 'negative control must detect the redirect');
  assert(containsRedirect('in-app route only') === false, 'negative control must allow the in-app screen');

  console.log('TRIP_MATH_OK');
}

function verifyScreen() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const screen = readFileSync(join(root, 'src/screens/partner/driver/DriverActiveJobScreen.tsx'), 'utf8');
  const map = readFileSync(join(root, 'src/components/booking/LiveTripMap.tsx'), 'utf8');
  const containsRedirect = source =>
    source.includes('Open Google Maps directions') || source.includes('google.com/maps/dir');

  assert(containsRedirect('Open Google Maps directions') === true, 'screen check lost its positive control');
  assert(!containsRedirect(screen), 'active job still redirects to Google Maps');
  assert(screen.includes('legForJobStatus'), 'active job does not use the trip leg');
  assert(screen.includes('legTitle'), 'active job does not label the pickup leg');
  assert(map.includes("title={pickup.label || 'Pickup'}"), 'map is missing the pickup marker');
  assert(map.includes("title={dropoff.label || 'Drop'}"), 'map is missing the drop marker');
  assert(map.includes('title={driverLocation.label'), 'map is missing the driver marker');

  console.log('NO_EXTERNAL_MAPS_OK');
}

if (mode === 'math') verifyMath();
else if (mode === 'screen') verifyScreen();
else {
  console.error('usage: verify-trip-navigation.mjs math|screen');
  process.exit(1);
}
