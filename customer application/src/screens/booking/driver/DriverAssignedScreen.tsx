import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, Text, View } from 'react-native';
import { ArrowRight, Check, MessageCircle, Phone, Star } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import DriverAvatar from '../../../components/bookings/DriverAvatar';
import { getDriverTypeBadgeLabel } from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { useBookingTracking } from '../../../hooks/useBookingTracking';
import { useBookingQuery } from '../../../services/bookings/useBookingQueries';
import { brand } from '../../../theme/brand';
import type { HomeStackParamList } from '../../../types/navigation';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverAssigned'>;

export default function DriverAssignedScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const { booking: draftBooking } = useDriverBooking();
  const bookingId = route.params?.bookingId;
  const booking = useBookingQuery(bookingId ?? '');
  const { etaMinutes, driverName, driverPhone, driverRating, status } = useBookingTracking(
    bookingId,
    'driver',
  );
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const name = driverName ?? booking?.driver?.name ?? 'Assigning driver';
  const rating = booking?.driver?.rating ?? driverRating;
  const phone = driverPhone ?? booking?.driver?.phone ?? brand.phoneRaw;
  const hasDriver = Boolean(driverName ?? booking?.driver?.name);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  useEffect(() => {
    if (!bookingId) return;
    const enRouteStatuses = ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'];
    if (enRouteStatuses.includes(status)) {
      const timer = setTimeout(() => {
        navigation.replace('DriverTrack', {
          bookingId,
          bookingType: 'driver',
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [bookingId, navigation, status]);

  if (bookingId && !booking && !hasDriver) {
    return (
      <TowingBookingLayout title=" " step={5} hideFooter>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </TowingBookingLayout>
    );
  }

  return (
    <TowingBookingLayout
      title=" "
      step={5}
      hideFooter
      onBack={() => navigation.goBack()}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', paddingTop: t.px(4) }}>
          <Animated.View
            style={{
              width: t.px(72),
              height: t.px(72),
              borderRadius: t.px(36),
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: t.px(14),
              transform: [{ scale: scaleAnim }],
            }}>
            <Check size={t.px(34)} color={colors.background} strokeWidth={3} />
          </Animated.View>

          <Text
            style={{
              fontSize: t.px(22),
              fontWeight: typography.weights.bold,
              color: colors.success,
              marginBottom: t.px(20),
            }}>
            {hasDriver ? 'Driver Assigned!' : 'Waiting for driver to accept…'}
          </Text>

          <View
            style={[
              {
                width: '100%',
                borderRadius: t.cardRadius,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                padding: t.cardPadding,
              },
              shadows.card,
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(14) }}>
              <DriverAvatar size={t.px(72)} />

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: t.px(8),
                  }}>
                  <Text
                    style={{
                      fontSize: t.labelBold,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {name}
                  </Text>
                  {hasDriver && rating != null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(4) }}>
                      <Star size={t.px(14)} color={colors.primary} fill={colors.primary} />
                      <Text
                        style={{
                          fontSize: t.body,
                          fontWeight: typography.weights.semibold,
                          color: colors.grey,
                        }}>
                        {rating.toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: t.px(8),
                    paddingHorizontal: t.px(12),
                    paddingVertical: t.px(5),
                    borderRadius: t.px(16),
                    backgroundColor: colors.goldLight,
                  }}>
                  <Text
                    style={{
                      fontSize: t.caption,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {getDriverTypeBadgeLabel(draftBooking.driverType)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: t.px(20) }}>
              <Text
                style={{
                  fontSize: t.bodyLarge,
                  fontWeight: typography.weights.semibold,
                  color: colors.dark,
                  marginBottom: t.px(4),
                }}>
                {hasDriver ? 'Arriving in' : 'Estimated arrival'}
              </Text>
              <Text
                style={{
                  fontSize: t.px(32),
                  fontWeight: typography.weights.extrabold,
                  color: colors.primary,
                }}>
                {etaMinutes != null ? etaMinutes + ' min' : 'Updating'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: t.px(10), width: '100%', marginTop: t.px(16) }}>
            <Pressable
              onPress={() => void Linking.openURL(`tel:${phone}`)}
              disabled={!hasDriver}
              style={{
                flex: 1,
                height: t.px(48),
                borderRadius: t.inputRadius,
                borderWidth: 1.5,
                borderColor: colors.primary,
                backgroundColor: colors.background,
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
                backgroundColor: colors.background,
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

        <Pressable
          onPress={() =>
            navigation.navigate('DriverTrack', {
              bookingId,
              bookingType: 'driver',
            })
          }
          style={{
            height: t.buttonHeight,
            borderRadius: t.cardRadius,
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.px(8),
            marginBottom: t.footerBottom,
          }}>
          <Text
            style={{
              fontSize: t.buttonLabel,
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Track Driver
          </Text>
          <ArrowRight size={t.px(20)} color={colors.dark} strokeWidth={2.5} />
        </Pressable>
      </View>
    </TowingBookingLayout>
  );
}
