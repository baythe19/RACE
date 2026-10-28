import { z } from 'zod';

const emergencyContactSchema = z.object({
  name: z.string().min(2).max(100),
  mobileNumber: z.string().min(10).max(15),
  relationship: z.string().max(50).optional(),
});

const addressSchema = z.object({
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  country: z.string().default('India'),
});

export const completeProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().email().optional(),
  ),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional(),
  emergencyContact: emergencyContactSchema,
  address: addressSchema,
  profilePhoto: z.string().url().optional(),
});

export type CompleteProfileDto = z.infer<typeof completeProfileSchema>;

/** Partial update — only send fields you want to change. */
export const updateProfileSchema = completeProfileSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field is required',
  });

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

/** ─── Identity credential endpoints (D-04: placebo screen wiring) ─── */

// 10-digit Indian mobile, normalized server-side. Ownership checks live in the service.
const mobileDigits = z
  .string()
  .trim()
  .regex(/^(?:\+?91)?([6-9]\d{9})$/, 'Enter a valid 10-digit mobile number')
  .transform((value) => value.replace(/\D/g, '').slice(-10));

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  })
  .strict();

export type PasswordChangeDto = z.infer<typeof passwordChangeSchema>;

export const mobileChangeRequestSchema = z.object({ newMobile: mobileDigits }).strict();
export type MobileChangeRequestDto = z.infer<typeof mobileChangeRequestSchema>;

export const mobileChangeConfirmSchema = z
  .object({
    pendingToken: z.string().min(16),
    code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  })
  .strict();
export type MobileChangeConfirmDto = z.infer<typeof mobileChangeConfirmSchema>;

export const pinSetSchema = z
  .object({
    currentPin: z.string().regex(/^\d{4,6}$/).optional(),
    pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
  })
  .strict();
export type PinSetDto = z.infer<typeof pinSetSchema>;

export const pinVerifySchema = z
  .object({ pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits') })
  .strict();
export type PinVerifyDto = z.infer<typeof pinVerifySchema>;

export type DriverVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type DriverDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

/**
 * Driver-only verification summary. Exposed so the Partner app can show the real
 * review state (screens: "Your account is under verification", driver dashboard
 * verification card) instead of inferring it from `isVerified`.
 * Never includes credential fields (loginId / passwordHash).
 */
export interface ProfileDriverSummaryDto {
  status: DriverVerificationStatus;
  driverCode?: string;
  driverType?: string;
  licenseNo?: string;
  city?: string;
  state?: string;
  vehicleRegistration?: string;
  fleetSource?: 'vendor' | 'admin';
  vendorUserId?: string;
  policeVerificationStatus?: DriverDocumentStatus;
  documents: Array<{
    type: string;
    status: DriverDocumentStatus;
    uploadedAt?: string;
  }>;
  statusHistory: Array<{ status: string; note?: string; changedAt: string }>;
  submittedAt?: string;
}

export interface ProfileResponseDto {
  id: string;
  mobileNumber: string;
  fullName?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  emergencyContact?: {
    name: string;
    mobileNumber: string;
    relationship?: string;
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  profilePhoto?: string;
  isVerified: boolean;
  isProfileCompleted: boolean;
  role: string;
  isAvailable?: boolean;
  driverContext?: 'VENDOR_MANAGED' | 'INDEPENDENT';
  vendorUserId?: string;
  driverProfile?: ProfileDriverSummaryDto;
}
