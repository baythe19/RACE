import { z } from 'zod';

export const vendorTypeSchema = z.enum([
  'towing_company',
  'tow_truck_driver',
  'full_time_driver',
  'part_time_driver',
  'mechanic',
]);

export const documentTypeSchema = z.enum([
  'aadhaar',
  'pan',
  'gst',
  'shop_license',
  'msme',
  'cancelled_cheque',
  'commercial_licence',
  'driving_license',
  'police_verification',
  'medical_certificate',
  'vehicle_insurance',
  'fitness_certificate',
  'puc',
  'commercial_permit',
  'selfie',
  'vehicle_photo',
  'voter_id',
  'other',
]);

const bankDetailsSchema = z.object({
  accountHolderName: z.string().min(2).max(100),
  accountNumber: z.string().min(6).max(30),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, 'Invalid IFSC'),
  bankName: z.string().min(2).max(100).optional(),
});

const towVehicleSchema = z.object({
  registrationNumber: z.string().min(4).max(20),
  vehicleType: z.string().min(2).max(50),
  capacity: z.string().max(50).optional(),
  photos: z.array(z.string().url()).optional(),
});

const driverProfileSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  emergencyContact: z
    .object({
      name: z.string().min(2).max(100),
      mobileNumber: z.string().min(10).max(15),
      relationship: z.string().max(50).optional(),
    })
    .optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  vehicleCategories: z.array(z.string().min(1).max(50)).optional(),
  languages: z.array(z.string().min(1).max(50)).optional(),
  previousEmployer: z.string().max(150).optional(),
  referenceContact: z
    .object({
      name: z.string().min(2).max(100),
      mobileNumber: z.string().min(10).max(15),
    })
    .optional(),
  availability: z
    .object({
      hourly: z.boolean().optional(),
      daily: z.boolean().optional(),
      nightShift: z.boolean().optional(),
      weekend: z.boolean().optional(),
    })
    .optional(),
});

const documentSchema = z.object({
  documentType: documentTypeSchema,
  fileUrl: z.string().url(),
  fileName: z.string().max(200).optional(),
});

const baseVendorSchema = z.object({
  vendorType: vendorTypeSchema,
  businessName: z.string().min(2).max(150).optional(),
  ownerName: z.string().min(2).max(100),
  mobileNumber: z.string().min(10).max(15),
  email: z.string().email().optional(),
  address: z.string().min(5).max(300).optional(),
  towVehicle: towVehicleSchema.optional(),
  bankDetails: bankDetailsSchema.optional(),
  driverProfile: driverProfileSchema.optional(),
  documents: z.array(documentSchema).optional(),
});

export const saveVendorDraftSchema = baseVendorSchema.partial().extend({
  vendorType: vendorTypeSchema,
});

export const registerVendorSchema = baseVendorSchema.extend({
  acceptTerms: z.literal(true),
});

export const updateVendorSchema = baseVendorSchema.partial();

export const uploadDocumentSchema = z.object({
  documentType: documentTypeSchema,
});

export const reviewVendorSchema = z.object({
  status: z.enum(['approved', 'rejected', 'changes_requested']),
  reviewNotes: z.string().max(500).optional(),
  verificationStage: z
    .enum([
      'submitted',
      'document_review',
      'background_check',
      'selfie_match',
      'approved',
      'rejected',
    ])
    .optional(),
});

export const adminListVendorsSchema = z.object({
  status: z
    .enum(['pending', 'under_review', 'approved', 'rejected', 'changes_requested', 'draft'])
    .optional(),
  verificationStage: z
    .enum([
      'submitted',
      'document_review',
      'background_check',
      'selfie_match',
      'approved',
      'rejected',
    ])
    .optional(),
});

export const reviewDocumentSchema = z.object({
  verificationStatus: z.enum(['approved', 'rejected', 'resubmission_required', 'under_review']),
  reviewNotes: z.string().max(500).optional(),
});

