import React from 'react';
import { Text, View } from 'react-native';
import { PartyPopper } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { TowingFareBreakdownCard } from '../../../components/booking/FareBreakdownCard';
import type { HomeStackParamList } from '../../../types/navigation';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingConfirmed'>;

const TOWING_ACCENT = '#F59E0B';

export default function TowingConfirmedScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const { bookingId, apiBookingId, service, eta, fareBreakdown } = route.params;
  const trackParams = {
    bookingId: apiBookingId,
    bookingType: 'towing' as const,
  };

  return (
    <TowingBookingLayout
      title="Booking Confirmed"
      step={0}
      showStep={false}
      accentColor={TOWING_ACCENT}
      onBack={() => navigation.popToTop()}
      buttonLabel="Track Booking"
      onContinue={() => navigation.navigate('TowingTrack', trackParams)}
      secondaryLabel="Go Home"
      onSecondary={() => navigation.popToTop()}
      secondaryVariant="outline">
      <View style={{ flex: 1 }}>
        {/* Celebration hero */}
        <View
          style={[
            {
              borderRadius: t.cardRadius,
              backgroundColor: colors.goldLight,
              borderWidth: 1,
              borderColor: TOWING_ACCENT,
              alignItems: 'center',
              paddingHorizontal: t.px(18),
              paddingTop: t.px(22),
              paddingBottom: t.px(18),
            },
            shadows.card,
          ]}>
          <View
            style={{
              width: t.px(72),
              height: t.px(72),
              borderRadius: t.px(36),
              backgroundColor: TOWING_ACCENT,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <PartyPopper size={t.px(34)} color={colors.background} strokeWidth={2.2} />
          </View>
          <Text
            style={{
              marginTop: t.px(12),
              fontSize: t.px(20),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              textAlign: 'center',
            }}>
            You're all set! 🎉
          </Text>
          <Text
            style={{
              marginTop: t.px(4),
              fontSize: t.body,
              color: colors.grey,
              textAlign: 'center',
              lineHeight: t.px(20),
            }}>
            Your {service.toLowerCase() || 'towing'} request is confirmed. A partner is being assigned.
          </Text>

          {/* Booking id + ETA chips */}
          <View
            style={{
              marginTop: t.px(16),
              flexDirection: 'row',
              gap: t.px(10),
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
            <View
              style={{
                paddingHorizontal: t.px(12),
                paddingVertical: t.px(7),
                borderRadius: t.px(999),
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <Text
                style={{
                  fontSize: t.caption,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {bookingId}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: t.px(12),
                paddingVertical: t.px(7),
                borderRadius: t.px(999),
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: TOWING_ACCENT,
              }}>
              <Text
                style={{
                  fontSize: t.caption,
                  fontWeight: typography.weights.bold,
                  color: TOWING_ACCENT,
                }}>
                ETA {eta}
              </Text>
            </View>
          </View>
        </View>

        {/* Fare recap */}
        {fareBreakdown ? (
          <View style={{ marginTop: t.px(14) }}>
            <TowingFareBreakdownCard breakdown={fareBreakdown} accentColor={TOWING_ACCENT} compact />
          </View>
        ) : null}

        <Text
          style={{
            marginTop: t.px(12),
            fontSize: t.caption,
            color: colors.grey,
            textAlign: 'center',
            lineHeight: t.px(18),
          }}>
          Pay the remaining amount to the partner after your vehicle is delivered.
        </Text>
      </View>
    </TowingBookingLayout>
  );
}
