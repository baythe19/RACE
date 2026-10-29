import type { RoadsideServiceId } from '../types/roadsideBooking';

/** Home “Popular services” tile ids → booking service id. */
export function popularServiceToRoadsideId(popularId: string): RoadsideServiceId | null {
  switch (popularId) {
    case 'roadside':
      return 'flat_tyre';
    case 'battery':
      return 'battery';
    case 'fuel':
      return 'fuel';
    default:
      return null;
  }
}

/** Roadside Assistance catalog row ids → booking service id. */
export function roadsideCatalogIdToServiceId(catalogId: string): RoadsideServiceId | null {
  switch (catalogId) {
    case 'flat_tyre':
      return 'flat_tyre';
    case 'battery_jumpstart':
      return 'battery';
    case 'fuel_delivery':
      return 'fuel';
    case 'minor_repair':
      return 'minor_repairs';
    default:
      return null;
  }
}

/** Skip duplicate “Select service” — go straight to location step. */
export function openRoadsideLocation(
  navigation: { navigate: (screen: 'RoadsideLocation', params: { serviceId: RoadsideServiceId }) => void },
  serviceId: RoadsideServiceId,
): void {
  navigation.navigate('RoadsideLocation', { serviceId });
}

export function isRoadsidePickupReady(booking: {
  location: string;
  locationLat?: number;
  locationLng?: number;
}): boolean {
  const address = booking.location?.trim();
  if (!address) return false;
  const { locationLat: lat, locationLng: lng } = booking;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return false;
  }
  return true;
}

export function roadsidePickupKey(booking: {
  location: string;
  locationLat?: number;
  locationLng?: number;
}): string {
  return `${booking.location.trim()}|${booking.locationLat ?? ''}|${booking.locationLng ?? ''}`;
}
