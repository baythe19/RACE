import { UI_PREVIEW_AUTH_FLOW } from '../config/uiPreviewMode';
import type { TowingFareBreakdown } from '../types/fare';

/** When true, towing booking screens prefill demo data so UI can be clicked through. */
export const TOWING_WALKTHROUGH_ENABLED = UI_PREVIEW_AUTH_FLOW;

export const TOWING_DEMO_PICKUP = {
  address: 'Patia Square, Bhubaneswar',
  label: 'Patia Square',
  lat: 20.2961,
  lng: 85.8245,
};

export const TOWING_DEMO_DROP = {
  address: 'Cuttack Road, Bhubaneswar',
  label: 'Cuttack Road',
  lat: 20.3124,
  lng: 85.84,
};

export function getTowingWalkthroughFare(): TowingFareBreakdown {
  return {
    baseFare: 499,
    distanceKm: 8,
    extraKm: 3,
    extraKmCharge: 150,
    nightSurcharge: 0,
    totalFare: 649,
    advanceAmount: 200,
    remainingAmount: 449,
    isFallback: true,
  };
}
