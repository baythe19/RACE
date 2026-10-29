import type {
  BookingLocation,
  CreateDriverBookingRequest,
  CreateRoadsideBookingRequest,
  CreateTowingBookingRequest,
} from '../types/serviceBooking';
import { isTowingRoadsideSlug } from './roadsideServiceMap';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const PACKAGE_HOURS = new Set([2, 4, 8, 12, 24]);

export function assertValidObjectId(id: string, label = 'vehicle'): void {
  if (!OBJECT_ID_REGEX.test(id)) {
    throw new Error(`Invalid ${label} id`);
  }
}

export function assertValidBookingLocation(
  location: BookingLocation,
  field: 'pickup' | 'dropoff',
): void {
  if (!location.address?.trim()) {
    throw new Error(`Enter a valid ${field} address`);
  }
  if (
    typeof location.latitude !== 'number' ||
    typeof location.longitude !== 'number' ||
    Number.isNaN(location.latitude) ||
    Number.isNaN(location.longitude)
  ) {
    throw new Error(`Select ${field} on the map so we have coordinates`);
  }
}

export function assertFutureScheduledAt(scheduledAt?: string): void {
  if (!scheduledAt) return;
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid schedule date/time');
  }
  if (date <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }
}

/** Mirrors backend createTowingBookingSchema */
export function validateTowingBookingRequest(payload: CreateTowingBookingRequest): void {
  assertValidObjectId(payload.vehicleId);
  assertValidBookingLocation(payload.pickup, 'pickup');
  assertValidBookingLocation(payload.dropoff, 'dropoff');
  assertFutureScheduledAt(payload.scheduledAt);

  const mode = payload.towingMode ?? (payload.scheduledAt ? 'scheduled' : 'instant');

  if (mode === 'scheduled' && !payload.scheduledAt) {
    throw new Error('Pick a date and time for scheduled towing');
  }
  if (mode === 'emergency' && payload.scheduledAt) {
    throw new Error('Emergency towing is dispatched now — remove the scheduled time');
  }
  if (mode === 'instant' && payload.scheduledAt) {
    throw new Error('Instant towing cannot include a scheduled time');
  }
}

/** Mirrors backend createDriverBookingSchema */
export function validateDriverBookingRequest(payload: CreateDriverBookingRequest): void {
  assertValidObjectId(payload.vehicleId);
  assertValidBookingLocation(payload.pickup, 'pickup');
  if (payload.dropoff) {
    assertValidBookingLocation(payload.dropoff, 'dropoff');
  }
  if (payload.driverServiceType === 'outstation' && !payload.dropoff) {
    throw new Error('Select a destination for outstation driver bookings');
  }
  const hasPackage =
    payload.packageHours != null && PACKAGE_HOURS.has(Number(payload.packageHours));
  const hasDuration =
    typeof payload.estimatedDurationHours === 'number' && payload.estimatedDurationHours > 0;
  if (!hasPackage && !hasDuration) {
    throw new Error('Select a package (2, 4, 8, 12, or 24 hours)');
  }
  assertFutureScheduledAt(payload.scheduledAt);
}

/** Mirrors backend createRoadsideBookingSchema */
export function validateRoadsideBookingRequest(payload: CreateRoadsideBookingRequest): void {
  if (!payload.serviceType?.trim()) {
    throw new Error('Select a roadside service');
  }
  assertValidObjectId(payload.vehicleId);
  assertValidBookingLocation(payload.pickup, 'pickup');
  if (isTowingRoadsideSlug(payload.serviceType)) {
    if (!payload.dropoff) {
      throw new Error('Drop-off is required for towing roadside services');
    }
    assertValidBookingLocation(payload.dropoff, 'dropoff');
  }
  assertFutureScheduledAt(payload.scheduledAt);
}
