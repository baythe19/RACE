import type { AdminNotification, PaginatedResponse } from '@race/types';

import { apiDelete, apiGet, apiPatch, apiPost } from '../http';

const CATEGORY_TO_TYPE: Record<string, AdminNotification['type']> = {
  vendor: 'VENDOR',
  driver: 'VENDOR',
  booking: 'BOOKING',
  payment: 'PAYMENT',
  customer: 'SYSTEM',
  system: 'SYSTEM',
  subscription: 'SYSTEM',
};

export async function getNotifications(filters: { page?: number; pageSize?: number } = {}) {
  const result = await apiGet<PaginatedResponse<{
    id: string;
    title: string;
    message?: string;
    type: string;
    category: string;
    isRead: boolean;
    createdAt: string;
  }>>('/notifications', filters as Record<string, unknown>);

  return {
    ...result,
    items: result.items.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message ?? '',
      type: CATEGORY_TO_TYPE[n.category] ?? 'SYSTEM',
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
  };
}

export async function markNotificationRead(id: string) {
  await apiPatch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await apiPost('/notifications/read-all');
}

export async function getUnreadNotificationCount(): Promise<number> {
  const result = await apiGet<{ count: number }>('/notifications/unread-count');
  return result.count;
}

export async function deleteNotification(id: string) {
  await apiDelete(`/notifications/${id}`);
}
