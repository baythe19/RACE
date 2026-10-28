import { UserModel } from '../../../models/src/user';
import type { Types } from 'mongoose';
import { isDriverVisibleToCustomer } from '../bookingDisplayStatus';

/**
 * P-TRACK-01: resolve the freshest trustworthy driver fix for a customer-facing
 * tracking response.
 *
 * During an active trip (DRIVER_EN_ROUTE → IN_PROGRESS) the driver app PATCHes
 * /driver/location, which writes booking-scoped driverLatitude/driverLongitude
 * (+ driverLocationUpdatedAt) and emits the socket event. User.currentLocation
 * is only written opportunistically, so it can be stale or absent while the
 * booking-scoped fix is live.
 *
 * Preference order:
 *   1. Booking-scoped fix when fresh (age within [-30s, +90s] — same window the
 *      vendor tracking endpoint uses) during an active status.
 *   2. User.currentLocation fallback (legacy behaviour) when no fresh
 *      booking-scoped fix exists.
 *
 * P-UPI-01: also resolves the assigned driver's saved UPI VPA so the dropoff
 * settlement sheet can deep-link the customer's UPI app (MVP UPI / Cash).
 */

const MIN_LOCATION_AGE_MS = -30_000;
const MAX_LOCATION_AGE_MS = 90_000;

const ACTIVE_TRACKING_STATUSES = ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'];

export interface TrackingDriverFix {
  latitude: number;
  longitude: number;
  updatedAt?: string;
  driverName?: string;
  driverPhone?: string;
}

export interface CustomerTrackingExtras {
  driverLocation?: TrackingDriverFix;
  driverUpiId?: string;
}

interface BookingScopedLocationSource {
  status: string;
  driverId?: string | Types.ObjectId | null;
  driverLatitude?: number;
  driverLongitude?: number;
  driverLocationUpdatedAt?: Date | null;
}

/**
 * Picks the best available driver location plus the driver's saved UPI VPA.
 * Both are undefined before the driver is visible (pre-accept privacy).
 */
export async function resolveCustomerTrackingExtras<T extends BookingScopedLocationSource>(
  booking: T,
): Promise<CustomerTrackingExtras> {
  if (!isDriverVisibleToCustomer(booking.status) || !booking.driverId) {
    return {};
  }

  const driverUser = await UserModel.findById(booking.driverId.toString())
    .select('currentLocation fullName mobileNumber driverProfile.bankDetails')
    .exec();

  const identity = {
    driverName: driverUser?.fullName ?? undefined,
    driverPhone: driverUser?.mobileNumber ?? undefined,
  };

  let driverLocation: TrackingDriverFix | undefined;

  // 1) Fresh booking-scoped fix written by the active-trip location reporter.
  if (ACTIVE_TRACKING_STATUSES.includes(booking.status)) {
    const updatedAt = booking.driverLocationUpdatedAt ?? undefined;
    const ageMs = updatedAt ? Date.now() - updatedAt.getTime() : undefined;
    const isFresh =
      typeof booking.driverLatitude === 'number' &&
      typeof booking.driverLongitude === 'number' &&
      typeof ageMs === 'number' &&
      ageMs >= MIN_LOCATION_AGE_MS &&
      ageMs <= MAX_LOCATION_AGE_MS;
    if (isFresh) {
      driverLocation = {
        latitude: booking.driverLatitude as number,
        longitude: booking.driverLongitude as number,
        updatedAt: updatedAt?.toISOString(),
        ...identity,
      };
    }
  }

  // 2) Legacy fallback: driver profile location (may be stale or absent).
  if (!driverLocation) {
    const fallback = driverUser?.currentLocation;
    if (fallback?.latitude !== undefined && fallback.longitude !== undefined) {
      driverLocation = {
        latitude: fallback.latitude,
        longitude: fallback.longitude,
        updatedAt: fallback.updatedAt?.toISOString(),
        ...identity,
      };
    }
  }

  const bank = driverUser?.driverProfile?.bankDetails;
  const driverUpiId =
    bank && bank.payoutMethod !== 'bank' && bank.upiId ? bank.upiId : undefined;

  return { driverLocation, driverUpiId };
}

/** Merge identity when the caller already resolved the driver separately. */
export function withDriverIdentity(
  fix: TrackingDriverFix | undefined,
  driver?: { name?: string; phone?: string },
): TrackingDriverFix | undefined {
  if (!fix) return undefined;
  return {
    ...fix,
    driverName: fix.driverName ?? driver?.name,
    driverPhone: fix.driverPhone ?? driver?.phone,
  };
}
