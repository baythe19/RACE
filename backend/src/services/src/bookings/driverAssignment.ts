import { Types } from 'mongoose';

import { logger } from '../../../utils/src/logger';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../utils/src/errors';
import { UserModel, type IUser } from '../../../models/src/user';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { VendorVehicleModel } from '../../../models/src/vendorVehicle';
import { DriverVendorMembershipModel } from '../../../models/src/driverVendorMembership';
import { canTransition } from '../bookingStatusConstants';
import { emitBookingStatusUpdate, emitDriverOffersUpdated, emitToDriver, emitVendorOffersUpdated } from '../socket';
import { notifyCustomerTripStatus, notifyDriverJobOffer } from '../bookingNotifications';
import { mapPublicBookingStatus } from '../bookingDisplayStatus';
import { encryptTripOtpForStorage, generateTripStartOtp, hashTripOtpForStorage } from './tripOtp';
import type { ActiveBookingType } from '../../../models/src/user';

const FALLBACK_DISTANCE_KM = 999;
const EARTH_RADIUS_KM = 6371;
/** Open-offer radius (km). Drivers without GPS still see all eligible offers. */
const DEFAULT_OFFER_RADIUS_KM = 50;
/** A GPS fix older than this is not safe to use for automatic dispatch. */
const MAX_DRIVER_LOCATION_AGE_MS = 90_000;

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

/** Drivers eligible for towing / roadside tow bookings (including connected fleet drivers) */
export const TOWING_DRIVER_TYPES = ['Tow Driver', 'Full-Time'] as const;

/** Drivers eligible for hire-a-driver (any package duration) */
export const DRIVER_SERVICE_TYPES = ['Full-Time', 'Part-Time'] as const;

function driverTypesForBooking(bookingType: ActiveBookingType): readonly string[] {
  return bookingType === 'towing' ? TOWING_DRIVER_TYPES : DRIVER_SERVICE_TYPES;
}

async function reserveDriverForBooking(
  driverObjectId: Types.ObjectId,
  bookingObjectId: Types.ObjectId,
  bookingType: ActiveBookingType,
  expectedVendorId?: string | null,
): Promise<void> {
  const filter: Record<string, unknown> = {
    _id: driverObjectId,
    role: 'driver',
    isAvailable: true,
    'driverProfile.status': { $ne: 'REJECTED' },
    operationalStatus: { $ne: 'SUSPENDED' },
    reviewStatus: { $ne: 'REJECTED' },
    activeBookingId: null,
  };
  if (expectedVendorId === null) {
    filter['driverProfile.vendorUserId'] = null;
  } else if (expectedVendorId !== undefined) {
    filter['driverProfile.vendorUserId'] = new Types.ObjectId(expectedVendorId);
  }

  const reserved = await UserModel.findOneAndUpdate(
    filter,
    {
      $set: {
        isAvailable: false,
        activeBookingId: bookingObjectId,
        activeBookingType: bookingType,
      },
    },
    { new: true },
  ).exec();

  if (!reserved) {
    throw new ConflictError('Driver is no longer available or already has an active booking');
  }
}

/**
 * P0-2 (v6 audit): atomically pin one ACTIVE fleet vehicle to this booking.
 * The conditional update fails when the vehicle is already pinned to a
 * different open job, so two vendors (or two dispatches racing) cannot bind
 * the same truck. The vehicle document gains `activeBookingId` mirrors of the
 * driver reservation so release/cancel can always free it.
 */
