import { Types } from 'mongoose';

import { logger } from '../../../utils/src/logger';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../utils/src/errors';
import { UserModel, type IUser } from '../../../models/src/user';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { canTransition } from '../bookingStatusConstants';
import { appendStatusHistory } from './booking';
import { emitBookingStatusUpdate, emitToDriver } from '../socket';
import { mapPublicBookingStatus } from '../bookingDisplayStatus';
import { generateTripStartOtp } from './tripOtp';
import type { ActiveBookingType } from '../../../models/src/user';

const FALLBACK_DISTANCE_KM = 999;
const EARTH_RADIUS_KM = 6371;
/** Open-offer radius (km). Drivers without GPS still see all eligible offers. */
const DEFAULT_OFFER_RADIUS_KM = 50;

/**
 * Decision window for an open marketplace offer, in milliseconds.
 *
 * The window is decided by the backend (never by the app) and can be tuned per
 * environment: `OFFER_DECISION_WINDOW_SECONDS` (default 120s, minimum 30s).
 * Vendor-fleet jobs are exempt — those are already routed to a specific vendor
 * and may legitimately wait longer for a fleet driver to claim them.
 */
export const OFFER_DECISION_WINDOW_MS =
  Math.max(30, Number(process.env.OFFER_DECISION_WINDOW_SECONDS ?? 120)) * 1000;

export function offerExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + OFFER_DECISION_WINDOW_MS);
}

export function isOfferExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > offerExpiresAt(createdAt).getTime();
}

/** Drivers eligible for towing / roadside tow bookings */
export const TOWING_DRIVER_TYPES = ['Tow Driver'] as const;

/** Drivers eligible for hire-a-driver (any package duration) */
export const DRIVER_SERVICE_TYPES = ['Full-Time', 'Part-Time'] as const;

function driverTypesForBooking(bookingType: ActiveBookingType): readonly string[] {
  return bookingType === 'towing' ? TOWING_DRIVER_TYPES : DRIVER_SERVICE_TYPES;
}

export function isDriverEligibleForBooking(
  driver: IUser,
  bookingType: ActiveBookingType,
): boolean {
  const driverType = driver.driverProfile?.driverType;
  if (!driverType) return false;
  return driverTypesForBooking(bookingType).includes(driverType);
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(c * EARTH_RADIUS_KM * 10) / 10;
}

function driverDistanceFromPickup(
  driver: IUser,
  pickupLatitude: number,
  pickupLongitude: number,
): number {
  const lat = driver.currentLocation?.latitude;
  const lng = driver.currentLocation?.longitude;
  if (lat !== undefined && lng !== undefined) {
    return haversineDistanceKm(pickupLatitude, pickupLongitude, lat, lng);
  }
  return FALLBACK_DISTANCE_KM;
}

