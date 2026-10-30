import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  getNotifications,
  deleteAllNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
  type NotificationPreferences,
} from './notificationService';

export const notificationQueryKeys = {
  list: ['partner', 'notifications'] as const,
  preferences: ['partner', 'notification-preferences'] as const,
};

export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: notificationQueryKeys.list,
    queryFn: getNotifications,
    enabled,
    refetchInterval: query => query.state.status === 'error' ? 30_000 : 10_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}

export function useNotificationPreferencesQuery(enabled = true) {
  return useQuery({
    queryKey: notificationQueryKeys.preferences,
    queryFn: getNotificationPreferences,
    enabled,
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list });
    },
  });
}

export function useDeleteAllNotificationsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list });
    },
  });
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list });
    },
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list });
    },
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Partial<NotificationPreferences>) =>
      updateNotificationPreferences(prefs),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.preferences });
    },
  });
}
