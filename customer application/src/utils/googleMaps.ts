import Constants from 'expo-constants';
import * as Location from 'expo-location';

export const BHUBANESWAR_DEFAULT = {
  latitude: 20.2961,
  longitude: 85.8245,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const PLACEHOLDER_KEY_PATTERN = /^(paste_?your_?key_?here|your_?api_?key|xxx+|changeme)?$/i;

/** Returns a usable Google Maps key, or empty string if missing / placeholder. */
export function getGoogleMapsApiKey(): string {
  const fromPublicEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY?.trim() ?? '';
  const fromExtra = (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined)?.trim() ?? '';
  const key = fromPublicEnv || fromExtra;
  if (!key || PLACEHOLDER_KEY_PATTERN.test(key) || key.includes('PASTE_YOUR')) {
    return '';
  }
  return key;
}

interface GeocodeResponse {
  status: string;
  results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
  error_message?: string;
}

export async function forwardGeocode(
  query: string,
): Promise<{ address: string; latitude: number; longitude: number } | null> {
  const key = getGoogleMapsApiKey();
  if (!key || !query.trim()) return null;

  const params = new URLSearchParams({
    address: query.trim(),
    region: 'in',
    key,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    );
    const data = (await response.json()) as GeocodeResponse;
    const result = data.results?.[0];
    if (!result) return null;

    return {
      address: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    };
  } catch {
    return null;
  }
}

/** Never returns raw lat/lng strings — uses Expo reverse geocode when Google is unavailable. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const key = getGoogleMapsApiKey();
  if (key) {
    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      key,
      region: 'in',
      language: 'en',
    });

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      );
      const data = (await response.json()) as GeocodeResponse;
      const formatted = data.results?.[0]?.formatted_address?.trim();
      if (formatted && !/^lat\s*:/i.test(formatted)) {
        return formatted;
      }
    } catch {
      // fall through to Expo
    }
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results[0];
    if (place) {
      const parts = [
        [place.streetNumber, place.street].filter(Boolean).join(' '),
        place.district || place.subregion,
        place.city,
        place.region,
        place.postalCode,
      ]
        .map(part => part?.trim())
        .filter(Boolean);
      if (parts.length) {
        return parts.join(', ');
      }
      if (place.name?.trim()) {
        return place.name.trim();
      }
    }
  } catch {
    // ignore
  }

  const openStreet = await reverseGeocodeOpenStreetMap(latitude, longitude);
  if (openStreet) return openStreet;

  return 'Selected location';
}

/** Used when Google billing/key is unavailable. Browser-safe (CORS *). */
async function reverseGeocodeOpenStreetMap(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '0',
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { display_name?: string };
    const name = data.display_name?.trim();
    return name || null;
  } catch {
    return null;
  }
}
