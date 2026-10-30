import React from 'react';
import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { TowingFareBreakdownCard } from '../../../components/booking/FareBreakdownCard';
import type { HomeStackParamList } from '../../../types/navigation';
import { formatRupee } from '../../../utils/towingPricing';
import { colors, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingConfirmed'>;

const TOWING_ACCENT = '#F59E0B';

export default function TowingConfirmedScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const { bookingId, apiBookingId, eta, fareBreakdown } = route.params;
  const trackParams = {
    bookingId: apiBookingId,
    bookingType: 'towing' as const,
  };

  return (
    <TowingBookingLayout
      title="Booking confirmed"
      step={0}
      showStep={false}
      accentColor={TOWING_ACCENT}
      scrollable={false}
      onBack={() => navigation.popToTop()}
      buttonLabel="Track booking"
      onContinue={() => {
        if (!apiBookingId) {
          navigation.popToTop();
          return;
        }
        navigation.navigate('TowingTrack', trackParams);
      }}
      secondaryLabel="Go home"
      onSecondary={() => navigation.popToTop()}
      secondaryVariant="outline">
      <View style={{ flex: 1, justifyContent: 'center', gap: t.px(16) }}>
        <View style={{ alignItems: 'center', gap: t.px(10) }}>
          <View
            style={{
              width: t.px(56),
              height: t.px(56),
              borderRadius: t.px(28),
              borderWidth: 2,
              borderColor: TOWING_ACCENT,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.background,
            }}>
            <Check size={t.px(28)} color={TOWING_ACCENT} strokeWidth={2.8} />
          </View>
          <Text
            style={{
              fontSize: t.px(20),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              textAlign: 'center',
            }}>
            Partner assignment started
          </Text>
          <Text
            style={{
              fontSize: t.body,
              color: colors.grey,
              textAlign: 'center',
              lineHeight: t.px(20),
            }}>
            {bookingId}
            {eta ? ` · ${eta}` : ''}
          </Text>
        </View>

        {fareBreakdown ? (
          <TowingFareBreakdownCard breakdown={fareBreakdown} accentColor={TOWING_ACCENT} compact />
        ) : null}

        {fareBreakdown ? (
          <Text style={{ fontSize: t.caption, color: colors.grey, textAlign: 'center' }}>
            Balance {formatRupee(fareBreakdown.remainingAmount)} due to partner after delivery.
          </Text>
        ) : null}
      </View>
    </TowingBookingLayout>
  );
}
