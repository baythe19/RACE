import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { TOKEN_KEYS } from '../config/env';
import { api, unwrapApi } from './api';
import { API_ENDPOINTS } from '../config/api';
import { UI_PREVIEW_MODE, UI_PREVIEW_MUTATIONS_ENABLED } from '../constants/preview';

// Configure lock-screen and heads-up banner presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
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
  if (UI_PREVIEW_MODE) {
    const notifications = await readPreviewNotifications();
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return { notifications: [...notifications], unreadCount };
  }
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

export async function deleteNotification(id: string): Promise<void> {
  try {
    await unwrapApi(api.delete(`${API_ENDPOINTS.notifications}/${id}`));
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const notifications = await readPreviewNotifications();
      await writePreviewNotifications(notifications.filter(n => n.id !== id));
      return;
    }
    throw error;
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  if (UI_PREVIEW_MODE) return { ...mockNotificationPrefs };
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

/**
 * Configure high-priority Android notification channels with lock screen visibility.
 */
export async function setupLockScreenNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    // 1. MAX priority channel for incoming dispatch jobs (heads-up on lock screen)
    await Notifications.setNotificationChannelAsync('dispatch_urgent', {
      name: '🚨 Urgent Dispatch Offers',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#FFBF00',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      sound: 'default',
    });

    // 2. High priority channel for active trip milestones (OTP, arrival, payment)
    await Notifications.setNotificationChannelAsync('trip_updates', {
      name: 'Trip & Payment Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066FF',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
  }
}

/**
 * Request notification permissions from OS.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    await setupLockScreenNotificationChannels();
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Failed to get notification permissions', e);
    return false;
  }
}

/**
 * Display an immediate outer-app notification on the lock screen / status bar.
 */
export async function presentOuterAppAlert(params: {
  title: string;
  body: string;
  channelId?: 'dispatch_urgent' | 'trip_updates';
  data?: Record<string, unknown>;
}): Promise<string> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' ? { channelId: params.channelId ?? 'dispatch_urgent' } : {}),
        data: params.data ?? {},
      },
      trigger: null, // triggers immediately
    });
  } catch (err) {
    console.warn('Could not schedule local notification', err);
    return '';
  }
}

/**
 * High-priority outer-app lockscreen alert when a new job offer arrives.
 */
export async function alertNewDispatchOffer(job?: {
  serviceType?: string;
  estimatedFare?: number;
  pickupAddress?: string;
  bookingNumber?: string;
}): Promise<void> {
  const fareStr = job?.estimatedFare ? ` · ₹${job.estimatedFare}` : '';
  const pickup = job?.pickupAddress ? ` · ${job.pickupAddress}` : '';
  await presentOuterAppAlert({
    title: '🚨 New Dispatch Offer Nearby!',
    body: `${job?.serviceType ?? 'Flatbed Towing'}${fareStr}${pickup} — Tap to review and accept`,
    channelId: 'dispatch_urgent',
    data: { type: 'JOB_OFFER', bookingNumber: job?.bookingNumber },
  });
}

/**
 * High-priority outer-app alert when customer confirms payment at dropoff.
 */
export async function alertCustomerPaymentConfirmed(fare?: number): Promise<void> {
  const amountStr = fare ? ` of ₹${fare}` : '';
  await presentOuterAppAlert({
    title: '💰 Payment Confirmed by Customer!',
    body: `Customer confirmed payment${amountStr}. Collect the 4-digit completion code to finish the service.`,
    channelId: 'trip_updates',
    data: { type: 'PAYMENT_CONFIRMED' },
  });
}

/**
 * High-priority outer-app alert when trip start OTP is ready.
 */
export async function alertTripOtpReady(customerName?: string): Promise<void> {
  await presentOuterAppAlert({
    title: '🔑 Pickup Reached — Verify OTP',
    body: `Ask ${customerName ?? 'customer'} for the 4-digit trip start OTP before loading vehicle.`,
    channelId: 'trip_updates',
    data: { type: 'TRIP_OTP' },
  });
}