export async function reserveFleetVehicleForBooking(
  vehicleId: string,
  vendorId: string,
  bookingObjectId: Types.ObjectId,
  bookingType: ActiveBookingType,
): Promise<void> {
  const openJobFilter = {
    _id: { $ne: bookingObjectId },
    assignedFleetVehicleId: new Types.ObjectId(vehicleId),
    status: { $in: ['CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
  };
  const [towingClash, driverClash] = await Promise.all([
    TowingBookingModel.exists(openJobFilter).exec(),
    DriverBookingModel.exists(openJobFilter).exec(),
  ]);
  if (towingClash || driverClash) {
    throw new ConflictError(
      'This fleet vehicle is already on another open job. Assign a different vehicle.',
    );
  }

  const reserved = await VendorVehicleModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(vehicleId),
      vendorId: new Types.ObjectId(vendorId),
      status: 'ACTIVE',
      $or: [
        { activeBookingId: null },
        { activeBookingId: { $exists: false } },
      ],
    },
    {
      $set: {
        activeBookingId: bookingObjectId,
        activeBookingType: bookingType,
      },
    },
    { new: true },
  ).exec();

  if (!reserved) {
    throw new ConflictError(
      'Fleet vehicle is not available — it may be inactive or already on another job. Assign a different vehicle.',
    );
  }
}

/** Free a fleet vehicle that was pinned to a booking (accept, cancel, unassign). */
export async function releaseFleetVehicleFromBooking(bookingId: string): Promise<void> {
  try {
    await VendorVehicleModel.updateMany(
      { activeBookingId: new Types.ObjectId(bookingId) },
      { $set: { activeBookingId: null, activeBookingType: null } },
    ).exec();
  } catch (error) {
    logger.error('Failed to release fleet vehicle reservation', { bookingId, error });
  }
}

async function releaseDriverReservationIfBookingUnclaimed(
  driverId: string,
  bookingId: string,
  bookingType: ActiveBookingType,
): Promise<void> {
  try {
    const bookingModel =
      bookingType === 'towing' ? TowingBookingModel : DriverBookingModel;
    const assignmentPersisted = await bookingModel
      .exists({ _id: bookingId, driverId: new Types.ObjectId(driverId) })
      .exec();
    if (!assignmentPersisted) {
      await releaseDriver(driverId, bookingId);
    }
  } catch (error) {
    logger.error('Failed to roll back a driver booking reservation', {
      driverId,
      bookingId,
      error: error instanceof Error ? error.message : 'Unknown rollback error',
    });
  }
}

/**
 * Offer feed matches Part-Time / Full-Time / Tow Driver.
 * Older QA rows stored the label "Driver Service" and relied on selfDriverCategory.
 */
export function resolvedOfferDriverType(driver: IUser): string | undefined {
  const raw = driver.driverProfile?.driverType?.trim();
  if (raw === 'Tow Driver' || raw === 'Full-Time' || raw === 'Part-Time') {
    return raw;
  }
  if (!raw || raw === 'Driver Service') {
    if (driver.selfDriverCategory === 'PART_TIME') return 'Part-Time';
    if (driver.selfDriverCategory === 'FULL_TIME') return 'Full-Time';
  }
  return raw || undefined;
}

export function isDriverEligibleForBooking(
  driver: IUser,
  bookingType: ActiveBookingType,
): boolean {
  const driverType = resolvedOfferDriverType(driver);
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

function hasFreshDriverLocation(driver: IUser, now = Date.now()): boolean {
  const location = driver.currentLocation;
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const updatedAt = location?.updatedAt?.getTime();
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof updatedAt !== 'number' ||
    !Number.isFinite(updatedAt) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return false;
  }
  const age = now - updatedAt;
  return age >= -30_000 && age <= MAX_DRIVER_LOCATION_AGE_MS;
}

function driverDistanceFromPickup(
  driver: IUser,
  pickupLatitude: number,
  pickupLongitude: number,
): number | undefined {
  if (!hasFreshDriverLocation(driver)) return undefined;
  const { latitude, longitude } = driver.currentLocation!;
  return haversineDistanceKm(pickupLatitude, pickupLongitude, latitude!, longitude!);
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
  /** Roadside on-site assist — vendor assigns a mechanic/driver only (no tow truck). */
  onSiteAssist?: boolean;
};

