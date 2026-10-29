import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { AlertTriangle, Clock, MapPin, Wrench } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  ROADSIDE_ACCENT,
  ROADSIDE_ACCENT_LIGHT,
  ROADSIDE_BOOKING_STEP_LABELS,
  ROADSIDE_ETA_MINUTES,
  getRoadsideServiceLabel,
  getRoadsideServicePrice,
} from '../../../constants/roadsideBooking';
import { useRoadsideBooking } from '../../../context/RoadsideBookingContext';
import { useServiceBookingPayment } from '../../../hooks/useServiceBookingPayment';
import { createRoadsideBooking } from '../../../services/bookings/serviceBookingApi';
import { getApiErrorMessage } from '../../../services/api';
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
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideReview'>;

function ReviewSection({
  label,
  children,
  t,
}: {
  label: string;
  children: React.ReactNode;
  t: ReturnType<typeof useBookingTheme>['t'];
}) {
  return (
    <View
      style={[
        {
          borderRadius: t.cardRadius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: t.cardPadding,
          paddingVertical: t.px(12),
          gap: t.px(8),
        },
        shadows.cardSoft,
      ]}>
      <Text
        style={{
          fontSize: t.caption,
          fontWeight: typography.weights.semibold,
          color: colors.grey,
        }}>
        {label}
      </Text>
      {children}
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
      await useVehicleStore.getState().fetchVehicles().catch(() => undefined);
      const latestVehicles = useVehicleStore.getState().vehicles;
      const serviceType = roadsideServiceIdToSlug(booking.serviceId);
      const payload = buildRoadsideBookingRequest(
        {
          ...booking,
          location: booking.landmark?.trim()
            ? `${booking.location} (${booking.landmark.trim()})`
            : booking.location,
        },
        latestVehicles.length ? latestVehicles : vehicles,
        serviceType,
      );

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

      const response = await createRoadsideBooking(payload);

      if (!response.available) {
        Alert.alert('Coming soon', response.message ?? 'This service is not available yet.');
        return;
      }

      if (response.booking) {
        try {
          await confirmExistingBooking(response.booking.id, 'towing');
        } catch {
          // confirmExistingBooking already shows the payment error.
          return;
        }
        resetBooking();
        navigation.navigate('RoadsideHelpOnWay');
        return;
      }

      Alert.alert('Booking failed', 'Unable to create roadside booking. Please try again.');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Something went wrong, please try again.');
      if (message.toLowerCase().includes('vehicle')) {
        Alert.alert('Vehicle required', message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Vehicle',
            onPress: () => {
              const parent = navigation.getParent();
              if (parent) {
                (parent as { navigate: (name: string, params: object) => void }).navigate(
                  'Profile',
                  { screen: 'AddVehicle' },
                );
              }
            },
          },
        ]);
        return;
      }
      Alert.alert('Booking failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isConfirming;

  const locationLine = formatLocationDisplay({
    address: booking.location,
    displayLabel: booking.locationLabel,
  });
  const serviceLabel = getRoadsideServiceLabel(booking.serviceId);
  const price = getRoadsideServicePrice(booking.serviceId);

  return (
    <TowingBookingLayout
      title="Confirm request"
      step={2}
      stepLabels={ROADSIDE_BOOKING_STEP_LABELS}
      accentColor={ROADSIDE_ACCENT}
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel={isBusy ? 'Confirming…' : 'Confirm & get help'}
      continueDisabled={isBusy}
      onContinue={() => void handleConfirm()}
      footerNote={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: t.px(10),
            borderRadius: t.inputRadius,
            borderWidth: 1,
            borderColor: '#FDE8C4',
            backgroundColor: ROADSIDE_ACCENT_LIGHT,
            paddingHorizontal: t.px(12),
            paddingVertical: t.px(10),
            marginBottom: t.px(4),
          }}>
          <AlertTriangle
            size={t.px(18)}
            color={ROADSIDE_ACCENT}
            strokeWidth={2}
            style={{ marginTop: t.px(1) }}
          />
          <View style={{ flex: 1, gap: t.px(2) }}>
            <Text
              style={{
                fontSize: t.px(13),
                fontWeight: typography.weights.semibold,
                color: colors.dark,
                lineHeight: t.px(18),
              }}>
              Pro reaches you in{' '}
              <Text style={{ color: ROADSIDE_ACCENT }}>~{ROADSIDE_ETA_MINUTES} min</Text> after
              you confirm.
            </Text>
            <Text
              style={{
                fontSize: t.px(12),
                fontWeight: typography.weights.regular,
                color: colors.grey,
                lineHeight: t.px(16),
              }}>
              Live tracking starts once you tap confirm.
            </Text>
          </View>
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
          No charge if we can't help on arrival
        </Text>
      }>
      <WizardStepFade>
        {isBusy ? (
          <View style={{ alignItems: 'center', paddingVertical: t.px(12) }}>
            <ActivityIndicator color={ROADSIDE_ACCENT} />
          </View>
        ) : null}

        <View style={{ gap: t.px(10) }}>
          <ReviewSection label="Service" t={t}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(12) }}>
              <View
                style={{
                  width: t.px(40),
                  height: t.px(40),
                  borderRadius: t.px(20),
                  backgroundColor: ROADSIDE_ACCENT_LIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Wrench size={t.px(20)} color={colors.dark} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: t.bodyLarge,
                    fontWeight: typography.weights.semibold,
                    color: colors.dark,
                  }}>
                  {serviceLabel}
                </Text>
                <Text
                  style={{
                    fontSize: t.caption,
                    color: colors.grey,
                    marginTop: t.px(2),
                    lineHeight: t.px(16),
                  }}>
                  Mechanic comes to your vehicle
                </Text>
              </View>
            </View>
          </ReviewSection>

          <ReviewSection label="Meet here" t={t}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.px(8) }}>
              <MapPin size={t.px(18)} color="#10B981" strokeWidth={2.2} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: t.body,
                    fontWeight: typography.weights.semibold,
                    color: colors.dark,
                    lineHeight: t.px(20),
                  }}>
                  {locationLine}
                </Text>
                {booking.landmark?.trim() ? (
                  <Text
                    style={{
                      fontSize: t.caption,
                      color: colors.grey,
                      marginTop: t.px(4),
                      lineHeight: t.px(16),
                    }}>
                    {booking.landmark.trim()}
                  </Text>
                ) : null}
              </View>
            </View>
          </ReviewSection>

          <ReviewSection label="Timing & fee" t={t}>
            <View style={{ flexDirection: 'row', gap: t.px(10) }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: t.px(12),
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.pageBg,
                  paddingVertical: t.px(10),
                  paddingHorizontal: t.px(8),
                  alignItems: 'center',
                }}>
                <Clock size={t.px(16)} color={colors.grey} strokeWidth={2} />
                <Text
                  style={{
                    fontSize: t.px(11),
                    color: colors.grey,
                    marginTop: t.px(4),
                  }}>
                  Est. arrival
                </Text>
                <Text
                  style={{
                    fontSize: t.px(16),
                    fontWeight: typography.weights.semibold,
                    color: colors.dark,
                    marginTop: t.px(2),
                  }}>
                  ~{ROADSIDE_ETA_MINUTES} min
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: t.px(12),
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.pageBg,
                  paddingVertical: t.px(10),
                  paddingHorizontal: t.px(8),
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    fontSize: t.px(18),
                    fontWeight: typography.weights.semibold,
                    color: ROADSIDE_ACCENT,
                  }}>
                  ₹{price}
                </Text>
                <Text
                  style={{
                    fontSize: t.px(11),
                    color: colors.grey,
                    marginTop: t.px(4),
                  }}>
                  Service fee
                </Text>
                <Text
                  style={{
                    fontSize: t.px(10),
                    color: colors.grey,
                    marginTop: t.px(2),
                  }}>
                  Pay after help
                </Text>
              </View>
            </View>
          </ReviewSection>
        </View>
      </WizardStepFade>
    </TowingBookingLayout>
  );
}
