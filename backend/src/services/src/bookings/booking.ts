import crypto from 'crypto';
import { BadRequestError } from '../../../utils/src/errors';
import {
  canTransition,
  type BookingPaymentStatus,
  type UnifiedBookingStatus,
} from '../bookingStatusConstants';

export interface BookingLocationInput {
  address: string;
  latitude: number;
  longitude: number;
}

export interface StatusHistoryEntry {
  status: UnifiedBookingStatus;
  timestamp: Date;
}

export interface AdvanceSplit {
  estimatedFare: number;
  advanceAmount: number;
  remainingAmount: number;
  paymentStatus: BookingPaymentStatus;
}

export type DriverPackageHours = 2 | 4 | 8 | 12 | 24;
export type DriverVehicleCategory = 'hatchback' | 'sedan' | 'suv';

export type TowingFareBreakdown = {
  baseFare: number;
  distanceKm: number;
  extraKm: number;
  extraKmCharge: number;
  nightSurcharge: number;
  /** Added when towingMode is emergency (priority dispatch). */
  prioritySurcharge?: number;
  /** Subtracted when towingMode is scheduled (advance booking). */
  scheduledDiscount?: number;
  totalFare: number;
  advanceAmount: number;
  remainingAmount: number;
  isFallback?: boolean;
};

export type TowingPricingMode = 'instant' | 'scheduled' | 'emergency';

export type DriverFareBreakdown = {
  packageHours: number;
  includedKm: number;
  vehicleCategory: string;
  packageFare: number;
  driverPayout: number;
  platformFee: number;
  extraHoursCharge: number;
  extraKmCharge: number;
  totalFare: number;
  advanceAmount: number;
  remainingAmount: number;
};

const ADVANCE_PERCENT = 0.3;
const TOWING_BASE_FARE = 299;
const TOWING_INCLUDED_KM = 5;
const TOWING_PER_KM_AFTER_INCLUDED = 25;
const TOWING_MINIMUM_FARE = 299;
const TOWING_FALLBACK_FARE = 499;
const TOWING_FALLBACK_FARE_SCHEDULED = 399;
const TOWING_FALLBACK_FARE_EMERGENCY = 699;
const TOWING_EMERGENCY_SURCHARGE = 200;
const TOWING_SCHEDULED_DISCOUNT = 100;
const NIGHT_SURCHARGE_RATE = 0.2;

/**
 * RACE driver-hire packages from market pricing sheet.
 * Customer pay + driver received; platform fee = customer - driver.
 * SUV 8h+ extrapolated (+₹100 over sedan) until sheet is completed.
 */
const DRIVER_PACKAGES: Array<{
  packageHours: DriverPackageHours;
  includedKm: number;
  hatchback: number;
  sedan: number;
  suv: number;
  hatchbackDriver: number;
  sedanDriver: number;
  suvDriver: number;
  extraHourRate: number;
  extraKmRate: number;
}> = [
  {
    packageHours: 2,
    includedKm: 20,
    hatchback: 400,
    sedan: 500,
    suv: 600,
    hatchbackDriver: 300,
    sedanDriver: 400,
    suvDriver: 500,
    extraHourRate: 50,
    extraKmRate: 10,
  },
  {
    packageHours: 4,
    includedKm: 40,
    hatchback: 600,
    sedan: 700,
    suv: 800,
    hatchbackDriver: 500,
    sedanDriver: 500,
    suvDriver: 600,
    extraHourRate: 50,
    extraKmRate: 10,
  },
  {
    packageHours: 8,
    includedKm: 80,
    hatchback: 1000,
    sedan: 1100,
    suv: 1200,
    hatchbackDriver: 800,
    sedanDriver: 900,
    suvDriver: 1000,
    extraHourRate: 100,
    extraKmRate: 7,
  },
  {
    packageHours: 12,
    includedKm: 120,
    hatchback: 1500,
    sedan: 1600,
    suv: 1700,
    hatchbackDriver: 1200,
    sedanDriver: 1200,
    suvDriver: 1400,
    extraHourRate: 100,
    extraKmRate: 5,
  },
  {
    packageHours: 24,
    includedKm: 240,
    hatchback: 2000,
    sedan: 2100,
    suv: 2200,
    hatchbackDriver: 1600,
    sedanDriver: 1600,
    suvDriver: 1800,
    extraHourRate: 100,
    extraKmRate: 5,
  },
];

function roundToNearestTen(amount: number): number {
  return Math.round(amount / 10) * 10;
}

function splitAdvance(totalFare: number): { advanceAmount: number; remainingAmount: number } {
  const advanceAmount = Math.round(totalFare * ADVANCE_PERCENT);
  return {
    advanceAmount,
    remainingAmount: totalFare - advanceAmount,
  };
}

function isNightSurchargeTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}

/** Fixed on-site roadside assist (no distance matrix). */
export function calculateRoadsideFlatFare(totalFare: number): {
  fare: number;
  breakdown: TowingFareBreakdown;
} {
  const { advanceAmount, remainingAmount } = splitAdvance(totalFare);
  return {
    fare: totalFare,
    breakdown: {
      baseFare: totalFare,
      distanceKm: 0,
      extraKm: 0,
      extraKmCharge: 0,
      nightSurcharge: 0,
      totalFare,
      advanceAmount,
      remainingAmount,
      isFallback: false,
    },
  };
}

export function getVehicleCategory(
  vehicleType: string,
  vehicleSubtype?: string,
): DriverVehicleCategory {
  const subtype = vehicleSubtype?.trim().toLowerCase() ?? '';

  if (subtype.includes('hatchback') || subtype.includes('scooter') || subtype.includes('commuter')) {
    return 'hatchback';
  }
  if (subtype.includes('sedan')) {
    return 'sedan';
  }
  if (
    subtype.includes('suv') ||
    subtype.includes('muv') ||
    subtype.includes('truck') ||
    subtype.includes('coach') ||
    subtype.includes('bus')
  ) {
    return 'suv';
  }

  switch (vehicleType.toLowerCase()) {
    case 'truck':
    case 'bus':
      return 'suv';
    case 'bike':
    case 'auto':
      return 'hatchback';
    case 'ev':
      return subtype.includes('car') ? 'sedan' : 'hatchback';
    case 'car':
      return 'sedan';
    default:
      return 'hatchback';
  }
}

export function resolvePackageHours(
  packageHours?: DriverPackageHours,
  estimatedDurationHours?: number,
): DriverPackageHours {
  if (packageHours) {
    return packageHours;
  }

  const hours = estimatedDurationHours ?? 2;
  if (hours <= 2) return 2;
  if (hours <= 4) return 4;
  if (hours <= 8) return 8;
  if (hours <= 12) return 12;
  return 24;
}

export function calculateTowingFare(
  distanceKm: number,
  scheduledAt?: Date,
  towingMode: TowingPricingMode = 'instant',
): { fare: number; breakdown: TowingFareBreakdown } {
  const mode: TowingPricingMode =
    towingMode === 'scheduled' || towingMode === 'emergency' ? towingMode : 'instant';

  if (distanceKm <= 0) {
    const fallbackFare =
      mode === 'emergency'
        ? TOWING_FALLBACK_FARE_EMERGENCY
        : mode === 'scheduled'
          ? TOWING_FALLBACK_FARE_SCHEDULED
          : TOWING_FALLBACK_FARE;
    const { advanceAmount, remainingAmount } = splitAdvance(fallbackFare);
    return {
      fare: fallbackFare,
      breakdown: {
        baseFare: TOWING_FALLBACK_FARE,
        distanceKm: 0,
        extraKm: 0,
        extraKmCharge: 0,
        nightSurcharge: 0,
        prioritySurcharge: mode === 'emergency' ? TOWING_EMERGENCY_SURCHARGE : undefined,
        scheduledDiscount: mode === 'scheduled' ? TOWING_SCHEDULED_DISCOUNT : undefined,
        totalFare: fallbackFare,
        advanceAmount,
        remainingAmount,
        isFallback: true,
      },
    };
  }

  const extraKm = Math.max(0, distanceKm - TOWING_INCLUDED_KM);
  const extraKmCharge = Math.round(extraKm * TOWING_PER_KM_AFTER_INCLUDED);
  const subtotal = TOWING_BASE_FARE + extraKmCharge;
  const nightSurcharge = isNightSurchargeTime(scheduledAt ?? new Date())
    ? Math.round(subtotal * NIGHT_SURCHARGE_RATE)
    : 0;
  const prioritySurcharge = mode === 'emergency' ? TOWING_EMERGENCY_SURCHARGE : 0;
  const scheduledDiscount = mode === 'scheduled' ? TOWING_SCHEDULED_DISCOUNT : 0;
  const rawTotal = subtotal + nightSurcharge + prioritySurcharge - scheduledDiscount;
  const totalFare = Math.max(
    TOWING_MINIMUM_FARE,
    roundToNearestTen(rawTotal),
  );
  const { advanceAmount, remainingAmount } = splitAdvance(totalFare);

  return {
    fare: totalFare,
    breakdown: {
      baseFare: TOWING_BASE_FARE,
      distanceKm: Math.round(distanceKm * 10) / 10,
      extraKm: Math.round(extraKm * 10) / 10,
      extraKmCharge,
      nightSurcharge,
      prioritySurcharge: prioritySurcharge > 0 ? prioritySurcharge : undefined,
      scheduledDiscount: scheduledDiscount > 0 ? scheduledDiscount : undefined,
      totalFare,
      advanceAmount,
      remainingAmount,
    },
  };
}