export type SaveVendorDraftDto = z.infer<typeof saveVendorDraftSchema>;
export type RegisterVendorDto = z.infer<typeof registerVendorSchema>;
export type UpdateVendorDto = z.infer<typeof updateVendorSchema>;
export type UploadDocumentDto = z.infer<typeof uploadDocumentSchema>;
export type ReviewVendorDto = z.infer<typeof reviewVendorSchema>;
export type ReviewDocumentDto = z.infer<typeof reviewDocumentSchema>;

/** Vendor payout account — bank transfer or UPI VPA. Real validation, no mocks.
 *  IFSC: 4 letters (bank) + 0 + 6 alphanumerics (branch). UPI: name@handle. */
export const savePayoutAccountSchema = z
  .object({
    payoutMethod: z.enum(['bank', 'upi']),
    accountHolderName: z.string().trim().min(3).max(80),
    bank: z
      .object({
        accountNumber: z.string().trim().regex(/^\d{9,18}$/, 'Account number must be 9-18 digits').optional(),
        ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
        bankName: z.string().trim().min(2).max(80),
      })
      .optional(),
    upi: z
      .object({
        upiId: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/, 'Invalid UPI ID (e.g. name@okhdfcbank)'),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.payoutMethod === 'bank' && !value.bank) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bank'], message: 'Bank details are required' });
    }
    if (value.payoutMethod === 'upi' && !value.upi) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['upi'], message: 'UPI details are required' });
    }
  });

export type SavePayoutAccountDto = z.infer<typeof savePayoutAccountSchema>;

export interface PayoutAccountDto {
  payoutMethod: 'bank' | 'upi';
  accountHolderName: string;
  /** Masked for display — never return the full number to the client. */
  accountNumberMasked?: string;
  ifsc?: string;
  bankName?: string;
  upiId?: string;
  isVerified: boolean;
  verifiedAt?: string;
  updatedAt?: string;
}

export interface VendorEarningsDto {
  currency: 'INR';
  totals: {
    today: number;
    week: number;
    month: number;
    allTime: number;
  };
  /** Payouts actually marked VENDOR_PAYOUT / COMPLETED. */
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    paidAt: string;
    description?: string;
  }>;
  /** Real completed job payments for the chart (last 7 days, per day). */
  dailyEarnings: Array<{ date: string; amount: number }>;
}

export interface VendorDocumentDto {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  verificationStatus: string;
  reviewNotes?: string;
  uploadedAt: string;
}

export interface VendorResponseDto {
  id: string;
  userId: string;
  vendorType: string;
  status: string;
  verificationStage: string;
  businessName?: string;
  ownerName?: string;
  mobileNumber: string;
  email?: string;
  address?: string;
  towVehicle?: {
    registrationNumber: string;
    vehicleType: string;
    capacity?: string;
    photos?: string[];
  };
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
    bankName?: string;
  };
  driverProfile?: {
    dateOfBirth?: string;
    emergencyContact?: {
      name: string;
      mobileNumber: string;
      relationship?: string;
    };
    yearsOfExperience?: number;
    vehicleCategories?: string[];
    languages?: string[];
    previousEmployer?: string;
    referenceContact?: { name: string; mobileNumber: string };
    availability?: {
      hourly?: boolean;
      daily?: boolean;
      nightShift?: boolean;
      weekend?: boolean;
    };
  };
  reviewNotes?: string;
  statusHistory: Array<{
    status: string;
    note?: string;
    changedAt: string;
  }>;
  documents: VendorDocumentDto[];
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vendor document policy: the partner picks one identity proof and one
 * business identity proof (any of the listed types). Bank proof is collected
 * with the bank/verification flow, not the registration document step.
 */
export const VENDOR_EXEMPT_DOCUMENT_CHECK_TYPES = new Set(['towing_company', 'mechanic']);

/** Required documents per vendor type for submission validation */
export const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  towing_company: [],
  mechanic: [],
  tow_truck_driver: [
    'aadhaar',
    'pan',
    'driving_license',
    'selfie',
    'police_verification',
    'medical_certificate',
    'vehicle_insurance',
    'fitness_certificate',
    'puc',
  ],
  full_time_driver: [
    'aadhaar',
    'pan',
    'driving_license',
    'selfie',
    'police_verification',
    'medical_certificate',
  ],
  part_time_driver: ['aadhaar', 'pan', 'driving_license', 'selfie'],
};
