import type { AppSettings } from '@race/types';

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    appName: 'RACE Service',
    supportEmail: 'support@raceservice.com',
    supportPhone: '+91 1800-123-4567',
    timezone: 'Asia/Kolkata',
    defaultLanguage: 'en',
  },
  notifications: {
    emailAlerts: true,
    smsAlerts: true,
    pushAlerts: true,
    bookingAlerts: true,
    vendorAlerts: true,
    financeAlerts: true,
  },
  payment: {
    currency: 'INR',
    commissionRate: 15,
    payoutCycle: 'weekly',
    minPayoutAmount: 500,
    enableWallet: true,
  },
  security: {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    require2FA: false,
    passwordExpiryDays: 90,
  },
  service: {
    defaultServiceRadius: 25,
    maxBookingWaitMinutes: 45,
    enableSOS: true,
    enableSubscriptions: true,
  },
  terms: {
    termsUrl: 'https://raceservice.com/terms',
    privacyUrl: 'https://raceservice.com/privacy',
    refundPolicyUrl: 'https://raceservice.com/refund',
  },
  emailSms: {
    smtpHost: 'smtp.raceservice.com',
    smtpPort: 587,
    smtpUser: 'noreply@raceservice.com',
    smsProvider: 'HanuSMS',
    smsApiKey: '••••••••••••',
  },
  appearance: {
    primaryColor: '#F5A623',
    sidebarTheme: 'light',
    compactMode: false,
  },
  demo: {
    useMockData: false,
  },
};
