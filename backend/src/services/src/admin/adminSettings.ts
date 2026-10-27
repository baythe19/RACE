import { PlatformSettingsModel } from '../../../models/src/platformSettings';
import { logActivity } from './activityLogger';

const DEFAULT_SETTINGS = {
  platformName: 'RACE Service',
  supportEmail: 'support@raceservice.com',
  supportPhone: '+91 98765 43210',
  commissionRate: 12.5,
  bookingRadiusKm: 50,
  timezone: 'Asia/Kolkata',
  language: 'en',
  autoPayout: false,
  currency: 'INR',
  appearance: {
    theme: 'light' as const,
    sidebarTheme: 'light' as const,
    primaryColor: '#F5A623',
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
  },
  useMockData: false,
};

export const adminSettingsService = {
  async get() {
    let settings = await PlatformSettingsModel.findOne();
    if (!settings) {
      settings = await PlatformSettingsModel.create(DEFAULT_SETTINGS);
    }
    return {
      general: {
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        timezone: settings.timezone,
        language: settings.language,
        currency: settings.currency,
      },
      business: {
        commissionRate: settings.commissionRate,
        bookingRadiusKm: settings.bookingRadiusKm,
        autoPayout: settings.autoPayout,
      },
      appearance: settings.appearance,
      notifications: settings.notifications,
      demo: {
        useMockData: Boolean(settings.useMockData),
      },
    };
  },

  async update(payload: Record<string, unknown>, actor: { id: string; name: string }) {
    let settings = await PlatformSettingsModel.findOne();
    if (!settings) {
      settings = await PlatformSettingsModel.create(DEFAULT_SETTINGS);
    }

    const general = payload.general as Record<string, unknown> | undefined;
    const business = payload.business as Record<string, unknown> | undefined;
    if (general) {
      if (general.platformName) settings.platformName = String(general.platformName);
      if (general.supportEmail) settings.supportEmail = String(general.supportEmail);
      if (general.supportPhone) settings.supportPhone = String(general.supportPhone);
      if (general.timezone) settings.timezone = String(general.timezone);
      if (general.language) settings.language = String(general.language);
    }
    if (business) {
      if (business.commissionRate != null) settings.commissionRate = Number(business.commissionRate);
      if (business.bookingRadiusKm != null) settings.bookingRadiusKm = Number(business.bookingRadiusKm);
      if (business.autoPayout != null) settings.autoPayout = Boolean(business.autoPayout);
    }
    if (payload.appearance) settings.appearance = { ...settings.appearance, ...(payload.appearance as object) };
    if (payload.notifications) settings.notifications = { ...settings.notifications, ...(payload.notifications as object) };
    const demo = payload.demo as Record<string, unknown> | undefined;
    if (demo && demo.useMockData != null) {
      settings.useMockData = Boolean(demo.useMockData);
    }
    settings.updatedBy = actor.id;
    await settings.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      title: 'Platform settings updated',
    });

    return this.get();
  },
};
