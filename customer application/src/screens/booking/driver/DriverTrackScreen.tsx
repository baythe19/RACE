import React, { useEffect, useMemo } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DropoffPaymentModal from '../../../components/booking/DropoffPaymentModal';
import LiveTrackingContent, {
  mergeLiveStatus,
} from '../../../components/booking/LiveTrackingContent';
import { useBookingTracking } from '../../../hooks/useBookingTracking';
import { isCustomerMockDataEnabled } from '../../../config/customerQa';
import { claimDropoffPrompt } from '../../../services/dropoffPromptGate';
import { useBookingQuery } from '../../../services/bookings/useBookingQueries';
import type { BookingsStackParamList, HomeStackParamList } from '../../../types/navigation';
import {
  formatBookingDisplayId,
  formatUnifiedStatusLabel,
  isCompletedUnifiedStatus,
  isOngoingUnifiedStatus,
} from '../../../utils/bookingDisplay';
import { formatLocationDisplay } from '../../../utils/readableAddress';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList & BookingsStackParamList, 'DriverTrack'>;

const TRACK_STEPS = ['Assigned', 'On the Way', 'Arrived', 'Completed'];

function stepIndexForStatus(status: string): number {
  switch (status) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'DRIVER_ASSIGNED':
      return 0;
    case 'DRIVER_EN_ROUTE':
      return 1;
    case 'DRIVER_ARRIVED':
    case 'IN_PROGRESS':
      return 2;
    case 'COMPLETED':
    case 'RATED':
      return 3;
    default:
      return 0;
  }
}

export default function DriverTrackScreen({ navigation, route }: Props) {
  const bookingId = route.params?.bookingId;
  const fromBookings = route.params?.fromBookings;
  const booking = useBookingQuery(bookingId ?? '', 'driver');
  const {
    etaLabel,
    etaMinutes,
    status: trackedStatus,
    driverLocation,
    driverName,
    driverPhone,
    tripStartOtp: trackedOtp,
    arrivedAtDropoffAt,
    completionOtp,
    paymentCollectionMode,
    paymentConfirmedByCustomer,
    fare: trackedFare,
    driverUpiId,
  } = useBookingTracking(bookingId, 'driver');

  const status = mergeLiveStatus(trackedStatus, booking?.unifiedStatus);
  const tripOtp = booking?.tripStartOtp ?? trackedOtp;
  const displayDriverName = driverName ?? booking?.driver?.name ?? 'Assigning driver';
  const phone = driverPhone ?? booking?.driver?.phone;
  const fleetVehicleLabel = booking?.assignedFleetVehicleLabel;
  const activeStep = useMemo(() => stepIndexForStatus(status), [status]);
  const isCompleted = isCompletedUnifiedStatus(status);
  const isLive = isOngoingUnifiedStatus(status);

  const resolvedEta =
    etaMinutes != null
      ? `${etaMinutes} min`
      : booking?.etaMinutes != null
        ? `${booking.etaMinutes} min`
        : etaLabel;

  const resolvedFare =
    trackedFare ??
    (booking?.fareBreakdown && 'totalFare' in booking.fareBreakdown
      ? (booking.fareBreakdown as { totalFare?: number }).totalFare
      : booking?.estimatedFare) ??
    0;

  const isArrivedDropoff = Boolean(
    arrivedAtDropoffAt || (booking as { arrivedAtDropoffAt?: string } | null)?.arrivedAtDropoffAt,
  );
  const showDropoffPayment = isArrivedDropoff && !isCompleted;

  useEffect(() => claimDropoffPrompt(), []);

  const trackParams = bookingId
    ? { bookingId, bookingType: 'driver' as const, fromBookings }
    : undefined;

  const handleContinue = () => {
    if (fromBookings) {
      goBackWithinStack(navigation);
      return;
    }
    if (isCompleted && bookingId) {
      navigation.navigate('TowingRate', { bookingId, bookingType: 'driver' });
      return;
    }
    if (trackParams) {
      navigation.navigate('DriverOnWay', trackParams);
    }
  };

  const mockDriverPoint =
    !driverLocation &&
    isCustomerMockDataEnabled() &&
    booking?.pickup?.latitude != null &&
    booking?.pickup?.longitude != null
      ? {
          latitude: booking.pickup.latitude + 0.008,
          longitude: booking.pickup.longitude - 0.006,
          label: displayDriverName,
        }
      : null;

  const locationHint = driverLocation
    ? 'Partner location updating live'
    : mockDriverPoint
      ? 'Preview mode · sample partner position on map'
      : status === 'DRIVER_ASSIGNED' || status === 'CONFIRMED'
        ? 'Driver allotted · waiting to start'
        : status === 'PENDING'
          ? 'Finding a partner near you'
          : null;

  return (
    <LiveTrackingContent
      bookingNumberLabel={
        booking ? formatBookingDisplayId(booking.bookingNumber) : 'Driver trip'
      }
      statusLabel={formatUnifiedStatusLabel(status)}
      statusCode={status}
      isLive={isLive}
      steps={TRACK_STEPS}
      activeStep={activeStep}
      etaLabel={resolvedEta}
      serviceLabel="Driver hire"
      pickupLabel={formatLocationDisplay(booking?.pickup) || 'Pickup'}
      dropLabel={
        booking?.dropoff ? formatLocationDisplay(booking.dropoff) : undefined
      }
      driverName={displayDriverName}
      driverPhone={phone}
      fleetVehicleLabel={fleetVehicleLabel}
      locationHint={locationHint}
      tripOtp={tripOtp}
      loading={Boolean(bookingId && !booking)}
      pickup={
        booking?.pickup?.latitude != null && booking?.pickup?.longitude != null
          ? {
              latitude: booking.pickup.latitude,
              longitude: booking.pickup.longitude,
              label: formatLocationDisplay(booking.pickup),
            }
          : null
      }
      dropoff={
        booking?.dropoff?.latitude != null && booking?.dropoff?.longitude != null
          ? {
              latitude: booking.dropoff.latitude,
              longitude: booking.dropoff.longitude,
              label: formatLocationDisplay(booking.dropoff),
            }
          : null
      }
      driver={
        driverLocation
          ? {
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
              label: displayDriverName,
            }
          : mockDriverPoint
      }
      primaryLabel={
        fromBookings ? 'Back to Bookings' : isCompleted ? 'Rate Experience' : 'Continue'
      }
      onPrimary={handleContinue}
      onBack={() => goBackWithinStack(navigation)}
      footerExtra={
        bookingId ? (
          <DropoffPaymentModal
            visible={showDropoffPayment}
            bookingId={bookingId}
            bookingType="driver"
            fare={resolvedFare}
            completionOtp={
              completionOtp ??
              (booking as { completionOtp?: string } | null)?.completionOtp
            }
            paymentCollectionMode={
              paymentCollectionMode ??
              (booking as { paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE' } | null)
                ?.paymentCollectionMode
            }
            paymentConfirmedByCustomer={
              paymentConfirmedByCustomer ??
              (booking as { paymentConfirmedByCustomer?: boolean } | null)
                ?.paymentConfirmedByCustomer
            }
            driverUpiId={
              driverUpiId ?? (booking as { driverUpiId?: string } | null)?.driverUpiId
            }
            driverName={driverName ?? booking?.driver?.name}
          />
        ) : null
      }
    />
  );
}
