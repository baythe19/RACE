export interface ServiceableCity {
  name: string;
  state: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  displayName: string;
  comingSoon: boolean;
}

export const SERVICEABLE_AREAS: ServiceableCity[] = [
  {
    name: 'bhubaneswar',
    state: 'Odisha',
    centerLat: 20.2961,
    centerLng: 85.8245,
    radiusKm: 30,
    displayName: 'Bhubaneswar',
    comingSoon: false,
  },
  {
    name: 'cuttack',
    state: 'Odisha',
    centerLat: 20.4625,
    centerLng: 85.883,
    radiusKm: 15,
    displayName: 'Cuttack',
    comingSoon: true,
  },
  {
    name: 'bhopal',
    state: 'Madhya Pradesh',
    centerLat: 23.2599,
    centerLng: 77.4126,
    radiusKm: 30,
    displayName: 'Bhopal',
    comingSoon: false,
  },
];

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return c * EARTH_RADIUS_KM;
}

export function findServiceableCity(
  latitude: number,
  longitude: number,
): ServiceableCity | null {
  let best: { city: ServiceableCity; distanceKm: number } | null = null;

  for (const city of SERVICEABLE_AREAS) {
    const distanceKm = haversineDistanceKm(
      latitude,
      longitude,
      city.centerLat,
      city.centerLng,
    );
    if (distanceKm <= city.radiusKm) {
      if (!best || distanceKm < best.distanceKm) {
        best = { city, distanceKm };
      }
    }
  }

  return best?.city ?? null;
}
