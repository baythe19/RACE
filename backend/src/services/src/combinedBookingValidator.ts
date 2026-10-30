import { z } from 'zod';

import { UNIFIED_BOOKING_STATUSES } from './bookingStatusConstants';
import type { DriverFareBreakdown, TowingFareBreakdown } from './bookings/booking';

export const combinedBookingListQuerySchema = z.object({
  status: z.enum(UNIFIED_BOOKING_STATUSES).optional(),
  type: z.enum(['towing', 'driver']).optional(),
});

export type CombinedBookingListQuery = z.infer<typeof combinedBookingListQuerySchema>;

export interface CombinedBookingLocationDto {
  address: string;
  latitude: number;
  longitude: number;
}

export interface CombinedBookingListItemDto {
  id: string;
  bookingNumber: string;
  bookingType: 'towing' | 'driver';
  serviceLabel: string;
  status: string;
  awaitingPartnerAccept?: boolean;
  paymentStatus: string;
  vehicleId: string;
  pickup: CombinedBookingLocationDto;
  dropoff?: CombinedBookingLocationDto;
  distanceKm?: number;
  packageHours?: number;
  vehicleCategory?: string;
  includedKm?: number;
  estimatedDurationHours?: number;
  estimatedFare: number;
  fareBreakdown?: TowingFareBreakdown | DriverFareBreakdown;
  advanceAmount: number;
  advancePaid: boolean;
  remainingAmount: number;
  remainingPaid: boolean;
  driverId?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
  vendorId?: string;
  assignedFleetVehicleLabel?: string;
  tripStartOtp?: string;
  arrivedAtDropoffAt?: string;
  completionOtp?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE';
  paymentConfirmedByCustomer?: boolean;
  scheduledAt?: string;
  statusHistory: Array<{ status: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
}
