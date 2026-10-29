import { BadRequestError } from '../../../utils/src/errors';

export interface ServiceableCity {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

/**
 * Live service areas. Mirrors `customer application/src/config/serviceableAreas.ts`
 * (comingSoon cities excluded — they cannot accept bookings yet).
 * Keep the two lists in sync when a new city launches.
 */
export const SERVICEABLE_AREAS: ServiceableCity[] = [
  {
    name: 'bhubaneswar',
    centerLat: 20.2961,
    centerLng: 85.8245,
    radiusKm: 30,
  },
];

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return c * EARTH_RADIUS_KM;
}

export function findServiceableCity(latitude: number, longitude: number): ServiceableCity | null {
  let best: { city: ServiceableCity; distanceKm: number } | null = null;

  for (const city of SERVICEABLE_AREAS) {
    const distanceKm = haversineDistanceKm(latitude, longitude, city.centerLat, city.centerLng);
    if (distanceKm <= city.radiusKm) {
      if (!best || distanceKm < best.distanceKm) {
        best = { city, distanceKm };
      }
    }
  }

  return best?.city ?? null;
}

interface LocationWithCoords {
  address: string;
  latitude: number;
  longitude: number;
}

export function isServiceableLocation(location: LocationWithCoords | undefined): boolean {
  if (!location) {
    return true; // Optional dropoff locations are not geofenced.
  }
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    Math.abs(location.latitude) > 90 ||
    Math.abs(location.longitude) > 180
  ) {
    throw new BadRequestError('Valid location coordinates are required');
  }
  const city = findServiceableCity(location.latitude, location.longitude);
  return city != null;
}

export function ensureBookingServiceable(location: LocationWithCoords | undefined): void {
  if (isServiceableLocation(location)) {
    return;
  }
  const cityNames = SERVICEABLE_AREAS.map((city) => city.name).join(', ');
  throw new BadRequestError(
    `We are not serviceable at this location yet. We currently serve ${cityNames}.`,
  );
}
