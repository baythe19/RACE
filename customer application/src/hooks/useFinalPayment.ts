import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '../services/api';
import { completeFinalPayment } from '../services/bookings/serviceBookingApi';
import { getAppDialog } from '../utils/alertBus';
import type { ServiceBookingType } from '../types/serviceBooking';

export function useFinalPayment() {
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = useState(false);

  const payRemaining = useCallback(async (bookingId: string, bookingType: ServiceBookingType) => {
    setIsPaying(true);
    try {
      await completeFinalPayment(bookingId, bookingType);
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      return true;
    } catch (err) {
      getAppDialog().showDialog({
        tone: 'error',
        title: 'Payment failed',
        message: getApiErrorMessage(err, 'Unable to process final payment'),
        primaryLabel: 'OK',
      });
      return false;
    } finally {
      setIsPaying(false);
    }
  }, [queryClient]);

  return { payRemaining, isPaying };
}
