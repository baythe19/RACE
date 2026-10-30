import React from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { MessageCircle, Phone } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LiveTripMap from '../../../components/booking/LiveTripMap';
import TripOtpCard from '../../../components/booking/TripOtpCard';
import DriverAvatar from '../../../components/bookings/DriverAvatar';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { useBookingTracking } from '../../../hooks/useBookingTracking';
import { useBookingQuery } from '../../../services/bookings/useBookingQueries';
import { brand } from '../../../theme/brand';
import type { HomeStackParamList } from '../../../types/navigation';
import { shouldShowTripStartOtp } from '../../../utils/bookingDisplay';
import { formatLocationDisplay } from '../../../utils/readableAddress';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingDriverOnWay'>;

export default function TowingDriverOnWayScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const trackParams = route.params;
  const bookingId = route.params?.bookingId;
  const booking = useBookingQuery(bookingId ?? '', 'towing');
  const {
    etaLabel,
    etaMinutes,
    driverName,
    driverPhone,
    driverLocation,
    status,
    tripStartOtp: trackedOtp,
  } = useBookingTracking(bookingId, 'towing');
  const tripOtp = booking?.tripStartOtp ?? trackedOtp;
  const showTripOtp = Boolean(
    tripOtp && shouldShowTripStartOtp(booking?.unifiedStatus ?? status),
  );

  const name = driverName ?? booking?.driver?.name ?? 'Your partner';
  const phone = driverPhone ?? booking?.driver?.phone ?? brand.phoneRaw;
  const hasDriver = Boolean(driverName ?? booking?.driver?.name);

  if (bookingId && !booking && !hasDriver) {
    return (
      <TowingBookingLayout title="Your driver is on the way" step={0} headerVariant="inline" hideFooter>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </TowingBookingLayout>
    );
  }

  return (
    <TowingBookingLayout
      title="Your driver is on the way"
      step={0}
      headerVariant="inline"
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel="Continue"
      onContinue={() => navigation.navigate('TowingCompleted', trackParams)}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, marginBottom: t.px(14), minHeight: t.px(200) }}>
          <LiveTripMap
            borderRadius={t.px(16)}
            style={{ flex: 1 }}
            tripStatus={booking?.unifiedStatus ?? status}
            pickup={
              booking?.pickup?.latitude != null && booking?.pickup?.longitude != null
                ? {
                    latitude: booking.pickup.latitude,
                    longitude: booking.pickup.longitude,
                    label: formatLocationDisplay(booking.pickup),
                  }
                : null
            }
            dropoff={
              booking?.dropoff?.latitude != null && booking?.dropoff?.longitude != null
                ? {
                    latitude: booking.dropoff.latitude,
                    longitude: booking.dropoff.longitude,
                    label: formatLocationDisplay(booking.dropoff),
                  }
                : null
            }
            driver={
              driverLocation
                ? {
                    latitude: driverLocation.latitude,
                    longitude: driverLocation.longitude,
                    label: name,
                  }
                : null
            }
          />
        </View>

        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              padding: t.cardPadding,
            },
            shadows.card,
          ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(12) }}>
            <DriverAvatar size={t.px(52)} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: t.labelBold,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {name}
              </Text>
              {!hasDriver ? (
                <Text style={{ fontSize: t.caption, color: colors.grey }}>
                  Finding nearest tow driver…
                </Text>
              ) : null}
            </View>
          </View>

          <Text
            style={{
              marginTop: t.px(16),
              fontSize: t.px(24),
              fontWeight: typography.weights.extrabold,
              color: colors.primary,
              textAlign: 'center',
            }}>
            {hasDriver
              ? etaMinutes == null
                ? 'ETA updating'
                : 'Arriving in ' + etaMinutes + ' min'
              : 'ETA: ' + etaLabel}
          </Text>

          {showTripOtp && tripOtp ? (
            <View style={{ marginTop: t.px(16) }}>
              <TripOtpCard
                otp={tripOtp}
                subtitle="Share with driver at pickup to start the trip."
              />
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: t.px(10), marginTop: t.px(16) }}>
            <Pressable
              onPress={() => void Linking.openURL(`tel:${phone}`)}
              disabled={!hasDriver}
              style={{
                flex: 1,
                height: t.px(48),
                borderRadius: t.inputRadius,
                borderWidth: 1.5,
                borderColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.px(6),
                opacity: hasDriver ? 1 : 0.5,
              }}>
              <Phone size={t.px(18)} color={colors.primary} />
              <Text
                style={{
                  fontSize: t.body,
                  fontWeight: typography.weights.bold,
                  color: colors.primary,
                }}>
                Call Driver
              </Text>
            </Pressable>
            <Pressable
              style={{
                flex: 1,
                height: t.px(48),
                borderRadius: t.inputRadius,
                borderWidth: 1.5,
                borderColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.px(6),
                opacity: 0.5,
              }}>
              <MessageCircle size={t.px(18)} color={colors.primary} />
              <Text
                style={{
                  fontSize: t.body,
                  fontWeight: typography.weights.bold,
                  color: colors.primary,
                }}>
                Chat
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </TowingBookingLayout>
  );
}
