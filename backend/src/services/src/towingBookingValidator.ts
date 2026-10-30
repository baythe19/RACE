import { z } from 'zod';

import { UNIFIED_BOOKING_STATUSES } from './bookingStatusConstants';
import type { TowingFareBreakdown } from './bookings/booking';

const locationSchema = z.object({
  address: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

export const createTowingBookingSchema = z
  .object({
    vehicleId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid vehicle id'),
    pickup: locationSchema,
    dropoff: locationSchema,
    towingMode: z.enum(['instant', 'scheduled', 'emergency']).optional(),
    // D-12: accept UTC offsets ("+05:30") as well as "Z" so third-party callers
    // with valid future dates are not rejected. Client always sends Z (toISOString).
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

    const mode = data.towingMode ?? (data.scheduledAt ? 'scheduled' : 'instant');

    if (mode === 'scheduled' && !data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduledAt is required for scheduled towing',
        path: ['scheduledAt'],
      });
    }

    if (mode === 'emergency' && data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Emergency towing cannot include a future schedule',
        path: ['scheduledAt'],
      });
    }

    if (mode === 'instant' && data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Instant towing cannot include scheduledAt',
        path: ['scheduledAt'],
      });
    }
  });

export const updateTowingBookingStatusSchema = z.object({
  status: z.enum(UNIFIED_BOOKING_STATUSES),
});

export const cancelTowingBookingSchema = z.object({
  reason: z.string().trim().min(1).max(250).optional(),
});

export const towingBookingStatusQuerySchema = z.object({
  status: z.enum(UNIFIED_BOOKING_STATUSES).optional(),
});

export type CreateTowingBookingDto = z.infer<typeof createTowingBookingSchema>;
export type UpdateTowingBookingStatusDto = z.infer<typeof updateTowingBookingStatusSchema>;

export interface TowingBookingResponseDto {
  id: string;
  bookingNumber: string;
  customerId: string;
  vehicleId: string;
  pickup: { address: string; latitude: number; longitude: number };
  dropoff?: { address: string; latitude: number; longitude: number };
  towingMode?: 'instant' | 'scheduled' | 'emergency';
  assistLabel?: string;
  distanceKm?: number;
  estimatedFare: number;
  fareBreakdown?: TowingFareBreakdown;
  advanceAmount: number;
  advancePaid: boolean;
  advancePaymentId?: string;
  remainingAmount: number;
  remainingPaid: boolean;
  paymentStatus: string;
  status: string;
  /** True when a partner is allotted but has not accepted yet (no driver PII). */
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

export interface TowingTrackingResponseDto {
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
