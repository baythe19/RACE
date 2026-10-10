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
    scheduledAt: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scheduledAt && new Date(data.scheduledAt) <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduledAt must be a future date',
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
  pickup: { address: string; latitude: number; longitude: number };
  dropoff?: { address: string; latitude: number; longitude: number };
  assignedFleetVehicleLabel?: string;
  tripStartOtp?: string;
}
