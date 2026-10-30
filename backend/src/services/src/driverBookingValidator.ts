import { z } from 'zod';

import { UNIFIED_BOOKING_STATUSES } from './bookingStatusConstants';
import type { DriverFareBreakdown } from './bookings/booking';

const packageHoursSchema = z.union([
  z.literal(2),
  z.literal(4),
  z.literal(8),
  z.literal(12),
  z.literal(24),
]);

const locationSchema = z.object({
  address: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

export const createDriverBookingSchema = z
  .object({
    vehicleId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid vehicle id'),
    pickup: locationSchema,
    dropoff: locationSchema.optional(),
    packageHours: packageHoursSchema.optional(),
    estimatedDurationHours: z.number().positive().optional(),
    driverServiceType: z.enum(['part_time', 'full_time', 'outstation', 'night']).optional(),
    // D-12: accept UTC offsets ("+05:30") as well as "Z" (client sends Z).
    scheduledAt: z.string().datetime({ offset: true }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scheduledAt && new Date(data.scheduledAt) <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduledAt must be a future date',
        path: ['scheduledAt'],
      });
    }

    if (!data.packageHours && !data.estimatedDurationHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'packageHours or estimatedDurationHours is required',
        path: ['packageHours'],
      });
    }
  });

export const updateDriverBookingStatusSchema = z.object({
  status: z.enum(UNIFIED_BOOKING_STATUSES),
});

export const cancelDriverBookingSchema = z.object({
  reason: z.string().trim().min(1).max(250).optional(),
});

export const driverBookingStatusQuerySchema = z.object({
  status: z.enum(UNIFIED_BOOKING_STATUSES).optional(),
});

export type CreateDriverBookingDto = z.infer<typeof createDriverBookingSchema>;
export type UpdateDriverBookingStatusDto = z.infer<typeof updateDriverBookingStatusSchema>;

export interface DriverBookingResponseDto {
  id: string;
  bookingNumber: string;
  customerId: string;
  vehicleId?: string;
  pickup: { address: string; latitude: number; longitude: number };
  dropoff?: { address: string; latitude: number; longitude: number };
  driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  estimatedDurationHours?: number;
  packageHours: number;
  vehicleCategory?: string;
  includedKm?: number;
  estimatedFare: number;
  fareBreakdown?: DriverFareBreakdown;
  advanceAmount: number;
  advancePaid: boolean;
  advancePaymentId?: string;
  remainingAmount: number;
  remainingPaid: boolean;
  paymentStatus: string;
  status: string;
  awaitingPartnerAccept?: boolean;
  vendorId?: string;
  driverId?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
  assignedFleetVehicleLabel?: string;
  tripStartOtp?: string;
  completionOtp?: string;
  arrivedAtDropoffAt?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE';
  paymentConfirmedByCustomer?: boolean;
  scheduledAt?: string;
  statusHistory: Array<{ status: string; timestamp: string; note?: string }>;
  cancelledAt?: string;
  cancelledBy?: 'customer' | 'driver' | 'admin';
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: 'NOT_APPLICABLE' | 'PENDING' | 'PROCESSED';
  rating?: {
    score: number;
    review?: string;
    tags?: string[];
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DriverTrackingResponseDto {
  bookingId: string;
  status: string;
  awaitingPartnerAccept?: boolean;
  statusHistory: Array<{ status: string; timestamp: string }>;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    updatedAt?: string;
    driverName?: string;
    driverPhone?: string;
  };
  /** P-UPI-01: assigned driver's saved UPI VPA for dropoff settlement deep-link. */
  driverUpiId?: string;
  pickup: { address: string; latitude: number; longitude: number };
  dropoff?: { address: string; latitude: number; longitude: number };
  assignedFleetVehicleLabel?: string;
  tripStartOtp?: string;
  completionOtp?: string;
  arrivedAtDropoffAt?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE';
  paymentConfirmedByCustomer?: boolean;
  fare?: number;
}
