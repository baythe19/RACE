import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { DRIVER_ACCENT, DRIVER_LIGHT_BG } from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import type { Vehicle } from '../../../types/vehicle';
import { getVehicleCategory } from '../../../utils/vehicleCategory';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverBookingVehicle'>;

function formatVehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.brand} ${vehicle.model} • ${vehicle.vehicleNumber}`;
}

export default function DriverBookingVehicleScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const [selectedId, setSelectedId] = useState(booking.vehicleId);
  const nextScreen = route.params?.nextScreen ?? 'DriverBookingLocation';
  const step = nextScreen === 'DriverReview' ? 3 : 1;

  useEffect(() => {
    void fetchVehicles().catch((error) => {
      if (__DEV__) {
        console.warn('[DriverBookingVehicle] fetchVehicles failed', error);
      }
    });
  }, [fetchVehicles]);

  const canContinue = Boolean(selectedId && selectedId.length > 0 && safeVehicles.length > 0);

  return (
    <TowingBookingLayout
      title="Select Vehicle"
      step={step}
      accentColor={DRIVER_ACCENT}
      continueDisabled={!canContinue}
      onBack={() => goBackWithinStack(navigation)}
      onContinue={() => {
        const vehicle = safeVehicles.find(item => item.id === selectedId);
        if (!vehicle) return;
        updateBooking({
          vehicleId: vehicle.id,
          vehicleLabel: formatVehicleLabel(vehicle),
          vehicleCategory: getVehicleCategory(vehicle.vehicleType, vehicle.vehicleSubtype),
        });
        navigation.navigate(nextScreen);
      }}>
      <Text
        style={{
          fontSize: t.bodyLarge,
          color: colors.grey,
          textAlign: 'center',
          marginBottom: t.px(16),
        }}>
        Choose a registered vehicle for this booking
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
            }}>
            <Ionicons name="car-outline" size={t.px(36)} color={colors.grey} />
            <Text
              style={{
                marginTop: t.px(10),
                fontSize: t.body,
                color: colors.grey,
                textAlign: 'center',
              }}>
              No vehicles found. Add a vehicle from your profile to continue.
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
                backgroundColor: DRIVER_ACCENT,
              }}>
              <Text
                style={{
                  fontSize: t.body,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                Add Vehicle
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
                    borderColor: isSelected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: isSelected ? DRIVER_LIGHT_BG : colors.background,
                    padding: t.px(16),
                  },
                  shadows.card,
                ]}>
                <View
                  style={{
                    width: t.px(44),
                    height: t.px(44),
                    borderRadius: t.px(22),
                    backgroundColor: isSelected ? colors.background : DRIVER_LIGHT_BG,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons
                    name="car"
                    size={t.iconSm}
                    color={isSelected ? DRIVER_ACCENT : colors.dark}
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
                  </Text>
                </View>
                <View
                  style={{
                    width: t.checkSize,
                    height: t.checkSize,
                    borderRadius: t.checkSize / 2,
                    borderWidth: isSelected ? 0 : 1.5,
                    borderColor: colors.border,
                    backgroundColor: isSelected ? DRIVER_ACCENT : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={t.px(14)} color={colors.background} />
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </TowingBookingLayout>
  );
}
