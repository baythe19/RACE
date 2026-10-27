import type { AppSettings } from '@race/types';

import { DEFAULT_SETTINGS } from '../constants/default-settings';
import { apiGet, apiPut } from '../http';

export async function getSettings(): Promise<AppSettings> {
  const raw = await apiGet<{
    general?: {
      platformName?: string;
      supportEmail?: string;
      supportPhone?: string;
      timezone?: string;
      language?: string;
    };
    business?: { commissionRate?: number; bookingRadiusKm?: number; autoPayout?: boolean };
    appearance?: AppSettings['appearance'];
    notifications?: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
    };
    demo?: { useMockData?: boolean };
  }>('/settings');

  return {
    ...DEFAULT_SETTINGS,
    general: {
      ...DEFAULT_SETTINGS.general,
      appName: raw.general?.platformName ?? DEFAULT_SETTINGS.general.appName,
      supportEmail: raw.general?.supportEmail ?? DEFAULT_SETTINGS.general.supportEmail,
      supportPhone: raw.general?.supportPhone ?? DEFAULT_SETTINGS.general.supportPhone,
      timezone: raw.general?.timezone ?? DEFAULT_SETTINGS.general.timezone,
      defaultLanguage: raw.general?.language ?? DEFAULT_SETTINGS.general.defaultLanguage,
    },
    payment: {
      ...DEFAULT_SETTINGS.payment,
      commissionRate: raw.business?.commissionRate ?? DEFAULT_SETTINGS.payment.commissionRate,
    },
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...(raw.appearance ?? {}),
      compactMode:
        (raw.appearance as { compactMode?: boolean } | undefined)?.compactMode ??
        DEFAULT_SETTINGS.appearance.compactMode,
    },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      emailAlerts: raw.notifications?.emailEnabled ?? DEFAULT_SETTINGS.notifications.emailAlerts,
      smsAlerts: raw.notifications?.smsEnabled ?? DEFAULT_SETTINGS.notifications.smsAlerts,
      pushAlerts: raw.notifications?.pushEnabled ?? DEFAULT_SETTINGS.notifications.pushAlerts,
    },
    demo: {
      useMockData: raw.demo?.useMockData ?? DEFAULT_SETTINGS.demo.useMockData,
    },
  };
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  await apiPut('/settings', {
    general: {
      platformName: settings.general.appName,
      supportEmail: settings.general.supportEmail,
      supportPhone: settings.general.supportPhone,
      timezone: settings.general.timezone,
      language: settings.general.defaultLanguage,
    },
    business: {
      commissionRate: settings.payment.commissionRate,
    },
    appearance: settings.appearance,
    notifications: {
      emailEnabled: settings.notifications.emailAlerts,
      smsEnabled: settings.notifications.smsAlerts,
      pushEnabled: settings.notifications.pushAlerts,
    },
    demo: {
      useMockData: settings.demo.useMockData,
    },
  });
  return settings;
}

export async function resetSettings(): Promise<AppSettings> {
  return saveSettings(DEFAULT_SETTINGS);
}
