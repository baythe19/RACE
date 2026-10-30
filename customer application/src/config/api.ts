import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Prefer EXPO_PUBLIC_* from .env (reloads with Metro). app.config extra can stay stale on device.
const extraApiUrl =
  (process.env.EXPO_PUBLIC_API_URL?.trim() ||
    (Constants.expoConfig?.extra?.apiUrl as string | undefined)) ??
  undefined;

const DEV_API_HOST = Platform.select({
  android: '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

export const API_CONFIG = {
  baseUrl: extraApiUrl ?? `http://${DEV_API_HOST}:3000`,
  // 30s: Render free tier cold-start can exceed 12s on first request.
  timeoutMs: 30000,
} as const;

export const API_ENDPOINTS = {
  health: '/health',
  brand: '/api/v1/brand',
  services: '/api/v1/services',
  sendOtp: '/api/v1/auth/send-otp',
  verifyOtp: '/api/v1/auth/verify-otp',
  refreshToken: '/api/v1/auth/refresh-token',
  profile: '/api/v1/profile',
  profileComplete: '/api/v1/profile/complete',
  vehicles: '/api/v1/vehicles',
  vendorRegister: '/api/v1/vendor/register',
  vendorDraft: '/api/v1/vendor/draft',
  vendorUpdate: '/api/v1/vendor/update',
  vendorProfile: '/api/v1/vendor/profile',
  vendorStatus: '/api/v1/vendor/status',
  vendorDashboard: '/api/v1/vendor/dashboard',
  vendorUploadDocument: '/api/v1/vendor/upload-document',
  vendorSelfie: '/api/v1/vendor/selfie',
  bookings: '/api/v1/bookings',
  towingBookings: '/api/v1/bookings/towing',
  towingBooking: (id: string) => `/api/v1/bookings/towing/${id}`,
  towingBookingTracking: (id: string) => `/api/v1/bookings/towing/${id}/tracking`,
  towingBookingCancelPreview: (id: string) => `/api/v1/bookings/towing/${id}/cancel-preview`,
  towingBookingCancel: (id: string) => `/api/v1/bookings/towing/${id}/cancel`,
  driverBookings: '/api/v1/bookings/driver',
  driverBooking: (id: string) => `/api/v1/bookings/driver/${id}`,
  driverBookingTracking: (id: string) => `/api/v1/bookings/driver/${id}/tracking`,
  driverBookingCancelPreview: (id: string) => `/api/v1/bookings/driver/${id}/cancel-preview`,
  driverBookingCancel: (id: string) => `/api/v1/bookings/driver/${id}/cancel`,
  roadsideBookings: '/api/v1/bookings/roadside',
  roadsideAvailability: '/api/v1/bookings/roadside/availability',
  paymentAdvance: '/api/v1/payments/advance',
  paymentAdvanceVerify: '/api/v1/payments/advance/verify',
  paymentFinal: '/api/v1/payments/final',
  paymentFinalVerify: '/api/v1/payments/final/verify',
  fareTowing: '/api/v1/fare/towing',
  fareDriver: '/api/v1/fare/driver',
  savedLocations: '/api/v1/profile/locations',
  paymentMethods: '/api/v1/profile/payment-methods',
  notifications: '/api/v1/profile/notifications',
  subscriptions: '/api/v1/subscriptions',
  subscriptionPlans: '/api/v1/subscriptions/plans',
  sosConfig: '/api/v1/sos/config',
  sosContext: '/api/v1/sos/context',
  sosAlert: '/api/v1/sos/alert',
  wallet: '/api/v1/profile/wallet',
  driverAvailability: '/api/v1/driver/availability',
  driverLocation: '/api/v1/driver/location',
  driverMyBookings: '/api/v1/driver/bookings',
  driverActiveBooking: '/api/v1/driver/bookings/active',
  driverBookingStatus: (id: string) => `/api/v1/driver/bookings/${id}/status`,
  driverBookingAccept: (id: string) => `/api/v1/driver/bookings/${id}/accept`,
  driverBookingReject: (id: string) => `/api/v1/driver/bookings/${id}/reject`,
  vendorDrivers: '/api/v1/vendor/drivers',
  vendorDriverClaim: '/api/v1/vendor/drivers/claim',
  vendorDriver: (id: string) => `/api/v1/vendor/drivers/${id}`,
  vendorDriverUploadDocument: (id: string) => `/api/v1/vendor/drivers/${id}/upload-document`,
  driverRegister: '/api/v1/driver/register',
  confirmPaymentMode: (id: string) => `/api/v1/bookings/${id}/confirm-payment-mode`,
} as const;
