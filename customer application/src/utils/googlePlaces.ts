import type { AddressFormValues } from '../components/profile/ProfileAddressFields';
import type { LocationResult } from '../types/location';
import { getGoogleMapsApiKey, reverseGeocode } from './googleMaps';
import { buildReadableAddressLabel } from './readableAddress';

export const LOCATION_ACCENT = '#F59E0B';

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceDetailsLike {
  place_id?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  address_components?: AddressComponent[];
}

function getComponent(components: AddressComponent[], type: string): string {
  return components.find(component => component.types.includes(type))?.long_name ?? '';
}

export function parseLocationResult(
  placeId: string,
  formattedAddress: string,
  latitude: number,
  longitude: number,
  addressComponents: AddressComponent[] = [],
): LocationResult {
  const city =
    getComponent(addressComponents, 'locality') ||
    getComponent(addressComponents, 'administrative_area_level_2') ||
    getComponent(addressComponents, 'sublocality_level_1') ||
    getComponent(addressComponents, 'sublocality') ||
    '';

  return {
    address: formattedAddress,
    displayLabel: buildReadableAddressLabel(formattedAddress, addressComponents),
    city,
    state: getComponent(addressComponents, 'administrative_area_level_1'),
    pincode: getComponent(addressComponents, 'postal_code'),
    latitude,
    longitude,
    placeId,
  };
}

export function parseLocationFromPlaceDetails(
  data: { place_id?: string; description?: string },
  details: PlaceDetailsLike | null,
): LocationResult | null {
  if (!details?.geometry?.location) return null;

  const formattedAddress = details.formatted_address ?? data.description ?? '';
  const { lat, lng } = details.geometry.location;

  return parseLocationResult(
    details.place_id ?? data.place_id ?? '',
    formattedAddress,
    lat,
    lng,
    details.address_components ?? [],
  );
}

export function toAddressFormValues(location: LocationResult): AddressFormValues {
  const parts = location.address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  const line1 = parts[0] ?? location.address;
  const line2 =
    parts.find(part => part.toLowerCase().includes(location.city.toLowerCase()) === false &&
      part !== line1 &&
      !part.match(/^\d{6}$/) &&
      part !== location.state) ??
    parts[1] ??
    '';

  return {
    line1,
    line2: line2 === line1 ? '' : line2,
    city: location.city,
    state: location.state,
    pincode: location.pincode,
  };
}

export async function reverseGeocodeToLocation(
  latitude: number,
  longitude: number,
): Promise<LocationResult> {
  const key = getGoogleMapsApiKey();
  if (!key) {
    const address = await reverseGeocode(latitude, longitude);
    return {
      address,
      city: '',
      state: '',
      pincode: '',
      latitude,
      longitude,
      placeId: '',
    };
  }

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
    const data = (await response.json()) as {
      results?: Array<{
        formatted_address: string;
        place_id: string;
        geometry: { location: { lat: number; lng: number } };
        address_components: AddressComponent[];
      }>;
    };

    const result = data.results?.[0];
    if (!result) {
      throw new Error('No address found');
    }

    return parseLocationResult(
      result.place_id,
      result.formatted_address,
      result.geometry.location.lat,
      result.geometry.location.lng,
      result.address_components,
    );
  } catch {
    const address = await reverseGeocode(latitude, longitude);
    return {
      address,
      city: '',
      state: '',
      pincode: '',
      latitude,
      longitude,
      placeId: '',
    };
  }
}

export interface PlaceSuggestion {
  placeId: string;
  title: string;
  subtitle: string;
  distanceLabel?: string;
}

function formatMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 950) return `${Math.max(50, Math.round(meters / 50) * 50)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/** Local-first autocomplete. `origin` ranks nearby places and adds straight-line distance. */
export async function searchPlaceSuggestions(
  input: string,
  origin?: { latitude: number; longitude: number } | null,
): Promise<PlaceSuggestion[]> {
  const key = getGoogleMapsApiKey();
  const query = input.trim();
  if (!key || query.length < 2) return [];

  const params = new URLSearchParams({
    input: query,
    key,
    components: 'country:in',
    language: 'en',
  });
  if (origin) {
    params.set('origin', `${origin.latitude},${origin.longitude}`);
    params.set('location', `${origin.latitude},${origin.longitude}`);
    params.set('radius', '40000');
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
    );
    const data = (await response.json()) as {
      predictions?: Array<{
        place_id: string;
        description: string;
        distance_meters?: number;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }>;
    };
    return (data.predictions ?? []).slice(0, 8).map(item => ({
      placeId: item.place_id,
      title: item.structured_formatting?.main_text || item.description,
      subtitle: item.structured_formatting?.secondary_text || '',
      distanceLabel:
        typeof item.distance_meters === 'number' ? formatMeters(item.distance_meters) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function locationFromPlaceId(placeId: string, fallbackTitle: string): Promise<LocationResult | null> {
  const key = getGoogleMapsApiKey();
  if (!key || !placeId) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'place_id,formatted_address,geometry,address_components',
    key,
    language: 'en',
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
    );
    const data = (await response.json()) as { result?: PlaceDetailsLike };
    return parseLocationFromPlaceDetails({ place_id: placeId, description: fallbackTitle }, data.result ?? null);
  } catch {
    return null;
  }
}

export function distanceKm(
  from: { latitude: number; longitude: number } | null | undefined,
  latitude: number,
  longitude: number,
): number | null {
  if (!from) return null;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(latitude - from.latitude);
  const dLng = toRad(longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(latitude)) * Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (!Number.isFinite(km)) return null;
  return Math.max(0, Math.round(km));
}

/** True when two pins are effectively the same curb (under 200m). */
export function isSameSpot(
  a: { latitude: number; longitude: number } | null | undefined,
  latitude?: number | null,
  longitude?: number | null,
): boolean {
  if (!a || latitude == null || longitude == null) return false;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(latitude - a.latitude);
  const dLng = toRad(longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(latitude)) * Math.sin(dLng / 2) ** 2;
  const meters = 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Number.isFinite(meters) && meters < 200;
}
