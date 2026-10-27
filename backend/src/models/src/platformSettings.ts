import { Schema, model, type Document } from 'mongoose';

export interface IPlatformSettings extends Document {
  platformName: string;
  supportEmail: string;
  supportPhone?: string;
  commissionRate: number;
  bookingRadiusKm: number;
  timezone: string;
  language: string;
  autoPayout: boolean;
  currency: string;
  appearance: {
    theme: 'light' | 'dark' | 'system';
    sidebarTheme: 'light' | 'dark';
    primaryColor: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
  };
  /** When true, admin UI may overlay demo/mock dashboard content. Default false = live data only. */
  useMockData: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    platformName: { type: String, default: 'RACE Service' },
    supportEmail: { type: String, default: 'support@raceservice.com' },
    supportPhone: { type: String },
    commissionRate: { type: Number, default: 12.5, min: 0, max: 100 },
    bookingRadiusKm: { type: Number, default: 50 },
    timezone: { type: String, default: 'Asia/Kolkata' },
    language: { type: String, default: 'en' },
    autoPayout: { type: Boolean, default: false },
    currency: { type: String, default: 'INR' },
    appearance: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
      sidebarTheme: { type: String, enum: ['light', 'dark'], default: 'light' },
      primaryColor: { type: String, default: '#F5A623' },
    },
    notifications: {
      emailEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: true },
      pushEnabled: { type: Boolean, default: true },
    },
    useMockData: { type: Boolean, default: false },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

export const PlatformSettingsModel = model<IPlatformSettings>(
  'PlatformSettings',
  PlatformSettingsSchema,
);

export const SETTINGS_SINGLETON_ID = 'platform';
