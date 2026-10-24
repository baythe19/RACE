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

export const vendorDriverOnboardingSendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(2).max(100).optional(),
});

export const vendorDriverOnboardingVerifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().min(4).max(8),
  challengeId: z.string().optional(),
});

export const createVendorStaffDriverSchema = z
  .object({
    proofToken: z.string().min(10).optional(),
    onboardingProofToken: z.string().min(10).optional(),
    name: z.string().min(2).max(100).optional(),
    fullName: z.string().min(2).max(100).optional(),
    phone: z.string().min(10).max(15),
    licenseNo: z.string().min(4).max(40),
    driverType: z.enum(['Tow Driver', 'Full-Time', 'Part-Time']).default('Tow Driver'),
    dateOfBirth: z.string().optional(),
    city: z.string().min(2).max(100).optional(),
    state: z.string().optional(),
    experienceYears: z.number().min(0).max(50).optional(),
    email: z.string().email().optional(),
    documents: z
      .object({
        drivingLicense: z.string().optional(),
        aadhaarCard: z.string().optional(),
        profilePhoto: z.string().optional(),
      })
      .optional(),
  })
  .refine((data) => Boolean(data.proofToken || data.onboardingProofToken), {
    message: 'Either proofToken or onboardingProofToken is required',
    path: ['proofToken'],
  })
  .refine((data) => Boolean(data.name || data.fullName), {
    message: 'Either name or fullName is required',
    path: ['name'],
  });

export type VendorDriverOnboardingSendOtpDto = z.infer<typeof vendorDriverOnboardingSendOtpSchema>;
export type VendorDriverOnboardingVerifyOtpDto = z.infer<typeof vendorDriverOnboardingVerifyOtpSchema>;
export type CreateVendorStaffDriverDto = z.infer<typeof createVendorStaffDriverSchema>;
export type AssignVendorDriverVehicleDto = z.infer<typeof assignVendorDriverVehicleSchema>;
export type CreateFleetDriverDto = CreateVendorDriverDto;