export function calculateDriverFare(
  packageHours: DriverPackageHours,
  vehicleCategory: DriverVehicleCategory,
  actualHours?: number,
  actualKm?: number,
): { fare: number; breakdown: DriverFareBreakdown } {
  const normalizedHours = Number(packageHours) as DriverPackageHours;
  const pkg = DRIVER_PACKAGES.find((entry) => entry.packageHours === normalizedHours);

  if (!pkg) {
    throw new BadRequestError(`Invalid driver package hours: ${packageHours}`);
  }

  const packageFare = pkg[vehicleCategory];
  const driverKey = `${vehicleCategory}Driver` as
    | 'hatchbackDriver'
    | 'sedanDriver'
    | 'suvDriver';
  const driverPayoutBase = pkg[driverKey];
  let extraHoursCharge = 0;
  let extraKmCharge = 0;

  if (actualHours !== undefined && actualHours > packageHours) {
    const extraHours = actualHours - packageHours;
    extraHoursCharge = Math.round(extraHours * pkg.extraHourRate);
  }

  if (actualKm !== undefined && actualKm > pkg.includedKm) {
    const extraKm = actualKm - pkg.includedKm;
    extraKmCharge = Math.round(extraKm * pkg.extraKmRate);
  }

  const totalFare = packageFare + extraHoursCharge + extraKmCharge;
  const driverPayout = driverPayoutBase + extraHoursCharge + extraKmCharge;
  const platformFee = Math.max(0, totalFare - driverPayout);
  const { advanceAmount, remainingAmount } = splitAdvance(totalFare);

  return {
    fare: totalFare,
    breakdown: {
      packageHours: pkg.packageHours,
      includedKm: pkg.includedKm,
      vehicleCategory,
      packageFare,
      driverPayout,
      platformFee,
      extraHoursCharge,
      extraKmCharge,
      totalFare,
      advanceAmount,
      remainingAmount,
    },
  };
}

/** @deprecated Use calculateTowingFare */
export function calculateTowingEstimatedFare(distanceKm?: number): number {
  return calculateTowingFare(distanceKm ?? 0).fare;
}

/** @deprecated Use calculateDriverFare */
export function calculateDriverEstimatedFare(estimatedDurationHours = 2): number {
  const packageHours = resolvePackageHours(undefined, estimatedDurationHours);
  return calculateDriverFare(packageHours, 'hatchback').fare;
}

export function calculateAdvanceSplit(estimatedFare: number): AdvanceSplit {
  const advanceAmount = Math.round(estimatedFare * ADVANCE_PERCENT);
  const remainingAmount = estimatedFare - advanceAmount;

  return {
    estimatedFare,
    advanceAmount,
    remainingAmount,
    paymentStatus: 'PENDING_ADVANCE',
  };
}

export function haversineDistanceKm(
  pickup: BookingLocationInput,
  dropoff: BookingLocationInput,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(dropoff.latitude - pickup.latitude);
  const dLon = toRad(dropoff.longitude - pickup.longitude);
  const lat1 = toRad(pickup.latitude);
  const lat2 = toRad(dropoff.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(c * earthRadiusKm * 10) / 10;
}

export function createInitialStatusHistory(
  status: UnifiedBookingStatus = 'PENDING',
): StatusHistoryEntry[] {
  return [{ status, timestamp: new Date() }];
}

export function appendStatusHistory(
  history: StatusHistoryEntry[],
  status: UnifiedBookingStatus,
): StatusHistoryEntry[] {
  return [...history, { status, timestamp: new Date() }];
}

export function assertValidStatusTransition(
  currentStatus: UnifiedBookingStatus,
  nextStatus: UnifiedBookingStatus,
): void {
  if (!canTransition(currentStatus, nextStatus)) {
    throw new BadRequestError(
      `Invalid status transition from ${currentStatus} to ${nextStatus}`,
    );
  }
}

export async function generatePrefixedBookingNumber(
  prefix: string,
  countDocuments?: () => Promise<number>,
): Promise<string> {
  let count = 0;
  if (countDocuments) {
    try {
      count = await countDocuments();
    } catch {
      count = 0;
    }
  }
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const seq = String((count % 10000) + 1).padStart(4, '0');
  const entropy = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${dateStr}-${seq}-${entropy}`;
}
