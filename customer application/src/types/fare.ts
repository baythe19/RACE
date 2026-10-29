export type DriverVehicleCategory = 'hatchback' | 'sedan' | 'suv';
export type DriverPackageHours = 2 | 4 | 8 | 12 | 24;

export interface TowingFareBreakdown {
  baseFare: number;
  distanceKm: number;
  extraKm: number;
  extraKmCharge: number;
  nightSurcharge: number;
  prioritySurcharge?: number;
  scheduledDiscount?: number;
  totalFare: number;
  advanceAmount: number;
  remainingAmount: number;
  isFallback?: boolean;
}

export interface DriverFareBreakdown {
  packageHours: number;
  includedKm: number;
  vehicleCategory: string;
  packageFare: number;
  extraHoursCharge: number;
  extraKmCharge: number;
  totalFare: number;
  advanceAmount: number;
  remainingAmount: number;
}

export interface TowingFareEstimate {
  estimatedFare: number;
  distanceKm?: number;
  durationMinutes?: number;
  fareBreakdown: TowingFareBreakdown;
}

export interface DriverFareEstimate {
  estimatedFare: number;
  fareBreakdown: DriverFareBreakdown;
}
