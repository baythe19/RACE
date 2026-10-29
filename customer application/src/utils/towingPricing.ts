import type { TowingTypeId } from '../types/towingBooking';

const TOWING_RATES: Record<TowingTypeId, { basePrice: number; ratePerKm: number }> = {
  flatbed: { basePrice: 500, ratePerKm: 25 },
  wheel_lift: { basePrice: 400, ratePerKm: 20 },
  heavy_tow: { basePrice: 750, ratePerKm: 32 },
  other: { basePrice: 550, ratePerKm: 26 },
};

const EARTH_RADIUS_KM = 6371;
/** ±15% variance on distance for estimated price range */
const DISTANCE_VARIANCE = 0.15;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TowingPriceBreakdown {
  basePrice: number;
  distanceKm: number;
  distanceKmMin: number;
  distanceKmMax: number;
  distanceCharge: number;
  distanceChargeMin: number;
  distanceChargeMax: number;
  total: number;
  totalMin: number;
  totalMax: number;
  advancePayment: number;
  advancePaymentMin: number;
  advancePaymentMax: number;
}

export function formatRupee(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatRupeeRange(min: number, max: number): string {
  if (min === max) return formatRupee(min);
  return `${formatRupee(min)} – ${formatRupee(max)}`;
}

export function formatDistanceRange(min: number, max: number): string {
  if (min === max) return `~${min} km`;
  return `~${min} – ${max} km`;
}

export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Mock geocoding for demo addresses in Bhubaneswar area. */
export function estimateCoordinates(address: string): Coordinates {
  const lower = address.toLowerCase();

  if (lower.includes('patia')) {
    return { lat: 20.351, lng: 85.8189 };
  }
  if (lower.includes('cuttack')) {
    return { lat: 20.462, lng: 85.882 };
  }
  if (lower.includes('saheed') || lower.includes('nagar')) {
    return { lat: 20.2961, lng: 85.8245 };
  }
  if (lower.includes('chandrasekharpur')) {
    return { lat: 20.3456, lng: 85.8032 };
  }

  return { lat: 20.356, lng: 85.85 };
}

export function calculateTowingPricing(
  towingType: TowingTypeId,
  pickup: string,
  drop: string,
): TowingPriceBreakdown {
  const rates = TOWING_RATES[towingType];
  const from = estimateCoordinates(pickup);
  const to = estimateCoordinates(drop);
  const distanceKm = Math.round(haversineDistanceKm(from, to) * 10) / 10;

  const distanceKmMin = Math.round(distanceKm * (1 - DISTANCE_VARIANCE) * 10) / 10;
  const distanceKmMax = Math.round(distanceKm * (1 + DISTANCE_VARIANCE) * 10) / 10;

  const distanceChargeMin = Math.round(distanceKmMin * rates.ratePerKm);
  const distanceChargeMax = Math.round(distanceKmMax * rates.ratePerKm);
  const distanceCharge = Math.round(distanceKm * rates.ratePerKm);

  const totalMin = rates.basePrice + distanceChargeMin;
  const totalMax = rates.basePrice + distanceChargeMax;
  const total = rates.basePrice + distanceCharge;

  const advancePaymentMin = Math.round(totalMin * 0.3);
  const advancePaymentMax = Math.round(totalMax * 0.3);

  return {
    basePrice: rates.basePrice,
    distanceKm,
    distanceKmMin,
    distanceKmMax,
    distanceCharge,
    distanceChargeMin,
    distanceChargeMax,
    total,
    totalMin,
    totalMax,
    advancePayment: advancePaymentMin,
    advancePaymentMin,
    advancePaymentMax,
  };
}
