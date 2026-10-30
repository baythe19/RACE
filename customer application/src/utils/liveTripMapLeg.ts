import type { MapPoint } from '../components/booking/LiveTripMap';

export type CustomerMapRouteMode = 'trip_plan' | 'to_pickup' | 'to_drop' | 'driver_to_drop';

function valid(point?: MapPoint | null): point is MapPoint {
  return (
    !!point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    !(point.latitude === 0 && point.longitude === 0)
  );
}

/**
 * Which segment to draw on the customer map:
 * - Before a partner is driving: pickup → drop (planned trip).
 * - After accept, before pickup handover: partner → pickup only.
 * - In progress with a drop: pickup → drop (active leg).
 */
export function customerMapRouteMode(
  status: string,
  hasDriverLocation: boolean,
  hasDropoff: boolean,
): CustomerMapRouteMode | null {
  if (status === 'IN_PROGRESS' && hasDropoff) {
    return hasDriverLocation ? 'driver_to_drop' : 'to_drop';
  }
  if (
    hasDriverLocation &&
    (status === 'DRIVER_EN_ROUTE' ||
      status === 'DRIVER_ARRIVED' ||
      status === 'DRIVER_ASSIGNED')
  ) {
    return 'to_pickup';
  }
  if (
    (status === 'PENDING' ||
      status === 'CONFIRMED' ||
      status === 'DRIVER_ASSIGNED') &&
    hasDropoff
  ) {
    return 'trip_plan';
  }
  return null;
}

export function customerMapRouteEndpoints(
  mode: CustomerMapRouteMode,
  pickup: MapPoint | null | undefined,
  dropoff: MapPoint | null | undefined,
  driver: MapPoint | null | undefined,
): { origin: MapPoint; destination: MapPoint } | null {
  if (mode === 'trip_plan' && valid(pickup) && valid(dropoff)) {
    return { origin: pickup, destination: dropoff };
  }
  if (mode === 'to_pickup' && valid(driver) && valid(pickup)) {
    return { origin: driver, destination: pickup };
  }
  if (mode === 'to_drop' && valid(pickup) && valid(dropoff)) {
    return { origin: pickup, destination: dropoff };
  }
  if (mode === 'driver_to_drop' && valid(driver) && valid(dropoff)) {
    return { origin: driver, destination: dropoff };
  }
  return null;
}