export function isOnSiteAssistBooking(booking: {
  assistLabel?: string | null;
  distanceKm?: number | null;
  pickup?: { latitude?: number; longitude?: number };
  dropoff?: { latitude?: number; longitude?: number } | null;
}): boolean {
  if (!booking.assistLabel?.trim()) return false;
  if (booking.distanceKm === 0) return true;
  const pickup = booking.pickup;
  const dropoff = booking.dropoff;
  if (!pickup || !dropoff) return false;
  return pickup.latitude === dropoff.latitude && pickup.longitude === dropoff.longitude;
}

/**
 * Full-time jobs → full-time drivers only.
 * Outstation and night → either independent category can accept.
 */
export function independentDriverMatchesHire(
  selfCategory: 'FULL_TIME' | 'PART_TIME' | undefined,
  driverServiceType?: string,
): boolean {
  if (driverServiceType === 'part_time') return selfCategory === 'PART_TIME';
  if (driverServiceType === 'full_time') return selfCategory === 'FULL_TIME';
  if (driverServiceType === 'outstation' || driverServiceType === 'night') {
    return selfCategory === 'PART_TIME' || selfCategory === 'FULL_TIME';
  }
  return selfCategory === 'PART_TIME' || selfCategory === 'FULL_TIME';
}

/** Specific, bookable name for an offer — falls back to the broad category. */
export function bookingServiceLabel(
  bookingType: 'towing' | 'driver',
  booking: {
    towingMode?: 'instant' | 'scheduled' | 'emergency';
    assistLabel?: string;
    driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  },
): string {
  if (bookingType === 'towing') {
    if (booking.assistLabel?.trim()) return booking.assistLabel.trim();
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
    assistLabel?: string;
    distanceKm?: number;
    driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  },
  distanceKm?: number,
  /** Marketplace offers carry the backend decision window; vendor jobs do not. */
  includeDecisionWindow = false,
): OpenBookingOffer {
  const vendorId = booking.vendorId?.toString();
  const onSiteAssist =
    bookingType === 'towing' &&
    isOnSiteAssistBooking({
      assistLabel: 'assistLabel' in booking ? booking.assistLabel : undefined,
      distanceKm: 'distanceKm' in booking ? booking.distanceKm : undefined,
      pickup: booking.pickup,
      dropoff: booking.dropoff ?? null,
    });
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
    serviceLabel: bookingServiceLabel(bookingType, booking),
    vendorId,
    assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel ?? undefined,
    vendorApproved: Boolean(vendorId),
    onSiteAssist: onSiteAssist || undefined,
    ...(includeDecisionWindow
      ? {
          offerExpiresAt: offerExpiresAt(booking.createdAt).toISOString(),
          isExpired: isOfferExpired(booking.createdAt),
        }
      : {}),
  };
}

/**
 * Selects which booking collections may contribute to an open-offer feed.
 *
 * Independent drivers receive driver-hire jobs only, even when a caller asks
 * for all offers or explicitly requests towing. Vendors receive towing jobs
 * only. The internal audience preserves the unscoped behavior.
 */
