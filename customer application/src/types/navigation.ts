import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BookingPaymentFlow } from '../constants/bookingPayment';

export type BookingPaymentParams = {
  amount: number;
  flow: BookingPaymentFlow;
  bookingId?: string;
  bookingType?: ServiceBookingTypeParam;
};

export type ServiceBookingTypeParam = 'towing' | 'driver';

export type BookingTrackParams = {
  bookingId?: string;
  bookingType?: ServiceBookingTypeParam;
  fromBookings?: boolean;
};

export type BookingRateParams = {
  bookingId?: string;
  bookingType?: ServiceBookingTypeParam;
};

export type TowingBookingParamList = {
  TowingService: undefined;
  TowingChooseVehicle: undefined;
  TowingPickupDrop: undefined;
  TowingReview: undefined;
  TowingAdvancePayment: undefined;
  BookingPayment: BookingPaymentParams;
  TowingConfirmed: {
    bookingId: string;
    apiBookingId?: string;
    service: string;
    eta: string;
    fareBreakdown?: import('./fare').TowingFareBreakdown;
  };
  TowingTrack: BookingTrackParams | undefined;
  TowingDriverOnWay: BookingTrackParams | undefined;
  TowingCompleted: BookingTrackParams | undefined;
  TowingRate: BookingRateParams | undefined;
};

export type DriverBookingParamList = {
  DriverService: undefined;
  DriverBookingVehicle: { nextScreen?: 'DriverBookingLocation' | 'DriverReview' } | undefined;
  DriverBookingLocation: undefined;
  DriverBookingDateTime: undefined;
  DriverBookingReview: undefined;
  DriverBookingPayment: undefined;
  DriverBookingConfirmed: {
    bookingId: string;
    apiBookingId: string;
    service: string;
    eta: string;
    fareBreakdown?: import('./fare').DriverFareBreakdown;
  };
  DriverEnquiry: undefined;
  DriverSelectType: undefined;
  DriverDateTime: undefined;
  DriverPickup: undefined;
  DriverChooseVehicleType: undefined;
  DriverReview: undefined;
  BookingPayment: BookingPaymentParams;
  DriverAssigned: BookingTrackParams | undefined;
  DriverTrack: BookingTrackParams | undefined;
  DriverOnWay: BookingTrackParams | undefined;
};

export type RoadsideBookingParamList = {
  RoadsideAssistance: undefined;
  RoadsideSelectService: undefined;
  RoadsideLocation: { serviceId?: import('./roadsideBooking').RoadsideServiceId } | undefined;
  RoadsideReview: undefined;
  BookingPayment: BookingPaymentParams;
  RoadsideHelpOnWay: { bookingId?: string } | undefined;
};

export type MoreServicesParamList = {
  MoreServices: undefined;
};

export type ComingSoonParamList = {
  ServiceComingSoon: {
    serviceId: 'emergency_repair' | 'vehicle_recovery';
  };
};

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  CreateAccount: undefined;
  AccountType: undefined;
  SignupVendorType: { accountType?: 'customer' | 'vendor' } | undefined;
  MobileNumber: undefined;
  OtpVerification: {
    mobileNumber: string;
    isExistingUser: boolean;
    devOtp?: string;
    otpMessage?: string;
  };
  OTP: {
    phone: string;
    isExistingUser: boolean;
    devOtp?: string;
    otpMessage?: string;
  };
  ForgotPassword: undefined;
  ResetPassword: { phone: string };
  ProfileSetup: undefined;
  ProfileWizard: undefined;
  AddFirstVehicle: undefined;
  VehicleSuccess: { vehicleId: string; vehicleNumber: string };
  VehicleRegistration: undefined;
  VendorWizard: { vendorType?: string; fromSignup?: boolean } | undefined;
  VendorReview: { vendorType?: string; fromSignup?: boolean } | undefined;
  VendorVerificationStatus: { vendorType?: string; fromSignup?: boolean } | undefined;
  QRCode: {
    vehicleId: string;
    vehicleNumber: string;
  };
};

