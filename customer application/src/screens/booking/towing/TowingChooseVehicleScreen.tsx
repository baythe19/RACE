import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Car, Check, Plus } from 'lucide-react-native';
import {
  VehiclePlaceholderImage,
  formatVehicleTypeWithSubtype,
} from '../../../components/vehicles/vehicleUi';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import type { BookingTheme } from '../../../components/booking/bookingTheme';
import { TOWING_TYPES } from '../../../constants/towingBooking';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import type { TowingTypeId } from '../../../types/towingBooking';
import type { Vehicle } from '../../../types/vehicle';
import { isTowingWalkthroughEnabled } from '../../../utils/towingBookingWalkthrough';
import {
  buildTowingScheduleDateStrip,
  getDateReviewLabel,
  parseStoredDate,
  TOWING_SCHEDULE_DATE_STRIP_DAYS,
} from '../../../utils/driverCalendar';
import { getVehicleCategory } from '../../../utils/vehicleCategory';
import { colors, shadows, typography } from '../../../theme';
import { formatVehicleNumber } from '../../../utils/vehicleFormat';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingChooseVehicle'>;

const CARD_OUTLINE = '#E7E5E4';
const ICON_TILE_BG = '#F9FAFB';

/** White cards; brand yellow ring + tick = selected (matches stepper & Continue). */
function selectionCardStyle(selected: boolean, t: BookingTheme) {
  return {
    borderRadius: t.px(14),
    borderWidth: selected ? 2 : 1,
    borderColor: selected ? colors.primary : CARD_OUTLINE,
    backgroundColor: colors.background,
  };
}

