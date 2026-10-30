import type { BookingLocation } from '../types/serviceBooking';
import { BHUBANESWAR_DEFAULT } from './googleMaps';

// Default map center — only used when GPS permission is denied or coords are missing.
// Never sent to POST /api/v1/bookings/* unless the user explicitly selects a location on the map.
const DEFAULT_LATITUDE = BHUBANESWAR_DEFAULT.latitude;
const DEFAULT_LONGITUDE = BHUBANESWAR_DEFAULT.longitude;

/** Requires real coordinates — use when submitting bookings to the API. */
export function requireBookingLocation(
  address: string,
  latitude: number | undefined,
  longitude: number | undefined,
  label = 'location',
): BookingLocation {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new Error(`${label} address is required`);
  }
  if (latitude == null || longitude == null) {
    throw new Error(`Select ${label} on the map to set coordinates`);
  }
  return {
    address: trimmed,
    latitude,
    longitude,
  };
}

export function addressToBookingLocation(
  address: string,
  latitude?: number,
  longitude?: number,
  offset = 0,
): BookingLocation {
  return {
    address: address.trim(),
    latitude: latitude ?? DEFAULT_LATITUDE + offset,
    longitude: longitude ?? DEFAULT_LONGITUDE + offset * 0.5,
  };
}

export function buildFutureScheduledAt(daysAhead = 1, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

import type { TowingTimeId } from '../types/towingBooking';
import { isSameDay, parseISODate, parseStoredDate } from './driverCalendar';

export function towingDateIdToScheduledAt(
  dateId: string,
  timeId: TowingTimeId = '30-60',
): string | undefined {
  const iso = parseStoredDate(dateId);
  const date = parseISODate(iso);
  const now = new Date();

  if (isSameDay(date, now)) {
    const hoursAhead = timeId === '60-90' ? 1.5 : timeId === 'custom' ? 3 : 1;
    date.setHours(now.getHours() + Math.ceil(hoursAhead), 0, 0, 0);
  } else {
    date.setHours(10, 0, 0, 0);
  }

  if (date.getTime() <= now.getTime()) {
    date.setTime(now.getTime() + 60 * 60 * 1000);
  }

  return date.toISOString();
}

/** Combine wizard date (ISO or legacy id) + HH:mm start into scheduledAt. */
export function driverDateIdToScheduledAt(
  dateId: string,
  startTime24 = '09:00',
): string | undefined {
  const iso = parseStoredDate(dateId);
  const date = parseISODate(iso);
  const match = startTime24.match(/^(\d{1,2}):(\d{2})$/);
  const hours = match ? Number(match[1]) : 9;
  const minutes = match ? Number(match[2]) : 0;
  date.setHours(hours, minutes, 0, 0);

  const now = new Date();
  if (date.getTime() <= now.getTime()) {
    if (isSameDay(date, now)) {
      return undefined;
    }
    date.setTime(now.getTime() + 60 * 60 * 1000);
  }

  return date.toISOString();
}
