export type PartnerRole = 'vendor' | 'driver';

export type PartnerRegistrationStackParamList = {
  DriverPersonalInfo: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean };
  DriverVehicleInfo: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean };
  DriverDocuments: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean };
  DriverReview: { role: PartnerRole; mobileNumber?: string; fromReview?: boolean };
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
  PartnerDriverAuthMode: undefined;
  PartnerVendorDriverLogin: undefined;
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
  PartnerMain: undefined;
  /** Gate shown while a driver's application is not approved yet. */
  PartnerDriverVerification: undefined;
};

export type PartnerTabParamList = {
  PartnerHome: undefined;
  PartnerJobs: undefined;
  PartnerAccount: undefined;
};

export type PartnerJobsStackParamList = {
  PartnerJobsList: undefined;
  PartnerActiveJob: {
    bookingId?: string;
    bookingType?: 'towing' | 'driver';
  };
  VendorVehicles: undefined;
  VendorAssignJob: {
    bookingId: string;
    bookingType: 'towing' | 'driver';
    bookingNumber: string;
    serviceLabel: string;
    pickupAddress?: string;
    estimatedFare?: number;
  };
};

export type PartnerAccountStackParamList = {
  PartnerAccountMain: undefined;
  VendorVerificationStatus: undefined;
  VendorDrivers: undefined;
  VendorVehicles: undefined;
};
