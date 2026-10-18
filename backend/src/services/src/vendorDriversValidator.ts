import { z } from 'zod';

export const createVendorDriverSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  licenseNo: z.string().min(4).max(40),
  driverType: z.enum(['Tow Driver', 'Full-Time', 'Part-Time']).default('Tow Driver'),
  city: z.string().min(2).max(100).optional(),
  vehicleRegistration: z.string().min(4).max(20).optional(),
  email: z.string().email().optional(),
  loginId: z
    .string()
    .min(4, 'Login ID must be at least 4 characters')
    .max(40)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'Login ID may only contain letters, numbers, dots, underscores, and hyphens',
    ),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
});

export const claimVendorDriverSchema = z.object({
  phone: z.string().min(10).max(15),
});

export const inviteVendorDriverSchema = z.object({
  phone: z.string().min(10).max(15),
});

export const revokeVendorDriverMembershipSchema = z.object({
  reason: z.string().max(500).optional(),
});

/** Vendor resets a fleet driver's login password (driver forgot it). */
export const resetVendorDriverPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
});

export const uploadVendorDriverDocumentSchema = z.object({
  documentType: z.string().min(2).max(50),
});

export type CreateVendorDriverDto = z.infer<typeof createVendorDriverSchema>;
export type ClaimVendorDriverDto = z.infer<typeof claimVendorDriverSchema>;
export type ResetVendorDriverPasswordDto = z.infer<typeof resetVendorDriverPasswordSchema>;
export type UploadVendorDriverDocumentDto = z.infer<typeof uploadVendorDriverDocumentSchema>;

export const assignVendorDriverVehicleSchema = z.object({
  /** Empty string / null unlinks the driver from their current fleet vehicle. */
  vehicleRegistration: z.string().max(20).optional().nullable(),
});

export type AssignVendorDriverVehicleDto = z.infer<typeof assignVendorDriverVehicleSchema>;
export type CreateFleetDriverDto = CreateVendorDriverDto;
