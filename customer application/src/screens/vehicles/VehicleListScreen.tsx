import React, { useEffect } from 'react';
import {
  Pressable,
  Text,
  View,
  type ViewStyle,
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
  VEHICLE_BANNER_BG,
  VEHICLE_YELLOW,
  VehicleEmergencyQrThumb,
  VehiclePlaceholderImage,
  VehicleTypeIcon,
} from '../../components/vehicles/vehicleUi';
import { useVehicleStore } from '../../store/vehicleStore';
import { useAppDialog } from '../../hooks/useAppDialog';
import type { ProfileStackParamList } from '../../types/navigation';
import type { Vehicle } from '../../types/vehicle';
import { formatVehicleNumber } from '../../utils/vehicleFormat';
import { colors, shadows, typography } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyVehicles'>;

function SpecChip({
  px,
  children,
}: {
  px: (n: number) => number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(4),
        backgroundColor: '#F3F4F6',
        borderRadius: px(6),
        paddingHorizontal: px(8),
        paddingVertical: px(4),
        maxWidth: '100%',
      }}>
      {children}
    </View>
  );
}

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
  const qrSize = px(52);

  return (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [
        {
          borderRadius: px(18),
          borderWidth: isPrimary ? 2 : 1,
          borderColor: isPrimary ? VEHICLE_YELLOW : colors.border,
          backgroundColor: isPrimary ? '#FFFBF5' : colors.background,
          padding: px(16),
          marginBottom: px(14),
          opacity: pressed ? 0.96 : 1,
        },
        shadows.card,
        isPrimary
          ? ({
              shadowColor: VEHICLE_YELLOW,
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 3,
            } as ViewStyle)
          : null,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: px(14) }}>
        <VehiclePlaceholderImage type={vehicle.vehicleType} size={px(76)} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: px(6),
              marginBottom: px(4),
            }}>
            <Text
              numberOfLines={2}
              style={{
                flex: 1,
                minWidth: px(120),
                fontSize: px(15),
                fontWeight: typography.weights.bold,
                color: colors.dark,
                lineHeight: px(20),
              }}>
              {vehicle.brand} {vehicle.model}
            </Text>
            {isPrimary ? (
              <View
                style={{
                  paddingHorizontal: px(8),
                  paddingVertical: px(3),
                  borderRadius: px(6),
                  backgroundColor: '#FEF3C7',
                }}>
                <Text
                  style={{
                    fontSize: px(9.5),
                    fontWeight: typography.weights.bold,
                    color: VEHICLE_YELLOW,
                  }}>
                  Primary
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={{
              fontSize: px(12),
              color: colors.grey,
              fontWeight: typography.weights.semibold,
              marginBottom: px(8),
              letterSpacing: 0.3,
            }}>
            {formatVehicleNumber(vehicle.vehicleNumber)}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(6), alignItems: 'center' }}>
            <SpecChip px={px}>
              <FuelTypeIcon type={vehicle.fuelType} size={px(11)} />
              <Text
                style={{
                  fontSize: px(10.5),
                  color: colors.grey,
                  fontWeight: typography.weights.semibold,
                }}>
                {formatFuelLabel(vehicle.fuelType)}
              </Text>
            </SpecChip>
            <SpecChip px={px}>
              <Circle size={px(7)} color={colorHex} fill={colorHex} />
              <Text
                style={{
                  fontSize: px(10.5),
                  color: colors.grey,
                  fontWeight: typography.weights.semibold,
                }}>
                {colorLabel}
              </Text>
            </SpecChip>
            <SpecChip px={px}>
              <VehicleTypeIcon type={vehicle.vehicleType} size={px(11)} color={colors.grey} />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: px(10.5),
                  color: colors.grey,
                  fontWeight: typography.weights.semibold,
                  flexShrink: 1,
                }}>
                {formatVehicleTypeWithSubtype(vehicle)}
              </Text>
            </SpecChip>
          </View>
        </View>

        <Pressable
          onPress={onViewQr}
          accessibilityRole="button"
          accessibilityLabel="View vehicle emergency QR code"
          style={({ pressed }) => [
            {
              alignItems: 'center',
              flexShrink: 0,
              padding: px(6),
              borderRadius: px(12),
              borderWidth: 1,
              borderColor: isPrimary ? '#FDE68A' : colors.border,
              backgroundColor: '#FFFFFF',
            },
            shadows.card,
            pressed && { opacity: 0.7 },
          ]}>
          <VehicleEmergencyQrThumb vehicleId={vehicle.id} qrCodeDataUrl={vehicle.qrCode} size={qrSize} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: px(14),
          paddingTop: px(12),
          borderTopWidth: 1,
          borderTopColor: isPrimary ? '#FDE68A' : colors.border,
        }}>
        <Pressable
          onPress={onViewQr}
          style={({ pressed }) => [
            {
              flex: 1,
              alignItems: 'center',
              paddingVertical: px(8),
              borderRadius: px(10),
              backgroundColor: '#FEF3C7',
            },
            pressed && { opacity: 0.75 },
          ]}>
          <Text
            style={{
              fontSize: px(12.5),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            View QR
          </Text>
        </Pressable>
        <View style={{ width: px(10) }} />
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            {
              flex: 1,
              alignItems: 'center',
              paddingVertical: px(8),
              borderRadius: px(10),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: '#FFFFFF',
            },
            pressed && { opacity: 0.75 },
          ]}>
          <Text
            style={{
              fontSize: px(12.5),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Edit
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function AddVehicleCard({ px, onPress }: { px: (n: number) => number; onPress: () => void }) {
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
        marginTop: px(4),
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
          Emergency QR
        </Text>
        <Text style={{ fontSize: px(12), color: colors.dark, lineHeight: px(17) }}>
          Scan opens help for that vehicle — call, towing, or SOS.
        </Text>
      </View>
    </View>
  );
}

export default function VehicleListScreen({ navigation }: Props) {
  const px = useProfilePx();
  const { dialog, showDialog } = useAppDialog();
  const { vehicles, isLoading, error, fetchVehicles, deleteVehicle } = useVehicleStore();
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  const handleDelete = (id: string) => {
    showDialog({
      tone: 'danger',
      title: 'Delete vehicle',
      message: 'Remove this vehicle from your account?',
      secondaryLabel: 'Cancel',
      primaryLabel: 'Delete',
      destructive: true,
      onPrimary: () => {
        void deleteVehicle(id);
      },
    });
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
      contentStyle={{ paddingTop: px(18) }}
      headerRight={
        <>
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
        </>
      }>
      {dialog}
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
