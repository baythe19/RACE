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
  driverProfile?: ProfileDriverSummaryDto;
}
