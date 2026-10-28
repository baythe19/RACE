import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, Text, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Smartphone } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { DriverFareBreakdownCard } from '../../../components/booking/FareBreakdownCard';
import {
  DRIVER_ACCENT,
  DRIVER_LIGHT_BG,
  getDateReviewLabel,
  getDriverTypeLabel,
  getShortLocation,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { useServiceBookingPayment } from '../../../hooks/useServiceBookingPayment';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import { formatRupee } from '../../../utils/driverPricing';
import { parseStoredDate } from '../../../utils/driverCalendar';
import { buildDriverBookingRequest } from '../../../utils/serviceBookingPayload';
import type { DriverFareBreakdown } from '../../../types/fare';
import { colors, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverBookingPayment'>;

type PaymentMethodId = 'upi';

const PAYMENT_METHODS: Array<{
  id: PaymentMethodId;
  label: string;
  description: string;
  Icon: typeof Smartphone;
}> = [
  {
    id: 'upi',
    label: __DEV__ ? 'UPI demo' : 'UPI',
    description: __DEV__ ? 'Simulated in development; no charge' : 'Online payment unavailable',
    Icon: Smartphone,
  },
];

function formatBookingNumber(bookingNumber: string): string {
  return bookingNumber.startsWith('#') ? bookingNumber : `#${bookingNumber}`;
}

export default function DriverBookingPaymentScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, resetBooking } = useDriverBooking();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { confirmDriver, isConfirming } = useServiceBookingPayment();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('upi');
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmedFare, setConfirmedFare] = useState<DriverFareBreakdown | null>(
    booking.fareBreakdown ?? null,
  );
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void fetchVehicles().catch((error) => {
      if (__DEV__) {
        console.warn('[DriverBookingPayment] fetchVehicles failed', error);
      }
    });
  }, [fetchVehicles]);

  useEffect(() => {
    if (!booking.vehicleCategory) {
      navigation.goBack();
    }
  }, [booking.vehicleCategory, navigation]);

  const advance = booking.advancePayment;
  const readyToPay = Boolean(booking.vehicleCategory) && advance > 0;

  const summaryRows = [
    { label: 'Service', value: getDriverTypeLabel(booking.driverType) },
    { label: 'Pickup', value: getShortLocation(booking.pickup, booking.pickupLabel) },
    { label: 'Date', value: getDateReviewLabel(parseStoredDate(booking.dateId)) },
    { label: 'Start', value: booking.startTime },
    { label: 'Duration', value: `${booking.packageHours} hours` },
    { label: 'Total', value: formatRupee(booking.totalPrice) },
  ];

  const handleConfirm = async (_method: PaymentMethodId) => {
    if (isConfirming || showSuccess || !readyToPay) return;
    setPaymentMethod(_method);

    try {
      const payload = buildDriverBookingRequest(booking, vehicles);
      const confirmed = await confirmDriver(payload);
      if (!confirmed) return;
      const { booking: created } = confirmed;
      const breakdown =
        (created.fareBreakdown as DriverFareBreakdown | undefined) ?? booking.fareBreakdown ?? null;
      setConfirmedFare(breakdown);

      setShowSuccess(true);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();

      const bookingId = formatBookingNumber(created.bookingNumber);

      setTimeout(() => {
        navigation.replace('DriverAssigned', {
          bookingId: created.id,
          bookingType: 'driver',
        });
        resetBooking();
      }, 900);
    } catch (error) {
      if (__DEV__) {
        console.warn('[DriverBookingPayment] confirm booking failed', error);
      }
      Alert.alert(
        'Payment not completed',
        error instanceof Error ? error.message : 'Online payment is unavailable. Please try again later.',
      );
    }
  };

  if (showSuccess) {
    return (
      <TowingBookingLayout title="Pay Advance" step={5} showStep={false} hideFooter accentColor={DRIVER_ACCENT}>
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
            Demo booking confirmed
          </Text>
          <Text style={{ fontSize: t.body, color: colors.grey, textAlign: 'center' }}>
            No real money was charged. This is a development preview.
          </Text>
          {confirmedFare ? (
            <View style={{ width: '100%', marginTop: t.px(8) }}>
              <DriverFareBreakdownCard breakdown={confirmedFare} accentColor={DRIVER_ACCENT} compact />
            </View>
          ) : null}
        </View>
      </TowingBookingLayout>
    );
  }

  return (
    <TowingBookingLayout
      title="Pay Advance"
      step={5}
      accentColor={DRIVER_ACCENT}
      scrollable
      showStep={false}
      onBack={() => navigation.goBack()}
      hideFooter>
      <Pressable
        onPress={() => setSummaryExpanded(prev => !prev)}
        style={{
          borderRadius: t.px(12),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: t.px(16),
          paddingVertical: t.px(14),
          marginBottom: t.px(16),
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontSize: t.labelBold,
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Booking summary
          </Text>
          {summaryExpanded ? (
            <ChevronUp size={t.iconSm} color={colors.dark} />
          ) : (
            <ChevronDown size={t.iconSm} color={colors.dark} />
          )}
        </View>
        {summaryExpanded ? (
          <View style={{ marginTop: t.px(12), gap: t.px(10) }}>
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
                  }}
                  numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ marginTop: t.px(6), fontSize: t.caption, color: colors.grey }}>
            Tap to see pickup, date & duration
          </Text>
        )}
      </Pressable>

      <View
        style={{
          borderRadius: t.px(12),
          backgroundColor: DRIVER_LIGHT_BG,
          borderWidth: 1,
          borderColor: DRIVER_ACCENT,
          paddingVertical: t.px(16),
          paddingHorizontal: t.px(16),
          marginBottom: t.px(8),
        }}>
        <Text style={{ fontSize: t.caption, color: colors.grey, marginBottom: t.px(4) }}>
          Advance due now (30%)
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: t.bodyLarge, fontWeight: typography.weights.semibold, color: colors.dark }}>
            Pay now
          </Text>
          <Text
            style={{
              fontSize: t.px(22),
              fontWeight: typography.weights.extrabold,
              color: DRIVER_ACCENT,
            }}>
            {formatRupee(advance)}
          </Text>
        </View>
        <Text style={{ marginTop: t.px(6), fontSize: t.caption, color: colors.grey }}>
          Remaining balance when the driver arrives
        </Text>
      </View>

      {booking.fareBreakdown ? (
        <View style={{ marginBottom: t.px(20) }}>
          <DriverFareBreakdownCard breakdown={booking.fareBreakdown} accentColor={DRIVER_ACCENT} compact />
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
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.px(12),
                borderRadius: t.px(12),
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? DRIVER_ACCENT : colors.border,
                backgroundColor: selected ? DRIVER_LIGHT_BG : colors.background,
                paddingHorizontal: t.px(16),
                paddingVertical: t.px(14),
              }}>
              <View
                style={{
                  width: t.px(36),
                  height: t.px(36),
                  borderRadius: t.px(10),
                  backgroundColor: selected ? colors.background : DRIVER_LIGHT_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon size={t.iconSm} color={selected ? DRIVER_ACCENT : colors.dark} strokeWidth={2} />
              </View>
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
                  width: t.px(22),
                  height: t.px(22),
                  borderRadius: t.px(6),
                  borderWidth: selected ? 0 : 1.5,
                  borderColor: colors.border,
                  backgroundColor: selected ? DRIVER_ACCENT : colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {selected ? <Check size={t.px(12)} color={colors.dark} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text
        style={{
          fontSize: t.caption,
          color: colors.grey,
          textAlign: 'center',
          marginBottom: t.px(10),
          lineHeight: t.px(17),
        }}>
        {__DEV__
          ? 'Dev mode: confirms booking without a real charge.'
          : 'Advance reserves a verified driver for your schedule.'}
      </Text>

      <Pressable
        onPress={() => void handleConfirm(paymentMethod)}
        disabled={isConfirming || !readyToPay}
        style={{
          minHeight: t.buttonHeight,
          borderRadius: t.px(12),
          backgroundColor: isConfirming || !readyToPay ? colors.grey : DRIVER_ACCENT,
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
          {isConfirming ? 'Processing…' : `Confirm & pay ${formatRupee(advance)}`}
        </Text>
      </Pressable>

    </TowingBookingLayout>
  );
}
