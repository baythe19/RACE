import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '../services/api';
import {
  completeAdvancePayment,
  createDriverBooking,
  createTowingBooking,
} from '../services/bookings/serviceBookingApi';
import { alertBookingConfirmed, requestCustomerNotificationPermissions } from '../services/notificationService';
import { profileKeys } from '../services/profile/useProfileQueries';
import {
  isPreviewBookingMode,
  previewAdvancePayment,
  previewDriverBooking,
  previewTowingBooking,
} from '../services/bookings/previewBooking';
import { getAppDialog } from '../utils/alertBus';
import type {
  CreateDriverBookingRequest,
  CreateTowingBookingRequest,
  ServiceBooking,
  ServiceBookingType,
} from '../types/serviceBooking';

interface ConfirmResult {
  booking: ServiceBooking;
}

export function useServiceBookingPayment() {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmingRef = useRef(false);
  const refreshBookings = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    [queryClient],
  );

  const beginConfirm = () => {
    if (confirmingRef.current) return false;
    confirmingRef.current = true;
    setIsConfirming(true);
    setError(null);
    return true;
  };

  const endConfirm = () => {
    confirmingRef.current = false;
    setIsConfirming(false);
  };

  const confirmTowing = useCallback(async (payload: CreateTowingBookingRequest) => {
    if (!beginConfirm()) return undefined;
    try {
      // BUG-C1: wizard vehicles are local preview ids the real backend
      // rejects; in preview mode the whole confirm is demoed locally.
      if (__DEV__ && isPreviewBookingMode()) {
        const booking = previewTowingBooking(payload);
        previewAdvancePayment(booking.id, 'towing');
        await refreshBookings();
        return { booking } satisfies ConfirmResult;
      }
      const booking = await createTowingBooking(payload);
      await requestCustomerNotificationPermissions();
      await completeAdvancePayment(booking.id, 'towing');
      await alertBookingConfirmed(booking.bookingNumber);
      await refreshBookings();
      void queryClient.invalidateQueries({ queryKey: profileKeys.notifications });
      return { booking } satisfies ConfirmResult;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to confirm towing booking');
      setError(message);
      getAppDialog().showDialog({ tone: 'error', title: 'Booking failed', message, primaryLabel: 'OK' });
      throw err;
    } finally {
      endConfirm();
    }
  }, [queryClient, refreshBookings]);

  const confirmDriver = useCallback(async (payload: CreateDriverBookingRequest) => {
    if (!beginConfirm()) return undefined;
    try {
      if (__DEV__ && isPreviewBookingMode()) {
        const booking = previewDriverBooking(payload);
        previewAdvancePayment(booking.id, 'driver');
        await refreshBookings();
        return { booking } satisfies ConfirmResult;
      }
      const booking = await createDriverBooking(payload);
      await requestCustomerNotificationPermissions();
      await completeAdvancePayment(booking.id, 'driver');
      await alertBookingConfirmed(booking.bookingNumber);
      await refreshBookings();
      void queryClient.invalidateQueries({ queryKey: profileKeys.notifications });
      return { booking } satisfies ConfirmResult;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to confirm driver booking');
      setError(message);
      getAppDialog().showDialog({ tone: 'error', title: 'Booking failed', message, primaryLabel: 'OK' });
      throw err;
    } finally {
      endConfirm();
    }
  }, [queryClient, refreshBookings]);

  const confirmExistingBooking = useCallback(
    async (bookingId: string, bookingType: ServiceBookingType) => {
      if (!beginConfirm()) return;
      try {
        if (__DEV__ && isPreviewBookingMode()) {
          previewAdvancePayment(bookingId, bookingType);
          await refreshBookings();
          return;
        }
        await requestCustomerNotificationPermissions();
        await completeAdvancePayment(bookingId, bookingType);
        await alertBookingConfirmed();
        await refreshBookings();
        void queryClient.invalidateQueries({ queryKey: profileKeys.notifications });
      } catch (err) {
        const message = getApiErrorMessage(err, 'Unable to record advance payment');
        setError(message);
        getAppDialog().showDialog({ tone: 'error', title: 'Payment failed', message, primaryLabel: 'OK' });
        throw err;
      } finally {
        endConfirm();
      }
    },
    [queryClient, refreshBookings],
  );

  return { confirmTowing, confirmDriver, confirmExistingBooking, isConfirming, error };
}
