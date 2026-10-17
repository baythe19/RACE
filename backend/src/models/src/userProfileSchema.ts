import { Schema, Types } from 'mongoose';

export type VendorType =
  | 'towing_company'
  | 'tow_truck_driver'
  | 'full_time_driver'
  | 'part_time_driver'
  | 'mechanic';

export type VendorStatus =
  | 'draft'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type VerificationStage =
  | 'submitted'
  | 'document_review'
  | 'background_check'
  | 'selfie_match'
  | 'approved'
  | 'rejected';

export type DriverStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

/** Vendor payout destination — bank transfer or UPI VPA.
 *  `isVerified` is set only by a real verification step (penny-drop or admin review). */
export interface VendorBankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  payoutMethod?: 'bank' | 'upi';
  upiId?: string;
  isVerified?: boolean;
  verifiedAt?: Date;
  source?: 'vendor_app' | 'admin' | 'seed';
  updatedAt?: Date;
}

export interface IVendorProfile {
  vendorType: VendorType;
  status: VendorStatus;
  verificationStage: VerificationStage;
  businessName?: string;
  ownerName?: string;
  address?: string;
  towVehicle?: {
    registrationNumber?: string;
    vehicleType?: string;
    capacity?: string;
    photos?: string[];
  };
  bankDetails?: VendorBankDetails;
  partnerDriverDetails?: {
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
    referenceContact?: {
      name: string;
      mobileNumber: string;
    };
    availability?: {
      hourly?: boolean;
      daily?: boolean;
      nightShift?: boolean;
      weekend?: boolean;
    };
  };
  reviewNotes?: string;
  documentReviews?: Array<{
    key: string;
    status: 'VERIFIED' | 'REJECTED' | 'PENDING';
    reviewedAt?: Date;
  }>;
  statusHistory: Array<{
    status: string;
    note?: string;
    changedAt: Date;
  }>;
  submittedAt?: Date;
  approvedAt?: Date;
}

export type DriverFleetSource = 'vendor' | 'admin';

export interface IDriverProfile {
  driverCode: string;
  licenseNo: string;
  vendorUserId?: Types.ObjectId;
  /** vendor = onboarded by vendor via Partner app; admin = assigned by admin portal */
  fleetSource?: DriverFleetSource;
  /** Unique login for vendor-managed drivers (password auth). */
  loginId?: string;
  /** bcrypt hash — never returned in API responses. */
  passwordHash?: string;
  driverType: string;
  city: string;
  state?: string;
  vehicleRegistration?: string;
  rating: number;
  reviewCount: number;
  status: DriverStatus;
  totalTrips: number;
  experienceYears?: number;
  languages?: string[];
  availabilityWindow?: string;
  policeVerificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  documents: Array<{
    type: string;
    url: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    uploadedAt: Date;
  }>;
  statusHistory: Array<{
    status: string;
    note?: string;
    changedAt: Date;
    changedBy?: string;
  }>;
}

export const VendorProfileSchema = new Schema<IVendorProfile>(
  {
    vendorType: {
      type: String,
      enum: [
        'towing_company',
        'tow_truck_driver',
        'full_time_driver',
        'part_time_driver',
        'mechanic',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'under_review', 'approved', 'rejected', 'changes_requested'],
      default: 'draft',
    },
    verificationStage: {
      type: String,
      enum: [
        'submitted',
        'document_review',
        'background_check',
        'selfie_match',
        'approved',
        'rejected',
      ],
      default: 'submitted',
    },
    businessName: { type: String, trim: true },
    ownerName: { type: String, trim: true },
    address: { type: String, trim: true },
    towVehicle: {
      registrationNumber: String,
      vehicleType: String,
      capacity: String,
      photos: [String],
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
      /** Payout channel: bank transfer or UPI VPA. */
      payoutMethod: { type: String, enum: ['bank', 'upi'] },
      upiId: { type: String, trim: true, lowercase: true },
      /** True only after a real verification (penny-drop / admin review). */
      isVerified: { type: Boolean, default: false },
      verifiedAt: Date,
      /** Where this record came from — vendor app, admin panel, or seeding. */
      source: { type: String, enum: ['vendor_app', 'admin', 'seed'] },
      updatedAt: Date,
    },
    partnerDriverDetails: {
      dateOfBirth: String,
      emergencyContact: {
        name: String,
        mobileNumber: String,
        relationship: String,
      },
      yearsOfExperience: Number,
      vehicleCategories: [String],
      languages: [String],
      previousEmployer: String,
      referenceContact: {
        name: String,
        mobileNumber: String,
      },
      availability: {
        hourly: Boolean,
        daily: Boolean,
        nightShift: Boolean,
        weekend: Boolean,
      },
    },
    reviewNotes: { type: String },
    documentReviews: [
      {
        key: { type: String, required: true },
        status: { type: String, enum: ['VERIFIED', 'REJECTED', 'PENDING'], required: true },
        reviewedAt: { type: Date, default: Date.now },
      },
    ],
    statusHistory: [
      {
        status: { type: String, required: true },
        note: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
    submittedAt: { type: Date },
    approvedAt: { type: Date },
  },
  { _id: false },
);

export const DriverProfileSchema = new Schema<IDriverProfile>(
  {
    driverCode: { type: String, required: true },
    licenseNo: { type: String, required: true },
    vendorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    fleetSource: { type: String, enum: ['vendor', 'admin'] },
    loginId: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, select: false },
    driverType: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: 'Odisha' },
    vehicleRegistration: { type: String },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
    },
    totalTrips: { type: Number, default: 0 },
    experienceYears: { type: Number },
    languages: [{ type: String }],
    availabilityWindow: { type: String },
    policeVerificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    documents: [
      {
        type: { type: String, required: true },
        url: { type: String, required: true },
        status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String },
      },
    ],
  },
  { _id: false },
);
