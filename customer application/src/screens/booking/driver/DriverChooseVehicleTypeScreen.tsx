import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Car, Check, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import {
  DRIVER_ACCENT,
  DRIVER_BOOKING_STEP_LABELS,
  DRIVER_LIGHT_BG,
  getDriverVehicleTypeLabel,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import type { Vehicle } from '../../../types/vehicle';
import { getVehicleCategory } from '../../../utils/vehicleCategory';
import { colors, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverChooseVehicleType'>;

function formatVehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.brand} ${vehicle.model} · ${vehicle.vehicleNumber}`;
}

function goAddVehicle(navigation: Props['navigation']) {
  const parent = navigation.getParent();
  if (parent) {
    (parent as { navigate: (a: string, b?: object) => void }).navigate('Profile', {
      screen: 'AddVehicle',
    });
    return;
  }
  (navigation as { navigate: (a: string, b?: object) => void }).navigate('Profile', {
    screen: 'AddVehicle',
  });
}

export default function DriverChooseVehicleTypeScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const { vehicles, fetchVehicles, isLoading } = useVehicleStore();
  const [selectedId, setSelectedId] = useState(booking.vehicleId ?? '');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    void fetchVehicles()
      .catch(error => {
        if (__DEV__) {
          console.warn('[DriverChooseVehicleType] fetchVehicles failed', error);
        }
      })
      .finally(() => setHasLoaded(true));
  }, [fetchVehicles]);

  useEffect(() => {
    if (selectedId) return;
    if (booking.vehicleId) {
      setSelectedId(booking.vehicleId);
      return;
    }
    if (vehicles.length === 1) {
      setSelectedId(vehicles[0].id);
    }
  }, [booking.vehicleId, selectedId, vehicles]);

  const canContinue = selectedId.length > 0 && vehicles.length > 0;
  const showLoading = !hasLoaded && (isLoading || vehicles.length === 0);
  const chipRadius = t.px(12);

  return (
    <TowingBookingLayout
      title="Your vehicle"
      step={3}
      stepLabels={DRIVER_BOOKING_STEP_LABELS}
      accentColor={DRIVER_ACCENT}
      scrollable
      continueDisabled={!canContinue}
      onBack={() => navigation.goBack()}
      onContinue={() => {
        const vehicle = vehicles.find(item => item.id === selectedId);
        if (!vehicle) return;
        updateBooking({
          vehicleId: vehicle.id,
          vehicleLabel: formatVehicleLabel(vehicle),
          vehicleCategory: getVehicleCategory(vehicle.vehicleType, vehicle.vehicleSubtype),
        });
        navigation.navigate('DriverReview');
      }}>
      <View style={{ gap: t.px(14) }}>
        <Text
          style={{
            fontSize: t.caption,
            color: colors.grey,
            lineHeight: t.px(18),
            marginTop: -t.px(4),
          }}>
          Pick the car the hired driver will drive for you.
        </Text>

        {showLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: t.px(40), gap: t.px(10) }}>
            <ActivityIndicator color={DRIVER_ACCENT} />
            <Text style={{ fontSize: t.caption, color: colors.grey }}>Loading your vehicles…</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View
            style={{
              borderRadius: chipRadius,
              borderWidth: 1,
              borderColor: colors.border,
              padding: t.px(20),
              alignItems: 'center',
              backgroundColor: colors.background,
              gap: t.px(8),
            }}>
            <View
              style={{
                width: t.px(52),
                height: t.px(52),
                borderRadius: t.px(14),
                backgroundColor: DRIVER_LIGHT_BG,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Car size={t.px(26)} color={DRIVER_ACCENT} strokeWidth={2} />
            </View>
            <Text
              style={{
                marginTop: t.px(4),
                fontSize: t.labelBold,
                fontWeight: typography.weights.bold,
                color: colors.dark,
                textAlign: 'center',
              }}>
              No vehicle yet
            </Text>
            <Text
              style={{
                fontSize: t.caption,
                color: colors.grey,
                textAlign: 'center',
                lineHeight: t.px(18),
              }}>
              Add one vehicle to continue booking a driver.
            </Text>
            <Pressable
              onPress={() => goAddVehicle(navigation)}
              style={{
                marginTop: t.px(8),
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.px(6),
                paddingHorizontal: t.px(16),
                paddingVertical: t.px(12),
                borderRadius: chipRadius,
                backgroundColor: DRIVER_ACCENT,
              }}>
              <Plus size={t.px(16)} color={colors.dark} strokeWidth={2.5} />
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
          <View style={{ gap: t.px(10) }}>
            {vehicles.map(vehicle => {
              const isSelected = selectedId === vehicle.id;
              const category = getVehicleCategory(vehicle.vehicleType, vehicle.vehicleSubtype);
              return (
                <Pressable
                  key={vehicle.id}
                  onPress={() => setSelectedId(vehicle.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.px(12),
                    borderRadius: chipRadius,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: isSelected ? DRIVER_LIGHT_BG : colors.background,
                    padding: t.px(14),
                  }}>
                  <View
                    style={{
                      width: t.px(44),
                      height: t.px(44),
                      borderRadius: t.px(12),
                      backgroundColor: isSelected ? colors.background : DRIVER_LIGHT_BG,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Car
                      size={t.iconSm}
                      color={isSelected ? DRIVER_ACCENT : colors.dark}
                      strokeWidth={2.2}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontSize: t.labelBold,
                        fontWeight: typography.weights.bold,
                        color: colors.dark,
                      }}
                      numberOfLines={1}>
                      {vehicle.brand} {vehicle.model}
                    </Text>
                    <Text
                      style={{ fontSize: t.caption, color: colors.grey, marginTop: t.px(3) }}
                      numberOfLines={1}>
                      {vehicle.vehicleNumber}
                    </Text>
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: t.px(6),
                        paddingHorizontal: t.px(8),
                        paddingVertical: t.px(3),
                        borderRadius: t.px(6),
                        backgroundColor: isSelected ? colors.background : '#F3F4F6',
                      }}>
                      <Text
                        style={{
                          fontSize: t.px(10),
                          fontWeight: typography.weights.bold,
                          color: colors.dark,
                        }}>
                        {getDriverVehicleTypeLabel(category)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      width: t.px(22),
                      height: t.px(22),
                      borderRadius: t.px(6),
                      borderWidth: isSelected ? 0 : 1.5,
                      borderColor: colors.border,
                      backgroundColor: isSelected ? DRIVER_ACCENT : colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {isSelected ? (
                      <Check size={t.px(13)} color={colors.dark} strokeWidth={3} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => goAddVehicle(navigation)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.px(6),
                borderRadius: chipRadius,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                paddingVertical: t.px(14),
              }}>
              <Plus size={t.px(16)} color={DRIVER_ACCENT} strokeWidth={2.4} />
              <Text
                style={{
                  fontSize: t.body,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                Add another vehicle
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </TowingBookingLayout>
  );
}
