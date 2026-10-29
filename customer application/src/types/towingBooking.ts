export type TowingServiceModeId = 'instant' | 'scheduled' | 'emergency';

import type { TowingFareBreakdown } from './fare';

export type TowingVehicleTypeId = 'hatchback' | 'sedan' | 'suv' | 'bike';
export type TowingTypeId = 'flatbed' | 'wheel_lift' | 'heavy_tow' | 'other';
export type TowingTimeId = '30-60' | '60-90' | 'custom';

export type ServiceLocationType = 'current' | 'registered' | 'different';

export interface ServiceLocationData {
  type: ServiceLocationType;
  address: string;
  vehicleId?: string;
  vehicleLabel?: string;
}

export interface TowingBookingState {
  serviceMode: TowingServiceModeId;
  vehicleType: TowingVehicleTypeId;
  /** Customer's registered vehicle selected for this booking */
  vehicleId?: string;
  vehicleLabel?: string;
  pickup: string;
  pickupLabel?: string;
  pickupLat?: number;
  pickupLng?: number;
  drop: string;
  dropLabel?: string;
  dropLat?: number;
  dropLng?: number;
  towingType: TowingTypeId;
  dateId: string;
  timeId: TowingTimeId;
  bookingId: string;
  serviceLocation: ServiceLocationData | null;
  basePrice: number;
  distanceKm: number;
  distanceCharge: number;
  totalPrice: number;
  totalPriceMin: number;
  totalPriceMax: number;
  advancePayment: number;
  advancePaymentMin: number;
  advancePaymentMax: number;
  fareBreakdown?: TowingFareBreakdown;
}

export const DEFAULT_TOWING_BOOKING: TowingBookingState = {
  serviceMode: 'instant',
  vehicleType: 'sedan',
  pickup: 'Patia Square, Bhubaneswar',
  drop: 'Cuttack Road, Bhubaneswar',
  towingType: 'flatbed',
  dateId: 'today',
  timeId: '30-60',
  bookingId: '#RACE78291',
  serviceLocation: null,
  basePrice: 0,
  distanceKm: 0,
  distanceCharge: 0,
  totalPrice: 0,
  totalPriceMin: 0,
  totalPriceMax: 0,
  advancePayment: 0,
  advancePaymentMin: 0,
  advancePaymentMax: 0,
};
