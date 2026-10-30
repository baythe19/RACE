import { haversineMeters } from '../services/driver/tripNavigation';

/**
 * Driver location guide — decides how the app knows where the driver is.
 *
 * Two honest sources, in priority order:
 *   1. `manual`   — driver picked a point on the map (or is a QA bypass account).
 *   2. `gps`      — real device fix.
 *
 * When neither is usable, accepting a job is blocked: a driver without a usable
 * position cannot be matched to a pickup, and a far-away "accept" would strand
 * the customer. QA accounts (9898910000/01/02) always pass so flows stay
 * testable from anywhere.
 */

/** Pickups farther than this from the driver's position cannot be accepted. */
export const MAX_PICKUP_DISTANCE_KM = 15;

/** QA accounts used for demos/testing — location gates are relaxed for them. */
export const TEST_DRIVER_MOBILE_NUMBERS = [
  '+919898910000',
  '+919898910001',
  '+919898910002',
  '9898910000',
  '9898910001',
  '9898910002',
];

export function isTestDriverMobile(mobileNumber?: string | null): boolean {
  if (!mobileNumber) return false;
  const digits = mobileNumber.replace(/\D/g, '').slice(-10);
  return TEST_DRIVER_MOBILE_NUMBERS.some(t => t.replace(/\D/g, '').slice(-10) === digits);
}

export type LocationSourceKind = 'manual' | 'gps';

export interface DriverLocationGuide {
  /** Coordinates the trip pipeline should trust right now. */
  location: { latitude: number; longitude: number } | null;
  source: LocationSourceKind | null;
  /** Distance to the pickup, km (null when location unknown). */
  distanceToPickupKm: number | null;
  withinPickupRadius: boolean;
  /** True when GPS reported data exists (may be stale/poor — manual takes priority). */
  hasGpsData: boolean;
  /** True when this driver skips distance gates (QA bypass). */
  bypass: boolean;
}

interface EvaluateArgs {
  manualLocation: { latitude: number; longitude: number; updatedAt: number } | null;
  gpsLocation: { latitude: number; longitude: number; updatedAt: number; accuracy?: number | null } | null;
  pickup: { latitude: number; longitude: number } | null;
  mobileNumber?: string | null;
  /** GPS is considered stale after this many ms (default 90s). */
  gpsMaxAgeMs?: number;
}

export function evaluateDriverLocationGuide({
  manualLocation,
  gpsLocation,
  pickup,
  mobileNumber,
  gpsMaxAgeMs = 90_000,
}: EvaluateArgs): DriverLocationGuide {
  const bypass = isTestDriverMobile(mobileNumber);
  const now = Date.now();

  // Manual pick wins while reasonably fresh (2 hours), so yesterday's pick does
  // not silently pin a driver across town.
  const manualFresh = manualLocation != null && now - manualLocation.updatedAt < 2 * 60 * 60 * 1000;
  const gpsUsable = gpsLocation != null && now - gpsLocation.updatedAt < gpsMaxAgeMs;
  const hasGpsData = gpsLocation != null;

  const chosen = manualFresh ? manualLocation : gpsUsable ? gpsLocation : null;
  const source: LocationSourceKind | null = manualFresh ? 'manual' : gpsUsable ? 'gps' : null;

  if (!chosen || !pickup || bypass) {
    return {
      location: chosen ? { latitude: chosen.latitude, longitude: chosen.longitude } : null,
      source,
      distanceToPickupKm: null,
      // Bypass accounts are always "within radius".
      withinPickupRadius: bypass,
      hasGpsData,
      bypass,
    };
  }

  const distanceKm = haversineMeters(
    { latitude: chosen.latitude, longitude: chosen.longitude },
    pickup,
  ) / 1000;

  return {
    location: { latitude: chosen.latitude, longitude: chosen.longitude },
    source,
    distanceToPickupKm: Math.round(distanceKm * 10) / 10,
    withinPickupRadius: distanceKm <= MAX_PICKUP_DISTANCE_KM,
    hasGpsData,
    bypass,
  };
}

export type AcceptLocationGateInput = EvaluateArgs & { previewMode?: boolean };

/** Shared accept-time location gate for Jobs, offer modal, dashboard, and active trip. */
export function getDriverAcceptLocationGate(
  input: AcceptLocationGateInput,
): { ok: true } | { ok: false; title: string; message: string } {
  if (input.previewMode) return { ok: true };
  const { previewMode: _preview, ...evalArgs } = input;
  const verdict = evaluateDriverLocationGuide(evalArgs);
  if (verdict.bypass) return { ok: true };

  const pickup = input.pickup;
  const far =
    pickup != null &&
    verdict.distanceToPickupKm != null &&
    !verdict.withinPickupRadius;
  if (far) {
    return {
      ok: false,
      title: 'You are too far from pickup',
      message: `This pickup is ~${verdict.distanceToPickupKm} km away (limit ${MAX_PICKUP_DISTANCE_KM} km). Move closer or set your location from the dashboard, then try again.`,
    };
  }
  if (!verdict.location) {
    return {
      ok: false,
      title: 'Location needed to accept',
      message:
        'We could not get your GPS position. Turn on location or set your location manually from the dashboard, then try again.',
    };
  }
  return { ok: true };
}

export function pickupCoordsFromJob(job: {
  pickup?: { latitude?: number | null; longitude?: number | null } | null;
}): { latitude: number; longitude: number } | null {
  if (job.pickup?.latitude != null && job.pickup?.longitude != null) {
    return { latitude: job.pickup.latitude, longitude: job.pickup.longitude };
  }
  return null;
}
