import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import DropoffPaymentModal from './DropoffPaymentModal';
import { bookingKeys, useBookingsQuery } from '../../services/bookings/useBookingQueries';
import { dropoffPromptClaimed } from '../../services/dropoffPromptGate';
import { alertDriverArrivedDropoff } from '../../services/notificationService';
import { connectSocket, onDriverArrivedDropoff } from '../../services/socketService';
import type { Booking } from '../../types/booking';

function needsDropoffSheet(booking: Booking): boolean {
  const status = String(booking.unifiedStatus ?? booking.status ?? '').toUpperCase();
  if (
    status === 'COMPLETED' ||
    status === 'RATED' ||
    status === 'CANCELLED' ||
    status === 'SERVICE_COMPLETED' ||
    status === 'PAID'
  ) {
    return false;
  }
  return Boolean(booking.arrivedAtDropoffAt);
}

/**
 * When the driver confirms the drop, this sheet opens on whatever customer
 * screen is open. If the live track screen is already showing it, this stays quiet.
 */
export default function CustomerDropoffPrompt() {
  const queryClient = useQueryClient();
  const { data: bookings = [], refetch } = useBookingsQuery();
  const [trackOwnsPrompt, setTrackOwnsPrompt] = useState(dropoffPromptClaimed);
  const notified = useRef(new Set<string>());

  const due = useMemo(
    () => bookings.find(needsDropoffSheet),
    [bookings],
  );

  useEffect(() => {
    connectSocket();
    return onDriverArrivedDropoff(() => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      void refetch();
    });
  }, [queryClient, refetch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        setTrackOwnsPrompt(dropoffPromptClaimed());
        void refetch();
      }
    });
    const timer = setInterval(() => setTrackOwnsPrompt(dropoffPromptClaimed()), 500);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [refetch]);

  useEffect(() => {
    if (!due?.id || notified.current.has(due.id)) return;
    notified.current.add(due.id);
    const fare =
      due.fareBreakdown && 'totalFare' in due.fareBreakdown
        ? (due.fareBreakdown as { totalFare?: number }).totalFare
        : due.estimatedFare;
    void alertDriverArrivedDropoff(fare);
  }, [due]);

  if (!due || trackOwnsPrompt) return null;

  const fare =
    due.fareBreakdown && 'totalFare' in due.fareBreakdown
      ? (due.fareBreakdown as { totalFare?: number }).totalFare
      : due.estimatedFare;

  return (
    <DropoffPaymentModal
      visible
      bookingId={due.id}
      bookingType={due.bookingType === 'driver' ? 'driver' : 'towing'}
      fare={fare ?? 0}
      completionOtp={due.completionOtp}
      paymentCollectionMode={due.paymentCollectionMode}
      paymentConfirmedByCustomer={due.paymentConfirmedByCustomer}
      driverUpiId={due.driverUpiId}
      driverName={due.driver?.name}
      onSuccess={() => {
        void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
        void refetch();
      }}
    />
  );
}
