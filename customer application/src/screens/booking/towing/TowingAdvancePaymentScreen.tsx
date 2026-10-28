import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, Text, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Smartphone, Wallet } from 'lucide-react-native';
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
import { formatRupee, formatRupeeRange } from '../../../utils/towingPricing';
import { buildTowingBookingRequest } from '../../../utils/serviceBookingPayload';
import type { TowingFareBreakdown } from '../../../types/fare';
import { BHUBANESWAR_DEFAULT } from '../../../utils/googleMaps';
import { towingDateIdToScheduledAt } from '../../../utils/bookingLocation';
import { getApiErrorMessage } from '../../../services/api';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingAdvancePayment'>;

type PaymentMethodId = 'upi' | 'cash';

const TOWING_ACCENT = '#F59E0B';
const SELECTED_BG = '#FEF3C7';

const PAYMENT_METHODS: Array<{
  id: PaymentMethodId;
  label: string;
  description: string;
  Icon: typeof Smartphone;
}> = [
  {
    id: 'upi',
    label: 'UPI',
    description: 'PhonePe / GPay / Paytm',
    Icon: Smartphone,
  },
  {
    id: 'cash',
    label: 'Cash on Service',
    description: 'Pay when the tow truck arrives',
    Icon: Wallet,
  },
];

function formatBookingNumber(bookingNumber: string): string {
  return bookingNumber.startsWith('#') ? bookingNumber : `#${bookingNumber}`;
}

export default function TowingAdvancePaymentScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking, resetBooking } = useTowingBooking();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { confirmTowing, isConfirming } = useServiceBookingPayment();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('upi');
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
  const advance =
    activeBreakdown?.advanceAmount ?? booking.advancePaymentMin ?? booking.advancePayment;

  const totalRange = formatRupeeRange(totalMin, totalMax);

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
    { label: 'Est. Total', value: totalRange },
  ];

  const handleConfirm = async (_method: PaymentMethodId) => {
    if (isConfirming || showSuccess || isLoadingFare || !advance) return;
    setPaymentMethod(_method);

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
      const confirmed = await confirmTowing(payload);
      if (!confirmed) return;
      const { booking: created } = confirmed;
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
      }, 900);
    } catch (error) {
      setShowSuccess(false);
      successScale.setValue(0);
      Alert.alert('Payment Failed', getApiErrorMessage(error, 'Unable to confirm booking. Please try again.'));
    }
  };

  if (showSuccess) {
    return (
      <TowingBookingLayout title="Pay Advance" step={7} showStep={false} hideFooter>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 16 }}>
          <Animated.View
            style={{
              width: t.px(88),
              height: t.px(88),
              borderRadius: t.px(44),
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: successScale }],
            }}>
            <Check size={t.px(42)} color={colors.background} strokeWidth={3} />
          </Animated.View>
          <Text
            style={{
              fontSize: t.px(20),
              fontWeight: typography.weights.bold,
              color: colors.success,
            }}>
            Payment successful!
          </Text>
          {confirmedFare ? (
            <View style={{ width: '100%', marginTop: t.px(8) }}>
              <TowingFareBreakdownCard breakdown={confirmedFare} accentColor={TOWING_ACCENT} compact />
            </View>
          ) : null}
        </View>
      </TowingBookingLayout>
    );
  }

  return (
    <TowingBookingLayout
      title="Pay Advance"
      step={7}
      accentColor={TOWING_ACCENT}
      scrollable
      showStep={false}
      onBack={() => navigation.goBack()}
      hideFooter>
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
            marginBottom: t.px(16),
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

      <View
        style={{
          borderRadius: t.cardRadius,
          backgroundColor: SELECTED_BG,
          borderWidth: 1,
          borderColor: TOWING_ACCENT,
          paddingVertical: t.px(16),
          paddingHorizontal: t.px(16),
          marginBottom: t.px(20),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text style={{ fontSize: t.bodyLarge, fontWeight: typography.weights.semibold, color: colors.dark }}>
          Pay now
        </Text>
        <Text
          style={{
            fontSize: t.px(22),
            fontWeight: typography.weights.extrabold,
            color: TOWING_ACCENT,
          }}>
          {isLoadingFare ? '...' : formatRupee(advance)}
        </Text>
      </View>

      {activeBreakdown ? (
        <View style={{ marginBottom: t.px(20) }}>
          <TowingFareBreakdownCard breakdown={activeBreakdown} accentColor={TOWING_ACCENT} compact />
        </View>
      ) : isLoadingFare ? (
        <View style={{ alignItems: 'center', marginBottom: t.px(20) }}>
          <ActivityIndicator color={TOWING_ACCENT} />
        </View>
      ) : null}

      <Text
        style={{
          fontSize: t.sectionTitle,
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: t.px(10),
        }}>
        Payment Method
      </Text>

      <View style={{ gap: t.px(10), marginBottom: t.px(24) }}>
        {PAYMENT_METHODS.map(method => {
          const selected = paymentMethod === method.id;
          const Icon = method.Icon;
          return (
            <Pressable
              key={method.id}
              onPress={() => setPaymentMethod(method.id)}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.px(12),
                  borderRadius: t.inputRadius,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? TOWING_ACCENT : colors.border,
                  backgroundColor: selected ? SELECTED_BG : colors.background,
                  paddingHorizontal: t.px(16),
                  paddingVertical: t.px(14),
                },
                shadows.card,
              ]}>
              <Icon size={t.iconSm} color={selected ? TOWING_ACCENT : colors.dark} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: t.labelBold,
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                  }}>
                  {method.label}
                </Text>
                <Text style={{ fontSize: t.caption, color: colors.grey }}>{method.description}</Text>
              </View>
              <View
                style={{
                  width: t.px(20),
                  height: t.px(20),
                  borderRadius: t.px(10),
                  borderWidth: selected ? 0 : 1.5,
                  borderColor: colors.border,
                  backgroundColor: selected ? TOWING_ACCENT : colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {selected ? <Check size={t.px(12)} color={colors.background} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => void handleConfirm(paymentMethod)}
        disabled={isConfirming || isLoadingFare || !advance}
        style={{
          minHeight: t.buttonHeight,
          borderRadius: t.cardRadius,
          backgroundColor: isConfirming || isLoadingFare || !advance ? colors.grey : TOWING_ACCENT,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: t.px(12),
          flexDirection: 'row',
          gap: t.px(8),
        }}>
        {isConfirming ? <ActivityIndicator color={colors.dark} /> : null}
        <Text
          style={{
            fontSize: t.buttonLabel,
            fontWeight: typography.weights.bold,
            color: colors.dark,
          }}>
          {isConfirming ? 'Processing...' : `Pay ${formatRupee(advance)} & Confirm Booking`}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => void handleConfirm('cash')}
        disabled={isConfirming || isLoadingFare || !advance}
        style={{ alignItems: 'center', padding: t.px(8), opacity: isConfirming || isLoadingFare || !advance ? 0.5 : 1 }}>
        <Text
          style={{
            fontSize: t.body,
            fontWeight: typography.weights.semibold,
            color: colors.grey,
          }}>
          Pay Cash on Service
        </Text>
      </Pressable>
    </TowingBookingLayout>
  );
}
