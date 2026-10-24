import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import { API_BASE_URL, TOKEN_KEYS } from '../../config/env';
import { notificationQueryKeys } from '../useNotificationQueries';
import { driverQueryKeys } from './useDriverQueries';
import { vendorMembershipKeys } from '../vendor/useVendorMembershipQueries';

/** Authenticated driver-room sync; short polling remains the recovery fallback. */
export function useDriverRealtimeSync(enabled: boolean, driverId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !driverId) return undefined;

    let disposed = false;
    let socket: ReturnType<typeof io> | undefined;
    let appState = AppState.currentState;

    const refreshDriverData = () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: driverQueryKeys.jobs, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: driverQueryKeys.offers, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: driverQueryKeys.active, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list, refetchType: 'active' }),
        // P1 (v6 audit): My Vendor membership + invitation state refreshes live.
        queryClient.invalidateQueries({
          queryKey: vendorMembershipKeys.driver,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: vendorMembershipKeys.invitations,
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
      socket.on('connect', () => {
        socket?.emit('driver:join', { driverId });
        // Recover changes that happened while the app was backgrounded or reconnecting.
        refreshDriverData();
      });
      // The private OTP event refreshes booking state without copying the OTP
      // into an extra cache.
      socket.on('trip:otp', refreshDriverData);
      // These events contain only invalidation signals. Private data is fetched again
      // from authenticated REST endpoints.
      socket.on('job:offer', refreshDriverData);
      socket.on('driver:jobs-updated', refreshDriverData);
      socket.on('notification:new', refreshDriverData);
      socket.on('booking:status', refreshDriverData);
      socket.on('booking:payment_confirmed', refreshDriverData);
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
  }, [driverId, enabled, queryClient]);
}
