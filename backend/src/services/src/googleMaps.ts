import { env } from '../../config/env';
import { getCache } from '../../config/cache';
import { logger } from '../../utils/src/logger';

export interface LatLng {
  latitude: number;
  longitude: number;
}

interface DistanceMatrixElement {
  status: string;
  distance?: { value: number };
  duration?: { value: number };
}

interface DistanceMatrixResponse {
  status: string;
  rows?: Array<{
    elements?: DistanceMatrixElement[];
  }>;
  error_message?: string;
}

export async function getDistanceAndDuration(
  origin: LatLng,
  destination: LatLng,
): Promise<{ distanceKm: number; durationMinutes: number } | null> {
  if (!env.GOOGLE_MAPS_API_KEY?.trim()) {
    return null;
  }

  const params = new URLSearchParams({
    origins: `${origin.latitude},${origin.longitude}`,
    destinations: `${destination.latitude},${destination.longitude}`,
    mode: 'driving',
    units: 'metric',
    region: 'in',
    key: env.GOOGLE_MAPS_API_KEY,
  });

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;

  // BUG-18: Distance Matrix is a billed API and /fare is public — identical
  // origin/destination pairs are served from a 10-minute cache so a client
  // cannot burn quota by replaying the same request. Rounding to 3 decimals
  // makes the key stable across trivial GPS jitter.
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const cacheKey = `dm:${round(origin.latitude)},${round(origin.longitude)}:${round(destination.latitude)},${round(destination.longitude)}`;
  try {
    const cache = getCache();
    const hit = await cache.get(cacheKey);
    if (hit) {
      const parsed = JSON.parse(hit) as { distanceKm: number; durationMinutes: number };
      return parsed;
    }
  } catch {
    // cache unavailable — fall through to the live call
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      logger.warn('Google Distance Matrix request failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = (await response.json()) as DistanceMatrixResponse;

    if (data.status !== 'OK') {
      logger.warn('Google Distance Matrix API error', {
        status: data.status,
        errorMessage: data.error_message,
      });
      return null;
    }

    const element = data.rows?.[0]?.elements?.[0];

    if (!element || element.status !== 'OK' || !element.distance || !element.duration) {
      logger.warn('Google Distance Matrix element not OK', {
        elementStatus: element?.status ?? 'missing',
      });
      return null;
    }

    const result = {
      distanceKm: element.distance.value / 1000,
      durationMinutes: element.duration.value / 60,
    };

    // Cache-aside write: 10 minutes (600 s). Best-effort; failures are ignored.
    void getCache()
      .set(cacheKey, JSON.stringify(result), 'EX', 600)
      .catch(() => undefined);

    return result;
  } catch (error) {
    logger.warn('Google Distance Matrix request threw', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
