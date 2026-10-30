import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, Text, View } from 'react-native';
import { Check, Star } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { useFinalPayment } from '../../../hooks/useFinalPayment';
import { useBookingQuery } from '../../../services/bookings/useBookingQueries';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import type { HomeStackParamList } from '../../../types/navigation';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingCompleted'>;

export default function TowingCompletedScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const { resetBooking } = useTowingBooking();
  const bookingId = route.params?.bookingId;
  const booking = useBookingQuery(bookingId ?? '', 'towing');
  const { payRemaining, isPaying } = useFinalPayment();
  const [finalPaid, setFinalPaid] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const needsFinalPayment =
    Boolean(bookingId) &&
    !finalPaid &&
    booking?.advancePaid &&
    !booking?.remainingPaid &&
    (booking?.remainingAmount ?? 0) > 0;

  const handlePayRemaining = async () => {
    if (!bookingId) return;
    const ok = await payRemaining(bookingId, 'towing');
    if (ok) setFinalPaid(true);
  };

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <TowingBookingLayout
      title="Service Completed"
      step={0}
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel="Book Again"
      onContinue={() => {
        resetBooking();
        navigation.navigate('TowingChooseVehicle');
      }}
      secondaryLabel="Back to Home"
      onSecondary={() => navigation.popToTop()}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            width: t.px(88),
            height: t.px(88),
            borderRadius: t.px(44),
            backgroundColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: t.px(20),
            transform: [{ scale: scaleAnim }],
          }}>
          <Check size={t.px(42)} color={colors.background} strokeWidth={3} />
        </Animated.View>

        <Text
          style={{
            fontSize: t.px(24),
            fontWeight: typography.weights.extrabold,
            color: colors.dark,
            marginBottom: t.px(8),
          }}>
          Service Completed!
        </Text>
        <Text
          style={{
            fontSize: t.bodyLarge,
            color: colors.grey,
            marginBottom: t.px(24),
            textAlign: 'center',
          }}>
          Thanks for choosing RACE Service.
        </Text>

        {needsFinalPayment ? (
          <Pressable
            onPress={() => void handlePayRemaining()}
            disabled={isPaying}
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.goldLight,
              borderRadius: t.cardRadius,
              borderWidth: 1.5,
              borderColor: colors.primary,
              paddingVertical: t.px(14),
              paddingHorizontal: t.px(16),
              marginBottom: t.px(16),
              opacity: isPaying ? 0.7 : 1,
            }}>
            <Text
              style={{
                fontSize: t.bodyLarge,
                fontWeight: typography.weights.semibold,
                color: colors.dark,
              }}>
              {isPaying ? 'Processing…' : 'Pay now'}
            </Text>
            <Text
              style={{
                fontSize: t.labelBold,
                fontWeight: typography.weights.extrabold,
                color: colors.primary,
              }}>
              ₹{booking?.remainingAmount?.toLocaleString('en-IN') ?? '—'}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            if (route.params?.bookingId) {
              navigation.navigate('TowingRate', {
                bookingId: route.params.bookingId,
                bookingType: 'towing',
              });
              return;
            }
            navigation.navigate('TowingRate');
          }}
          style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: t.px(8), marginBottom: t.px(12) }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={t.px(28)}
                color={colors.primary}
                fill="transparent"
                strokeWidth={2}
              />
            ))}
          </View>
          <Text
            style={{
              fontSize: t.labelBold,
              fontStyle: 'italic',
              fontWeight: typography.weights.semibold,
              color: colors.primary,
            }}>
            Great Service! Tap to rate
          </Text>
        </Pressable>
      </View>
    </TowingBookingLayout>
  );
}
