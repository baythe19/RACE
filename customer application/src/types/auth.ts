export interface AuthUser {
  id: string;
  mobileNumber: string;
  role: 'customer' | 'vendor' | 'driver';
  /** Server-owned capabilities can include Customer and Driver on one identity. */
  capabilities?: Array<'customer' | 'vendor' | 'driver'>;
  isVerified: boolean;
  isProfileCompleted: boolean;
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
}

export type User = AuthUser;

export interface SendOtpRequest {
  mobileNumber: string;
  role?: 'customer' | 'vendor' | 'driver';
}

export interface SendOtpResponse {
  message: string;
  expiresIn: number;
  isExistingUser: boolean;
  isProfileCompleted: boolean;
  onboardingRequired?: boolean;
  devOtp?: string;
}

export interface VerifyOtpRequest {
  mobileNumber: string;
  otp: string;
  role?: 'customer' | 'vendor' | 'driver';
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
  onboardingRequired: boolean;
}

export interface CompleteProfileRequest {
  fullName: string;
  email: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string;
  emergencyContact: {
    name: string;
    mobileNumber: string;
    relationship?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  profilePhoto?: string;
}

export type VendorType =
  | 'towing_company'
  | 'tow_truck_driver'
  | 'full_time_driver'
  | 'part_time_driver'
  | 'mechanic';

export interface VendorRegistrationRequest {
  vendorType: VendorType;
  businessName?: string;
  ownerName: string;
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
  };
  documents?: Array<{
    documentType: string;
    fileUrl: string;
    fileName?: string;
  }>;
  acceptTerms: true;
}

export interface VendorStatusResponse {
  id: string;
  vendorType: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested';
  businessName?: string;
  ownerName?: string;
  reviewNotes?: string;
  statusHistory: Array<{ status: string; note?: string; changedAt: string }>;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}