function SelectionCheck({ selected, t }: { selected: boolean; t: BookingTheme }) {
  return (
    <View
      style={{
        width: t.checkSize,
        height: t.checkSize,
        borderRadius: t.px(8),
        borderWidth: selected ? 0 : 1.5,
        borderColor: CARD_OUTLINE,
        backgroundColor: selected ? colors.primary : colors.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {selected ? <Check size={t.px(13)} color={colors.dark} strokeWidth={3} /> : null}
    </View>
  );
}

function formatVehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.brand} ${vehicle.model} · ${vehicle.vehicleNumber}`;
}

function FormSection({
  title,
  t,
  topGap = 0,
}: {
  title: string;
  t: BookingTheme;
  topGap?: number;
}) {
  return (
    <View style={{ marginTop: t.px(topGap), marginBottom: t.px(8) }}>
      <Text
        style={{
          fontSize: t.px(13),
          fontWeight: typography.weights.extrabold,
          color: colors.dark,
          lineHeight: t.px(17),
        }}>
        {title}
      </Text>
    </View>
  );
}

export default function TowingChooseVehicleScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useTowingBooking();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const safeVehicles = (Array.isArray(vehicles) ? vehicles : []).filter(
    vehicle => vehicle && typeof vehicle.id === 'string' && vehicle.id.length > 0,
  );
  const scheduleDates = useMemo(() => buildTowingScheduleDateStrip(), []);
  const [selectedId, setSelectedId] = useState(booking.vehicleId ?? '');
  const [towType, setTowType] = useState<TowingTypeId>(booking.towingType);
  const [dateId, setDateId] = useState(() => {
    const parsed = parseStoredDate(booking.dateId || 'today');
    return scheduleDates.some(chip => chip.iso === parsed) ? parsed : (scheduleDates[0]?.iso ?? parsed);
  });
  const isScheduled = booking.serviceMode === 'scheduled';
  const selectedScheduleChip = scheduleDates.find(chip => chip.iso === dateId);

  useEffect(() => {
    void fetchVehicles().catch(error => {
      if (__DEV__) {
        console.warn('[TowingChooseVehicle] fetchVehicles failed', error);
      }
    });
  }, [fetchVehicles]);

  useEffect(() => {
    if (selectedId) return;
    if (booking.vehicleId) {
      setSelectedId(booking.vehicleId);
      return;
    }
    if (safeVehicles.length >= 1 && (isTowingWalkthroughEnabled() || safeVehicles.length === 1)) {
      setSelectedId(safeVehicles[0].id);
    }
  }, [booking.vehicleId, safeVehicles, selectedId]);

  const canContinue = selectedId.length > 0 && safeVehicles.length > 0;

  const monthNumber = (date: Date) => String(date.getMonth() + 1);

  return (
    <TowingBookingLayout
      title="Vehicle & tow"
      step={1}
      scrollable
      continueDisabled={!canContinue}
      onBack={() => goBackWithinStack(navigation)}
      onContinue={() => {
        const vehicle = safeVehicles.find(item => item.id === selectedId);
        if (!vehicle) return;
        const category = getVehicleCategory(vehicle.vehicleType, vehicle.vehicleSubtype);
        const vehicleType =
          vehicle.vehicleType === 'bike' ||
          vehicle.vehicleSubtype?.toLowerCase().includes('bike') ||
          vehicle.vehicleSubtype?.toLowerCase().includes('scooter')
            ? 'bike'
            : category === 'suv'
              ? 'suv'
              : category === 'hatchback'
                ? 'hatchback'
                : 'sedan';
        updateBooking({
          vehicleId: vehicle.id,
          vehicleLabel: formatVehicleLabel(vehicle),
          vehicleType,
          towingType: towType,
          dateId: isScheduled ? dateId : parseStoredDate('today'),
          timeId: isScheduled ? booking.timeId : '30-60',
          serviceLocation: {
            type: booking.serviceLocation?.type ?? 'current',
            address: booking.serviceLocation?.address ?? booking.pickup,
            vehicleId: vehicle.id,
            vehicleLabel: formatVehicleLabel(vehicle),
          },
        });
        navigation.navigate('TowingPickupDrop');
      }}>
      <WizardStepFade>
      <View style={{ gap: t.px(8) }}>
        <FormSection
          title={safeVehicles.length > 1 ? `Your vehicle (${safeVehicles.length})` : 'Your vehicle'}
          t={t}
        />
        {safeVehicles.length > 1 ? (
          <Text style={{ fontSize: t.px(11), color: colors.grey, marginTop: -t.px(4), marginBottom: t.px(2) }}>
            Tap the vehicle you need towed — all saved vehicles are listed below.
          </Text>
        ) : null}
        {safeVehicles.length === 0 ? (
          <View
            style={[
              {
                borderRadius: t.px(10),
                borderWidth: 1,
                borderColor: colors.border,
                padding: t.px(22),
                alignItems: 'center',
                backgroundColor: colors.background,
              },
              shadows.card,
            ]}>
            <View
              style={{
                width: t.px(52),
                height: t.px(52),
                borderRadius: t.px(10),
                borderWidth: 1,
                borderColor: CARD_OUTLINE,
                backgroundColor: ICON_TILE_BG,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Car size={t.px(26)} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text
              style={{
                marginTop: t.px(12),
                fontSize: t.body,
                color: colors.grey,
                textAlign: 'center',
                lineHeight: t.px(20),
              }}>
              No vehicles found. Add a vehicle from your profile to book a service.
            </Text>
            <Pressable
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  (parent as any).navigate('Profile', { screen: 'AddVehicle' });
                } else {
                  (navigation as any).navigate('Profile', { screen: 'AddVehicle' });
                }
              }}
              style={{
                marginTop: t.px(14),
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.px(6),
                paddingHorizontal: t.px(16),
                paddingVertical: t.px(10),
                borderRadius: t.px(10),
                backgroundColor: colors.primary,
              }}>
              <Plus size={t.px(15)} color={colors.dark} strokeWidth={2.6} />
              <Text
                style={{
                  fontSize: t.body,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                Add vehicle
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: t.px(8) }}>
            {safeVehicles.map(vehicle => {
              const isSelected = selectedId === vehicle.id;
              return (
                <Pressable
                  key={vehicle.id}
                  onPress={() => setSelectedId(vehicle.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: t.px(10),
                      paddingVertical: t.px(10),
                      paddingHorizontal: t.px(12),
                    },
                    selectionCardStyle(isSelected, t),
                  ]}>
                  <VehiclePlaceholderImage type={vehicle.vehicleType} size={t.px(52)} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontSize: t.px(14),
                        fontWeight: typography.weights.bold,
                        color: colors.dark,
                      }}
                      numberOfLines={2}>
                      {vehicle.brand} {vehicle.model}
                    </Text>
                    <Text
                      style={{ fontSize: t.px(11), color: colors.grey, marginTop: t.px(2) }}
                      numberOfLines={1}>
                      {formatVehicleNumber(vehicle.vehicleNumber)}
                    </Text>
                    <Text
                      style={{ fontSize: t.px(10), color: colors.grey, marginTop: t.px(1) }}
                      numberOfLines={1}>
                      {formatVehicleTypeWithSubtype(vehicle)}
                    </Text>
                  </View>
                  <SelectionCheck selected={isSelected} t={t} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <FormSection title="Tow type" t={t} topGap={10} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.px(8) }}>
        {TOWING_TYPES.map(type => {
          const selected = towType === type.id;
          return (
            <Pressable
              key={type.id}
              onPress={() => setTowType(type.id)}
              style={[
                {
                  width: '47%',
                  flexGrow: 1,
                  minWidth: t.px(128),
                  overflow: 'hidden',
                  alignItems: 'center',
                },
                selectionCardStyle(selected, t),
              ]}>
              <View style={{ position: 'absolute', top: t.px(6), right: t.px(6), zIndex: 2 }}>
                <SelectionCheck selected={selected} t={t} />
              </View>
              <View
                style={{
                  width: '100%',
                  height: t.px(56),
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: t.px(6),
                }}>
                <Image
                  source={type.image}
                  style={{ width: '100%', height: t.px(42) }}
                  resizeMode="contain"
                />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  paddingHorizontal: t.px(6),
                  paddingVertical: t.px(6),
                  fontSize: t.px(11),
                  fontWeight: selected ? typography.weights.bold : typography.weights.semibold,
                  color: selected ? colors.primaryDark : colors.dark,
                  textAlign: 'center',
                }}>
                {type.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isScheduled ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginTop: t.px(10),
              marginBottom: t.px(4),
            }}>
            <Text
              style={{
                fontSize: t.px(13),
                fontWeight: typography.weights.extrabold,
                color: colors.dark,
              }}>
              Schedule date
            </Text>
            <Text style={{ fontSize: t.px(11), color: colors.grey }}>
              {getDateReviewLabel(dateId)}
            </Text>
          </View>
          <Text style={{ fontSize: t.px(11), color: colors.grey, marginBottom: t.px(8) }}>
            Pick a day in the next {TOWING_SCHEDULE_DATE_STRIP_DAYS} days — tap a date to confirm
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.px(8), paddingBottom: t.px(4), paddingRight: t.px(8) }}>
            {scheduleDates.map(chip => {
              const selected = dateId === chip.iso;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setDateId(chip.iso)}
                  style={{
                    width: t.px(56),
                    minHeight: t.px(52),
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: t.px(6),
                    ...selectionCardStyle(selected, t),
                  }}>
                  <Text
                    style={{
                      fontSize: t.px(10),
                      fontWeight: typography.weights.medium,
                      color: colors.grey,
                    }}>
                    {chip.isToday ? 'Today' : chip.weekday}
                  </Text>
                  <Text
                    style={{
                      fontSize: t.px(13),
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                      marginTop: t.px(2),
                    }}>
                    {chip.dayNumber}/{monthNumber(chip.date)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedScheduleChip ? (
            <Text
              style={{
                fontSize: t.px(11),
                color: colors.primaryDark,
                fontWeight: typography.weights.semibold,
                marginTop: t.px(4),
              }}>
              Scheduled for {getDateReviewLabel(selectedScheduleChip.iso)}
            </Text>
          ) : null}
        </>
      ) : null}
      </WizardStepFade>
    </TowingBookingLayout>
  );
}
