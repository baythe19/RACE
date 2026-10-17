import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { AlertTriangle, Clock, MapPin, Tag, Wrench } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LucideIcon } from 'lucide-react-native';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import {
  ROADSIDE_ACCENT,
  ROADSIDE_ACCENT_LIGHT,
  ROADSIDE_ETA_MINUTES,
  getRoadsideServiceLabel,
  getRoadsideServicePrice,
} from '../../../constants/roadsideBooking';
import { useRoadsideBooking } from '../../../context/RoadsideBookingContext';
import { useServiceBookingPayment } from '../../../hooks/useServiceBookingPayment';
import { createRoadsideBooking } from '../../../services/bookings/serviceBookingApi';
import {
  isPreviewBookingMode,
  previewAdvancePayment,
  previewTowingBooking,
} from '../../../services/bookings/previewBooking';
import { useVehicleStore } from '../../../store/vehicleStore';
import { buildRoadsideBookingRequest } from '../../../utils/serviceBookingPayload';
import { roadsideServiceIdToSlug } from '../../../utils/roadsideServiceMap';
import { formatLocationDisplay } from '../../../utils/readableAddress';
import type { HomeStackParamList } from '../../../types/navigation';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideReview'>;

function ReviewRow({
  Icon,
  label,
  value,
  valueColor = colors.dark,
  t,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  valueColor?: string;
  t: ReturnType<typeof useBookingTheme>['t'];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: t.px(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
      <View
        style={{
          width: t.px(40),
          height: t.px(40),
          borderRadius: t.px(20),
          backgroundColor: ROADSIDE_ACCENT_LIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={t.px(18)} color={colors.dark} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, marginLeft: t.px(12) }}>
        <Text
          style={{
            fontSize: t.caption,
            fontWeight: typography.weights.semibold,
            color: colors.grey,
            marginBottom: t.px(2),
          }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: t.bodyLarge,
            fontWeight: typography.weights.bold,
            color: valueColor,
          }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function RoadsideReviewScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, resetBooking } = useRoadsideBooking();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { confirmExistingBooking, isConfirming } = useServiceBookingPayment();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchVehicles().catch((error) => {
      if (__DEV__) {
        console.warn('[RoadsideReview] fetchVehicles failed', error);
      }
    });
  }, [fetchVehicles]);

  const handleConfirm = async () => {
    if (isSubmitting || isConfirming) return;
    setIsSubmitting(true);

    try {
      const serviceType = roadsideServiceIdToSlug(booking.serviceId);
      const payload = buildRoadsideBookingRequest(booking, vehicles, serviceType);

      // BUG-C1: preview vehicles are local ids the backend rejects — demo the
      // whole roadside confirm in preview mode.
      if (__DEV__ && isPreviewBookingMode()) {
        const previewBooking = previewTowingBooking({
          vehicleId: payload.vehicleId,
          pickup: payload.pickup,
          dropoff: payload.dropoff ?? payload.pickup,
          towingMode: 'instant',
        });
        previewAdvancePayment(previewBooking.id, 'towing');
        resetBooking();
        navigation.navigate('RoadsideHelpOnWay');
        return;
      }

      if (!__DEV__) {
        throw new Error('Online booking payments are not configured yet.');
      }
      const response = await createRoadsideBooking(payload);

      if (!response.available) {
        Alert.alert('Coming soon', response.message ?? 'This service is not available yet.');
        return;
      }

      if (response.booking) {
        await confirmExistingBooking(response.booking.id, 'towing');
        resetBooking();
        navigation.navigate('RoadsideHelpOnWay');
        return;
      }

      Alert.alert('Booking failed', 'Unable to create roadside booking. Please try again.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Add a vehicle')) {
        Alert.alert('Vehicle required', 'Add a vehicle in Profile before booking roadside help.');
        return;
      }
      if (error instanceof Error && error.message.includes('map')) {
        Alert.alert('Location required', error.message);
        return;
      }
      Alert.alert('Booking failed', 'Something went wrong, please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isConfirming;

  const rows = [
    { Icon: Wrench, label: 'Service', value: getRoadsideServiceLabel(booking.serviceId) },
    { Icon: MapPin, label: 'Location', value: formatLocationDisplay({ address: booking.location, displayLabel: booking.locationLabel }) },
    { Icon: Clock, label: 'ETA', value: `${ROADSIDE_ETA_MINUTES} minutes` },
    {
      Icon: Tag,
      label: 'Price',
      value: `₹${getRoadsideServicePrice(booking.serviceId)}`,
      valueColor: ROADSIDE_ACCENT,
    },
  ];

  return (
    <TowingBookingLayout
      title="Review & Confirm"
      step={3}
      accentColor={ROADSIDE_ACCENT}
      onBack={() => navigation.goBack()}
      buttonLabel={isBusy ? 'Confirming...' : 'Confirm & Get Help'}
      continueDisabled={isBusy}
      onContinue={() => void handleConfirm()}
      footerNote={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.px(10),
            borderRadius: t.inputRadius,
            backgroundColor: ROADSIDE_ACCENT_LIGHT,
            paddingHorizontal: t.px(14),
            paddingVertical: t.px(12),
            marginBottom: t.px(4),
          }}>
          <AlertTriangle size={t.iconSm} color={ROADSIDE_ACCENT} strokeWidth={2} />
          <Text style={{ flex: 1, fontSize: t.body, color: colors.dark }}>
            Professional will arrive within{' '}
            <Text style={{ fontWeight: typography.weights.bold, color: ROADSIDE_ACCENT }}>
              {ROADSIDE_ETA_MINUTES} min
            </Text>
          </Text>
        </View>
      }
      footerNoteBelow={
        <Text
          style={{
            fontSize: t.caption,
            color: colors.grey,
            textAlign: 'center',
            marginTop: t.px(2),
            marginBottom: t.px(4),
          }}>
          No charge if we can't help
        </Text>
      }>
      {isBusy ? (
        <View style={{ alignItems: 'center', paddingVertical: t.px(12) }}>
          <ActivityIndicator color={ROADSIDE_ACCENT} />
        </View>
      ) : null}
      <View
        style={[
          {
            borderRadius: t.cardRadius,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: t.cardPadding,
            paddingTop: t.px(4),
            paddingBottom: t.px(4),
          },
          shadows.card,
        ]}>
        {rows.map(row => (
          <ReviewRow
            key={row.label}
            Icon={row.Icon}
            label={row.label}
            value={row.value}
            valueColor={row.valueColor}
            t={t}
          />
        ))}
      </View>
    </TowingBookingLayout>
  );
}
