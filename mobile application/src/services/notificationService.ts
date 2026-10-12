import { api, unwrapApi } from './api';
import { API_ENDPOINTS } from '../config/api';
import { UI_PREVIEW_MODE } from '../constants/preview';

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

let mockNotificationsState: PartnerNotificationItem[] = [
  {
    id: 'notif-001',
    type: 'JOB_OFFER',
    title: 'New job request',
    message: '#TOW-10052 • 6.2 km away\nStation Square, Bhubaneswar',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    metadata: { bookingId: 'RACE-TOW-MOCK-004', bookingType: 'towing', bookingNumber: 'TOW-10052' },
  },
  {
    id: 'notif-002',
    type: 'BOOKING_UPDATE',
    title: 'Job accepted',
    message: 'You have accepted #TOW-10051',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    metadata: { bookingId: 'RACE-TOW-MOCK-001', bookingType: 'towing' },
  },
  {
    id: 'notif-003',
    type: 'BOOKING_UPDATE',
    title: 'Customer OTP',
    message: 'Trip #TOW-10051 • OTP: 4829',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    metadata: { bookingId: 'RACE-TOW-MOCK-001', otp: '4829' },
  },
  {
    id: 'notif-004',
    type: 'PAYMENT',
    title: 'Trip completed',
    message: 'You earned ₹1,650',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    metadata: { fare: '1650' },
  },
  {
    id: 'notif-005',
    type: 'ACCOUNT',
    title: 'Verification approved',
    message: 'Your document has been verified',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * 1.1).toISOString(),
  },
  {
    id: 'notif-006',
    type: 'PAYMENT',
    title: 'Payout initiated',
    message: '₹3,200 has been processed',
    isRead: false,
    createdAt: new Date(Date.now() - 86400000 * 1.3).toISOString(),
  },
  {
    id: 'notif-007',
    type: 'ACCOUNT',
    title: 'Document rejected',
    message: 'Please re-upload RC document',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * 1.6).toISOString(),
  },
];

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
      const unreadCount = mockNotificationsState.filter(n => !n.isRead).length;
      return { notifications: [...mockNotificationsState], unreadCount };
    }
    throw error;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await unwrapApi(api.patch(`${API_ENDPOINTS.notifications}/${id}/read`));
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      mockNotificationsState = mockNotificationsState.map(n =>
        n.id === id ? { ...n, isRead: true } : n,
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
    if (UI_PREVIEW_MODE) {
      mockNotificationsState = mockNotificationsState.map(n => ({ ...n, isRead: true }));
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
    if (UI_PREVIEW_MODE) {
      mockNotificationPrefs = { ...mockNotificationPrefs, ...prefs };
      return { ...mockNotificationPrefs };
    }
    throw error;
  }
}
