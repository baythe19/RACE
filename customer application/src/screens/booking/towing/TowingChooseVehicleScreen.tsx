import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Car, Check } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { TOWING_DATE_OPTIONS, TOWING_TYPES } from '../../../constants/towingBooking';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import type { TowingTypeId } from '../../../types/towingBooking';
import type { Vehicle } from '../../../types/vehicle';
import { TOWING_WALKTHROUGH_ENABLED } from '../../../utils/towingBookingWalkthrough';
import { getVehicleCategory } from '../../../utils/vehicleCategory';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingChooseVehicle'>;

function formatVehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.brand} ${vehicle.model} · ${vehicle.vehicleNumber}`;
}

export default function TowingChooseVehicleScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useTowingBooking();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const safeVehicles = (Array.isArray(vehicles) ? vehicles : []).filter(
    vehicle => vehicle && typeof vehicle.id === 'string' && vehicle.id.length > 0,
  );
  const [selectedId, setSelectedId] = useState(booking.vehicleId ?? '');
  const [towType, setTowType] = useState<TowingTypeId>(booking.towingType);
  const [dateId, setDateId] = useState(booking.dateId || 'today');
  const isScheduled = booking.serviceMode === 'scheduled';

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
    if (safeVehicles.length >= 1 && (TOWING_WALKTHROUGH_ENABLED || safeVehicles.length === 1)) {
      setSelectedId(safeVehicles[0].id);
    }
  }, [booking.vehicleId, safeVehicles, selectedId]);

  const canContinue = selectedId.length > 0 && safeVehicles.length > 0;

  return (
    <TowingBookingLayout
      title="Vehicle & tow type"
      step={1}
      scrollable
      continueDisabled={!canContinue}
      onBack={() => navigation.goBack()}
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
          dateId: isScheduled ? dateId : 'today',
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
      <Text
        style={{
          fontSize: t.bodyLarge,
          color: colors.grey,
          textAlign: 'center',
          marginBottom: t.px(16),
        }}>
        Choose which of your vehicles needs towing
      </Text>

      <View style={{ gap: t.px(12) }}>
        {safeVehicles.length === 0 ? (
          <View
            style={{
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              padding: t.px(20),
              alignItems: 'center',
              backgroundColor: colors.background,
            }}>
            <Car size={t.px(36)} color={colors.grey} strokeWidth={2} />
            <Text
              style={{
                marginTop: t.px(10),
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
                paddingHorizontal: t.px(16),
                paddingVertical: t.px(10),
                borderRadius: t.inputRadius,
                backgroundColor: colors.primary,
              }}>
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
          safeVehicles.map(vehicle => {
            const isSelected = selectedId === vehicle.id;
            return (
              <Pressable
                key={vehicle.id}
                onPress={() => setSelectedId(vehicle.id)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.px(12),
                    borderRadius: t.cardRadius,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.goldLight : colors.background,
                    padding: t.px(16),
                  },
                  shadows.card,
                ]}>
                <View
                  style={{
                    width: t.px(44),
                    height: t.px(44),
                    borderRadius: t.px(22),
                    backgroundColor: isSelected ? colors.background : colors.goldLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Car
                    size={t.iconSm}
                    color={isSelected ? colors.primary : colors.dark}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: t.labelBold,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={{ fontSize: t.body, color: colors.grey, marginTop: t.px(2) }}>
                    {vehicle.vehicleNumber}
                    {vehicle.vehicleSubtype ? ` · ${vehicle.vehicleSubtype}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    width: t.checkSize,
                    height: t.checkSize,
                    borderRadius: t.checkSize / 2,
                    borderWidth: isSelected ? 0 : 1.5,
                    borderColor: colors.border,
                    backgroundColor: isSelected ? colors.primary : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {isSelected ? (
                    <Check size={t.px(13)} color={colors.background} strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      <Text
        style={{
          marginTop: t.px(20),
          marginBottom: t.px(10),
          fontSize: t.sectionTitle,
          fontWeight: typography.weights.bold,
          color: colors.dark,
        }}>
        How should we tow it?
      </Text>
      <View style={{ flexDirection: 'row', gap: t.px(10) }}>
        {TOWING_TYPES.map(type => {
          const selected = towType === type.id;
          return (
            <Pressable
              key={type.id}
              onPress={() => setTowType(type.id)}
              style={{
                flex: 1,
                borderRadius: t.cardRadius,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.goldLight : colors.background,
                padding: t.px(12),
              }}>
              <Text
                style={{
                  fontSize: t.body,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {type.id === 'flatbed' ? 'Flatbed' : 'Wheel lift'}
              </Text>
              <Text style={{ marginTop: t.px(4), fontSize: t.caption, color: colors.grey }}>
                {type.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isScheduled ? (
        <View style={{ marginTop: t.px(18) }}>
          <Text
            style={{
              marginBottom: t.px(10),
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            When?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.px(8) }}>
            {TOWING_DATE_OPTIONS.slice(0, 4).map(option => {
              const selected = dateId === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setDateId(option.id)}
                  style={{
                    paddingHorizontal: t.px(12),
                    paddingVertical: t.px(8),
                    borderRadius: t.px(999),
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.goldLight : colors.background,
                  }}>
                  <Text
                    style={{
                      fontSize: t.caption,
                      fontWeight: typography.weights.semibold,
                      color: colors.dark,
                    }}>
                    {option.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </TowingBookingLayout>
  );
}
