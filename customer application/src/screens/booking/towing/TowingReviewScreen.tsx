import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { TowingFareBreakdownCard } from '../../../components/booking/FareBreakdownCard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import {
  towingServiceTimingLabel,
} from '../../../components/booking/TowingServiceModeBanner';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  getDateLabel,
  getShortLocation,
  getTimeLabel,
  getTowingTypeLabel,
  getVehicleLabel,
} from '../../../constants/towingBooking';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { useAppDialog } from '../../../hooks/useAppDialog';
import { useServiceBookingPayment } from '../../../hooks/useServiceBookingPayment';
import { estimateTowingFare } from '../../../services/bookings/fareApi';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import type { TowingFareBreakdown } from '../../../types/fare';
import type { TowingBookingState } from '../../../types/towingBooking';
import { buildTowingBookingRequest } from '../../../utils/serviceBookingPayload';
import { towingFareModeParams } from '../../../utils/towingFareEstimate';
import {
  getTowingWalkthroughFare,
  isTowingWalkthroughEnabled,
} from '../../../utils/towingBookingWalkthrough';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingReview'>;

const TOWING_ACCENT = '#F59E0B';

function formatBookingNumber(bookingNumber: string): string {
  return bookingNumber.startsWith('#') ? bookingNumber : `#${bookingNumber}`;
}

/** Status line on the confirmed screen — matches the same mode rules as the create payload. */
function confirmationStatusLine(booking: TowingBookingState): string {
  if (booking.serviceMode === 'scheduled') {
    return `${getDateLabel(booking.dateId)}, ${getTimeLabel(booking.timeId)}`;
  }
  if (booking.serviceMode === 'emergency') {
    return 'Priority dispatch';
  }
  return 'ETA 30–60 min';
}

function hasRouteCoords(booking: TowingBookingState): boolean {
  return (
    booking.pickupLat != null &&
    booking.pickupLng != null &&
    booking.dropLat != null &&
    booking.dropLng != null
  );
}

function SummaryRow({
  label,
  value,
  t,
  last,
}: {
  label: string;
  value: string;
  t: ReturnType<typeof useBookingTheme>['t'];
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: t.px(12),
        paddingVertical: t.px(8),
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}>
      <Text style={{ fontSize: t.caption, color: colors.grey, flexShrink: 0 }}>{label}</Text>
      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          fontSize: t.body,
          fontWeight: typography.weights.semibold,
          color: colors.dark,
          textAlign: 'right',
          lineHeight: t.px(18),
        }}>
        {value}
      </Text>
    </View>
  );
}

