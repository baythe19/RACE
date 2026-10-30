import { z } from 'zod';

/** vehicleId is enforced in vendorBookings.assignBooking (optional for on-site roadside). */
export const vendorApproveBookingSchema = z.object({
  bookingType: z.enum(['towing', 'driver']),
  driverId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid driver id'),
  vehicleId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid vehicle id').optional(),
}).superRefine((value, context) => {
  if (value.bookingType !== 'towing') {
    context.addIssue({
      code: 'custom',
      path: ['bookingType'],
      message: 'Vendors can only assign vehicle towing jobs',
    });
  }
});

export const vendorAssignBookingSchema = vendorApproveBookingSchema;

export const vendorVerifyTripOtpSchema = z.object({
  bookingType: z.enum(['towing', 'driver']),
  tripOtp: z.string().regex(/^\d{4}$/, 'Enter 4-digit trip OTP'),
});

export type VendorApproveBookingDto = z.infer<typeof vendorApproveBookingSchema>;
export type VendorAssignBookingDto = z.infer<typeof vendorAssignBookingSchema>;
export type VendorVerifyTripOtpDto = z.infer<typeof vendorVerifyTripOtpSchema>;