export type OpenBookingOffer = {
  bookingType: 'towing' | 'driver';
  id: string;
  bookingNumber: string;
  status: string;
  pickup?: {
    label?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  dropoff?: {
    label?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  estimatedFare?: number;
  createdAt: string;
  distanceKm?: number;
  serviceLabel: string;
  vendorId?: string;
  assignedFleetVehicleLabel?: string;
  /** True when vendor approved the job and a driver still needs to claim it. */
  vendorApproved?: boolean;
  /**
   * Backend-decided deadline for accepting this open offer. Absent for
   * vendor-routed jobs, which do not run on the marketplace clock.
   */
  offerExpiresAt?: string;
  /** Server-computed: the decision window has already lapsed. */
  isExpired?: boolean;
};

/** Specific, bookable name for an offer — falls back to the broad category. */
function offerServiceLabel(
  bookingType: 'towing' | 'driver',
  booking: {
    towingMode?: 'instant' | 'scheduled' | 'emergency';
    driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  },
): string {
  if (bookingType === 'towing') {
    if (booking.towingMode === 'emergency') return 'Emergency Towing';
    if (booking.towingMode === 'scheduled') return 'Scheduled Towing';
    if (booking.towingMode === 'instant') return 'Instant Towing';
    return 'Towing';
  }
  switch (booking.driverServiceType) {
    case 'full_time':
      return 'Full-Time Driver';
    case 'part_time':
      return 'Part-Time Driver';
    case 'outstation':
      return 'Outstation Driver';
    case 'night':
      return 'Night Driver';
    default:
      return 'Driver hire';
  }
}

function mapOffer(
  bookingType: 'towing' | 'driver',
  booking: {
    id?: string;
    _id?: { toString(): string };
    bookingNumber: string;
    status: string;
    pickup?: { address?: string; latitude?: number; longitude?: number };
    dropoff?: { address?: string; latitude?: number; longitude?: number } | null;
    estimatedFare?: number;
    createdAt: Date;
    vendorId?: { toString(): string } | null;
    assignedFleetVehicleLabel?: string | null;
    towingMode?: 'instant' | 'scheduled' | 'emergency';
    driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  },
  distanceKm?: number,
  /** Marketplace offers carry the backend decision window; vendor jobs do not. */
  includeDecisionWindow = false,
): OpenBookingOffer {
  const vendorId = booking.vendorId?.toString();
  return {
    bookingType,
    id: booking.id ?? booking._id?.toString() ?? '',
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    pickup: booking.pickup,
    dropoff: booking.dropoff ?? null,
    estimatedFare: booking.estimatedFare,
    createdAt: booking.createdAt.toISOString(),
    distanceKm,
    serviceLabel: offerServiceLabel(bookingType, booking),
    vendorId,
    assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel ?? undefined,
    vendorApproved: Boolean(vendorId),
    ...(includeDecisionWindow
      ? {
          offerExpiresAt: offerExpiresAt(booking.createdAt).toISOString(),
          isExpired: isOfferExpired(booking.createdAt),
        }
      : {}),
  };
}

/** Confirmed bookings with no driver — marketplace feed. */
export async function listOpenBookingOffers(options?: {
  bookingType?: ActiveBookingType;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  forDriver?: IUser;
  /** Vendor portal: open jobs + jobs this vendor already approved (awaiting driver). */
  forVendorId?: string;
}): Promise<OpenBookingOffer[]> {
  const includeTowing = !options?.bookingType || options.bookingType === 'towing';
  const includeDriver = !options?.bookingType || options.bookingType === 'driver';
  const radiusKm = options?.radiusKm ?? DEFAULT_OFFER_RADIUS_KM;

  const noDriverClause = { $or: [{ driverId: null }, { driverId: { $exists: false } }] };
  const noVendorClause = { $or: [{ vendorId: null }, { vendorId: { $exists: false } }] };

  const openFilter: Record<string, unknown> = {
    status: 'CONFIRMED',
  };

  const driverVendorId = options?.forDriver?.driverProfile?.vendorUserId?.toString();

  if (options?.forVendorId) {
    openFilter.$and = [
      noDriverClause,
      {
        $or: [
          { vendorId: null },
          { vendorId: { $exists: false } },
          { vendorId: new Types.ObjectId(options.forVendorId) },
        ],
      },
    ];
  } else if (driverVendorId) {
    openFilter.$and = [noDriverClause];
    openFilter.vendorId = new Types.ObjectId(driverVendorId);
  } else if (options?.forDriver) {
    openFilter.$and = [noDriverClause, noVendorClause];
  } else {
    openFilter.$and = [noDriverClause];
  }

  const [towing, driver] = await Promise.all([
    includeTowing
      ? TowingBookingModel.find(openFilter).sort({ createdAt: -1 }).exec()
      : Promise.resolve([]),
    includeDriver
      ? DriverBookingModel.find(openFilter).sort({ createdAt: -1 }).exec()
      : Promise.resolve([]),
  ]);

  const offers: OpenBookingOffer[] = [];

  const consider = (
    bookingType: 'towing' | 'driver',
    booking: {
      id?: string;
      _id?: { toString(): string };
      bookingNumber: string;
      status: string;
      pickup?: { address?: string; latitude?: number; longitude?: number };
      dropoff?: { address?: string; latitude?: number; longitude?: number } | null;
      estimatedFare?: number;
      createdAt: Date;
      vendorId?: { toString(): string } | null;
      assignedFleetVehicleLabel?: string | null;
    },
  ) => {
    if (options?.forDriver && !isDriverEligibleForBooking(options.forDriver, bookingType)) {
      const bookingVendorIdEarly = booking.vendorId?.toString();
      if (
        !driverVendorId ||
        !bookingVendorIdEarly ||
        bookingVendorIdEarly !== driverVendorId
      ) {
        return;
      }
    }

    const bookingVendorId = booking.vendorId?.toString();
    if (driverVendorId) {
      if (!bookingVendorId || bookingVendorId !== driverVendorId) {
        return;
      }
    } else if (options?.forDriver && bookingVendorId) {
      return;
    }

    if (options?.forVendorId && bookingVendorId && bookingVendorId !== options.forVendorId) {
      return;
    }

    const lat = booking.pickup?.latitude;
    const lng = booking.pickup?.longitude;
    let distanceKm: number | undefined;
    /** Vendor fleet drivers see every job their vendor approved — no geo radius. */
    const skipRadiusFilter = Boolean(driverVendorId) || Boolean(bookingVendorId);

    if (
      options?.latitude !== undefined &&
      options?.longitude !== undefined &&
      lat !== undefined &&
      lng !== undefined
    ) {
      distanceKm = haversineDistanceKm(options.latitude, options.longitude, lat, lng);
      if (!skipRadiusFilter && distanceKm > radiusKm) return;
    } else if (options?.forDriver && lat !== undefined && lng !== undefined) {
      distanceKm = driverDistanceFromPickup(options.forDriver, lat, lng);
      if (!skipRadiusFilter && distanceKm !== FALLBACK_DISTANCE_KM && distanceKm > radiusKm) {
        return;
      }
    }

    offers.push(mapOffer(bookingType, booking, distanceKm, !skipRadiusFilter));
  };

  for (const booking of towing) consider('towing', booking);
  for (const booking of driver) consider('driver', booking);

  offers.sort((a, b) => {
    const da = a.distanceKm ?? FALLBACK_DISTANCE_KM;
    const db = b.distanceKm ?? FALLBACK_DISTANCE_KM;
    if (da !== db) return da - db;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return offers;
}

/**
 * Vendor approves an open customer request and assigns a fleet vehicle.
 * Status stays CONFIRMED until a vendor driver self-claims the job.
 */
export async function approveVendorBookingOffer(
  bookingId: string,
  bookingType: ActiveBookingType,
  vendorId: string,
  options: {
    fleetVehicleId: string;
    fleetVehicleLabel: string;
  },
): Promise<{
  id: string;
  status: string;
  bookingNumber: string;
  vendorId: string;
  assignedFleetVehicleLabel: string;
}> {
  const filter = {
    _id: bookingId,
    status: 'CONFIRMED',
    $and: [
      { $or: [{ driverId: null }, { driverId: { $exists: false } }] },
      { $or: [{ vendorId: null }, { vendorId: { $exists: false } }] },
    ],
  };

  const update = {
    $set: {
      vendorId: new Types.ObjectId(vendorId),
      assignedFleetVehicleId: new Types.ObjectId(options.fleetVehicleId),
      assignedFleetVehicleLabel: options.fleetVehicleLabel,
    },
    $push: {
      statusHistory: {
        status: 'CONFIRMED',
        timestamp: new Date(),
        note: 'Vendor approved — awaiting driver',
      },
    },
  };

  const approved =
    bookingType === 'towing'
      ? await TowingBookingModel.findOneAndUpdate(filter, update, { new: true }).exec()
      : await DriverBookingModel.findOneAndUpdate(filter, update, { new: true }).exec();

  if (!approved) {
    throw new ConflictError('This job is no longer available or was already approved');
  }

  emitBookingStatusUpdate(bookingId, 'CONFIRMED', {
    internalStatus: 'CONFIRMED',
    message: 'Vendor approved your request — assigning driver',
    assignedFleetVehicleLabel: options.fleetVehicleLabel,
    vendorApproved: true,
  });

  return {
    id: approved.id,
    status: approved.status,
    bookingNumber: approved.bookingNumber,
    vendorId,
    assignedFleetVehicleLabel: options.fleetVehicleLabel,
  };
}

/**
 * Race-to-accept open offer: CONFIRMED → DRIVER_EN_ROUTE atomically.
 * Customer then sees partner details.
 * Optional vendorId / fleet vehicle when a vendor dispatches their fleet.
 */
export async function claimOpenBookingOffer(
  bookingId: string,
  bookingType: ActiveBookingType,
  driverId: string,
  options?: {
    vendorId?: string;
    fleetVehicleId?: string;
    fleetVehicleLabel?: string;
  },
): Promise<{
  id: string;
  status: string;
  bookingNumber: string;
  driverId: string;
  vendorId?: string;
  assignedFleetVehicleLabel?: string;
}> {
  const driver = await UserModel.findOne({ _id: driverId, role: 'driver' }).exec();
  if (!driver) throw new NotFoundError('Driver not found');
  if (driver.driverProfile?.status !== 'APPROVED') {
    throw new BadRequestError('Driver account pending admin approval');
  }
  if (!driver.isAvailable || driver.activeBookingId) {
    throw new BadRequestError('You already have an active booking or are offline');
  }
  if (!isDriverEligibleForBooking(driver, bookingType)) {
    const existingForEligibility =
      bookingType === 'towing'
        ? await TowingBookingModel.findById(bookingId).select('vendorId').exec()
        : await DriverBookingModel.findById(bookingId).select('vendorId').exec();
    const bookingVendorForEligibility = existingForEligibility?.vendorId?.toString();
    const driverVendorForEligibility = driver.driverProfile?.vendorUserId?.toString();
    if (
      !bookingVendorForEligibility ||
      !driverVendorForEligibility ||
      bookingVendorForEligibility !== driverVendorForEligibility
    ) {
      throw new BadRequestError(
        bookingType === 'towing'
          ? 'Only tow drivers can accept towing jobs'
          : 'Only Full-Time / Part-Time drivers can accept driver-hire jobs',
      );
    }
  }

  const existing =
    bookingType === 'towing'
      ? await TowingBookingModel.findById(bookingId).exec()
      : await DriverBookingModel.findById(bookingId).exec();
  if (!existing) {
    throw new NotFoundError('Booking not found');
  }
  if (existing.status !== 'CONFIRMED' || existing.driverId) {
    throw new ConflictError('This job was just taken by another partner');
  }

  const driverVendorId = driver.driverProfile?.vendorUserId?.toString();
  const bookingVendorId =
    'vendorId' in existing && existing.vendorId ? existing.vendorId.toString() : undefined;

  if (bookingVendorId) {
    if (!driverVendorId || driverVendorId !== bookingVendorId) {
      throw new ForbiddenError('This job is reserved for your vendor fleet drivers');
    }
  } else if (driverVendorId) {
    throw new ForbiddenError('Your vendor must approve this job before you can accept it');
  }

  // Open marketplace offers run on the backend decision clock. Vendor-routed
  // jobs are exempt, since their approval can legitimately land later.
  if (!bookingVendorId && isOfferExpired(existing.createdAt)) {
    throw new ConflictError('This request expired. Please wait for the next request.');
  }

  const vendorId = bookingVendorId ?? options?.vendorId;
  const fleetVehicleId =
    ('assignedFleetVehicleId' in existing && existing.assignedFleetVehicleId?.toString()) ??
    options?.fleetVehicleId;
  const fleetVehicleLabel =
    ('assignedFleetVehicleLabel' in existing
      ? existing.assignedFleetVehicleLabel
      : undefined) ?? options?.fleetVehicleLabel;

  const driverObjectId = new Types.ObjectId(driverId);
  const tripStartOtp = generateTripStartOtp();
  const $set: Record<string, unknown> = {
    driverId: driverObjectId,
    status: 'DRIVER_EN_ROUTE',
    tripStartOtp,
    tripStartOtpVerified: false,
  };
  if (vendorId) {
    $set.vendorId = new Types.ObjectId(vendorId);
  }
  if (fleetVehicleId) {
    $set.assignedFleetVehicleId = new Types.ObjectId(fleetVehicleId);
  }
  if (fleetVehicleLabel) {
    $set.assignedFleetVehicleLabel = fleetVehicleLabel;
  }

  const update = {
    $set,
    $push: {
      statusHistory: {
        $each: [
          { status: 'DRIVER_ASSIGNED', timestamp: new Date() },
          { status: 'DRIVER_EN_ROUTE', timestamp: new Date() },
        ],
      },
    },
  };
  const filter = {
    _id: bookingId,
    status: 'CONFIRMED',
    $or: [{ driverId: null }, { driverId: { $exists: false } }],
  };

  const claimed =
    bookingType === 'towing'
      ? await TowingBookingModel.findOneAndUpdate(filter, update, { new: true }).exec()
      : await DriverBookingModel.findOneAndUpdate(filter, update, { new: true }).exec();

  if (!claimed) {
    throw new ConflictError('This job was just taken by another partner');
  }

  await UserModel.findByIdAndUpdate(driverId, {
    isAvailable: false,
    activeBookingId: new Types.ObjectId(bookingId),
    activeBookingType: bookingType,
  }).exec();

  // VOC P0.3: the trip-start OTP must reach ONLY the assigned driver — it is
  // no longer broadcast to the shared booking room, where any authenticated
  // socket (previously even unauthenticated) could hear it.
  emitBookingStatusUpdate(bookingId, 'DRIVER_EN_ROUTE', {
    internalStatus: 'DRIVER_EN_ROUTE',
    driverAccepted: true,
    message: 'Partner accepted your booking',
    assignedFleetVehicleLabel: fleetVehicleLabel,
  });
  emitToDriver(driverId, 'trip:otp', {
    bookingId,
    bookingType,
    tripStartOtp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  return {
    id: claimed.id,
    status: claimed.status,
    bookingNumber: claimed.bookingNumber,
    driverId,
    vendorId,
    assignedFleetVehicleLabel: fleetVehicleLabel,
  };
}

// TODO: Replace with MongoDB $geoNear when driver app sends live location consistently
export async function findNearestAvailableDriver(
  pickupLatitude: number,
  pickupLongitude: number,
  bookingType: ActiveBookingType,
): Promise<{ driverId: string; distanceKm: number } | null> {
  const drivers = await UserModel.find({
    role: 'driver',
    isAvailable: true,
    'driverProfile.status': 'APPROVED',
    'driverProfile.driverType': { $in: [...driverTypesForBooking(bookingType)] },
    $or: [{ activeBookingId: null }, { activeBookingId: { $exists: false } }],
  }).exec();

  if (drivers.length === 0) {
    return null;
  }

  const ranked = drivers
    .map((driver) => ({
      driverId: driver.id,
      distanceKm: driverDistanceFromPickup(driver, pickupLatitude, pickupLongitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return ranked[0];
}

export async function assignDriverToBooking(
  bookingId: string,
  bookingType: ActiveBookingType,
  driverId: string,
): Promise<void> {
  const driver = await UserModel.findOne({ _id: driverId, role: 'driver' }).exec();
  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  if (!isDriverEligibleForBooking(driver, bookingType)) {
    const expected =
      bookingType === 'towing' ? 'tow driver' : 'driver service (Full-Time / Part-Time)';
    throw new BadRequestError(
      `Driver ${driver.fullName ?? driverId} is not eligible for ${bookingType} bookings (${expected} required)`,
    );
  }

  const driverObjectId = new Types.ObjectId(driverId);

  if (bookingType === 'towing') {
    const booking = await TowingBookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (!canTransition(booking.status, 'DRIVER_ASSIGNED')) {
      throw new BadRequestError(
        `Cannot assign driver: invalid status transition from ${booking.status} to DRIVER_ASSIGNED`,
      );
    }

    await TowingBookingModel.findByIdAndUpdate(bookingId, {
      driverId: driverObjectId,
      status: 'DRIVER_ASSIGNED',
      statusHistory: appendStatusHistory(booking.statusHistory, 'DRIVER_ASSIGNED'),
    }).exec();
  } else {
    const booking = await DriverBookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (!canTransition(booking.status, 'DRIVER_ASSIGNED')) {
      throw new BadRequestError(
        `Cannot assign driver: invalid status transition from ${booking.status} to DRIVER_ASSIGNED`,
      );
    }

    await DriverBookingModel.findByIdAndUpdate(bookingId, {
      driverId: driverObjectId,
      status: 'DRIVER_ASSIGNED',
      statusHistory: appendStatusHistory(booking.statusHistory, 'DRIVER_ASSIGNED'),
    }).exec();
  }

  await UserModel.findByIdAndUpdate(driverId, {
    isAvailable: false,
    activeBookingId: new Types.ObjectId(bookingId),
    activeBookingType: bookingType,
  }).exec();

  emitBookingStatusUpdate(bookingId, mapPublicBookingStatus('DRIVER_ASSIGNED'), {
    internalStatus: 'DRIVER_ASSIGNED',
    driverAccepted: false,
    message: 'Driver allotted — awaiting acceptance',
  });
}

export async function releaseDriver(driverId: string): Promise<void> {
  await UserModel.findByIdAndUpdate(driverId, {
    isAvailable: true,
    activeBookingId: null,
    activeBookingType: null,
  }).exec();
}

/** Driver rejects an assigned job — frees driver and returns booking to CONFIRMED for reassignment. */
export async function unassignDriverFromBooking(
  bookingId: string,
  bookingType: ActiveBookingType,
  driverId: string,
): Promise<void> {
  if (bookingType === 'towing') {
    const booking = await TowingBookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundError('Booking not found');
    if (!booking.driverId || booking.driverId.toString() !== driverId) {
      throw new BadRequestError('Booking is not assigned to this driver');
    }
    await TowingBookingModel.findByIdAndUpdate(bookingId, {
      $unset: { driverId: 1 },
      status: 'CONFIRMED',
      statusHistory: appendStatusHistory(booking.statusHistory, 'CONFIRMED'),
    }).exec();
  } else {
    const booking = await DriverBookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundError('Booking not found');
    if (!booking.driverId || booking.driverId.toString() !== driverId) {
      throw new BadRequestError('Booking is not assigned to this driver');
    }
    await DriverBookingModel.findByIdAndUpdate(bookingId, {
      $unset: { driverId: 1 },
      status: 'CONFIRMED',
      statusHistory: appendStatusHistory(booking.statusHistory, 'CONFIRMED'),
    }).exec();
  }

  await releaseDriver(driverId);
}

export async function autoAssignDriver(
  bookingId: string,
  bookingType: ActiveBookingType,
  pickupLatitude: number,
  pickupLongitude: number,
): Promise<{ assigned: boolean; driverId?: string; reason?: string }> {
  try {
    const nearest = await findNearestAvailableDriver(
      pickupLatitude,
      pickupLongitude,
      bookingType,
    );
    if (!nearest) {
      logger.warn(`No available drivers for ${bookingType} booking ${bookingId}`);
      return { assigned: false, reason: 'No drivers available' };
    }

    await assignDriverToBooking(bookingId, bookingType, nearest.driverId);
    return { assigned: true, driverId: nearest.driverId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Driver assignment failed';
    logger.error(`Driver auto-assign failed for ${bookingType} booking ${bookingId}`, {
      error: message,
    });
    return { assigned: false, reason: message };
  }
}

export interface AvailableDriverSummary {
  _id: string;
  fullName?: string;
  mobileNumber: string;
  isAvailable?: boolean;
  currentLocation?: IUser['currentLocation'];
  activeBookingId?: string | null;
  distanceKm?: number;
}

export async function listAvailableDrivers(options?: {
  latitude?: number;
  longitude?: number;
  bookingType?: ActiveBookingType;
}): Promise<AvailableDriverSummary[]> {
  const filter: Record<string, unknown> = {
    role: 'driver',
    isAvailable: true,
    'driverProfile.status': 'APPROVED',
  };

  if (options?.bookingType) {
    filter['driverProfile.driverType'] = { $in: [...driverTypesForBooking(options.bookingType)] };
  }

  const drivers = await UserModel.find(filter).exec();

  const summaries = drivers.map((driver) => {
    const summary: AvailableDriverSummary = {
      _id: driver.id,
      fullName: driver.fullName,
      mobileNumber: driver.mobileNumber,
      isAvailable: driver.isAvailable,
      currentLocation: driver.currentLocation,
      activeBookingId: driver.activeBookingId?.toString() ?? null,
    };

    if (
      options?.latitude !== undefined &&
      options?.longitude !== undefined
    ) {
      summary.distanceKm = driverDistanceFromPickup(
        driver,
        options.latitude,
        options.longitude,
      );
    }

    return summary;
  });

  if (options?.latitude !== undefined && options?.longitude !== undefined) {
    summaries.sort((a, b) => (a.distanceKm ?? FALLBACK_DISTANCE_KM) - (b.distanceKm ?? FALLBACK_DISTANCE_KM));
  }

  return summaries;
}
