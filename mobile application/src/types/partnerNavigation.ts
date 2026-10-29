import type { NavigatorScreenParams } from '@react-navigation/native';

export type PartnerRole = 'vendor' | 'driver';

export type PartnerRegistrationStackParamList = {
  DriverPersonalInfo: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean; isResubmit?: boolean };
  DriverVehicleInfo: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean; isResubmit?: boolean };
  DriverDocuments: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean; isResubmit?: boolean };
  DriverReview: {
    role: PartnerRole;
    mobileNumber?: string;
    fromReview?: boolean;
    isResubmit?: boolean;
    initialStep?: number;
  };
  VendorBusinessInfo: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean };
  VendorBusinessAddress: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean };
  VendorDocuments: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean };
  VendorReview: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean };
  DriverVerificationPending: { role: PartnerRole; mobileNumber?: string };
};

export type PartnerAuthStackParamList = {
  PartnerSplash: undefined;
  PartnerLogin: { role?: PartnerRole } | undefined;
  PartnerOtpVerification: {
    mobileNumber: string;
    role?: PartnerRole;
    isExistingUser?: boolean;
    devOtp?: string;
    otpMessage?: string;
  };
  PartnerRoleSelection: { mobileNumber?: string } | undefined;
};

export type PartnerRootStackParamList = {
  PartnerBootstrap: undefined;
  PartnerRegistration: { role: PartnerRole; mobileNumber?: string };
  PartnerMain: NavigatorScreenParams<PartnerTabParamList> | undefined;
  /** Gate shown while a driver's application is not approved yet. */
  PartnerDriverVerification: undefined;
};

/** Shared assign-job payload (same screen may live on Jobs, Drivers, or Account stack). */
export type VendorAssignJobRouteParams = {
  bookingId: string;
  bookingType: 'towing' | 'driver';
  bookingNumber: string;
  serviceLabel: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  estimatedFare?: number;
  preferredDriverId?: string;
  /** Roadside on-site — assign driver/mechanic only (no fleet truck). */
  onSiteAssist?: boolean;
};

export type PartnerDriversStackParamList = {
  VendorDriversList: { fullScreen?: boolean } | undefined;
  VendorAddDriver: undefined;
  VendorAssignJob: VendorAssignJobRouteParams;
  VendorVehicles: undefined;
  VendorVehicleRegistration: { vehicleId?: string } | undefined;
};

export type PartnerVehiclesStackParamList = {
  VendorVehiclesList: undefined;
  VendorVehicles: undefined;
  VendorVehicleRegistration: { vehicleId?: string } | undefined;
};

export type PartnerTabParamList = {
  PartnerHome: undefined;
  PartnerJobs: NavigatorScreenParams<PartnerJobsStackParamList> | undefined;
  PartnerVehicles: NavigatorScreenParams<PartnerVehiclesStackParamList> | undefined;
  PartnerDrivers: NavigatorScreenParams<PartnerDriversStackParamList> | undefined;
  PartnerVendor: undefined;
  PartnerAccount: NavigatorScreenParams<PartnerAccountStackParamList> | undefined;
};

export type PartnerJobsListParams = {
  /** Deep-link from Account / notifications into the Done segment. */
  initialSegment?: 'available' | 'active' | 'done';
};

export type PartnerJobsStackParamList = {
  PartnerJobsList: PartnerJobsListParams | undefined;
  PartnerActiveJob: {
    bookingId?: string;
    bookingType?: 'towing' | 'driver';
  };
  VendorVehicles: undefined;
  VendorVehicleRegistration: { vehicleId?: string } | undefined;
  VendorDrivers: { fullScreen?: boolean } | undefined;
  /** Vendor-side staff-driver onboarding: the full 3-step driver registration flow. */
  VendorAddDriver: undefined;
  VendorAssignJob: VendorAssignJobRouteParams;
};

export type PartnerAccountStackParamList = {
  PartnerAccountMain: undefined;
  PartnerEditProfile: undefined;
  PartnerDocuments: undefined;
  PartnerEarnings: undefined;
  PartnerNotifications: undefined;
  PartnerSettings: undefined;
  PartnerHelpSupport: undefined;
  PartnerBankDetails: undefined;
  VendorVerificationStatus: undefined;
  VendorDrivers: { fullScreen?: boolean } | undefined;
  /** Vendor-side staff-driver onboarding (same flow as the Jobs-stack copy). */
  VendorAddDriver: undefined;
  VendorAssignJob: VendorAssignJobRouteParams;
  VendorVehicles: undefined;
  VendorVehicleRegistration: { vehicleId?: string } | undefined;
};
