import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';

import GooglePayIcon from '../../components/icons/GooglePayIcon';
import TowingBookingLayout, { useBookingTheme } from '../../components/booking/TowingBookingLayout';
import {
  BOOKING_PAYMENT_METHODS,
  type BookingPaymentFlow,
  type PaymentMethodId,
} from '../../constants/bookingPayment';
import { ROADSIDE_ACCENT } from '../../constants/roadsideBooking';
import type { HomeStackParamList } from '../../types/navigation';
import { colors, shadows, typography } from '../../theme';
import { initiateAdvancePayment, verifyAdvancePayment } from '../../services/bookings/serviceBookingApi';
import { getApiErrorMessage } from '../../services/api';

type Props = NativeStackScreenProps<HomeStackParamList, 'BookingPayment'>;

const NEXT_ROUTE: Record<BookingPaymentFlow, keyof HomeStackParamList> = {
  towing: 'TowingConfirmed',
  driver: 'DriverAssigned',
  roadside: 'RoadsideHelpOnWay',
};

export default function BookingPaymentScreen({ navigation, route }: Props) {
  const { amount, flow, bookingId, bookingType } = route.params;
  const { t } = useBookingTheme();
  const accent = flow === 'roadside' ? ROADSIDE_ACCENT : colors.primary;
  const [selected, setSelected] = useState<PaymentMethodId>('wallet');

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!bookingId || !bookingType) {
        throw new Error('Missing booking details for payment');
      }
      const session = await initiateAdvancePayment({ bookingId, bookingType });
      return verifyAdvancePayment({ transactionId: session.transactionId, status: 'success' });
    },
  });

  const continueAfterPayment = () => {
    const next = NEXT_ROUTE[flow];
    if (flow === 'towing') {
      navigation.navigate('TowingConfirmed', {
        bookingId: bookingId!,
        apiBookingId: bookingId!,
        service: 'Towing',
        eta: '60–90 min',
      });
      return;
    }
    if (flow === 'driver') {
      navigation.navigate('DriverAssigned', { bookingId: bookingId!, bookingType: 'driver' });
      return;
    }
    navigation.navigate(next as 'RoadsideHelpOnWay');
  };

  // MVP: UPI+Cash are the real rails. GPay option is a coming-soon showcase —
  // paying always runs the (stub) advance flow regardless of selection, so if a
  // coming-soon method is picked, fall back to UPI and tell the user.
  const handlePay = async () => {
    if (payMutation.isPending) return;
    if (!bookingId || !bookingType) {
      Alert.alert('Payment unavailable', 'Booking details are missing. Please retry from booking review.');
      return;
    }
    if (selected === 'gpay') {
      setSelected('upi');
      Alert.alert('Coming soon', 'Google Pay in-app is launching after MVP. UPI is selected instead.');
    }

    try {
      const payment = await payMutation.mutateAsync();
      if (payment.status !== 'success') {
        Alert.alert('Payment incomplete', 'The payment could not be confirmed. Please try again.');
        return;
      }
      Alert.alert(
        'Payment successful',
        'Your advance payment has been confirmed.',
        [{ text: 'Continue', onPress: continueAfterPayment }],
      );
    } catch (error) {
      Alert.alert(
        'Payment not completed',
        getApiErrorMessage(error, 'Could not complete the payment. Please try again.'),
      );
    }
  };

  return (
    <TowingBookingLayout
      title="Confirm Payment"
      step={flow === 'towing' ? 6 : flow === 'driver' ? 5 : 4}
      accentColor={accent}
      onBack={() => navigation.goBack()}
      buttonLabel={
        payMutation.isPending
          ? 'Processing...'
          : 'Pay ₹' + amount
      }
      onContinue={() => void handlePay()}
      continueDisabled={payMutation.isPending}
      footerNoteBelow={
        <Text style={{ fontSize: t.caption, color: colors.grey, textAlign: 'center' }}>
          Secure payment confirmation for RACE services.
        </Text>
      }>
      <View style={{ flex: 1 }}>
        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              padding: t.cardPadding,
              marginBottom: t.px(18),
              alignItems: 'center',
            },
            shadows.card,
          ]}>
          <Text style={{ fontSize: t.caption, color: colors.grey, marginBottom: t.px(4) }}>
            Amount to pay
          </Text>
          <Text
            style={{
              fontSize: t.px(36),
              fontWeight: typography.weights.extrabold,
              color: accent,
            }}>
            ₹{amount}
          </Text>
        </View>

        <Text
          style={{
            fontSize: t.labelBold,
            fontWeight: typography.weights.bold,
            color: colors.dark,
            marginBottom: t.px(12),
          }}>
          Select Payment Method
        </Text>

        <View style={{ gap: t.px(10) }}>
          {BOOKING_PAYMENT_METHODS.map(method => {
            const isSelected = selected === method.id;
            const isComingSoon = method.subtitle.startsWith('Coming soon');
            return (
              <Pressable
                key={method.id}
                onPress={() => setSelected(method.id)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.px(12),
                    borderRadius: t.inputRadius,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? accent : colors.border,
                    backgroundColor: isSelected ? colors.goldLight : colors.background,
                    padding: t.rowPadding,
                  },
                  shadows.card,
                ]}>
                <View
                  style={{
                    width: t.px(44),
                    height: t.px(44),
                    borderRadius: t.px(22),
                    backgroundColor: colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {method.id === 'gpay' ? (
                    <GooglePayIcon size={t.px(28)} />
                  ) : (
                    <method.Icon size={t.px(22)} color={colors.dark} strokeWidth={2} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: t.bodyLarge,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {method.label}
                  </Text>
                  <Text style={{ fontSize: t.caption, color: colors.grey, marginTop: t.px(2) }}>
                    {method.subtitle}
                  </Text>
                </View>
                {isSelected ? (
                  <View
                    style={{
                      width: t.px(22),
                      height: t.px(22),
                      borderRadius: t.px(11),
                      backgroundColor: accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Check size={t.px(14)} color={colors.background} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => Alert.alert('Add Method', 'Add a new payment method from Profile → Payment Methods.')}
          style={{ marginTop: t.px(14), alignItems: 'center' }}>
          <Text style={{ fontSize: t.body, fontWeight: typography.weights.bold, color: accent }}>
            + Add New Payment Method
          </Text>
        </Pressable>
      </View>
    </TowingBookingLayout>
  );
}
