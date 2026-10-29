import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Smartphone } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
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
import { getDriverServiceFlow } from '../../../utils/driverServiceFlow';
import type { DriverFareBreakdown } from '../../../types/fare';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

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
    label: __DEV__ ? 'Demo payment' : 'UPI',
    description: __DEV__ ? 'No real charge in development' : 'Online payment unavailable',
    Icon: Smartphone,
  },
];

export default function DriverBookingPaymentScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, resetBooking } = useDriverBooking();
  const flow = getDriverServiceFlow(booking.driverType);
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { confirmDriver, isConfirming } = useServiceBookingPayment();
  const [summaryExpanded, setSummaryExpanded] = useState(true);
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
      goBackWithinStack(navigation);
    }
  }, [booking.vehicleCategory, navigation]);

  const advance = booking.advancePayment;
  const readyToPay = Boolean(booking.vehicleCategory) && advance > 0;

  const summaryRows = [
    { label: 'Service', value: getDriverTypeLabel(booking.driverType) },
    { label: 'Pickup', value: getShortLocation(booking.pickup, booking.pickupLabel) },
    { label: 'When', value: `${getDateReviewLabel(parseStoredDate(booking.dateId))} · ${booking.startTime}` },
    { label: 'Duration', value: `${booking.packageHours} hours` },
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
    }
  };

  if (showSuccess) {
    return (
      <TowingBookingLayout
        title="Booking confirmed"
        step={4}
        stepLabels={flow.wizardStepLabels}
        accentColor={DRIVER_ACCENT}
        hideFooter
        showStep={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.px(8) }}>
          <Animated.View
            style={{
              width: t.px(72),
              height: t.px(72),
              borderRadius: t.px(36),
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: successScale }],
            }}>
            <Check size={t.px(36)} color={colors.background} strokeWidth={3} />
          </Animated.View>
          <Text
            style={{
              marginTop: t.px(14),
              fontSize: t.px(18),
              fontWeight: typography.weights.bold,
              color: colors.dark,
              textAlign: 'center',
            }}>
            {__DEV__ ? 'Demo booking placed' : 'Advance recorded'}
          </Text>
          <Text
            style={{
              marginTop: t.px(6),
              fontSize: t.caption,
              color: colors.grey,
              textAlign: 'center',
              lineHeight: t.px(18),
            }}>
            {__DEV__
              ? 'No money was charged. We are finding your driver.'
              : 'Your driver will be assigned shortly.'}
          </Text>
          {confirmedFare ? (
            <View style={{ width: '100%', marginTop: t.px(16) }}>
              <DriverFareBreakdownCard breakdown={confirmedFare} accentColor={DRIVER_ACCENT} compact />
            </View>
          ) : null}
        </View>
      </TowingBookingLayout>
    );
  }

  return (
    <TowingBookingLayout
      title="Pay advance"
      step={4}
      stepLabels={flow.wizardStepLabels}
      accentColor={DRIVER_ACCENT}
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel={isConfirming ? 'Processing…' : `Pay ${formatRupee(advance)}`}
      continueDisabled={isConfirming || !readyToPay}
      onContinue={() => void handleConfirm(paymentMethod)}>
      <WizardStepFade>
        <View style={{ gap: t.px(12) }}>
          <Pressable
            onPress={() => setSummaryExpanded(prev => !prev)}
            style={{
              borderRadius: t.px(12),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              paddingHorizontal: t.px(14),
              paddingVertical: t.px(12),
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontSize: t.body,
                  fontWeight: typography.weights.semibold,
                  color: colors.dark,
                }}>
                Trip summary
              </Text>
              {summaryExpanded ? (
                <ChevronUp size={t.iconSm} color={colors.grey} />
              ) : (
                <ChevronDown size={t.iconSm} color={colors.grey} />
              )}
            </View>
            {!summaryExpanded ? (
              <Text style={{ marginTop: t.px(4), fontSize: t.caption, color: colors.grey }} numberOfLines={1}>
                {summaryRows[1]?.value}
              </Text>
            ) : (
              <View style={{ marginTop: t.px(10), gap: t.px(8) }}>
                {summaryRows.map(row => (
                  <View
                    key={row.label}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.px(10) }}>
                    <Text style={{ fontSize: t.caption, color: colors.grey, width: t.px(72) }}>{row.label}</Text>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: t.caption,
                        fontWeight: typography.weights.semibold,
                        color: colors.dark,
                        textAlign: 'right',
                      }}
                      numberOfLines={2}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>

          {booking.fareBreakdown ? (
            <DriverFareBreakdownCard breakdown={booking.fareBreakdown} accentColor={DRIVER_ACCENT} compact />
          ) : (
            <View
              style={{
                borderRadius: t.px(12),
                borderWidth: 1,
                borderColor: colors.border,
                padding: t.px(14),
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: t.body, color: colors.grey }}>Advance due now</Text>
                <Text style={{ fontSize: t.px(18), fontWeight: typography.weights.bold, color: DRIVER_ACCENT }}>
                  {formatRupee(advance)}
                </Text>
              </View>
            </View>
          )}

          <View>
            <Text
              style={{
                fontSize: t.caption,
                fontWeight: typography.weights.semibold,
                color: colors.grey,
                marginBottom: t.px(8),
              }}>
              Payment
            </Text>
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
                    gap: t.px(10),
                    borderRadius: t.px(12),
                    borderWidth: 1,
                    borderColor: selected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: selected ? DRIVER_LIGHT_BG : colors.background,
                    paddingHorizontal: t.px(12),
                    paddingVertical: t.px(12),
                  }}>
                  <View
                    style={{
                      width: t.px(34),
                      height: t.px(34),
                      borderRadius: t.px(10),
                      backgroundColor: colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon size={t.iconSm} color={colors.dark} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: t.body, fontWeight: typography.weights.semibold, color: colors.dark }}>
                      {method.label}
                    </Text>
                    <Text style={{ fontSize: t.px(11), color: colors.grey }}>{method.description}</Text>
                  </View>
                  <View
                    style={{
                      width: t.px(20),
                      height: t.px(20),
                      borderRadius: t.px(10),
                      borderWidth: selected ? 0 : 1,
                      borderColor: colors.border,
                      backgroundColor: selected ? DRIVER_ACCENT : colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {selected ? <Check size={t.px(11)} color={colors.dark} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={{
              fontSize: t.px(11),
              color: colors.grey,
              textAlign: 'center',
              lineHeight: t.px(16),
            }}>
            {__DEV__
              ? 'Development preview only — confirms booking without charging.'
              : 'Balance is due when your driver arrives.'}
          </Text>
        </View>
      </WizardStepFade>
    </TowingBookingLayout>
  );
}
