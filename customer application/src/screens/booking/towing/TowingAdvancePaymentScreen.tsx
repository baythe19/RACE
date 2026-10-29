import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, Text, View } from 'react-native';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { TowingFareBreakdownCard } from '../../../components/booking/FareBreakdownCard';
import {
  getDateLabel,
  getShortLocation,
  getTimeLabel,
  getTowingTypeLabel,
  getVehicleLabel,
} from '../../../constants/towingBooking';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { useServiceBookingPayment } from '../../../hooks/useServiceBookingPayment';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import { estimateTowingFare } from '../../../services/bookings/fareApi';
import { buildTowingBookingRequest } from '../../../utils/serviceBookingPayload';
import type { TowingFareBreakdown } from '../../../types/fare';
import { BHUBANESWAR_DEFAULT } from '../../../utils/googleMaps';
import { towingDateIdToScheduledAt } from '../../../utils/bookingLocation';
import { getApiErrorMessage } from '../../../services/api';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingAdvancePayment'>;

const TOWING_ACCENT = '#F59E0B';

function formatBookingNumber(bookingNumber: string): string {
  return bookingNumber.startsWith('#') ? bookingNumber : `#${bookingNumber}`;
}

export default function TowingAdvancePaymentScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking, resetBooking } = useTowingBooking();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { confirmTowing, isConfirming } = useServiceBookingPayment();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fareBreakdown, setFareBreakdown] = useState<TowingFareBreakdown | null>(
    booking.fareBreakdown ?? null,
  );
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const [confirmedFare, setConfirmedFare] = useState<TowingFareBreakdown | null>(
    booking.fareBreakdown ?? null,
  );
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void fetchVehicles().catch((error) => {
      Alert.alert('Unable to load vehicles', 'Please try again.');
      if (__DEV__) {
        console.warn('[TowingAdvancePayment] fetchVehicles failed', error);
      }
    });
  }, [fetchVehicles]);

  useEffect(() => {
    if (fareBreakdown?.totalFare) return;

    const pickupLat = booking.pickupLat ?? BHUBANESWAR_DEFAULT.latitude;
    const pickupLng = booking.pickupLng ?? BHUBANESWAR_DEFAULT.longitude;
    const dropLat = booking.dropLat ?? pickupLat + 0.01;
    const dropLng = booking.dropLng ?? pickupLng + 0.01;

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
          updateBooking({
            basePrice: estimate.fareBreakdown.baseFare,
            distanceKm: estimate.fareBreakdown.distanceKm,
            distanceCharge: estimate.fareBreakdown.extraKmCharge,
            totalPrice: estimate.fareBreakdown.totalFare,
            totalPriceMin: estimate.fareBreakdown.totalFare,
            totalPriceMax: estimate.fareBreakdown.totalFare,
            advancePayment: estimate.fareBreakdown.advanceAmount,
            advancePaymentMin: estimate.fareBreakdown.advanceAmount,
            advancePaymentMax: estimate.fareBreakdown.advanceAmount,
            fareBreakdown: estimate.fareBreakdown,
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[TowingAdvancePayment] estimate fare failed', error);
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
    fareBreakdown?.totalFare,
    updateBooking,
  ]);

  const activeBreakdown = fareBreakdown ?? booking.fareBreakdown ?? null;
  const totalMin = activeBreakdown?.totalFare ?? booking.totalPriceMin ?? booking.totalPrice;
  const totalMax = activeBreakdown?.totalFare ?? booking.totalPriceMax ?? booking.totalPrice;

  const summaryRows = [
    { label: 'Service', value: 'Towing' },
    { label: 'Vehicle', value: booking.vehicleLabel || getVehicleLabel(booking.vehicleType) },
    { label: 'Pickup', value: getShortLocation(booking.pickup, booking.pickupLabel) },
    { label: 'Drop', value: getShortLocation(booking.drop, booking.dropLabel) },
    { label: 'Towing Type', value: getTowingTypeLabel(booking.towingType) },
    {
      label: 'Date & Time',
      value: `${getDateLabel(booking.dateId)}, ${getTimeLabel(booking.timeId)}`,
    },
    { label: 'Est. Total', value: `₹${totalMin}` },
  ];

  const handleConfirm = async () => {
    if (isConfirming || showSuccess || isLoadingFare) return;

    let payload;
    try {
      payload = buildTowingBookingRequest(booking, vehicles);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to prepare booking. Please try again.';
      Alert.alert('Cannot confirm booking', message);
      return;
    }

    try {
      const result = await confirmTowing(payload);
      const created = result?.booking;
      if (!created) {
        throw new Error('Booking response was empty');
      }
      const breakdown =
        (created.fareBreakdown as TowingFareBreakdown | undefined) ??
        activeBreakdown ??
        null;
      setConfirmedFare(breakdown);

      setShowSuccess(true);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();

      const bookingId = formatBookingNumber(created.bookingNumber);
      const eta = getTimeLabel(booking.timeId);

      setTimeout(() => {
        navigation.replace('TowingConfirmed', {
          bookingId,
          apiBookingId: created.id,
          service: 'Towing',
          eta,
          fareBreakdown: breakdown ?? undefined,
        });
        resetBooking();
      }, 1100);
    } catch (error) {
      setShowSuccess(false);
      successScale.setValue(0);
      Alert.alert('Booking Failed', getApiErrorMessage(error, 'Unable to confirm booking. Please try again.'));
    }
  };

  if (showSuccess) {
    return (
      <TowingBookingLayout title="Booking" step={0} showStep={false} hideFooter>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.px(24) }}>
          <Animated.View
            style={{
              width: t.px(96),
              height: t.px(96),
              borderRadius: t.px(48),
              backgroundColor: colors.goldLight,
              borderWidth: 2,
              borderColor: TOWING_ACCENT,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: successScale }],
            }}>
            <View
              style={{
                width: t.px(64),
                height: t.px(64),
                borderRadius: t.px(32),
                backgroundColor: TOWING_ACCENT,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Check size={t.px(34)} color={colors.background} strokeWidth={3.2} />
            </View>
          </Animated.View>
          <Text
            style={{
              marginTop: t.px(18),
              fontSize: t.px(22),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
            }}>
            Booking Confirmed!
          </Text>
          <Text
            style={{
              marginTop: t.px(6),
              fontSize: t.body,
              color: colors.grey,
              textAlign: 'center',
              lineHeight: t.px(20),
            }}>
            Your towing request has been placed.
            {'\n'}Assigning a nearby partner…
          </Text>
          {confirmedFare ? (
            <View style={{ width: '100%', marginTop: t.px(18) }}>
              <TowingFareBreakdownCard breakdown={confirmedFare} accentColor={TOWING_ACCENT} compact />
            </View>
          ) : null}
        </View>
      </TowingBookingLayout>
    );
  }

  return (
    <TowingBookingLayout
      title="Confirm & book"
      step={3}
      accentColor={TOWING_ACCENT}
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      hideFooter>
      {/* Collapsible booking summary */}
      <Pressable
        onPress={() => setSummaryExpanded(prev => !prev)}
        style={[
          {
            borderRadius: t.cardRadius,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: t.px(16),
            paddingVertical: t.px(14),
            marginBottom: t.px(14),
          },
          shadows.card,
        ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontSize: t.labelBold,
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Booking Summary
          </Text>
          {summaryExpanded ? (
            <ChevronUp size={t.iconSm} color={colors.dark} />
          ) : (
            <ChevronDown size={t.iconSm} color={colors.dark} />
          )}
        </View>
        {summaryExpanded ? (
          <View style={{ marginTop: t.px(12), gap: t.px(8) }}>
            {summaryRows.map(row => (
              <View
                key={row.label}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.px(12) }}>
                <Text style={{ fontSize: t.body, color: colors.grey }}>{row.label}</Text>
                <Text
                  style={{
                    fontSize: t.body,
                    fontWeight: typography.weights.semibold,
                    color: colors.dark,
                    textAlign: 'right',
                    flex: 1,
                  }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>

      {/* Fare summary — full picture, pay-later split shown for transparency */}
      {activeBreakdown ? (
        <View style={{ marginBottom: t.px(14) }}>
          <TowingFareBreakdownCard breakdown={activeBreakdown} accentColor={TOWING_ACCENT} compact />
        </View>
      ) : isLoadingFare ? (
        <View style={{ alignItems: 'center', marginBottom: t.px(14) }}>
          <ActivityIndicator color={TOWING_ACCENT} />
        </View>
      ) : null}

      <Text
        style={{
          fontSize: t.caption,
          color: colors.grey,
          textAlign: 'center',
          marginBottom: t.px(16),
          lineHeight: t.px(18),
        }}>
        Our partner collects the remaining payment after the tow is completed.
        {'\n'}Online payment options will be available soon.
      </Text>

      {/* Single, clear CTA */}
      <Pressable
        onPress={() => void handleConfirm()}
        disabled={isConfirming || isLoadingFare}
        style={({ pressed }) => ({
          minHeight: t.buttonHeight,
          borderRadius: t.cardRadius,
          backgroundColor: isConfirming || isLoadingFare ? colors.border : colors.primary,
          opacity: pressed ? 0.9 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: t.px(8),
          marginBottom: t.px(10),
        })}>
        {isConfirming || isLoadingFare ? <ActivityIndicator color={colors.dark} size="small" /> : null}
        <Text
          style={{
            fontSize: t.buttonLabel,
            fontWeight: typography.weights.bold,
            color: colors.dark,
          }}>
          {isConfirming ? 'Confirming…' : 'Confirm Booking'}
        </Text>
      </Pressable>

      <Text
        style={{
          fontSize: t.caption,
          color: colors.grey,
          textAlign: 'center',
        }}>
        You will not be charged anything right now
      </Text>
    </TowingBookingLayout>
  );
}
