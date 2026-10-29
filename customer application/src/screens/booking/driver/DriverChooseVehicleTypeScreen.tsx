import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Car, Check, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  DRIVER_ACCENT,
  DRIVER_LIGHT_BG,
  getDriverVehicleTypeLabel,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { getDriverServiceFlow } from '../../../utils/driverServiceFlow';
import { useVehicleStore } from '../../../store/vehicleStore';
import type { HomeStackParamList } from '../../../types/navigation';
import type { Vehicle } from '../../../types/vehicle';
import { getVehicleCategory } from '../../../utils/vehicleCategory';
import { navigateToAddVehicleFromDriverWizard } from '../../../navigation/driverWizardNavigation';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverChooseVehicleType'>;

function formatVehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.brand} ${vehicle.model} · ${vehicle.vehicleNumber}`;
}

function VehicleListSkeleton({
  radius,
  px,
}: {
  radius: number;
  px: (n: number) => number;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={{ gap: px(10) }}>
      {[0, 1].map(index => (
        <Animated.View
          key={index}
          style={{
            opacity,
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(12),
            borderRadius: radius,
            borderWidth: 1,
            borderColor: colors.border,
            padding: px(14),
          }}>
          <View
            style={{
              width: px(44),
              height: px(44),
              borderRadius: px(12),
              backgroundColor: '#F3F4F6',
            }}
          />
          <View style={{ flex: 1, gap: px(8) }}>
            <View style={{ width: '62%', height: px(12), borderRadius: px(6), backgroundColor: '#F3F4F6' }} />
            <View style={{ width: '40%', height: px(10), borderRadius: px(6), backgroundColor: '#F3F4F6' }} />
          </View>
          <View
            style={{
              width: px(22),
              height: px(22),
              borderRadius: px(6),
              backgroundColor: '#F3F4F6',
            }}
          />
        </Animated.View>
      ))}
    </View>
  );
}

function goAddVehicle(navigation: Props['navigation']) {
  navigateToAddVehicleFromDriverWizard(navigation);
}

export default function DriverChooseVehicleTypeScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const flow = getDriverServiceFlow(booking.driverType);
  const { vehicles, fetchVehicles } = useVehicleStore();
  const [selectedId, setSelectedId] = useState(booking.vehicleId ?? '');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) setHasLoaded(true);
    }, 8000);
    void fetchVehicles()
      .catch(error => {
        if (__DEV__) {
          console.warn('[DriverChooseVehicleType] fetchVehicles failed', error);
        }
      })
      .finally(() => {
        settled = true;
        setHasLoaded(true);
      });
    return () => clearTimeout(timer);
  }, [fetchVehicles]);

  useFocusEffect(
    useCallback(() => {
      void fetchVehicles();
    }, [fetchVehicles]),
  );

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
  const showLoading = !hasLoaded && vehicles.length === 0;
  const chipRadius = t.px(12);

  return (
    <TowingBookingLayout
      title="Your vehicle"
      step={3}
      stepLabels={flow.wizardStepLabels}
      accentColor={DRIVER_ACCENT}
      scrollable={vehicles.length > 3}
      continueDisabled={!canContinue}
      onBack={() => goBackWithinStack(navigation)}
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
      <WizardStepFade>
      <View style={{ gap: t.px(10) }}>

        {showLoading ? (
          <VehicleListSkeleton radius={chipRadius} px={t.px} />
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
                gap: t.px(6),
                alignSelf: 'flex-start',
                paddingVertical: t.px(4),
              }}>
              <Plus size={t.px(14)} color={DRIVER_ACCENT} strokeWidth={2.4} />
              <Text
                style={{
                  fontSize: t.caption,
                  fontWeight: typography.weights.semibold,
                  color: colors.dark,
                }}>
                Add another vehicle
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      </WizardStepFade>
    </TowingBookingLayout>
  );
}