export default function TowingReviewScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { dialog, showDialog } = useAppDialog();
  const { booking, updateBooking, resetBooking } = useTowingBooking();
  const { vehicles, fetchVehicles, isLoading: isLoadingVehicles } = useVehicleStore();
  const { confirmTowing, isConfirming } = useServiceBookingPayment();
  const [fareBreakdown, setFareBreakdown] = useState<TowingFareBreakdown | null>(
    booking.fareBreakdown ?? null,
  );
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const submittingRef = useRef(false);

  const coordsReady = hasRouteCoords(booking);

  useEffect(() => {
    void fetchVehicles().catch(() => {
      /* missing vehicle is reported when the user confirms */
    });
  }, [fetchVehicles]);

  useEffect(() => {
    if (!coordsReady || booking.pickupLat == null || booking.pickupLng == null || booking.dropLat == null || booking.dropLng == null) {
      setFareBreakdown(isTowingWalkthroughEnabled() ? getTowingWalkthroughFare() : null);
      setIsLoadingFare(false);
      return;
    }

    const pickupLat = booking.pickupLat;
    const pickupLng = booking.pickupLng;
    const dropLat = booking.dropLat;
    const dropLng = booking.dropLng;
    let cancelled = false;

    async function loadFare() {
      setIsLoadingFare(true);
      try {
        const { towingMode, scheduledAt } = towingFareModeParams(booking);
        const estimate = await estimateTowingFare({
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          dropoff_lat: dropLat,
          dropoff_lng: dropLng,
          scheduledAt,
          towingMode,
        });
        if (!cancelled) {
          setFareBreakdown(estimate.fareBreakdown);
        }
      } catch {
        if (!cancelled) {
          setFareBreakdown(isTowingWalkthroughEnabled() ? getTowingWalkthroughFare() : null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFare(false);
        }
      }
    }

    void loadFare();
    return () => {
      cancelled = true;
    };
  }, [
    booking.dateId,
    booking.dropLat,
    booking.dropLng,
    booking.pickupLat,
    booking.pickupLng,
    booking.serviceMode,
    booking.timeId,
    coordsReady,
  ]);

  useEffect(() => {
    if (!fareBreakdown) return;

    updateBooking({
      basePrice: fareBreakdown.baseFare,
      distanceKm: fareBreakdown.distanceKm,
      distanceCharge: fareBreakdown.extraKmCharge,
      totalPrice: fareBreakdown.totalFare,
      totalPriceMin: fareBreakdown.totalFare,
      totalPriceMax: fareBreakdown.totalFare,
      advancePayment: fareBreakdown.advanceAmount,
      advancePaymentMin: fareBreakdown.advanceAmount,
      advancePaymentMax: fareBreakdown.advanceAmount,
      fareBreakdown,
    });
  }, [fareBreakdown, updateBooking]);

  const handleContinue = async () => {
    if (!fareBreakdown || isConfirming || isLoadingFare || submittingRef.current) return;
    if (!coordsReady) {
      showDialog({
        tone: 'warning',
        title: 'Route incomplete',
        message: 'Set pickup and drop on the map before confirming.',
        primaryLabel: 'OK',
      });
      return;
    }

    submittingRef.current = true;
    const statusLine = confirmationStatusLine(booking);

    let payload;
    try {
      payload = buildTowingBookingRequest(booking, vehicles);
    } catch (err) {
      submittingRef.current = false;
      const message =
        err instanceof Error ? err.message : 'Unable to prepare booking. Please try again.';
      showDialog({
        tone: 'warning',
        title: 'Cannot confirm booking',
        message,
        primaryLabel: 'OK',
      });
      return;
    }

    try {
      const result = await confirmTowing(payload);
      const created = result?.booking;
      if (!created) return;

      const breakdown =
        (created.fareBreakdown as TowingFareBreakdown | undefined) ?? fareBreakdown;

      navigation.replace('TowingConfirmed', {
        bookingId: formatBookingNumber(created.bookingNumber),
        apiBookingId: created.id,
        service: 'Towing',
        eta: statusLine,
        fareBreakdown: breakdown ?? undefined,
      });
      InteractionManager.runAfterInteractions(() => {
        resetBooking();
      });
    } catch {
      /* useServiceBookingPayment already shows the error dialog */
    } finally {
      submittingRef.current = false;
    }
  };

  const timingLabel = towingServiceTimingLabel(
    booking.serviceMode,
    getDateLabel(booking.dateId),
    getTimeLabel(booking.timeId),
  );

  return (
    <TowingBookingLayout
      title="Confirm booking"
      step={3}
      accentColor={TOWING_ACCENT}
      scrollable
      onBack={() => {
        if (isConfirming || submittingRef.current) return;
        goBackWithinStack(navigation);
      }}
      buttonLabel={isConfirming ? 'Confirming…' : 'Confirm booking'}
      onContinue={() => void handleContinue()}
      continueDisabled={
        isLoadingFare || isLoadingVehicles || !fareBreakdown || !coordsReady || isConfirming
      }
      continueLoading={isConfirming}
      footerNote={
        !isLoadingVehicles && vehicles.length === 0 ? (
          <Text style={{ fontSize: t.caption, color: colors.grey, textAlign: 'center' }}>
            Add a vehicle in Profile to confirm.
          </Text>
        ) : null
      }>
      {dialog}
      <WizardStepFade>
        <View style={{ gap: t.px(12), paddingBottom: t.px(8) }}>
          <View
            style={{
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              paddingHorizontal: t.px(14),
              paddingVertical: t.px(4),
            }}>
            <SummaryRow
              label="Vehicle"
              value={booking.vehicleLabel || getVehicleLabel(booking.vehicleType)}
              t={t}
            />
            <SummaryRow
              label="Pickup"
              value={getShortLocation(booking.pickup, booking.pickupLabel)}
              t={t}
            />
            <SummaryRow
              label="Drop"
              value={getShortLocation(booking.drop, booking.dropLabel)}
              t={t}
            />
            <SummaryRow label="Tow truck" value={getTowingTypeLabel(booking.towingType)} t={t} />
            <SummaryRow label="When" value={timingLabel} t={t} last />
          </View>

          {isLoadingFare ? (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: t.px(20),
                borderRadius: t.cardRadius,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <ActivityIndicator color={TOWING_ACCENT} />
              <Text style={{ marginTop: t.px(6), fontSize: t.caption, color: colors.grey }}>
                Calculating fare…
              </Text>
            </View>
          ) : fareBreakdown ? (
            <TowingFareBreakdownCard breakdown={fareBreakdown} accentColor={TOWING_ACCENT} compact />
          ) : (
            <Text style={{ fontSize: t.caption, color: colors.grey, textAlign: 'center' }}>
              Fare unavailable — check connection and try again.
            </Text>
          )}
        </View>
      </WizardStepFade>
    </TowingBookingLayout>
  );
}
