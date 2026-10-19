import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Clock, MapPin, Navigation, Radio } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LiveTripMap from '../../../components/booking/LiveTripMap';
import DriverAvatar from '../../../components/bookings/DriverAvatar';
import TripOtpCard from '../../../components/booking/TripOtpCard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { useBookingTracking } from '../../../hooks/useBookingTracking';
import { useBookingQuery } from '../../../services/bookings/useBookingQueries';
import type { BookingsStackParamList, HomeStackParamList } from '../../../types/navigation';
import {
  formatBookingDisplayId,
  formatUnifiedStatusLabel,
  isCompletedUnifiedStatus,
} from '../../../utils/bookingDisplay';
import { formatLocationDisplay } from '../../../utils/readableAddress';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList & BookingsStackParamList, 'DriverTrack'>;

const TRACK_STEPS = ['Assigned', 'On the Way', 'Arrived', 'Completed'];

function stepIndexForStatus(status: string): number {
  switch (status) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'DRIVER_ASSIGNED':
      return 0;
    case 'DRIVER_EN_ROUTE':
      return 1;
    case 'DRIVER_ARRIVED':
    case 'IN_PROGRESS':
      return 2;
    case 'COMPLETED':
    case 'RATED':
      return 3;
    default:
      return 0;
  }
}

export default function DriverTrackScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const bookingId = route.params?.bookingId;
  const fromBookings = route.params?.fromBookings;
  const booking = useBookingQuery(bookingId ?? '', 'driver');
  const { etaLabel, status, driverLocation, driverName, driverRating, tripStartOtp: trackedOtp } =
    useBookingTracking(bookingId, 'driver');
  const tripOtp = booking?.tripStartOtp ?? trackedOtp;
  const displayDriverName =
    driverName ?? booking?.driver?.name ?? 'Assigning driver';
  const hasAssignedDriver = Boolean(driverName ?? booking?.driver?.name);
  const fleetVehicleLabel = booking?.assignedFleetVehicleLabel;
  const activeStep = useMemo(() => stepIndexForStatus(status), [status]);
  const isCompleted = isCompletedUnifiedStatus(status);

  const trackParams = bookingId
    ? { bookingId, bookingType: 'driver' as const, fromBookings }
    : undefined;

  const handleContinue = () => {
    if (fromBookings) {
      navigation.goBack();
      return;
    }
    if (isCompleted && bookingId) {
      navigation.navigate('TowingRate', { bookingId, bookingType: 'driver' });
      return;
    }
    if (trackParams) {
      navigation.navigate('DriverOnWay', trackParams);
    }
  };

  if (bookingId && !booking) {
    return (
      <TowingBookingLayout title="Live Tracking" step={6} headerVariant="inline" hideFooter>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </TowingBookingLayout>
    );
  }

  return (
    <TowingBookingLayout
      title="Live Tracking"
      step={6}
      headerVariant="inline"
      onBack={() => navigation.goBack()}
      buttonLabel={fromBookings ? 'Back to Bookings' : isCompleted ? 'Rate Experience' : 'Continue'}
      onContinue={handleContinue}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.px(8),
            marginBottom: t.px(10),
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.px(5),
              paddingHorizontal: t.px(10),
              paddingVertical: t.px(4),
              borderRadius: t.px(20),
              backgroundColor: '#FEE2E2',
            }}>
            <Radio size={t.px(12)} color={colors.error} />
            <Text
              style={{
                fontSize: t.caption,
                fontWeight: typography.weights.bold,
                color: colors.error,
              }}>
              LIVE
            </Text>
          </View>
          <Text style={{ fontSize: t.caption, color: colors.grey }}>
            {booking ? formatBookingDisplayId(booking.bookingNumber) : 'Driver'} ·{' '}
            {formatUnifiedStatusLabel(status)}
          </Text>
        </View>

        <View style={{ flex: 1, marginBottom: t.px(12), minHeight: t.px(200) }}>
          <LiveTripMap
            borderRadius={t.px(16)}
            style={{ flex: 1 }}
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
                    label: displayDriverName,
                  }
                : null
            }
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: t.px(14),
            paddingHorizontal: t.px(4),
          }}>
          {TRACK_STEPS.map((step, index) => {
            const active = index <= activeStep;
            return (
              <View key={step} style={{ alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: t.px(10),
                    height: t.px(10),
                    borderRadius: t.px(5),
                    backgroundColor: active ? colors.primary : colors.border,
                    marginBottom: t.px(4),
                  }}
                />
                <Text
                  style={{
                    fontSize: t.px(9),
                    fontWeight: active ? typography.weights.bold : typography.weights.semibold,
                    color: active ? colors.dark : colors.grey,
                    textAlign: 'center',
                  }}>
                  {step}
                </Text>
              </View>
            );
          })}
        </View>

        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              padding: t.rowPadding,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.px(10),
              marginBottom: t.px(10),
            },
            shadows.card,
          ]}>
          <Clock size={t.iconSm} color={colors.primary} />
          <Text
            style={{
              fontSize: t.bodyLarge,
              fontWeight: typography.weights.semibold,
              color: colors.dark,
            }}>
            ETA: <Text style={{ color: colors.primary }}>{etaLabel}</Text>
          </Text>
          <Navigation size={t.iconSm} color={colors.grey} style={{ marginLeft: 'auto' }} />
        </View>

        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              padding: t.rowPadding,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.px(12),
            },
            shadows.card,
          ]}>
          <DriverAvatar size={t.px(44)} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: t.bodyLarge,
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              {displayDriverName}
            </Text>
            {hasAssignedDriver && driverRating != null ? (
              <Text style={{ fontSize: t.caption, color: colors.grey, marginBottom: t.px(2) }}>
                ★ {driverRating.toFixed(1)} · Assigned driver
              </Text>
            ) : null}
            {fleetVehicleLabel ? (
              <Text style={{ fontSize: t.caption, color: colors.grey, marginBottom: t.px(2) }}>
                Vehicle: {fleetVehicleLabel}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(4) }}>
              <MapPin size={t.px(12)} color={colors.grey} />
              <Text style={{ fontSize: t.caption, color: colors.grey }}>
                Driver hire · {formatLocationDisplay(booking?.pickup) || 'Pickup en route'}
              </Text>
            </View>
            {driverLocation ? (
              <Text style={{ fontSize: t.caption, color: colors.success, marginTop: t.px(2) }}>
                Partner location updating live
              </Text>
            ) : status === 'DRIVER_ASSIGNED' ? (
              <Text style={{ fontSize: t.caption, color: colors.warning, marginTop: t.px(2) }}>
                Driver allotted · Awaiting confirmation & start
              </Text>
            ) : null}
          </View>
        </View>

        {tripOtp ? (
          <View style={{ marginTop: t.px(12) }}>
            <TripOtpCard
              otp={tripOtp}
              subtitle="Share this code with your driver when they arrive to start the trip."
            />
          </View>
        ) : null}
      </View>
    </TowingBookingLayout>
  );
}
