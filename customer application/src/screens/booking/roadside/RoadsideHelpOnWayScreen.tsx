import React, { useMemo } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { MapPin, Phone, Wrench } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { useBookingTracking } from '../../../hooks/useBookingTracking';
import { useBookingQuery } from '../../../services/bookings/useBookingQueries';
import { ROADSIDE_ACCENT } from '../../../constants/roadsideBooking';
import { brand } from '../../../theme/brand';
import type { HomeStackParamList } from '../../../types/navigation';
import { formatBookingDisplayId, getCustomerBookingPresentation } from '../../../utils/bookingDisplay';
import { formatLocationCard } from '../../../utils/readableAddress';
import {
  ROADSIDE_HELP_STEPS,
  roadsideHelpCopy,
  roadsideHelpPhase,
  roadsideHelpStepIndex,
} from '../../../utils/roadsideHelpUi';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideHelpOnWay'>;

export default function RoadsideHelpOnWayScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const bookingId = route.params?.bookingId;
  const booking = useBookingQuery(bookingId ?? '', 'towing');
  const { status: trackedStatus, etaMinutes, driverName, driverPhone } = useBookingTracking(
    bookingId,
    'towing',
  );

  const unifiedStatus = booking?.unifiedStatus ?? trackedStatus ?? 'CONFIRMED';
  const dispatchHint = booking
    ? getCustomerBookingPresentation(booking).dispatchHint
    : 'Roadside jobs broadcast to vendor partners near you.';
  const hasPartnerName = Boolean(driverName ?? booking?.driver?.name);
  const phase = roadsideHelpPhase(unifiedStatus, hasPartnerName);
  const copy = roadsideHelpCopy(phase);
  const activeStep = roadsideHelpStepIndex(phase);

  const locationCard = useMemo(
    () =>
      booking?.pickup
        ? formatLocationCard({
            address: booking.pickup.address,
            label: booking.pickup.label,
          })
        : null,
    [booking?.pickup],
  );

  const showPartnerRow =
    hasPartnerName &&
    (phase === 'en_route' || phase === 'at_site' || phase === 'completed');
  const partnerName = driverName ?? booking?.driver?.name ?? 'Partner';
  const partnerPhone = driverPhone ?? booking?.driver?.phone;
  const showEta = phase === 'en_route' && etaMinutes != null;

  const goBookings = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Bookings' as never);
    } else {
      navigation.navigate('HomeMain' as never);
    }
  };

  const callHelpline = () => {
    void Linking.openURL(`tel:${brand.phoneRaw}`);
  };

  const callPartner = () => {
    const phone = partnerPhone?.trim();
    if (phone) void Linking.openURL(`tel:${phone}`);
    else callHelpline();
  };

  return (
    <TowingBookingLayout
      title="Roadside help"
      step={0}
      showStep={false}
      accentColor={ROADSIDE_ACCENT}
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel="Open in Bookings"
      onContinue={goBookings}
      secondaryLabel="Call helpline"
      onSecondary={callHelpline}
      secondaryVariant="outline">
      <View style={{ gap: t.px(16), paddingBottom: t.px(4) }}>
        {!bookingId ? (
          <Text style={{ fontSize: t.body, color: colors.grey, textAlign: 'center' }}>
            Your request was submitted. Open Bookings to track live updates.
          </Text>
        ) : !booking ? (
          <View style={{ alignItems: 'center', paddingVertical: t.px(24) }}>
            <ActivityIndicator color={ROADSIDE_ACCENT} />
          </View>
        ) : (
          <>
            <View
              style={{
                borderRadius: t.px(16),
                borderWidth: 1,
                borderColor: '#E7E5E4',
                backgroundColor: colors.background,
                padding: t.px(16),
                gap: t.px(12),
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.px(12) }}>
                <View
                  style={{
                    width: t.px(44),
                    height: t.px(44),
                    borderRadius: t.px(12),
                    backgroundColor: '#FFF7ED',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Wrench size={t.px(22)} color={ROADSIDE_ACCENT} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      paddingHorizontal: t.px(10),
                      paddingVertical: t.px(4),
                      borderRadius: t.px(8),
                      backgroundColor: '#F5F5F4',
                      marginBottom: t.px(8),
                    }}>
                    <Text
                      style={{
                        fontSize: t.px(11),
                        fontWeight: typography.weights.bold,
                        color: colors.dark,
                      }}>
                      {copy.chip}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: t.px(17),
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {copy.title}
                  </Text>
                  <Text
                    style={{
                      marginTop: t.px(4),
                      fontSize: t.px(13),
                      color: colors.grey,
                      lineHeight: t.px(18),
                    }}>
                    {copy.subtitle}
                  </Text>
                  {showEta ? (
                    <Text
                      style={{
                        marginTop: t.px(8),
                        fontSize: t.px(14),
                        fontWeight: typography.weights.semibold,
                        color: ROADSIDE_ACCENT,
                      }}>
                      ETA ~{etaMinutes} min
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />

              <View style={{ gap: t.px(6) }}>
                <Text style={{ fontSize: t.px(11), color: colors.grey }}>
                  {formatBookingDisplayId(booking.bookingNumber)}
                  {booking.serviceLabel ? ` · ${booking.serviceLabel}` : ''}
                </Text>
                {locationCard ? (
                  <View style={{ flexDirection: 'row', gap: t.px(8), alignItems: 'flex-start' }}>
                    <MapPin size={t.px(16)} color="#10B981" strokeWidth={2.2} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: t.px(14),
                          fontWeight: typography.weights.semibold,
                          color: colors.dark,
                        }}>
                        {locationCard.primary}
                      </Text>
                      {locationCard.secondary ? (
                        <Text style={{ fontSize: t.px(12), color: colors.grey, marginTop: 2 }}>
                          {locationCard.secondary}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.px(4) }}>
                {ROADSIDE_HELP_STEPS.map((label, index) => {
                  const done = index < activeStep;
                  const active = index === activeStep;
                  return (
                    <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                      <View
                        style={{
                          width: t.px(8),
                          height: t.px(8),
                          borderRadius: t.px(4),
                          backgroundColor: done || active ? ROADSIDE_ACCENT : '#E5E7EB',
                        }}
                      />
                      <Text
                        numberOfLines={1}
                        style={{
                          marginTop: t.px(6),
                          fontSize: t.px(9),
                          fontWeight: active ? typography.weights.bold : typography.weights.medium,
                          color: active ? colors.dark : colors.grey,
                        }}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {showPartnerRow ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.px(12),
                  borderRadius: t.px(14),
                  borderWidth: 1,
                  borderColor: '#E7E5E4',
                  padding: t.px(12),
                }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: t.px(11), color: colors.grey }}>Assigned partner</Text>
                  <Text
                    style={{
                      marginTop: t.px(2),
                      fontSize: t.px(15),
                      fontWeight: typography.weights.semibold,
                      color: colors.dark,
                    }}>
                    {partnerName}
                  </Text>
                  {booking.assignedFleetVehicleLabel ? (
                    <Text style={{ marginTop: t.px(2), fontSize: t.px(11), color: colors.grey }}>
                      {booking.assignedFleetVehicleLabel}
                    </Text>
                  ) : null}
                </View>
                {partnerPhone ? (
                  <Pressable
                    onPress={callPartner}
                    style={{
                      width: t.px(44),
                      height: t.px(44),
                      borderRadius: t.px(12),
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Phone size={t.px(18)} color={colors.dark} strokeWidth={2.2} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Text
              style={{
                fontSize: t.px(12),
                color: colors.grey,
                textAlign: 'center',
                lineHeight: t.px(17),
              }}>
              {dispatchHint}
              {' '}
              Open Bookings for live map once a partner accepts and is en route.
            </Text>
          </>
        )}
      </View>
    </TowingBookingLayout>
  );
}
