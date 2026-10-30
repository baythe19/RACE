/**
 * Two-leg trip navigation, the pattern used by Rapido, Uber, and Ola.
 *
 * After the driver accepts:
 *   1. Leg "to_pickup" — live position → customer pickup. Show both ends and the drop.
 *   2. Driver taps Arrived. Status becomes DRIVER_ARRIVED. Customer OTP is required.
 *   3. OTP success moves the job to IN_PROGRESS. Leg becomes "to_drop".
 *   4. The drawn route is only the active leg. The other point stays on the map.
 *
 * Road geometry comes from Google Directions when a key exists. A straight line
 * is only a labeled fallback, never presented as the road. Reroute when the
 * driver leaves the polyline or has moved far enough that the old route is stale.
 * Arrival is never automatic: GPS error in cities is larger than a driveway.
 */

export type LatLng = { latitude: number; longitude: number };

export type TripLeg = 'to_pickup' | 'to_drop' | 'idle';

export const OFF_ROUTE_METERS = 60;
export const REROUTE_MOVE_METERS = 80;
export const REROUTE_MIN_INTERVAL_MS = 20_000;
export const NEAR_PICKUP_METERS = 150;
/** Within this distance the Arrived button is emphasised (never auto-tapped). */
export const ARRIVAL_PROMPT_METERS = 60;
/** A fix this far off the route is treated as off route immediately. */
export const OFF_ROUTE_HARD_METERS = 120;

const EARTH_METERS = 6_371_000;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function haversineKm(a: LatLng, b: LatLng): number {
  return Math.round((haversineMeters(a, b) / 1000) * 10) / 10;
}

export function legForJobStatus(status: string): TripLeg {
  if (status === 'IN_PROGRESS') return 'to_drop';
  if (
    status === 'COMPLETED' ||
    status === 'RATED' ||
    status === 'PAID' ||
    status === 'CANCELLED'
  ) {
    return 'idle';
  }
  // P-05 (v8 audit): a job that is only CONFIRMED (routed, not yet assigned or
  // accepted) has no driver leg yet — show idle instead of a bogus "to pickup".
  if (status === 'CONFIRMED' || status === 'PENDING') return 'idle';
  return 'to_pickup';
}

export function legTitle(leg: TripLeg): string {
  if (leg === 'to_drop') return 'To drop';
  if (leg === 'to_pickup') return 'To pickup';
  return 'Trip';
}

/** Meters from a point to the nearest segment of a path. */
export function distanceToPathMeters(point: LatLng, path: LatLng[]): number {
  if (path.length === 0) return Number.POSITIVE_INFINITY;
  if (path.length === 1) return haversineMeters(point, path[0]);

  const lat0 = toRad(point.latitude);
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(lat0);
  let best = Number.POSITIVE_INFINITY;

  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1];
    const b = path[index];
    const ax = (a.longitude - point.longitude) * mPerDegLng;
    const ay = (a.latitude - point.latitude) * mPerDegLat;
    const bx = (b.longitude - point.longitude) * mPerDegLng;
    const by = (b.latitude - point.latitude) * mPerDegLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx + -ay * dy) / len2));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    best = Math.min(best, Math.hypot(cx, cy));
  }

  return best;
}

export function shouldRefreshRoute(input: {
  now: number;
  lastFetchedAt: number | null;
  lastOrigin: LatLng | null;
  origin: LatLng;
  path: LatLng[];
  destinationChanged: boolean;
}): boolean {
  if (input.destinationChanged || input.lastFetchedAt == null || input.lastOrigin == null) {
    return true;
  }
  const moved = haversineMeters(input.lastOrigin, input.origin);
  const elapsed = input.now - input.lastFetchedAt;
  const offRoute = input.path.length >= 2 && distanceToPathMeters(input.origin, input.path) > OFF_ROUTE_METERS;
  if (offRoute && elapsed >= 8_000) return true;
  if (elapsed < REROUTE_MIN_INTERVAL_MS && moved < 40) return false;
  return moved >= REROUTE_MOVE_METERS;
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Bearing in degrees (0 = north, clockwise) from `a` to `b`. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/* ------------------------------------------------------------------ *
 * Route progress (snap-to-route) — the maths behind turn-by-turn.     *
 * ------------------------------------------------------------------ */

export type PathProgress = {
  /** Index of the path segment start the driver is on. */
  index: number;
  /** Driver position projected onto the route. */
  snapped: LatLng;
  /** How far the raw GPS fix is from the route. */
  offMeters: number;
  /** Metres travelled along the route up to the snapped point. */
  alongMeters: number;
  totalMeters: number;
  remainingMeters: number;
};

const cumulativeCache = new WeakMap<LatLng[], number[]>();

/** Cumulative metres at every vertex of the path (memoised per path array). */
export function pathCumulativeMeters(path: LatLng[]): number[] {
  const cached = cumulativeCache.get(path);
  if (cached) return cached;
  const cumulative: number[] = [0];
  for (let i = 1; i < path.length; i += 1) {
    cumulative.push(cumulative[i - 1] + haversineMeters(path[i - 1], path[i]));
  }
  cumulativeCache.set(path, cumulative);
  return cumulative;
}

/** Projects `point` onto the nearest segment of `path`. */
export function progressAlongPath(point: LatLng, path: LatLng[]): PathProgress | null {
  if (path.length === 0) return null;
  const cumulative = pathCumulativeMeters(path);
  const totalMeters = cumulative[cumulative.length - 1];
  if (path.length === 1) {
    return {
      index: 0,
      snapped: path[0],
      offMeters: haversineMeters(point, path[0]),
      alongMeters: 0,
      totalMeters: 0,
      remainingMeters: 0,
    };
  }

  const lat0 = toRad(point.latitude);
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(lat0);
  let best = Number.POSITIVE_INFINITY;
  let bestIndex = 0;
  let bestT = 0;

  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const ax = (a.longitude - point.longitude) * mPerDegLng;
    const ay = (a.latitude - point.latitude) * mPerDegLat;
    const bx = (b.longitude - point.longitude) * mPerDegLng;
    const by = (b.latitude - point.latitude) * mPerDegLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx + -ay * dy) / len2));
    const dist = Math.hypot(ax + t * dx, ay + t * dy);
    if (dist < best) {
      best = dist;
      bestIndex = i - 1;
      bestT = t;
    }
  }

  const a = path[bestIndex];
  const b = path[bestIndex + 1];
  const snapped = {
    latitude: a.latitude + (b.latitude - a.latitude) * bestT,
    longitude: a.longitude + (b.longitude - a.longitude) * bestT,
  };
  const alongMeters = cumulative[bestIndex] + (cumulative[bestIndex + 1] - cumulative[bestIndex]) * bestT;
  return {
    index: bestIndex,
    snapped,
    offMeters: best,
    alongMeters,
    totalMeters,
    remainingMeters: Math.max(0, totalMeters - alongMeters),
  };
}

