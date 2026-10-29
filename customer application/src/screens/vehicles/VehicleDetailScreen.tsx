import React, { useEffect, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import GoldButton from '../../components/auth/GoldButton';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import VehicleEmergencyQrPanel from '../../components/vehicles/VehicleEmergencyQrPanel';
import { useVehicleStore } from '../../store/vehicleStore';
import type { ProfileStackParamList } from '../../types/navigation';
import { formatVehicleNumber } from '../../utils/vehicleFormat';
import { colors, typography } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const px = useProfilePx();
  const { vehicles, selectedVehicle, isLoading, error, fetchVehicle, deleteVehicle } =
    useVehicleStore();

  const listFallback = useMemo(
    () => vehicles.find(item => item.id === vehicleId) ?? null,
    [vehicleId, vehicles],
  );

  const vehicle =
    selectedVehicle?.id === vehicleId ? selectedVehicle : listFallback;

  useEffect(() => {
    void fetchVehicle(vehicleId);
  }, [fetchVehicle, vehicleId]);

  const handleDelete = () => {
    Alert.alert('Delete vehicle', 'Remove this vehicle from your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVehicle(vehicleId);
            navigation.navigate('MyVehicles');
          } catch (err) {
            Alert.alert('Vehicle', err instanceof Error ? err.message : 'Unable to delete vehicle');
          }
        },
      },
    ]);
  };

  if (isLoading && !vehicle) {
    return (
      <ProfileSubScreenLayout title="Vehicle QR" subtitle="Loading…">
        <DataSkeleton variant="detail" />
      </ProfileSubScreenLayout>
    );
  }

  if (!vehicle) {
    return (
      <ProfileSubScreenLayout title="Vehicle QR" subtitle="">
        <Text style={styles.error}>{error ?? 'Vehicle not found'}</Text>
      </ProfileSubScreenLayout>
    );
  }

  return (
    <ProfileSubScreenLayout
      title="Vehicle QR"
      subtitle={formatVehicleNumber(vehicle.vehicleNumber)}
      footer={
        <View style={[styles.footer, { paddingHorizontal: px(20), paddingBottom: px(16) }]}>
          <GoldButton
            label="Edit vehicle"
            onPress={() => navigation.navigate('EditVehicle', { vehicleId })}
            height={px(48)}
            borderRadius={px(12)}
            style={{ width: '100%' }}
          />
        </View>
      }>
      <VehicleEmergencyQrPanel vehicle={vehicle} px={px} showMeta={false} />
      <Pressable
        onPress={handleDelete}
        disabled={isLoading}
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}>
        <Text style={styles.deleteText}>{isLoading ? 'Please wait…' : 'Delete vehicle'}</Text>
      </Pressable>
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteText: {
    color: colors.error,
    fontWeight: typography.weights.bold,
    fontSize: 14,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginTop: 24,
  },
});
