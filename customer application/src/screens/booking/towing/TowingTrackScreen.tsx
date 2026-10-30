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
  formatLiveTrackingSummary,
  getCustomerBookingPresentation,
  isCompletedUnifiedStatus,
  isOngoingUnifiedStatus,
} from '../../../utils/bookingDisplay';
import {
  trackEtaForStage,
  trackLocationHint,
  trackPartnerDisplayName,
} from '../../../utils/bookingFlowCopy';
import { formatLocationCard, formatLocationDisplay } from '../../../utils/readableAddress';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList & BookingsStackParamList, 'TowingTrack'>;

const TRACK_STEPS = ['Placed', 'En route', 'Pickup', 'Drop-off'];

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

export default function TowingTrackScreen({ navigation, route }: Props) {
  const bookingId = route.params?.bookingId;
  const fromBookings = route.params?.fromBookings;
  const booking = useBookingQuery(bookingId ?? '', 'towing');
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
  } = useBookingTracking(bookingId, 'towing');

  const status = mergeLiveStatus(trackedStatus, booking?.unifiedStatus);
  const tripOtp = booking?.tripStartOtp ?? trackedOtp;
  const kind = booking ? getCustomerBookingPresentation(booking).kind : 'towing';
  const partnerPending = !driverName && !booking?.driver;
  const displayDriverName = trackPartnerDisplayName(
    kind,
    status,
    partnerPending,
    driverName ?? booking?.driver?.name,
  );
  const phone = driverPhone ?? booking?.driver?.phone;
  const fleetVehicleLabel = booking?.assignedFleetVehicleLabel;
  const activeStep = useMemo(() => stepIndexForStatus(status), [status]);
  const isCompleted = isCompletedUnifiedStatus(status);
  const isLive = isOngoingUnifiedStatus(status);

  const etaForStage = trackEtaForStage(kind, status, etaMinutes);
  const trackingUi = formatLiveTrackingSummary({
    kind,
    status,
    partnerPending,
    etaDisplay: etaForStage,
  });
  const pickupCard = formatLocationCard(booking?.pickup);
  const dropCard = booking?.dropoff ? formatLocationCard(booking.dropoff) : null;
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
    ? { bookingId, bookingType: 'towing' as const, fromBookings }
    : undefined;

  const handleContinue = () => {
    if (fromBookings) {
      goBackWithinStack(navigation);
      return;
    }
    if (isCompleted && bookingId) {
      navigation.navigate('TowingRate', { bookingId, bookingType: 'towing' });
      return;
    }
    if (trackParams) {
      navigation.navigate('TowingDriverOnWay', trackParams);
    }
  };

  const mockDriverPoint =
    !driverLocation &&
    isCustomerMockDataEnabled() &&
    (status === 'DRIVER_EN_ROUTE' ||
      status === 'DRIVER_ARRIVED' ||
      status === 'IN_PROGRESS') &&
    booking?.pickup?.latitude != null &&
    booking?.pickup?.longitude != null
      ? {
          latitude: booking.pickup.latitude + 0.008,
          longitude: booking.pickup.longitude - 0.006,
          label: displayDriverName,
        }
      : null;

  const locationHint = trackLocationHint(
    kind,
    status,
    Boolean(driverLocation),
    Boolean(mockDriverPoint),
  );

  return (
    <LiveTrackingContent
      bookingNumberLabel={
        booking ? formatBookingDisplayId(booking.bookingNumber) : 'Towing trip'
      }
      statusLabel={trackingUi.chipLabel}
      statusCode={status}
      isLive={isLive}
      steps={TRACK_STEPS}
      activeStep={activeStep}
      etaLabel={trackingUi.cardValue}
      summaryLabel={trackingUi.cardLabel}
      summaryChipLabel={trackingUi.chipLabel}
      serviceLabel="Towing"
      pickupLabel={
        dropCard
          ? `${pickupCard.primary}${pickupCard.secondary ? ` · ${pickupCard.secondary}` : ''}`
          : formatLocationDisplay(booking?.pickup) || 'Pickup'
      }
      dropLabel={
        dropCard
          ? `${dropCard.primary}${dropCard.secondary ? ` · ${dropCard.secondary}` : ''}`
          : undefined
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
            bookingType="towing"
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
