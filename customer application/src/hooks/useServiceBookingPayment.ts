import { useCallback, useState } from 'react';
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
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmTowing = useCallback(async (payload: CreateTowingBookingRequest) => {
    setIsConfirming(true);
    setError(null);
    try {
      // BUG-C1: wizard vehicles are local preview ids the real backend
      // rejects; in preview mode the whole confirm is demoed locally.
      if (__DEV__ && isPreviewBookingMode()) {
        const booking = previewTowingBooking(payload);
        previewAdvancePayment(booking.id, 'towing');
        return { booking } satisfies ConfirmResult;
      }
      if (!__DEV__) {
        throw new Error('Online booking payments are not configured yet.');
      }
      const booking = await createTowingBooking(payload);
      await completeAdvancePayment(booking.id, 'towing');
      return { booking } satisfies ConfirmResult;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to confirm towing booking');
      setError(message);
      Alert.alert('Booking failed', message);
      throw err;
    } finally {
      setIsConfirming(false);
    }
  }, []);

  const confirmDriver = useCallback(async (payload: CreateDriverBookingRequest) => {
    setIsConfirming(true);
    setError(null);
    try {
      if (__DEV__ && isPreviewBookingMode()) {
        const booking = previewDriverBooking(payload);
        previewAdvancePayment(booking.id, 'driver');
        return { booking } satisfies ConfirmResult;
      }
      if (!__DEV__) {
        throw new Error('Online booking payments are not configured yet.');
      }
      const booking = await createDriverBooking(payload);
      await completeAdvancePayment(booking.id, 'driver');
      return { booking } satisfies ConfirmResult;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to confirm driver booking');
      setError(message);
      Alert.alert('Booking failed', message);
      throw err;
    } finally {
      setIsConfirming(false);
    }
  }, []);

  const confirmExistingBooking = useCallback(
    async (bookingId: string, bookingType: ServiceBookingType) => {
      setIsConfirming(true);
      setError(null);
      try {
        if (__DEV__ && isPreviewBookingMode()) {
          previewAdvancePayment(bookingId, bookingType);
          return;
        }
        if (!__DEV__) {
          throw new Error('Online booking payments are not configured yet.');
        }
        await completeAdvancePayment(bookingId, bookingType);
      } catch (err) {
        const message = getApiErrorMessage(err, 'Unable to record advance payment');
        setError(message);
        Alert.alert('Payment failed', message);
        throw err;
      } finally {
        setIsConfirming(false);
      }
    },
    [],
  );

  return { confirmTowing, confirmDriver, confirmExistingBooking, isConfirming, error };
}
