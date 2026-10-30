import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppDispatch } from '../../redux/hooks';
import { useAuthStore } from '../../store/authStore';
import {
  setNotifications,
  setNotificationPreferences,
  setPaymentMethods,
  setSavedLocations,
  setWalletBalance,
} from '../../redux/profile/profileSlice';
import type { NotificationPreference, PaymentMethod, SavedLocation } from '../../types/profile';
import {
  listSavedLocations,
  createSavedLocation,
  updateSavedLocation,
  deleteSavedLocation,
} from './locationApi';
import {
  listPaymentMethods,
  createPaymentMethod,
  deletePaymentMethod,
  getWalletBalance,
} from './paymentApi';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteAllNotifications,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  mapMobilePrefToBackend,
} from './notificationApi';

export const profileKeys = {
  locations: ['profile', 'locations'] as const,
  payments: ['profile', 'payments'] as const,
  wallet: ['profile', 'wallet'] as const,
  notifications: ['profile', 'notifications'] as const,
  notificationPrefs: ['profile', 'notification-prefs'] as const,
};

export function useSavedLocationsQuery() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return useQuery({
    queryKey: profileKeys.locations,
    queryFn: async () => {
      const locations = await listSavedLocations();
      dispatch(setSavedLocations(locations));
      return locations;
    },
    enabled: isAuthenticated,
  });
}

export function useCreateLocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<SavedLocation, 'id'>) => createSavedLocation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.locations });
    },
  });
}

export function useUpdateLocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; payload: Partial<Omit<SavedLocation, 'id'>> }) =>
      updateSavedLocation(params.id, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.locations });
    },
  });
}

export function useDeleteLocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.locations });
    },
  });
}

export function usePaymentMethodsQuery() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return useQuery({
    queryKey: profileKeys.payments,
    queryFn: async () => {
      const methods = await listPaymentMethods();
      dispatch(setPaymentMethods(methods));
      return methods;
    },
    enabled: isAuthenticated,
  });
}

export function useWalletQuery() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return useQuery({
    queryKey: profileKeys.wallet,
    queryFn: async () => {
      const wallet = await getWalletBalance();
      dispatch(setWalletBalance(wallet));
      return wallet;
    },
    enabled: isAuthenticated,
  });
}

export function useCreatePaymentMethodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      type: PaymentMethod['type'];
      label: string;
      details: string;
      isDefault?: boolean;
    }) => createPaymentMethod(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.payments });
    },
  });
}

export function useDeletePaymentMethodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.payments });
    },
  });
}

export function useNotificationsQuery() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return useQuery({
    queryKey: profileKeys.notifications,
    queryFn: async () => {
      const result = await listNotifications();
      dispatch(setNotifications(result.notifications));
      return result;
    },
    enabled: isAuthenticated,
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.notifications });
    },
  });
}

export function useDeleteAllNotificationsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.notifications });
    },
  });
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.notifications });
    },
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.notifications });
    },
  });
}

export function useNotificationPrefsQuery() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return useQuery({
    queryKey: profileKeys.notificationPrefs,
    queryFn: async () => {
      const prefs = await getNotificationPreferences();
      dispatch(setNotificationPreferences(prefs));
      return prefs;
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateNotificationPrefMutation() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: async (params: { prefId: string; enabled: boolean }) => {
      const patch = mapMobilePrefToBackend(params.prefId, params.enabled);
      return updateNotificationPreferences(patch);
    },
    onSuccess: (prefs: NotificationPreference[]) => {
      dispatch(setNotificationPreferences(prefs));
      void queryClient.invalidateQueries({ queryKey: profileKeys.notificationPrefs });
    },
  });
}
