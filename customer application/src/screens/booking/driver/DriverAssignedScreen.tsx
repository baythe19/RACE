import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, Text, View } from 'react-native';
import { ArrowRight, Check, MessageCircle, Phone } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { mergeLiveStatus } from '../../../components/booking/LiveTrackingContent';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import DriverAvatar from '../../../components/bookings/DriverAvatar';
import { getDriverTypeBadgeLabel } from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { useBookingTracking } from '../../../hooks/useBookingTracking';
import { useBookingQuery } from '../../../services/bookings/useBookingQueries';
import { brand } from '../../../theme/brand';
import type { HomeStackParamList } from '../../../types/navigation';
import { getCustomerBookingPresentation } from '../../../utils/bookingDisplay';
import {
  bookingHasNamedPartner,
  trackEtaForStage,
  trackPartnerDisplayName,
} from '../../../utils/bookingFlowCopy';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverAssigned'>;

export default function DriverAssignedScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const { booking: draftBooking } = useDriverBooking();
  const bookingId = route.params?.bookingId;
  const booking = useBookingQuery(bookingId ?? '', 'driver');
  const { etaMinutes, driverName, driverPhone, status: trackedStatus } = useBookingTracking(
    bookingId,
    'driver',
  );
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const unifiedStatus = mergeLiveStatus(trackedStatus, booking?.unifiedStatus);
  const hasNamedPartner = bookingHasNamedPartner(
    driverName ? { name: driverName } : booking?.driver,
  );
  const partnerPending = !hasNamedPartner;
  const presentation = booking
    ? getCustomerBookingPresentation({ ...booking, unifiedStatus })
    : null;
  const name = trackPartnerDisplayName(
    'driver',
    unifiedStatus,
    partnerPending,
    driverName ?? booking?.driver?.name,
  );
  const phone = driverPhone ?? booking?.driver?.phone ?? brand.phoneRaw;
  const matchingPhase = ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED'].includes(unifiedStatus);
  const showEnRouteEta =
    unifiedStatus === 'DRIVER_EN_ROUTE' ||
    unifiedStatus === 'DRIVER_ARRIVED' ||
    unifiedStatus === 'IN_PROGRESS';
  const etaLine = trackEtaForStage('driver', unifiedStatus, etaMinutes ?? booking?.etaMinutes);
  const headline = presentation?.statusPill ?? (matchingPhase ? 'Finding driver' : 'Driver assigned');
  const subline = presentation?.dispatchHint ?? 'Sent to available drivers near you.';

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
    if (enRouteStatuses.includes(unifiedStatus)) {
      const timer = setTimeout(() => {
        navigation.replace('DriverTrack', {
          bookingId,
          bookingType: 'driver',
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [bookingId, navigation, unifiedStatus]);

  if (bookingId && !booking && partnerPending) {
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
      onBack={() => goBackWithinStack(navigation)}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', paddingTop: t.px(4) }}>
          <Animated.View
            style={{
              width: t.px(72),
              height: t.px(72),
              borderRadius: t.px(36),
              backgroundColor: matchingPhase && partnerPending ? '#FFF7ED' : colors.success,
              borderWidth: matchingPhase && partnerPending ? 2 : 0,
              borderColor: '#F59E0B',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: t.px(14),
              transform: [{ scale: scaleAnim }],
            }}>
            <Check
              size={t.px(34)}
              color={matchingPhase && partnerPending ? '#C2410C' : colors.background}
              strokeWidth={3}
            />
          </Animated.View>

          <Text
            style={{
              fontSize: t.px(22),
              fontWeight: typography.weights.bold,
              color: matchingPhase && partnerPending ? '#C2410C' : colors.success,
              marginBottom: t.px(6),
              textAlign: 'center',
            }}>
            {headline}
          </Text>
          {matchingPhase && partnerPending ? (
            <Text
              style={{
                fontSize: t.body,
                color: colors.grey,
                textAlign: 'center',
                marginBottom: t.px(14),
                lineHeight: t.px(20),
                paddingHorizontal: t.px(8),
              }}>
              {subline}
            </Text>
          ) : null}

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
                  textAlign: 'center',
                }}>
                {showEnRouteEta ? 'Arriving in' : 'Status'}
              </Text>
              <Text
                style={{
                  fontSize: showEnRouteEta ? t.px(32) : t.px(16),
                  fontWeight: typography.weights.extrabold,
                  color: showEnRouteEta ? colors.primary : colors.dark,
                  textAlign: 'center',
                  lineHeight: t.px(22),
                  paddingHorizontal: t.px(8),
                }}>
                {etaLine}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: t.px(10), width: '100%', marginTop: t.px(16) }}>
            <Pressable
              onPress={() => void Linking.openURL(`tel:${phone}`)}
              disabled={!hasNamedPartner}
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
                opacity: hasNamedPartner ? 1 : 0.5,
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