export function selectOpenOfferBookingTypes(options: {
  audience: 'driver' | 'vendor' | 'internal';
  bookingType?: ActiveBookingType;
  vendorLinkedDriver?: boolean;
}): ActiveBookingType[] {
  const requestedTypes: ActiveBookingType[] = options.bookingType
    ? [options.bookingType]
    : ['towing', 'driver'];

  if (options.audience === 'driver' && !options.vendorLinkedDriver) {
    return requestedTypes.filter((bookingType) => bookingType === 'driver');
  }

  // A towing vendor only receives vehicle jobs. Driver-hire stays with independent drivers.
  if (options.audience === 'vendor') {
    return requestedTypes.filter((bookingType) => bookingType === 'towing');
  }

  return requestedTypes;
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
  // Vendor-managed staff drivers only receive jobs assigned to them by their vendor. Zero open marketplace offers.
  if (options?.forDriver?.driverContext === 'VENDOR_MANAGED') {
    return [];
  }

  // P0-3 (v6 audit): a connected driver is defined by an ACTIVE membership —
  // the legacy embedded vendor pointer no longer expands the offer feed.
  let memberVendorUserId: string | undefined;
  if (options?.forDriver) {
    const membership = await DriverVendorMembershipModel.findOne({
      driverUserId: new Types.ObjectId(options.forDriver.id),
      status: 'ACTIVE',
    })
      .select('vendorUserId')
      .lean()
      .exec();
    memberVendorUserId = membership?.vendorUserId?.toString();
  }
  // Fleet drivers only work jobs their vendor assigns. They never browse open offers.
  if (memberVendorUserId) {
    return [];
  }
  const selectedBookingTypes = selectOpenOfferBookingTypes({
    audience: options?.forVendorId ? 'vendor' : options?.forDriver ? 'driver' : 'internal',
    bookingType: options?.bookingType,
    vendorLinkedDriver: Boolean(memberVendorUserId),
  });
  const includeTowing = selectedBookingTypes.includes('towing');
  const includeDriver = selectedBookingTypes.includes('driver');
  const radiusKm = options?.radiusKm ?? DEFAULT_OFFER_RADIUS_KM;

  const noDriverClause = { $or: [{ driverId: null }, { driverId: { $exists: false } }] };
  const noVendorClause = { $or: [{ vendorId: null }, { vendorId: { $exists: false } }] };

  const openFilter: Record<string, unknown> = {
    status: 'CONFIRMED',
  };

  const driverVendorId = memberVendorUserId;

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

  const towingModeRank = (mode?: string) =>
    mode === 'emergency' ? 0 : mode === 'instant' ? 1 : 2;
  towing.sort((a, b) => {
    const byMode = towingModeRank(a.towingMode) - towingModeRank(b.towingMode);
    if (byMode !== 0) return byMode;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const offers: OpenBookingOffer[] = [];

  const consider = (
    bookingType: 'towing' | 'driver',
    booking: {
      id?: string;
      _id?: { toString(): string };
      bookingNumber: string;
      status: string;
      driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
      towingMode?: 'instant' | 'scheduled' | 'emergency';
      assistLabel?: string;
      pickup?: { address?: string; latitude?: number; longitude?: number };
      dropoff?: { address?: string; latitude?: number; longitude?: number } | null;
      estimatedFare?: number;
      createdAt: Date;
      vendorId?: { toString(): string } | null;
      assignedFleetVehicleLabel?: string | null;
    },
  ) => {
    if (options?.forDriver) {
      if (options.forDriver.driverContext === 'INDEPENDENT' && bookingType !== 'driver') {
        return;
      }
      if (
        !independentDriverMatchesHire(
          options.forDriver.selfDriverCategory,
          booking.driverServiceType,
        )
      ) {
        return;
      }
    }

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
      if (!skipRadiusFilter && distanceKm !== undefined && distanceKm > radiusKm) {
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
  /** True when the vendor dispatched this job and it now waits for the driver's own accept. */
  awaitingDriverAccept?: boolean;
}> {
  const driver = await UserModel.findOne({ _id: driverId, role: 'driver' }).exec();
  if (!driver) throw new NotFoundError('Driver not found');
  if (driver.operationalStatus === 'SUSPENDED') {
    throw new BadRequestError('Driver account has been suspended');
  }
  if (driver.reviewStatus === 'REJECTED' || driver.driverProfile?.status === 'REJECTED') {
    throw new BadRequestError('Driver account documents were rejected');
  }
  if (!driver.isAvailable || driver.activeBookingId) {
    throw new BadRequestError('You already have an active booking or are offline');
  }
  if (!isDriverEligibleForBooking(driver, bookingType)) {
    throw new BadRequestError(
      bookingType === 'towing'
        ? 'Only tow drivers can accept towing jobs'
        : 'Only Full-Time / Part-Time drivers can accept driver-hire jobs',
    );
  }

  const existing =
    bookingType === 'towing'
      ? await TowingBookingModel.findById(bookingId).select('+tripStartOtpEncrypted').exec()
      : await DriverBookingModel.findById(bookingId).select('+tripStartOtpEncrypted').exec();
  if (!existing) {
    throw new NotFoundError('Booking not found');
  }
  if (existing.status !== 'CONFIRMED' || existing.driverId) {
    throw new ConflictError('This job was just taken by another partner');
  }

  const bookingVendorId =
    'vendorId' in existing && existing.vendorId ? existing.vendorId.toString() : undefined;

  const routedVendorId = bookingVendorId ?? options?.vendorId;
  // P0-3 (v6 audit): dispatch authorization is membership-only. The legacy
  // embedded vendor pointer is history/continuation data — it can keep old
  // in-flight bookings readable, but it must not authorize NEW dispatch.
  const activeMembership = await DriverVendorMembershipModel.findOne({
    driverUserId: new Types.ObjectId(driverId),
    status: 'ACTIVE',
  })
    .select('vendorUserId')
    .lean()
    .exec();
  const memberVendorUserId = activeMembership?.vendorUserId?.toString();
  const hasMembership = routedVendorId
    ? memberVendorUserId === routedVendorId
    : false;

  if (routedVendorId && !hasMembership) {
    throw new ForbiddenError('This job is reserved for connected Towing Vendor Drivers');
  }
  // P0-3: a connected (ACTIVE membership) driver is vendor-routed even on the
  // open feed — an un-routed marketplace claim would silently bypass consent.
  if (!routedVendorId && memberVendorUserId) {
    throw new ForbiddenError('Your Towing Vendor must assign this job to you');
  }
  if (bookingType === 'towing' && !routedVendorId) {
    throw new ForbiddenError('Towing work must be assigned by a Towing Vendor');
  }

  const assignedFleetVehicleId =
    'assignedFleetVehicleId' in existing
      ? existing.assignedFleetVehicleId?.toString()
      : undefined;
  if (bookingVendorId && assignedFleetVehicleId) {
    const activeFleetVehicle = await VendorVehicleModel.findOne({
      _id: assignedFleetVehicleId,
      vendorId: bookingVendorId,
      status: 'ACTIVE',
    })
      .select('_id')
      .exec();
    if (!activeFleetVehicle) {
      throw new ConflictError(
        'The fleet vehicle assigned to this job is no longer active. Ask your vendor to review the assignment.',
      );
    }
  }

  // Open marketplace offers run on the backend decision clock. Vendor-routed
  // jobs are exempt, since their approval can legitimately land later.
  if (!routedVendorId && isOfferExpired(existing.createdAt)) {
    throw new ConflictError('This request expired. Please wait for the next request.');
  }

  const vendorId = bookingVendorId ?? options?.vendorId;
  const fleetVehicleId = assignedFleetVehicleId ?? options?.fleetVehicleId;
  const fleetVehicleLabel =
    ('assignedFleetVehicleLabel' in existing
      ? existing.assignedFleetVehicleLabel
      : undefined) ?? options?.fleetVehicleLabel;

  const driverObjectId = new Types.ObjectId(driverId);
  const bookingObjectId = new Types.ObjectId(bookingId);
  const tripStartOtp = generateTripStartOtp();
  // P0-1 (v6 audit): vendor dispatch must NOT start the trip. The booking waits
  // at DRIVER_ASSIGNED until the allotted driver taps Accept; only the driver's
  // own claim (no vendorId in options) starts the trip immediately, exactly as
  // the open-marketplace flow always did.
  const vendorDispatched = Boolean(vendorId);
  const $set: Record<string, unknown> = {
    driverId: driverObjectId,
    status: vendorDispatched ? 'DRIVER_ASSIGNED' : 'DRIVER_EN_ROUTE',
    tripStartOtp: hashTripOtpForStorage(tripStartOtp),
    tripStartOtpEncrypted: encryptTripOtpForStorage(tripStartOtp),
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
          ...(vendorDispatched
            ? []
            : [{ status: 'DRIVER_EN_ROUTE', timestamp: new Date() }]),
        ],
      },
    },
  };
  const unassignedDriver = { $or: [{ driverId: null }, { driverId: { $exists: false } }] };
  const filter: Record<string, unknown> = {
    _id: bookingId,
    status: 'CONFIRMED',
    ...unassignedDriver,
  };
  if (vendorId) {
    filter.$and = [
      unassignedDriver,
      {
        $or: [
          { vendorId: null },
          { vendorId: { $exists: false } },
          { vendorId: new Types.ObjectId(vendorId) },
        ],
      },
    ];
    delete filter.$or;
  }

  await reserveDriverForBooking(driverObjectId, bookingObjectId, bookingType, vendorId ? undefined : null);

  // P0-2: vendor dispatch with a fleet vehicle must atomically pin the truck
  // before the booking update; else two dispatches could bind one vehicle.
  if (vendorId && fleetVehicleId) {
    try {
      await reserveFleetVehicleForBooking(fleetVehicleId, vendorId, bookingObjectId, bookingType);
    } catch (error) {
      await releaseDriver(driverId, bookingId);
      throw error;
    }
  }

  let claimed;
  try {
    claimed =
      bookingType === 'towing'
        ? await TowingBookingModel.findOneAndUpdate(filter, update, { new: true }).exec()
        : await DriverBookingModel.findOneAndUpdate(filter, update, { new: true }).exec();
  } catch (error) {
    await releaseDriverReservationIfBookingUnclaimed(driverId, bookingId, bookingType);
    if (vendorId && fleetVehicleId) {
      await releaseFleetVehicleFromBooking(bookingId);
    }
    throw error;
  }

  if (!claimed) {
    await releaseDriver(driverId, bookingId);
    if (vendorId && fleetVehicleId) {
      await releaseFleetVehicleFromBooking(bookingId);
    }
    throw new ConflictError('This job was just taken by another partner');
  }

  if (bookingType === 'towing') {
    emitVendorOffersUpdated();
  } else {
    emitDriverOffersUpdated();
  }

  if (vendorDispatched) {
    // Vendor-routed assignment waits for the driver's own acknowledgement. The
    // trip-start OTP is intentionally NOT emitted here — it goes out when the
    // driver accepts (updateBookingStatus → DRIVER_EN_ROUTE).
    emitBookingStatusUpdate(bookingId, 'DRIVER_ASSIGNED', {
      internalStatus: 'DRIVER_ASSIGNED',
      driverAccepted: false,
      message: 'New job assigned by your vendor — accept to start',
      assignedFleetVehicleLabel: fleetVehicleLabel,
    });
    emitToDriver(driverId, 'job:offer', {
      bookingId,
      bookingType,
      status: 'DRIVER_ASSIGNED',
      message: 'New job assigned by your vendor',
    });
    void notifyDriverJobOffer({
      driverId,
      bookingNumber: claimed.bookingNumber,
      bookingType,
      bookingId,
      message: `${claimed.bookingNumber} assigned by your vendor — accept to start`,
    }).catch(() => undefined);
    void notifyCustomerTripStatus({
      customerId: claimed.customerId.toString(),
      bookingNumber: claimed.bookingNumber,
      bookingType,
      bookingId: claimed.id,
      status: 'DRIVER_ASSIGNED',
    }).catch(() => undefined);
    return {
      id: claimed.id,
      status: claimed.status,
      bookingNumber: claimed.bookingNumber,
      driverId,
      vendorId,
      assignedFleetVehicleLabel: fleetVehicleLabel,
      awaitingDriverAccept: true,
    };
  }

  // VOC P0.3: the trip-start OTP must reach ONLY the assigned driver — it is
  // no longer broadcast to the shared booking room, where any authenticated
  // socket (previously even unauthenticated) could hear it.
  emitBookingStatusUpdate(bookingId, 'DRIVER_EN_ROUTE', {
    internalStatus: 'DRIVER_EN_ROUTE',
    driverAccepted: true,
    message: 'Partner accepted your booking',
    assignedFleetVehicleLabel: fleetVehicleLabel,
  });
  void notifyCustomerTripStatus({
    customerId: claimed.customerId.toString(),
    bookingNumber: claimed.bookingNumber,
    bookingType,
    bookingId: claimed.id,
    status: 'DRIVER_EN_ROUTE',
  }).catch(() => undefined);
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
  if (bookingType === 'towing') {
    return null;
  }

  const drivers = await UserModel.find({
    role: 'driver',
    isAvailable: true,
    driverContext: { $ne: 'VENDOR_MANAGED' },
    'driverProfile.vendorUserId': null,
    'driverProfile.status': { $ne: 'REJECTED' },
    operationalStatus: { $ne: 'SUSPENDED' },
    reviewStatus: { $ne: 'REJECTED' },
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
    .filter((driver): driver is { driverId: string; distanceKm: number } =>
      typeof driver.distanceKm === 'number',
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // Do not auto-assign from stale or missing GPS. The booking remains open for
  // an eligible driver/vendor to claim once a real location is available.
  return ranked[0] ?? null;
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
  if (driver.operationalStatus === 'SUSPENDED') {
    throw new BadRequestError('Driver account has been suspended');
  }
  if (driver.reviewStatus === 'REJECTED' || driver.driverProfile?.status === 'REJECTED') {
    throw new BadRequestError('Driver account documents were rejected');
  }

  if (!isDriverEligibleForBooking(driver, bookingType)) {
    const expected =
      bookingType === 'towing' ? 'tow driver' : 'driver service (Full-Time / Part-Time)';
    throw new BadRequestError(
      'Driver ' + (driver.fullName ?? driverId) + ' is not eligible for ' +
        bookingType + ' bookings (' + expected + ' required)',
    );
  }

  const booking =
    bookingType === 'towing'
      ? await TowingBookingModel.findById(bookingId).exec()
      : await DriverBookingModel.findById(bookingId).exec();
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  if (!canTransition(booking.status, 'DRIVER_ASSIGNED')) {
    throw new BadRequestError(
      'Cannot assign driver: invalid status transition from ' + booking.status +
        ' to DRIVER_ASSIGNED',
    );
  }

  const bookingVendorId = booking.vendorId?.toString() ?? null;
  const driverVendorId = driver.driverProfile?.vendorUserId?.toString() ?? null;
  if (bookingType === 'towing' && !bookingVendorId) {
    throw new BadRequestError('A towing vendor accepts this job and assigns one of their drivers');
  }
  if (bookingVendorId !== driverVendorId) {
    throw new ForbiddenError('Assign a driver from the booking vendor fleet');
  }

  const driverObjectId = new Types.ObjectId(driverId);
  const bookingObjectId = new Types.ObjectId(bookingId);
  const filter = {
    _id: bookingObjectId,
    status: booking.status,
    vendorId: booking.vendorId ?? null,
    $or: [{ driverId: null }, { driverId: { $exists: false } }],
  };
  const update = {
    $set: {
      driverId: driverObjectId,
      status: 'DRIVER_ASSIGNED',
    },
    $push: {
      statusHistory: { status: 'DRIVER_ASSIGNED', timestamp: new Date() },
    },
  };

  await reserveDriverForBooking(driverObjectId, bookingObjectId, bookingType, bookingVendorId);
  let assigned;
  try {
    assigned =
      bookingType === 'towing'
        ? await TowingBookingModel.findOneAndUpdate(filter, update, { new: true }).exec()
        : await DriverBookingModel.findOneAndUpdate(filter, update, { new: true }).exec();

    if (!assigned) {
      await releaseDriver(driverId, bookingId);
      throw new ConflictError('Booking changed before the driver could be assigned');
    }
  } catch (error) {
    await releaseDriverReservationIfBookingUnclaimed(driverId, bookingId, bookingType);
    throw error;
  }

  // Assigned job is gone from the open pool — refresh every partner feed live.
  if (bookingType === 'towing') {
    emitVendorOffersUpdated();
  } else {
    emitDriverOffersUpdated();
  }

  emitBookingStatusUpdate(bookingId, mapPublicBookingStatus('DRIVER_ASSIGNED'), {
    internalStatus: 'DRIVER_ASSIGNED',
    driverAccepted: false,
    message: 'Driver allotted - awaiting acceptance',
  });
  void notifyCustomerTripStatus({
    customerId: assigned.customerId.toString(),
    bookingNumber: assigned.bookingNumber,
    bookingType,
    bookingId: assigned.id,
    status: 'DRIVER_ASSIGNED',
  }).catch(() => undefined);
  void notifyDriverJobOffer({
    driverId,
    bookingNumber: assigned.bookingNumber,
    bookingType,
    bookingId: assigned.id,
    message: `${assigned.bookingNumber} allotted — accept in the app to start`,
  }).catch(() => undefined);
}

export async function releaseDriver(driverId: string, bookingId: string): Promise<void> {
  // P0-2: freeing the driver also frees the fleet truck pinned to this booking.
  await releaseFleetVehicleFromBooking(bookingId);
  await UserModel.findOneAndUpdate(
    {
      _id: driverId,
      activeBookingId: new Types.ObjectId(bookingId),
    },
    {
      $set: {
        isAvailable: true,
        activeBookingId: null,
        activeBookingType: null,
      },
    },
  ).exec();
}

/** Driver rejects an assigned job — frees driver and returns booking to CONFIRMED for reassignment. */
export async function unassignDriverFromBooking(
  bookingId: string,
  bookingType: ActiveBookingType,
  driverId: string,
): Promise<void> {
  const filter = {
    _id: new Types.ObjectId(bookingId),
    driverId: new Types.ObjectId(driverId),
    status: 'DRIVER_ASSIGNED',
  };
  const update = {
    $set: { status: 'CONFIRMED' },
    $unset: {
      driverId: 1,
      assignedFleetVehicleId: 1,
      assignedFleetVehicleLabel: 1,
    },
    $push: {
      statusHistory: {
        status: 'CONFIRMED',
        timestamp: new Date(),
        note: 'Driver rejected assignment',
      },
    },
  };
  const unassigned =
    bookingType === 'towing'
      ? await TowingBookingModel.findOneAndUpdate(filter, update, {
          new: true,
          runValidators: true,
        }).exec()
      : await DriverBookingModel.findOneAndUpdate(filter, update, {
          new: true,
          runValidators: true,
        }).exec();

  if (!unassigned) {
    throw new ConflictError('Booking changed before the driver rejection was saved');
  }

  await releaseDriver(driverId, bookingId);

  // Booking is back in the open pool — repopulate partner feeds live.
  if (bookingType === 'towing') {
    emitVendorOffersUpdated();
  } else {
    emitDriverOffersUpdated();
  }
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
  bookingId?: string;
}): Promise<AvailableDriverSummary[]> {
  const filter: Record<string, unknown> = {
    role: 'driver',
    isAvailable: true,
    'driverProfile.status': { $ne: 'REJECTED' },
    operationalStatus: { $ne: 'SUSPENDED' },
    reviewStatus: { $ne: 'REJECTED' },
    $or: [{ activeBookingId: null }, { activeBookingId: { $exists: false } }],
  };

  if (options?.bookingType) {
    filter['driverProfile.driverType'] = { $in: [...driverTypesForBooking(options.bookingType)] };
  }

  if (options?.bookingId) {
    if (!options.bookingType) {
      throw new BadRequestError('bookingType is required when filtering drivers for a booking');
    }
    const booking =
      options.bookingType === 'towing'
        ? await TowingBookingModel.findById(options.bookingId).select('vendorId').exec()
        : await DriverBookingModel.findById(options.bookingId).select('vendorId').exec();
    if (!booking) throw new NotFoundError('Booking not found');
    if (options.bookingType === 'towing' && !booking.vendorId) return [];
    filter['driverProfile.vendorUserId'] = booking.vendorId ?? null;
  } else if (options?.bookingType === 'towing') {
    return [];
  } else {
    filter.driverContext = { $ne: 'VENDOR_MANAGED' };
    filter['driverProfile.vendorUserId'] = null;
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
