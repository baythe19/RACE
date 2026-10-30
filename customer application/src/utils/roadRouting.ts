import { getGoogleMapsApiKey } from './googleMaps';

export type LatLng = { latitude: number; longitude: number };

export type RoadRouteSource = 'google_routes' | 'google_directions' | 'straight_fallback';

export type RoadRouteResult = {
  coordinates: LatLng[];
  distanceKm: number;
  durationMinutes: number;
  approximate: boolean;
  source: RoadRouteSource;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const routeCache = new Map<string, { timestamp: number; result: RoadRouteResult }>();

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function decodeGooglePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: latitude / 100000, longitude: longitude / 100000 });
  }

  return points;
}

function parseDurationSeconds(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  const text = String(raw).trim();
  if (!text) return 0;
  const match = text.match(/([\d.]+)\s*s/);
  if (match) return Math.max(0, Math.round(Number(match[1])));
  const asNum = Number(text);
  return Number.isFinite(asNum) ? Math.max(0, Math.round(asNum)) : 0;
}

function buildResult(
  coordinates: LatLng[],
  distanceMeters: number,
  durationSeconds: number,
  source: RoadRouteSource,
  approximate: boolean,
): RoadRouteResult {
  return {
    coordinates: coordinates.length >= 2 ? coordinates : [coordinates[0], coordinates[0]],
    distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
    durationMinutes: Math.max(1, Math.round(Math.max(durationSeconds, 60) / 60)),
    approximate,
    source,
  };
}

function straightFallback(origin: LatLng, destination: LatLng): RoadRouteResult {
  const meters = haversineMeters(origin, destination);
  const seconds = Math.max(60, Math.round((meters / 1000) * 130));
  return buildResult([origin, destination], meters, seconds, 'straight_fallback', true);
}

async function fetchGoogleRoutesV2(
  origin: LatLng,
  destination: LatLng,
  key: string,
): Promise<RoadRouteResult | null> {
  const gRes = await fetch(`https://routes.googleapis.com/directions/v2:computeRoutes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: {
        location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } },
      },
      destination: {
        location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      languageCode: 'en-IN',
      regionCode: 'IN',
      units: 'METRIC',
    }),
  });

  if (!gRes.ok) return null;
  const data = await gRes.json();
  const route = data.routes?.[0];
  if (!route?.polyline?.encodedPolyline) return null;

  const coords = decodeGooglePolyline(route.polyline.encodedPolyline);
  const distanceMeters = Number(route.distanceMeters) || haversineMeters(origin, destination);
  const durationSeconds =
    parseDurationSeconds(route.duration) ||
    parseDurationSeconds(route.staticDuration) ||
    Math.round((distanceMeters / 1000) * 120);

  return buildResult(
    coords.length >= 2 ? coords : [origin, destination],
    distanceMeters,
    durationSeconds,
    'google_routes',
    false,
  );
}

type DirectionsJsonResponse = {
  status: string;
  routes?: Array<{
    overview_polyline?: { points?: string };
    legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
  }>;
};

async function fetchGoogleDirectionsLegacy(
  origin: LatLng,
  destination: LatLng,
  key: string,
): Promise<RoadRouteResult | null> {
  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: 'driving',
    region: 'in',
    language: 'en',
    key,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as DirectionsJsonResponse;
  if (data.status !== 'OK' || !data.routes?.[0]) return null;

  const route = data.routes[0];
  const encoded = route.overview_polyline?.points;
  if (!encoded) return null;

  const coords = decodeGooglePolyline(encoded);
  const leg = route.legs?.[0];
  const distanceMeters = leg?.distance?.value ?? haversineMeters(origin, destination);
  const durationSeconds = leg?.duration?.value ?? Math.round((distanceMeters / 1000) * 120);

  return buildResult(
    coords.length >= 2 ? coords : [origin, destination],
    distanceMeters,
    durationSeconds,
    'google_directions',
    false,
  );
}

/**
 * Road geometry from Google Maps Platform only (Routes API → Directions API).
 * Straight guide only when key is missing or both Google calls fail.
 */
export async function fetchRoadRoute(origin: LatLng, destination: LatLng): Promise<RoadRouteResult> {
  const cacheKey = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}->${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const key = getGoogleMapsApiKey();
  if (key) {
    try {
      const routes = await fetchGoogleRoutesV2(origin, destination, key);
      if (routes) {
        routeCache.set(cacheKey, { timestamp: Date.now(), result: routes });
        return routes;
      }
    } catch {
      // try legacy Directions
    }

    try {
      const legacy = await fetchGoogleDirectionsLegacy(origin, destination, key);
      if (legacy) {
        routeCache.set(cacheKey, { timestamp: Date.now(), result: legacy });
        return legacy;
      }
    } catch {
      // fall through
    }
  }

  const result = straightFallback(origin, destination);
  routeCache.set(cacheKey, { timestamp: Date.now(), result });
  return result;
}
