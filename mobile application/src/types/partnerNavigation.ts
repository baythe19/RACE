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
  PartnerWelcome: undefined;
  PartnerRoleSelection: undefined;
  // P2 (v6 audit): PartnerDriverAuthMode / PartnerVendorDriverLogin credential
  // routes were removed from the live v6 auth stack (APIs removed backend-side
  // too). The screen files stay on disk for reference until deletion is okayed.
  PartnerLogin: { role?: PartnerRole } | undefined;
  PartnerOtpVerification: {
    mobileNumber: string;
    role?: PartnerRole;
    isExistingUser?: boolean;
    devOtp?: string;
    otpMessage?: string;
  };
};

export type PartnerRootStackParamList = {
  PartnerBootstrap: undefined;
  PartnerRegistration: { role: PartnerRole; mobileNumber?: string };
  PartnerMain: NavigatorScreenParams<PartnerTabParamList> | undefined;
  /** Gate shown while a driver's application is not approved yet. */
  PartnerDriverVerification: undefined;
};

export type PartnerDriversStackParamList = {
  VendorDriversList: { fullScreen?: boolean } | undefined;
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

export type PartnerJobsStackParamList = {
  PartnerJobsList: undefined;
  PartnerActiveJob: {
    bookingId?: string;
    bookingType?: 'towing' | 'driver';
  };
  VendorVehicles: undefined;
  VendorVehicleRegistration: { vehicleId?: string } | undefined;
  VendorDrivers: { fullScreen?: boolean } | undefined;
  VendorAssignJob: {
    bookingId: string;
    bookingType: 'towing' | 'driver';
    bookingNumber: string;
    serviceLabel: string;
    pickupAddress?: string;
    dropoffAddress?: string;
    estimatedFare?: number;
  };
};

export type PartnerAccountStackParamList = {
  PartnerAccountMain: undefined;
  PartnerEditProfile: undefined;
  PartnerVehicleInfo: undefined;
  PartnerDocuments: undefined;
  PartnerEarnings: undefined;
  PartnerNotifications: undefined;
  PartnerSettings: undefined;
  PartnerHelpSupport: undefined;
  PartnerBankDetails: undefined;
  PartnerTripHistory: undefined;
  VendorVerificationStatus: undefined;
  VendorDrivers: { fullScreen?: boolean } | undefined;
  VendorVehicles: undefined;
  VendorVehicleRegistration: { vehicleId?: string } | undefined;
};