/** Point `meters` along the path plus the heading of the segment it sits on. */
export function pointAlongPath(
  path: LatLng[],
  meters: number,
): { point: LatLng; heading: number; index: number } | null {
  if (path.length === 0) return null;
  if (path.length === 1) return { point: path[0], heading: 0, index: 0 };
  const cumulative = pathCumulativeMeters(path);
  const total = cumulative[cumulative.length - 1];
  const target = Math.max(0, Math.min(total, meters));
  let i = 1;
  while (i < path.length - 1 && cumulative[i] < target) i += 1;
  const a = path[i - 1];
  const b = path[i];
  const span = cumulative[i] - cumulative[i - 1];
  const t = span === 0 ? 0 : (target - cumulative[i - 1]) / span;
  return {
    point: {
      latitude: a.latitude + (b.latitude - a.latitude) * t,
      longitude: a.longitude + (b.longitude - a.longitude) * t,
    },
    heading: bearingDegrees(a, b),
    index: i - 1,
  };
}

/** Moves `from` by `meters` along `bearing` (degrees, 0 = north). */
export function offsetPoint(from: LatLng, bearing: number, meters: number): LatLng {
  const rad = toRad(bearing);
  const dLat = (meters * Math.cos(rad)) / 111_320;
  const dLng = (meters * Math.sin(rad)) / (111_320 * Math.cos(toRad(from.latitude)));
  return { latitude: from.latitude + dLat, longitude: from.longitude + dLng };
}

type StepLike = { coordinate: LatLng };
const stepAlongCache = new WeakMap<object, number[]>();

/** Metres along `path` at which each manoeuvre begins (memoised per steps array). */
export function stepStartMeters(steps: StepLike[], path: LatLng[]): number[] {
  const cached = stepAlongCache.get(steps);
  if (cached) return cached;
  let floor = 0;
  const result = steps.map(step => {
    // Steps run in order along the route; never let a snap jump backwards.
    const along = progressAlongPath(step.coordinate, path)?.alongMeters ?? floor;
    floor = Math.max(floor, along);
    return floor;
  });
  stepAlongCache.set(steps, result);
  return result;
}

/**
 * The manoeuvre the driver is approaching.
 *
 * Both Google Routes and OSRM describe step *i* with the manoeuvre that happens
 * at the START of that step ("Turn left onto X" begins where X begins). So while
 * driving step *i*, the banner must show step *i + 1*'s instruction, counted
 * down to where step *i + 1* starts. Distance is measured along the route from
 * the live GPS fix, never a frozen number from route calculation.
 */
export function resolveUpcomingManeuver<T extends StepLike>(
  steps: T[],
  path: LatLng[],
  alongMeters: number,
): { step: T; next: T | null; index: number; distanceMeters: number } | null {
  if (steps.length === 0) return null;
  if (steps.length === 1) {
    return { step: steps[0], next: null, index: 0, distanceMeters: 0 };
  }
  const starts = stepStartMeters(steps, path);
  // Step 0 is "depart"; the first real manoeuvre is step 1.
  let index = steps.length - 1;
  for (let i = 1; i < steps.length; i += 1) {
    if (starts[i] - alongMeters > 12) {
      index = i;
      break;
    }
  }
  return {
    step: steps[index],
    next: steps[index + 1] ?? null,
    index,
    distanceMeters: Math.max(0, Math.round(starts[index] - alongMeters)),
  };
}

/** Compact distance for turn banners: 40 m, 350 m, 1.2 km. */
export function formatManeuverDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = meters < 100 ? Math.round(meters / 10) * 10 : Math.round(meters / 50) * 50;
    return `${Math.max(rounded, 10)} m`;
  }
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
