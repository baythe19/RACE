import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { CalendarClock, Car, MapPin, Truck, Wrench } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { TowingFareBreakdownCard } from '../../../components/booking/FareBreakdownCard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import {
  getDateLabel,
  getShortLocation,
  getTimeLabel,
  getTowingTypeLabel,
  getVehicleLabel,
} from '../../../constants/towingBooking';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { estimateTowingFare } from '../../../services/bookings/fareApi';
import type { HomeStackParamList } from '../../../types/navigation';
import type { TowingFareBreakdown } from '../../../types/fare';
import { BHUBANESWAR_DEFAULT } from '../../../utils/googleMaps';
import { formatRupee } from '../../../utils/towingPricing';
import { towingDateIdToScheduledAt } from '../../../utils/bookingLocation';
import {
  getTowingWalkthroughFare,
  TOWING_WALKTHROUGH_ENABLED,
} from '../../../utils/towingBookingWalkthrough';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingReview'>;

const TOWING_ACCENT = '#F59E0B';

function SummaryRow({
  Icon,
  label,
  value,
  t,
}: {
  Icon: typeof Wrench;
  label: string;
  value: string;
  t: ReturnType<typeof useBookingTheme>['t'];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: t.px(10),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
      <Icon size={t.px(18)} color={colors.grey} strokeWidth={2} style={{ marginTop: t.px(2) }} />
      <View style={{ flex: 1, marginLeft: t.px(12), minWidth: 0 }}>
        <Text style={{ fontSize: t.caption, color: colors.grey, marginBottom: t.px(2) }}>{label}</Text>
        <Text
          numberOfLines={2}
          style={{
            fontSize: t.body,
            fontWeight: typography.weights.semibold,
            color: colors.dark,
            lineHeight: t.px(20),
          }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function TowingReviewScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useTowingBooking();
  const [fareBreakdown, setFareBreakdown] = useState<TowingFareBreakdown | null>(
    booking.fareBreakdown ?? null,
  );
  const [isLoadingFare, setIsLoadingFare] = useState(false);

  const pickupLat = booking.pickupLat ?? BHUBANESWAR_DEFAULT.latitude;
  const pickupLng = booking.pickupLng ?? BHUBANESWAR_DEFAULT.longitude;
  const dropLat = booking.dropLat ?? pickupLat + 0.01;
  const dropLng = booking.dropLng ?? pickupLng + 0.01;

  useEffect(() => {
    let cancelled = false;

    async function loadFare() {
      setIsLoadingFare(true);
      try {
        const scheduledAt =
          booking.serviceMode === 'scheduled'
            ? towingDateIdToScheduledAt(booking.dateId)
            : undefined;
        const estimate = await estimateTowingFare({
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          dropoff_lat: dropLat,
          dropoff_lng: dropLng,
          scheduledAt,
        });
        if (!cancelled) {
          setFareBreakdown(estimate.fareBreakdown);
        }
      } catch {
        if (!cancelled) {
          setFareBreakdown(TOWING_WALKTHROUGH_ENABLED ? getTowingWalkthroughFare() : null);
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
  }, [booking.serviceMode, booking.dateId, dropLat, dropLng, pickupLat, pickupLng]);

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

  const handleContinue = () => {
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
    navigation.navigate('TowingAdvancePayment');
  };

  const totalPrice = fareBreakdown?.totalFare ?? booking.totalPrice;
  const advancePayment = fareBreakdown?.advanceAmount ?? booking.advancePayment;

  return (
    <TowingBookingLayout
      title="Confirm booking"
      step={3}
      accentColor={TOWING_ACCENT}
      scrollable
      onBack={() => navigation.goBack()}
      buttonLabel="Pay advance"
      onContinue={handleContinue}
      continueDisabled={isLoadingFare || !fareBreakdown}
      footerNoteBelow={
        <Text
          style={{
            fontSize: t.caption,
            color: colors.grey,
            textAlign: 'center',
            marginTop: t.px(2),
            marginBottom: t.px(4),
          }}>
          You won't be charged until service begins
        </Text>
      }>
      <View style={{ gap: t.px(14), paddingBottom: t.px(8) }}>
        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              paddingHorizontal: t.px(16),
              paddingTop: t.px(4),
              paddingBottom: t.px(4),
            },
            shadows.card,
          ]}>
          <Text
            style={{
              fontSize: t.labelBold,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              paddingVertical: t.px(10),
            }}>
            Booking Details
          </Text>
          <SummaryRow Icon={Wrench} label="Service Type" value="Towing" t={t} />
          <SummaryRow
            Icon={Car}
            label="Vehicle"
            value={booking.vehicleLabel || getVehicleLabel(booking.vehicleType)}
            t={t}
          />
          <SummaryRow
            Icon={MapPin}
            label="Pickup"
            value={getShortLocation(booking.pickup, booking.pickupLabel)}
            t={t}
          />
          <SummaryRow
            Icon={MapPin}
            label="Drop"
            value={getShortLocation(booking.drop, booking.dropLabel)}
            t={t}
          />
          <SummaryRow
            Icon={Truck}
            label="Towing Type"
            value={getTowingTypeLabel(booking.towingType)}
            t={t}
          />
          <View style={{ paddingVertical: t.px(10) }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <CalendarClock
                size={t.px(18)}
                color={colors.grey}
                strokeWidth={2}
                style={{ marginTop: t.px(2) }}
              />
              <View style={{ flex: 1, marginLeft: t.px(12) }}>
                <Text style={{ fontSize: t.caption, color: colors.grey, marginBottom: t.px(2) }}>
                  Date & Time
                </Text>
                <Text
                  style={{
                    fontSize: t.body,
                    fontWeight: typography.weights.semibold,
                    color: colors.dark,
                  }}>
                  {booking.serviceMode === 'instant'
                    ? 'Now · dispatched immediately'
                    : `${getDateLabel(booking.dateId)}, ${getTimeLabel(booking.timeId)}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isLoadingFare ? (
          <View style={{ alignItems: 'center', paddingVertical: t.px(20) }}>
            <ActivityIndicator color={TOWING_ACCENT} />
            <Text style={{ marginTop: t.px(8), fontSize: t.caption, color: colors.grey }}>
              Calculating fare from route distance...
            </Text>
          </View>
        ) : fareBreakdown ? (
          <TowingFareBreakdownCard breakdown={fareBreakdown} accentColor={TOWING_ACCENT} />
        ) : (
          <View
            style={{
              borderRadius: t.cardRadius,
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: TOWING_ACCENT,
              padding: t.px(16),
              gap: t.px(8),
            }}>
            <Text
              style={{
                fontSize: t.labelBold,
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              Price Estimate
            </Text>
            <Text
              style={{
                fontSize: t.px(28),
                fontWeight: typography.weights.extrabold,
                color: TOWING_ACCENT,
              }}>
              {totalPrice > 0 ? formatRupee(totalPrice) : '—'}
            </Text>
          </View>
        )}
      </View>
    </TowingBookingLayout>
  );
}