export type BookingsStackParamList = {
  BookingsMain: undefined;
  BookingDetail: { bookingId: string; bookingType?: ServiceBookingTypeParam };
  TowingTrack: BookingTrackParams | undefined;
  DriverTrack: BookingTrackParams | undefined;
  TowingRate: BookingRateParams | undefined;
  RatingReview: { bookingId: string; bookingType?: ServiceBookingTypeParam };
  LiveTracking: { bookingId: string; bookingType?: ServiceBookingTypeParam };
  BookingFlow: {
    categoryId: string;
    serviceId: string;
    serviceLabel: string;
    serviceDescription?: string;
  };
};

export type CallStackParamList = {
  CallMain: undefined;
  QRScan: undefined;
  SOSEmergency: undefined;
  VehicleQrEmergency: { vehicleId: string };
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<RootTabParamList> | undefined;
  WrongApp: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  SelectLocation: undefined;
  ServiceList: {
    categoryId: string;
    categoryTitle: string;
  };
  SelectService: {
    categoryId: string;
    serviceId: string;
    serviceLabel: string;
    serviceDescription?: string;
  };
  MoreServices: undefined;
  BookingFlow: {
    categoryId: string;
    serviceId: string;
    serviceLabel: string;
    serviceDescription?: string;
  };
  LiveTracking: { bookingId: string; bookingType?: ServiceBookingTypeParam };
  RatingReview: { bookingId: string; bookingType?: ServiceBookingTypeParam };
  VehicleQrEmergency: { vehicleId: string };
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
} & TowingBookingParamList & DriverBookingParamList & RoadsideBookingParamList & MoreServicesParamList & ComingSoonParamList;

export type ServicesStackParamList = {
  ServicesMain: undefined;
  ServiceList: {
    categoryId: string;
    categoryTitle: string;
  };
  SelectService: {
    categoryId: string;
    serviceId: string;
    serviceLabel: string;
    serviceDescription?: string;
  };
} & TowingBookingParamList & DriverBookingParamList & RoadsideBookingParamList & MoreServicesParamList & ComingSoonParamList;

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PersonalInformation: undefined;
  MyVehicles: undefined;
  AddVehicle: { returnToDriverWizard?: boolean } | undefined;
  VehicleDetail: { vehicleId: string };
  EditVehicle: { vehicleId: string };
  SosDetails: undefined;
  SavedLocations: undefined;
  PaymentMethods: undefined;
  Notifications: undefined;
  HelpSupport: undefined;
  SupportCenter: undefined;
  ChoosePlan: undefined;
  SubscriptionPlans: undefined;
  EmergencySos: undefined;
  VendorTypeSelect: undefined;
  VendorWizard: { vendorType?: string } | undefined;
  VendorReview: { vendorType?: string } | undefined;
  VendorVerificationStatus: { vendorType?: string } | undefined;
  MyQr: { vehicleId: string };
  ChangeMobileNumber: undefined;
};

export type VendorFlowParamList = {
  VendorWizard: { vendorType?: string; fromSignup?: boolean } | undefined;
  VendorReview: { vendorType?: string; fromSignup?: boolean } | undefined;
  VendorVerificationStatus: { vendorType?: string; fromSignup?: boolean } | undefined;
};

export type PartnerAccountStackParamList = {
  PartnerAccountMain: undefined;
  VendorVerificationStatus: { vendorType?: string; fromSignup?: boolean } | undefined;
};

export type PartnerTabParamList = {
  PartnerHome: undefined;
  PartnerJobs: undefined;
  PartnerAccount: NavigatorScreenParams<PartnerAccountStackParamList> | undefined;
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Services: NavigatorScreenParams<ServicesStackParamList> | undefined;
  Call: NavigatorScreenParams<CallStackParamList> | undefined;
  Bookings: NavigatorScreenParams<BookingsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
