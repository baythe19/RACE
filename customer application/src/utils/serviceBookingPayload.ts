import type { DriverBookingState } from '../types/driverBooking';
import type { RoadsideBookingState } from '../types/roadsideBooking';
import type { TowingBookingState } from '../types/towingBooking';
import type {
  CreateDriverBookingRequest,
  CreateRoadsideBookingRequest,
  CreateTowingBookingRequest,
} from '../types/serviceBooking';
import type { Vehicle } from '../types/vehicle';
import {
  driverDateIdToScheduledAt,
  requireBookingLocation,
  towingDateIdToScheduledAt,
} from './bookingLocation';
import {
  validateDriverBookingRequest,
  validateRoadsideBookingRequest,
  validateTowingBookingRequest,
} from './bookingValidation';
import { isTowingRoadsideSlug } from './roadsideServiceMap';

export function resolveBookingVehicleId(
  preferredVehicleId: string | undefined,
  vehicles: Vehicle[],
): string {
  if (preferredVehicleId) {
    return preferredVehicleId;
  }
  if (vehicles.length > 0) {
    return vehicles[0].id;
  }
  throw new Error('Add a vehicle in Profile before booking');
}

export function buildTowingBookingRequest(
  booking: TowingBookingState,
  vehicles: Vehicle[],
): CreateTowingBookingRequest {
  const vehicleId = resolveBookingVehicleId(
    booking.vehicleId || booking.serviceLocation?.vehicleId,
    vehicles,
  );

  const pickupAddress =
    booking.serviceLocation?.address?.trim() || booking.pickup.trim();
  const dropoffAddress = booking.drop.trim();

  const payload: CreateTowingBookingRequest = {
    vehicleId,
    pickup: requireBookingLocation(
      pickupAddress,
      booking.pickupLat,
      booking.pickupLng,
      'pickup',
    ),
    dropoff: requireBookingLocation(
      dropoffAddress,
      booking.dropLat,
      booking.dropLng,
      'dropoff',
    ),
  };

  if (booking.serviceMode === 'scheduled') {
    payload.scheduledAt = towingDateIdToScheduledAt(booking.dateId, booking.timeId);
    payload.towingMode = 'scheduled';
  } else if (booking.serviceMode === 'emergency') {
    payload.towingMode = 'emergency';
  } else {
    payload.towingMode = 'instant';
  }

  validateTowingBookingRequest(payload);
  return payload;
}

export function buildDriverBookingRequest(
  booking: DriverBookingState,
  vehicles: Vehicle[],
): CreateDriverBookingRequest {
  const vehicleId = resolveBookingVehicleId(booking.vehicleId || undefined, vehicles);

  const payload: CreateDriverBookingRequest = {
    vehicleId,
    pickup: requireBookingLocation(
      booking.pickup.trim(),
      booking.pickupLat,
      booking.pickupLng,
      'pickup',
    ),
    packageHours: booking.packageHours,
    driverServiceType: booking.driverType,
  };

  const scheduledAt = driverDateIdToScheduledAt(booking.dateId, booking.startTime);
  if (scheduledAt) {
    payload.scheduledAt = scheduledAt;
  }

  if (booking.driverType === 'outstation' && booking.dropoff.trim()) {
    payload.dropoff = requireBookingLocation(
      booking.dropoff.trim(),
      booking.dropoffLat,
      booking.dropoffLng,
      'dropoff',
    );
  }

  validateDriverBookingRequest(payload);
  return payload;
}

export function buildRoadsideBookingRequest(
  booking: RoadsideBookingState,
  vehicles: Vehicle[],
  serviceType: string,
): CreateRoadsideBookingRequest {
  const vehicleId = resolveBookingVehicleId(undefined, vehicles);
  const pickup = requireBookingLocation(
    booking.location,
    booking.locationLat,
    booking.locationLng,
    'pickup',
  );

  const payload: CreateRoadsideBookingRequest = {
    serviceType,
    vehicleId,
    pickup,
  };

  if (isTowingRoadsideSlug(serviceType)) {
    payload.dropoff = requireBookingLocation(
      booking.dropoff ?? '',
      booking.dropoffLat,
      booking.dropoffLng,
      'dropoff',
    );
  }

  validateRoadsideBookingRequest(payload);
  return payload;
}
