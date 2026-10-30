import { toISODate, startOfDay } from '../utils/driverCalendar';
import type { DriverFareBreakdown, DriverPackageHours, DriverVehicleCategory } from './fare';

export type DriverTypeId = 'part_time' | 'full_time' | 'outstation' | 'night';
export type DriverDurationId = '2' | '4' | '8' | 'custom';
export type DriverTimeId = 'asap' | '30-60' | '60-90' | 'custom';

export interface DriverBookingState {
  driverType: DriverTypeId;
  vehicleId: string;
  vehicleLabel: string;
  vehicleCategory?: DriverVehicleCategory;
  pickup: string;
  pickupLabel?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoff: string;
  dropoffLabel?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  dateId: string;
  timeId: DriverTimeId;
  packageHours: DriverPackageHours;
  hours: number;
  subtotal: number;
  totalPrice: number;
  advancePayment: number;
  includedKm?: number;
  fareBreakdown?: DriverFareBreakdown;
  bookingId: string;
  /** Legacy fields used by post-booking tracking screens */
  durationId: DriverDurationId;
  startTime: string;
}

export const DEFAULT_DRIVER_BOOKING: DriverBookingState = {
  driverType: 'part_time',
  vehicleId: '',
  vehicleLabel: '',
  pickup: '',
  dropoff: '',
  dateId: 'today',
  timeId: '30-60',
  packageHours: 2,
  hours: 2,
  subtotal: 0,
  totalPrice: 0,
  advancePayment: 0,
  bookingId: '#RACE45821',
  durationId: '8',
  startTime: '09:00',
};
