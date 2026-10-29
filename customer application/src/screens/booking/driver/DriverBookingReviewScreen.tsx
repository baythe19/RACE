import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { CalendarClock, Car, MapPin, Wrench } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DriverFareBreakdownCard } from '../../../components/booking/FareBreakdownCard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import {
  DRIVER_ACCENT,
  DRIVER_PACKAGES,
  getDateLabel,
  getDriverTypeLabel,
  getShortLocation,
  getTimeLabel,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { estimateDriverFare } from '../../../services/bookings/fareApi';
import type { HomeStackParamList } from '../../../types/navigation';
import type { DriverFareBreakdown } from '../../../types/fare';
import { calculateDriverPricing, formatRupee } from '../../../utils/driverPricing';
import { getVehicleCategoryLabel } from '../../../utils/vehicleCategory';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverBookingReview'>;

export default function DriverBookingReviewScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const [fareBreakdown, setFareBreakdown] = useState<DriverFareBreakdown | null>(
    booking.fareBreakdown ?? null,
  );
  const [isLoadingFare, setIsLoadingFare] = useState(false);

  const localPricing = useMemo(
    () =>
      calculateDriverPricing(
        booking.packageHours,
        booking.vehicleCategory ?? 'hatchback',
        booking.driverType,
      ),
    [booking.packageHours, booking.vehicleCategory, booking.driverType],
  );

  const selectedPackage = DRIVER_PACKAGES.find(pkg => pkg.hours === booking.packageHours);

  useEffect(() => {
    let cancelled = false;

    async function loadFare() {
      setIsLoadingFare(true);
      try {
        const estimate = await estimateDriverFare({
          packageHours: booking.packageHours,
          vehicleCategory: booking.vehicleCategory ?? 'hatchback',
        });
        if (!cancelled) {
          setFareBreakdown(estimate.fareBreakdown);
        }
      } catch {
        if (!cancelled) {
          setFareBreakdown(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFare(false);
        }
      }
    }

    void loadFare();
    return () => {
      cancelled = true;
    };
  }, [booking.packageHours, booking.vehicleCategory]);

  const totalPrice = fareBreakdown?.totalFare ?? localPricing.totalPrice;
  const advancePayment = fareBreakdown?.advanceAmount ?? localPricing.advancePayment;

  const rows = [
    { Icon: Wrench, label: 'Service Type', value: getDriverTypeLabel(booking.driverType) },
    { Icon: Car, label: 'Vehicle', value: booking.vehicleLabel || '—' },
    { Icon: MapPin, label: 'Pickup', value: getShortLocation(booking.pickup, booking.pickupLabel) },
    {
      Icon: CalendarClock,
      label: 'Date & Time',
      value: `${getDateLabel(booking.dateId)}, ${getTimeLabel(booking.timeId)}`,
    },
    {
      Icon: CalendarClock,
      label: 'Package',
      value: selectedPackage
        ? `${selectedPackage.label} · ${selectedPackage.sublabel}`
        : `${booking.packageHours} hours`,
    },
  ];

  const handleContinue = () => {
    if (!booking.vehicleId || isLoadingFare) return;

    updateBooking({
      packageHours: booking.packageHours,
      hours: booking.packageHours,
      subtotal: totalPrice,
      totalPrice,
      advancePayment,
      includedKm: fareBreakdown?.includedKm ?? selectedPackage?.km ?? localPricing.includedKm,
      fareBreakdown: fareBreakdown ?? undefined,
    });
    navigation.navigate('DriverBookingPayment');
  };

  return (
    <TowingBookingLayout
      title="Review & Confirm"
      step={4}
      accentColor={DRIVER_ACCENT}
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel="Continue"
      onContinue={handleContinue}
      continueDisabled={!booking.vehicleId || isLoadingFare || totalPrice <= 0}
      footerNoteBelow={
        <Text
          style={{
            fontSize: t.caption,
            color: colors.grey,
            textAlign: 'center',
            marginTop: t.px(2),
            marginBottom: t.px(4),
          }}>
          You won't be charged until service begins
        </Text>
      }>
      <View style={{ gap: t.px(14), paddingBottom: t.px(8) }}>
        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              paddingHorizontal: t.cardPadding,
              paddingTop: t.px(10),
              paddingBottom: t.px(18),
            },
            shadows.card,
          ]}>
          <View style={{ gap: t.px(4) }}>
            {rows.map(row => (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: t.px(6),
                }}>
                <row.Icon size={t.iconSm} color={colors.dark} strokeWidth={2} />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: t.px(12),
                    fontSize: t.bodyLarge,
                    fontWeight: typography.weights.semibold,
                    color: colors.dark,
                  }}>
                  {row.label}
                </Text>
                <Text
                  style={{
                    fontSize: t.body,
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                    textAlign: 'right',
                    flexShrink: 1,
                    maxWidth: '48%',
                  }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {booking.vehicleCategory ? (
            <Text style={{ fontSize: t.caption, color: colors.grey, marginTop: t.px(8) }}>
              Vehicle category: {getVehicleCategoryLabel(booking.vehicleCategory)}
            </Text>
          ) : null}
        </View>

        {isLoadingFare ? (
          <View style={{ alignItems: 'center', paddingVertical: t.px(20) }}>
            <ActivityIndicator color={DRIVER_ACCENT} />
            <Text style={{ marginTop: t.px(8), fontSize: t.caption, color: colors.grey }}>
              Loading fare estimate...
            </Text>
          </View>
        ) : fareBreakdown ? (
          <DriverFareBreakdownCard breakdown={fareBreakdown} accentColor={DRIVER_ACCENT} />
        ) : (
          <View
            style={{
              borderRadius: t.cardRadius,
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: DRIVER_ACCENT,
              padding: t.px(16),
              gap: t.px(8),
            }}>
            <Text
              style={{
                fontSize: t.labelBold,
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              Price Estimate
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: t.body, color: colors.grey }}>Total</Text>
              <Text
                style={{
                  fontSize: t.px(28),
                  fontWeight: typography.weights.extrabold,
                  color: DRIVER_ACCENT,
                }}>
                {formatRupee(totalPrice)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: t.body, color: colors.grey }}>Advance (30%)</Text>
              <Text
                style={{
                  fontSize: t.px(20),
                  fontWeight: typography.weights.extrabold,
                  color: DRIVER_ACCENT,
                }}>
                {formatRupee(advancePayment)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TowingBookingLayout>
  );
}
