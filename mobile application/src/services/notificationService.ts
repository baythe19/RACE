import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEYS } from '../config/env';
import { api, unwrapApi } from './api';
import { API_ENDPOINTS } from '../config/api';
import { UI_PREVIEW_MODE, UI_PREVIEW_MUTATIONS_ENABLED } from '../constants/preview';
import {
  getPreviewDriverNotifications,
  getPreviewVendorNotifications,
  setPreviewNotificationsForRole,
} from '../data/previewPartnerWorld';

export type PartnerNotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, string>;
  createdAt: string;
};

export type NotificationPreferences = {
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  bookingUpdates: boolean;
  promotions: boolean;
  serviceLaunches: boolean;
};

async function previewNotificationRole(): Promise<'vendor' | 'driver'> {
  const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
  return token?.includes('vendor') ? 'vendor' : 'driver';
}

async function readPreviewNotifications(): Promise<PartnerNotificationItem[]> {
  const role = await previewNotificationRole();
  return role === 'vendor' ? getPreviewVendorNotifications() : getPreviewDriverNotifications();
}

async function writePreviewNotifications(next: PartnerNotificationItem[]): Promise<void> {
  const role = await previewNotificationRole();
  setPreviewNotificationsForRole(role, next);
}

let mockNotificationPrefs: NotificationPreferences = {
  pushEnabled: true,
  smsEnabled: true,
  emailEnabled: false,
  bookingUpdates: true,
  promotions: false,
  serviceLaunches: true,
};

export async function getNotifications(): Promise<{
  notifications: PartnerNotificationItem[];
  unreadCount: number;
}> {
  try {
    const res = await unwrapApi<{ notifications: PartnerNotificationItem[]; unreadCount: number }>(
      api.get(API_ENDPOINTS.notifications),
    );
    return res;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const notifications = await readPreviewNotifications();
      const unreadCount = notifications.filter(n => !n.isRead).length;
      return { notifications: [...notifications], unreadCount };
    }
    throw error;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await unwrapApi(api.patch(`${API_ENDPOINTS.notifications}/${id}/read`));
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const notifications = await readPreviewNotifications();
      await writePreviewNotifications(
        notifications.map(n => (n.id === id ? { ...n, isRead: true } : n)),
      );
      return;
    }
    throw error;
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await unwrapApi(api.patch(`${API_ENDPOINTS.notifications}/read-all`));
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const notifications = await readPreviewNotifications();
      await writePreviewNotifications(notifications.map(n => ({ ...n, isRead: true })));
      return;
    }
    throw error;
  }
}

export async function deleteAllNotifications(): Promise<void> {
  try {
    await unwrapApi(api.delete(API_ENDPOINTS.notifications));
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      await writePreviewNotifications([]);
      return;
    }
    throw error;
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    return await unwrapApi<NotificationPreferences>(
      api.get(`${API_ENDPOINTS.notifications}/preferences`),
    );
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return { ...mockNotificationPrefs };
    }
    throw error;
  }
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  try {
    return await unwrapApi<NotificationPreferences>(
      api.patch(`${API_ENDPOINTS.notifications}/preferences`, prefs),
    );
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      mockNotificationPrefs = { ...mockNotificationPrefs, ...prefs };
      return { ...mockNotificationPrefs };
    }
    throw error;
  }
}
