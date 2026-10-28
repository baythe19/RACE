import React, { useEffect } from 'react';
import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Circle, Info, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import {
  formatFuelLabel,
  formatVehicleTypeWithSubtype,
  FuelTypeIcon,
  getColorHex,
  MiniQrCode,
  VEHICLE_BANNER_BG,
  VEHICLE_YELLOW,
  VehiclePlaceholderImage,
  VehicleTypeIcon,
} from '../../components/vehicles/vehicleUi';
import { useVehicleStore } from '../../store/vehicleStore';
import type { ProfileStackParamList } from '../../types/navigation';
import type { Vehicle } from '../../types/vehicle';
import { formatVehicleNumber } from '../../utils/vehicleFormat';
import { colors, shadows, typography } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyVehicles'>;

function VehicleListCard({
  vehicle,
  isPrimary,
  px,
  onViewQr,
  onEdit,
  onLongPress,
}: {
  vehicle: Vehicle;
  isPrimary: boolean;
  px: (n: number) => number;
  onViewQr: () => void;
  onEdit: () => void;
  onLongPress: () => void;
}) {
  const colorHex = getColorHex(vehicle.color);
  const colorLabel = vehicle.color || '—';

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        {
          borderRadius: px(16),
          borderWidth: isPrimary ? 1.5 : 1,
          borderColor: isPrimary ? VEHICLE_YELLOW : colors.border,
          backgroundColor: colors.background,
          padding: px(12),
          marginBottom: px(12),
        },
        shadows.card,
      ]}>
      {isPrimary ? (
        <View style={{ position: 'absolute', top: px(10), right: px(10), zIndex: 2 }}>
          <View
            style={{
              paddingHorizontal: px(10),
              paddingVertical: px(4),
              borderRadius: px(12),
              backgroundColor: '#FEF3C7',
            }}>
            <Text
              style={{
                fontSize: px(10),
                fontWeight: typography.weights.bold,
                color: VEHICLE_YELLOW,
              }}>
              Primary Vehicle
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: px(12) }}>
        <VehiclePlaceholderImage type={vehicle.vehicleType} size={px(96)} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: px(8),
            }}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: isPrimary ? px(72) : px(4) }}>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: px(15),
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                  marginBottom: px(2),
                }}>
                {vehicle.brand} {vehicle.model}
              </Text>
              <Text style={{ fontSize: px(12), color: colors.grey, marginBottom: px(8) }}>
                {formatVehicleNumber(vehicle.vehicleNumber)}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(12) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
                  <FuelTypeIcon type={vehicle.fuelType} size={px(12)} />
                  <Text style={{ fontSize: px(11), color: colors.grey }}>
                    {formatFuelLabel(vehicle.fuelType)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
                  <Circle size={px(8)} color={colorHex} fill={colorHex} />
                  <Text style={{ fontSize: px(11), color: colors.grey }}>{colorLabel}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
                  <VehicleTypeIcon type={vehicle.vehicleType} size={px(12)} color={colors.grey} />
                  <Text style={{ fontSize: px(11), color: colors.grey }}>
                    {formatVehicleTypeWithSubtype(vehicle)}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                padding: px(4),
                borderRadius: px(6),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                flexShrink: 0,
              }}>
              <MiniQrCode size={px(40)} />
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: px(10),
              marginTop: px(10),
            }}>
            <Pressable onPress={onViewQr}>
              <Text
                style={{
                  fontSize: px(12),
                  fontWeight: typography.weights.bold,
                  color: VEHICLE_YELLOW,
                }}>
                View QR
              </Text>
            </Pressable>
            <Text style={{ color: colors.border }}>|</Text>
            <Pressable onPress={onEdit}>
              <Text
                style={{
                  fontSize: px(12),
                  fontWeight: typography.weights.bold,
                  color: colors.grey,
                }}>
                Edit
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function AddVehicleCard({ px, onPress }: { px: (n: number) => number; onPress: () => void }) {
  // Empty-state hero card — only visible when the user has no vehicles yet
  // (with vehicles present the Add action lives in the header button).
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: px(18),
        borderWidth: 1.5,
        borderColor: VEHICLE_YELLOW,
        borderStyle: 'dashed',
        paddingVertical: px(36),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: px(14),
        backgroundColor: '#FFFBEB',
      }}>
      <View
        style={{
          width: px(56),
          height: px(56),
          borderRadius: px(28),
          backgroundColor: VEHICLE_YELLOW,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: px(10),
        }}>
        <Plus size={px(26)} color={colors.dark} strokeWidth={2.8} />
      </View>
      <Text
        style={{
          fontSize: px(15),
          fontWeight: typography.weights.bold,
          color: colors.dark,
        }}>
        Add your first vehicle
      </Text>
      <Text
        style={{
          marginTop: px(3),
          fontSize: px(12),
          color: colors.grey,
        }}>
        Tap to register — takes under a minute
      </Text>
    </Pressable>
  );
}

function QrInfoBanner({ px }: { px: (n: number) => number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: px(12),
        borderRadius: px(12),
        backgroundColor: VEHICLE_BANNER_BG,
        padding: px(14),
      }}>
      <View
        style={{
          width: px(28),
          height: px(28),
          borderRadius: px(14),
          backgroundColor: VEHICLE_YELLOW,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Info size={px(16)} color={colors.background} strokeWidth={2.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: px(13),
            fontWeight: typography.weights.bold,
            color: colors.dark,
            marginBottom: px(2),
          }}>
          Each vehicle gets a unique QR code
        </Text>
        <Text style={{ fontSize: px(12), color: colors.dark, lineHeight: px(18) }}>
          Scan to request emergency help instantly
        </Text>
      </View>
    </View>
  );
}

export default function VehicleListScreen({ navigation }: Props) {
  const px = useProfilePx();
  const { vehicles, isLoading, error, fetchVehicles, deleteVehicle } = useVehicleStore();
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete vehicle', 'Remove this vehicle from your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteVehicle(id);
        },
      },
    ]);
  };

  const renderVehicle = (vehicle: Vehicle, index: number) => (
    <VehicleListCard
      key={vehicle.id}
      vehicle={vehicle}
      isPrimary={index === 0}
      px={px}
      onViewQr={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id })}
      onEdit={() => navigation.navigate('EditVehicle', { vehicleId: vehicle.id })}
      onLongPress={() => handleDelete(vehicle.id)}
    />
  );

  return (
    <ProfileSubScreenLayout
      title="My Vehicles"
      subtitle="Manage your registered vehicles"
      headerRight={
        <Pressable
          onPress={() => navigation.navigate('AddVehicle')}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(5),
              backgroundColor: VEHICLE_YELLOW,
              borderRadius: px(20),
              paddingVertical: px(8),
              paddingHorizontal: px(13),
            },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add vehicle">
          <Plus size={px(15)} color={colors.dark} strokeWidth={2.8} />
          <Text
            style={{
              fontSize: px(12),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Add Vehicle
          </Text>
        </Pressable>
      }>
      {isLoading && !safeVehicles.length ? (
        <DataSkeleton variant="cards" />
      ) : (
        <>
          {error && !safeVehicles.length ? (
            <Text
              style={{
                textAlign: 'center',
                color: colors.error,
                marginBottom: px(12),
                fontSize: px(13),
              }}>
              {error}
            </Text>
          ) : null}

          {safeVehicles.length === 0 ? (
            <AddVehicleCard px={px} onPress={() => navigation.navigate('AddVehicle')} />
          ) : (
            safeVehicles.map(renderVehicle)
          )}

          <QrInfoBanner px={px} />
        </>
      )}
    </ProfileSubScreenLayout>
  );
}
