import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AlarmClock, Calendar, Car, Clock, MapPin, User } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DriverFareBreakdownCard } from '../../../components/booking/FareBreakdownCard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  DRIVER_ACCENT,
  DRIVER_LIGHT_BG,
  DRIVER_PACKAGES,
  getDateReviewLabel,
  getDriverTypeLabel,
  getDurationReviewLabel,
  getShortLocation,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { estimateDriverFare } from '../../../services/bookings/fareApi';
import type { HomeStackParamList } from '../../../types/navigation';
import type { DriverDurationId } from '../../../types/driverBooking';
import type { DriverFareBreakdown, DriverPackageHours } from '../../../types/fare';
import { calculateDriverPricing, formatRupee } from '../../../utils/driverPricing';
import { parseStoredDate } from '../../../utils/driverCalendar';
import { getDriverServiceFlow } from '../../../utils/driverServiceFlow';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverReview'>;

const DURATION_TO_HOURS: Record<Exclude<DriverDurationId, 'custom'>, DriverPackageHours> = {
  '2': 2,
  '4': 4,
  '8': 8,
};

function SummaryRow({
  Icon,
  label,
  value,
  t,
  isLast = false,
}: {
  Icon: typeof Clock;
  label: string;
  value: string;
  t: ReturnType<typeof useBookingTheme>['t'];
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: t.px(12),
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}>
      <View
        style={{
          width: t.px(32),
          height: t.px(32),
          borderRadius: t.px(8),
          backgroundColor: DRIVER_LIGHT_BG,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={t.px(15)} color={DRIVER_ACCENT} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, marginLeft: t.px(12), minWidth: 0 }}>
        <Text style={{ fontSize: t.caption, color: colors.grey, marginBottom: t.px(2) }}>{label}</Text>
        <Text
          numberOfLines={2}
          style={{
            fontSize: t.body,
            fontWeight: typography.weights.semibold,
            color: colors.dark,
            lineHeight: t.px(20),
          }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function DriverReviewScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const flow = getDriverServiceFlow(booking.driverType);
  const [fareBreakdown, setFareBreakdown] = useState<DriverFareBreakdown | null>(
    booking.fareBreakdown ?? null,
  );
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const [fareUnavailable, setFareUnavailable] = useState(false);

  const packageHours: DriverPackageHours =
    booking.durationId === 'custom'
      ? booking.packageHours
      : DURATION_TO_HOURS[booking.durationId] ?? booking.packageHours;
  const vehicleCategory = booking.vehicleCategory ?? 'hatchback';
  const selectedPackage = DRIVER_PACKAGES.find(pkg => pkg.hours === packageHours);
  const chipRadius = t.px(12);

  const localPricing = useMemo(
    () => calculateDriverPricing(packageHours, vehicleCategory, booking.driverType),
    [packageHours, vehicleCategory, booking.driverType],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFare() {
      setIsLoadingFare(true);
      setFareUnavailable(false);
      try {
        const estimate = await estimateDriverFare({
          packageHours,
          vehicleCategory,
        });
        if (!cancelled) {
          setFareBreakdown(estimate.fareBreakdown);
        }
      } catch {
        if (!cancelled) {
          setFareBreakdown(null);
          setFareUnavailable(true);
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
  }, [packageHours, vehicleCategory]);

  useEffect(() => {
    if (!fareBreakdown) return;

    updateBooking({
      packageHours,
      hours: packageHours,
      subtotal: fareBreakdown.totalFare,
      totalPrice: fareBreakdown.totalFare,
      advancePayment: fareBreakdown.advanceAmount,
      includedKm: fareBreakdown.includedKm,
      fareBreakdown,
    });
  }, [fareBreakdown, packageHours, updateBooking]);

  const totalPrice = fareBreakdown?.totalFare ?? localPricing.totalPrice;
  const advancePayment = fareBreakdown?.advanceAmount ?? localPricing.advancePayment;
  const canContinue =
    Boolean(booking.vehicleId && booking.vehicleCategory) && !isLoadingFare && totalPrice > 0;

  const handleContinue = () => {
    if (!booking.vehicleCategory || !totalPrice) return;

    updateBooking({
      hours: packageHours,
      packageHours,
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
      title="Review booking"
      step={4}
      stepLabels={flow.wizardStepLabels}
      accentColor={DRIVER_ACCENT}
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel="Continue to pay"
      onContinue={handleContinue}
      continueDisabled={!canContinue}>
      <WizardStepFade>
      <View style={{ gap: t.px(14), paddingBottom: t.px(8) }}>
        <View
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.px(6),
            backgroundColor: DRIVER_LIGHT_BG,
            borderRadius: t.px(8),
            paddingHorizontal: t.px(10),
            paddingVertical: t.px(6),
          }}>
          <User size={t.px(13)} color={DRIVER_ACCENT} strokeWidth={2.4} />
          <Text
            style={{
              fontSize: t.caption,
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            {getDriverTypeLabel(booking.driverType)}
          </Text>
        </View>

        <View
          style={{
            borderRadius: chipRadius,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: t.px(14),
          }}>
          <SummaryRow
            Icon={Car}
            label="Vehicle"
            value={booking.vehicleLabel || '—'}
            t={t}
          />
          <SummaryRow
            Icon={Calendar}
            label="Date"
            value={getDateReviewLabel(parseStoredDate(booking.dateId))}
            t={t}
          />
          <SummaryRow
            Icon={Clock}
            label={flow.reviewDurationLabel}
            value={getDurationReviewLabel(booking.durationId, packageHours)}
            t={t}
          />
          <SummaryRow
            Icon={AlarmClock}
            label={booking.driverType === 'outstation' ? 'Departure' : 'Start time'}
            value={booking.startTime}
            t={t}
          />
          <SummaryRow
            Icon={MapPin}
            label={booking.driverType === 'outstation' ? 'Pickup' : 'Pickup'}
            value={getShortLocation(booking.pickup, booking.pickupLabel)}
            t={t}
            isLast={!flow.requiresDropoff || !booking.dropoff.trim()}
          />
          {flow.requiresDropoff && booking.dropoff.trim() ? (
            <SummaryRow
              Icon={MapPin}
              label="Destination"
              value={getShortLocation(booking.dropoff, booking.dropoffLabel)}
              t={t}
              isLast
            />
          ) : null}
        </View>

        {isLoadingFare ? (
          <View
            style={{
              borderRadius: chipRadius,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              paddingVertical: t.px(24),
              gap: t.px(8),
            }}>
            <ActivityIndicator color={DRIVER_ACCENT} />
            <Text style={{ fontSize: t.caption, color: colors.grey }}>Getting your fare…</Text>
          </View>
        ) : fareBreakdown ? (
          <DriverFareBreakdownCard breakdown={fareBreakdown} accentColor={DRIVER_ACCENT} />
        ) : (
          <View
            style={{
              borderRadius: chipRadius,
              backgroundColor: DRIVER_LIGHT_BG,
              borderWidth: 1,
              borderColor: DRIVER_ACCENT,
              padding: t.px(16),
              gap: t.px(10),
            }}>
            <Text
              style={{
                fontSize: t.labelBold,
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              Price estimate
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: t.caption, color: colors.grey, flex: 1 }}>
                {packageHours} hr package
                {selectedPackage?.km ? ` · ${selectedPackage.km} km included` : ''}
              </Text>
              <Text
                style={{
                  fontSize: t.labelBold,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {formatRupee(totalPrice)}
              </Text>
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: 'rgba(245, 158, 11, 0.35)',
                paddingTop: t.px(12),
                gap: t.px(4),
              }}>
              <Text style={{ fontSize: t.caption, color: colors.grey }}>Advance due now (30%)</Text>
              <Text
                style={{
                  fontSize: t.px(22),
                  fontWeight: typography.weights.extrabold,
                  color: DRIVER_ACCENT,
                }}>
                {formatRupee(advancePayment)}
              </Text>
            </View>
          </View>
        )}
        {fareUnavailable && !isLoadingFare ? (
          <Text style={{ fontSize: t.caption, color: colors.grey, lineHeight: t.px(18) }}>
            Live fare is unavailable. You can continue with this estimate.
          </Text>
        ) : null}
      </View>
      </WizardStepFade>
    </TowingBookingLayout>
  );
}
