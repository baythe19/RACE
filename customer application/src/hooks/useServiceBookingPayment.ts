import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { getApiErrorMessage } from '../services/api';
import {
  completeAdvancePayment,
  createDriverBooking,
  createTowingBooking,
} from '../services/bookings/serviceBookingApi';
import {
  isPreviewBookingMode,
  previewAdvancePayment,
  previewDriverBooking,
  previewTowingBooking,
} from '../services/bookings/previewBooking';
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
  const refreshBookings = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    [queryClient],
  );

  const confirmTowing = useCallback(async (payload: CreateTowingBookingRequest) => {
    setIsConfirming(true);
    setError(null);
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
      await completeAdvancePayment(booking.id, 'towing');
      await refreshBookings();
      return { booking } satisfies ConfirmResult;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to confirm towing booking');
      setError(message);
      Alert.alert('Booking failed', message);
      throw err;
    } finally {
      setIsConfirming(false);
    }
  }, [refreshBookings]);

  const confirmDriver = useCallback(async (payload: CreateDriverBookingRequest) => {
    setIsConfirming(true);
    setError(null);
    try {
      if (__DEV__ && isPreviewBookingMode()) {
        const booking = previewDriverBooking(payload);
        previewAdvancePayment(booking.id, 'driver');
        await refreshBookings();
        return { booking } satisfies ConfirmResult;
      }
      const booking = await createDriverBooking(payload);
      await completeAdvancePayment(booking.id, 'driver');
      await refreshBookings();
      return { booking } satisfies ConfirmResult;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to confirm driver booking');
      setError(message);
      Alert.alert('Booking failed', message);
      throw err;
    } finally {
      setIsConfirming(false);
    }
  }, [refreshBookings]);

  const confirmExistingBooking = useCallback(
    async (bookingId: string, bookingType: ServiceBookingType) => {
      setIsConfirming(true);
      setError(null);
      try {
        if (__DEV__ && isPreviewBookingMode()) {
          previewAdvancePayment(bookingId, bookingType);
          await refreshBookings();
          return;
        }
        await completeAdvancePayment(bookingId, bookingType);
        await refreshBookings();
      } catch (err) {
        const message = getApiErrorMessage(err, 'Unable to record advance payment');
        setError(message);
        Alert.alert('Payment failed', message);
        throw err;
      } finally {
        setIsConfirming(false);
      }
    },
    [refreshBookings],
  );

  return { confirmTowing, confirmDriver, confirmExistingBooking, isConfirming, error };
}
