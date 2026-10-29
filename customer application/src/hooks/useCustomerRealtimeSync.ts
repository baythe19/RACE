import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useAppSelector } from '../redux/hooks';
import {
  connectSocket,
  disconnectSocket,
  onNotificationNew,
} from '../services/socketService';
import { profileKeys } from '../services/profile/useProfileQueries';
import { requestCustomerNotificationPermissions } from '../services/notificationService';

/**
 * Keeps the customer notification inbox and booking queries fresh while logged in.
 * Trip milestone OS alerts still come from trackingService on booking:status.
 */
export function useCustomerRealtimeSync(enabled: boolean) {
  const queryClient = useQueryClient();
  const userId = useAppSelector(state => state.auth.user?.id);

  useEffect(() => {
    if (!enabled || !userId) {
      disconnectSocket();
      return undefined;
    }

    void requestCustomerNotificationPermissions();
    connectSocket();

    const refreshInbox = () => {
      void queryClient.invalidateQueries({
        queryKey: profileKeys.notifications,
        refetchType: 'active',
      });
    };

    const unsubNotification = onNotificationNew(refreshInbox);

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshInbox();
        void queryClient.invalidateQueries({ queryKey: ['bookings'], refetchType: 'active' });
      }
    });

    refreshInbox();

    return () => {
      unsubNotification();
      subscription.remove();
      disconnectSocket();
    };
  }, [enabled, queryClient, userId]);
}
