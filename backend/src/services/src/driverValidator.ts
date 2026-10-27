import { z } from 'zod';

import { UNIFIED_BOOKING_STATUSES } from './bookingStatusConstants';

export const updateDriverAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

export const updateDriverLocationSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export const driverBookingsQuerySchema = z.object({
  status: z.enum(UNIFIED_BOOKING_STATUSES).optional(),
  type: z.enum(['towing', 'driver']).optional(),
});

export const updateDriverBookingStatusSchema = z.object({
  status: z.enum(UNIFIED_BOOKING_STATUSES),
  bookingType: z.enum(['towing', 'driver']),
  tripOtp: z.string().regex(/^\d{4}$/, 'Enter 4-digit trip OTP').optional(),
  completionOtp: z.string().regex(/^\d{4}$/, 'Enter 4-digit completion OTP').optional(),
});

export const driverBookingActionSchema = z.object({
  bookingType: z.enum(['towing', 'driver']),
});

export type UpdateDriverAvailabilityDto = z.infer<typeof updateDriverAvailabilitySchema>;
export type UpdateDriverLocationDto = z.infer<typeof updateDriverLocationSchema>;
export type DriverBookingsQueryDto = z.infer<typeof driverBookingsQuerySchema>;
export type UpdateDriverBookingStatusDto = z.infer<typeof updateDriverBookingStatusSchema>;
export type DriverBookingActionDto = z.infer<typeof driverBookingActionSchema>;
