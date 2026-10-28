import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Car, Check, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { TOWING_DATE_OPTIONS, TOWING_TYPES } from '../../../constants/towingBooking';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import type { TowingTypeId } from '../../../types/towingBooking';
import type { Vehicle } from '../../../types/vehicle';
import { isTowingWalkthroughEnabled } from '../../../utils/towingBookingWalkthrough';
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
    if (safeVehicles.length >= 1 && (isTowingWalkthroughEnabled() || safeVehicles.length === 1)) {
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
      <View style={{ gap: t.px(12) }}>
        {/* Section: Choose your vehicle */}
        <View style={{ marginBottom: -t.px(2) }}>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
            }}>
            Choose your vehicle
          </Text>
          <Text style={{ fontSize: t.caption, color: colors.grey, marginTop: t.px(2) }}>
            Which vehicle needs to be towed?
          </Text>
        </View>
        {safeVehicles.length === 0 ? (
          <View
            style={[
              {
                borderRadius: t.cardRadius,
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
                borderRadius: t.px(26),
                backgroundColor: colors.goldLight,
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
                borderRadius: t.inputRadius,
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
                    padding: t.px(14),
                  },
                  shadows.card,
                ]}>
                <View
                  style={{
                    width: t.px(44),
                    height: t.px(44),
                    borderRadius: t.px(22),
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
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
                    borderColor: isSelected ? colors.primary : colors.border,
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

      <View style={{ marginTop: t.px(22), marginBottom: t.px(10) }}>
        <Text
          style={{
            fontSize: t.sectionTitle,
            fontWeight: typography.weights.extrabold,
            color: colors.dark,
          }}>
          Select tow type
        </Text>
        <Text style={{ fontSize: t.caption, color: colors.grey, marginTop: t.px(2) }}>
          How should we tow your vehicle?
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: t.px(12) }}>
        {TOWING_TYPES.map(type => {
          const selected = towType === type.id;
          return (
            <Pressable
              key={type.id}
              onPress={() => setTowType(type.id)}
              style={[
                {
                  flex: 1,
                  borderRadius: t.cardRadius,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.goldLight : colors.background,
                  overflow: 'hidden',
                },
                shadows.card,
              ]}>
              {/* Selection badge floats over the image */}
              <View
                style={{
                  position: 'absolute',
                  top: t.px(8),
                  right: t.px(8),
                  zIndex: 2,
                  width: t.checkSize,
                  height: t.checkSize,
                  borderRadius: t.checkSize / 2,
                  borderWidth: selected ? 0 : 1.5,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {selected ? (
                  <Check size={t.px(13)} color={colors.background} strokeWidth={3} />
                ) : null}
              </View>
              <View
                style={{
                  height: t.px(84),
                  backgroundColor: '#FFFFFF',
                  borderBottomWidth: 1,
                  borderBottomColor: selected ? '#F3E3B8' : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Image
                  source={type.image}
                  style={{ width: t.px(132), height: t.px(66) }}
                  resizeMode="contain"
                />
              </View>
              <View style={{ padding: t.px(12), paddingTop: t.px(10) }}>
                <Text
                  style={{
                    fontSize: t.bodyLarge,
                    fontWeight: typography.weights.extrabold,
                    color: colors.dark,
                  }}>
                  {type.id === 'flatbed' ? 'Flatbed' : 'Wheel lift'}
                </Text>
                <Text
                  style={{
                    marginTop: t.px(4),
                    fontSize: t.caption,
                    color: colors.grey,
                    lineHeight: t.px(18),
                  }}>
                  {type.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {isScheduled ? (
        <View style={{ marginTop: t.px(22), marginBottom: t.px(10) }}>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
            }}>
            When do you need it?
          </Text>
          <Text style={{ fontSize: t.caption, color: colors.grey, marginTop: t.px(2) }}>
            Pick a preferred day
          </Text>
        </View>
      ) : null}
      {isScheduled ? (
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
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.goldLight : colors.background,
                  }}>
                  <Text
                    style={{
                      fontSize: t.caption,
                      fontWeight: selected ? typography.weights.bold : typography.weights.semibold,
                      color: selected ? colors.primary : colors.dark,
                    }}>
                    {option.day}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      ) : null}
    </TowingBookingLayout>
  );
}
