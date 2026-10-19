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
