import { z } from 'zod';

export const vendorApproveBookingSchema = z.object({
  bookingType: z.enum(['towing', 'driver']),
  driverId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid driver id'),
  vehicleId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid vehicle id').optional(),
}).superRefine((value, context) => {
  if (value.bookingType === 'towing' && !value.vehicleId) {
    context.addIssue({ code: 'custom', path: ['vehicleId'], message: 'A towing job requires a fleet vehicle' });
  }
});

export const vendorAssignBookingSchema = z.object({
  bookingType: z.enum(['towing', 'driver']),
  driverId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid driver id'),
  vehicleId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid vehicle id').optional(),
}).superRefine((value, context) => {
  if (value.bookingType === 'towing' && !value.vehicleId) {
    context.addIssue({ code: 'custom', path: ['vehicleId'], message: 'A towing job requires a fleet vehicle' });
  }
});

export const vendorVerifyTripOtpSchema = z.object({
  bookingType: z.enum(['towing', 'driver']),
  tripOtp: z.string().regex(/^\d{4}$/, 'Enter 4-digit trip OTP'),
});

export type VendorApproveBookingDto = z.infer<typeof vendorApproveBookingSchema>;
export type VendorAssignBookingDto = z.infer<typeof vendorAssignBookingSchema>;
export type VendorVerifyTripOtpDto = z.infer<typeof vendorVerifyTripOtpSchema>;
