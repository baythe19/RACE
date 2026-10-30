import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { AppNotification, NotificationPreference } from '../../types/profile';
import { apiClient } from '../api/apiClient';

interface BackendNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, string>;
  createdAt: string;
}

interface BackendNotificationPrefs {
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  bookingUpdates: boolean;
  promotions: boolean;
  serviceLaunches: boolean;
}

interface NotificationsListResponse {
  notifications: BackendNotification[];
  unreadCount: number;
}

function mapNotificationType(type: string): AppNotification['category'] {
  if (type.includes('BOOKING')) return 'booking';
  if (type.includes('PAYMENT')) return 'payment';
  if (type.includes('PROMOTION') || type.includes('OFFER')) return 'offers';
  if (type.includes('SUBSCRIPTION')) return 'subscription';
  return 'general';
}

export function mapBackendPrefsToMobile(prefs: BackendNotificationPrefs): NotificationPreference[] {
  return [
    {
      id: 'booking_updates',
      title: 'Booking Updates',
      description: 'Status changes, driver assigned, and arrival alerts',
      enabled: prefs.bookingUpdates,
      category: 'booking',
    },
    {
      id: 'offers',
      title: 'Offers & Promotions',
      description: 'Discounts and seasonal deals',
      enabled: prefs.promotions,
      category: 'offers',
    },
    {
      id: 'subscription',
      title: 'Subscription Alerts',
      description: 'Renewal reminders and plan benefits',
      enabled: prefs.serviceLaunches,
      category: 'subscription',
    },
    {
      id: 'push',
      title: 'Push Notifications',
      description: 'Receive alerts on your device',
      enabled: prefs.pushEnabled,
      category: 'general',
    },
  ];
}

export function mapMobilePrefToBackend(
  prefId: string,
  enabled: boolean,
): Partial<BackendNotificationPrefs> {
  switch (prefId) {
    case 'booking_updates':
      return { bookingUpdates: enabled };
    case 'offers':
      return { promotions: enabled };
    case 'subscription':
      return { serviceLaunches: enabled };
    case 'push':
      return { pushEnabled: enabled };
    default:
      return {};
  }
}

export async function listNotifications(): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  const { data } = await apiClient.get<ApiSuccessResponse<NotificationsListResponse>>(
    API_ENDPOINTS.notifications,
  );
  return {
    unreadCount: data.data.unreadCount,
    notifications: data.data.notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.message,
      category: mapNotificationType(n.type),
      read: n.isRead,
      createdAt: n.createdAt,
      metadata: n.metadata,
    })),
  };
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch(`${API_ENDPOINTS.notifications}/read-all`);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`${API_ENDPOINTS.notifications}/${id}/read`);
}

/** Permanently deletes every notification for the signed-in customer. */
export async function deleteAllNotifications(): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.notifications);
}

/** Permanently deletes one notification for the signed-in customer. */
export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`${API_ENDPOINTS.notifications}/${id}`);
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<BackendNotificationPrefs>>(
    `${API_ENDPOINTS.notifications}/preferences`,
  );
  return mapBackendPrefsToMobile(data.data);
}

export async function updateNotificationPreferences(
  patch: Partial<BackendNotificationPrefs>,
): Promise<NotificationPreference[]> {
  const { data } = await apiClient.patch<ApiSuccessResponse<BackendNotificationPrefs>>(
    `${API_ENDPOINTS.notifications}/preferences`,
    patch,
  );
  return mapBackendPrefsToMobile(data.data);
}
