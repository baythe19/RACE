import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import { API_BASE_URL, TOKEN_KEYS } from '../../config/env';
import { notificationQueryKeys } from '../useNotificationQueries';
import { vendorBookingQueryKeys } from './useVendorBookingsQueries';
import { vendorMembershipKeys } from './useVendorMembershipQueries';

/** Refresh vendor data on authenticated socket signals; polling remains the recovery path. */
export function useVendorRealtimeSync(enabled: boolean, vendorId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !vendorId) return undefined;

    let disposed = false;
    let socket: ReturnType<typeof io> | undefined;
    let appState = AppState.currentState;

    const refreshVendorData = () => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: vendorBookingQueryKeys.offers,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: vendorBookingQueryKeys.bookings,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: vendorBookingQueryKeys.drivers,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: vendorBookingQueryKeys.vehicles,
          refetchType: 'active',
        }),
        // P1 (v6 audit): membership/invitation state must refresh on live
        // signals too, not only on its 20s poll.
        queryClient.invalidateQueries({
          queryKey: vendorMembershipKeys.vendor,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: vendorMembershipKeys.invitations,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: notificationQueryKeys.list,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: ['vendor', 'dashboard'],
          refetchType: 'active',
        }),
      ]);
    };

    const connect = async () => {
      if (disposed || appState !== 'active' || socket) return;
      const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
      if (disposed || !token || token.startsWith('mock-')) return;

      socket = io(API_BASE_URL, {
        auth: callback => {
          void SecureStore.getItemAsync(TOKEN_KEYS.ACCESS).then(currentToken => {
            callback({ token: currentToken ?? '' });
          });
        },
        autoConnect: false,
        reconnection: true,
        timeout: 10_000,
      });
      socket.on('connect', refreshVendorData);
      socket.on('vendor:jobs-updated', refreshVendorData);
      socket.on('notification:new', refreshVendorData);
      socket.connect();
    };

    void connect();
    const subscription = AppState.addEventListener('change', next => {
      appState = next;
      if (next === 'active') {
        if (socket) socket.connect();
        else void connect();
      } else {
        socket?.disconnect();
      }
    });

    return () => {
      disposed = true;
      subscription.remove();
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [queryClient, vendorId, enabled]);
}
