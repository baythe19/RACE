import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DataSkeleton from '../../components/ui/DataSkeleton';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Screen, { ScreenContent } from '../../components/ui/Screen';
import { useVehicleStore } from '../../store/vehicleStore';
import type { ProfileStackParamList } from '../../types/navigation';
import { colors, radius, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const { selectedVehicle, isLoading, error, fetchVehicle, deleteVehicle } = useVehicleStore();

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

  if (isLoading && !selectedVehicle) {
    return (
      <Screen>
        <View style={styles.loader}>
          <DataSkeleton variant="detail" />
        </View>
      </Screen>
    );
  }

  const vehicle = selectedVehicle;
  if (!vehicle) {
    return (
      <Screen>
        <View style={styles.loader}>
          <Text style={styles.error}>{error ?? 'Vehicle not found'}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenContent>
            <View style={styles.card}>
              <Text style={styles.plate}>{vehicle.vehicleNumber}</Text>
              <Text style={styles.meta}>
                {vehicle.brand} {vehicle.model}
              </Text>
              <Text style={styles.meta}>
                {vehicle.vehicleType} · {vehicle.fuelType}
                {vehicle.color ? ` · ${vehicle.color}` : ''}
              </Text>
            </View>

            <Text style={styles.qrTitle}>Vehicle QR Code</Text>
            <Text style={styles.qrHint}>
              Technicians can scan this to verify your vehicle on RACE. Keep it on your windshield
              or share from this screen.
            </Text>
            <View style={styles.qrWrap}>
              <Image source={{ uri: vehicle.qrCode }} style={styles.qrImage} resizeMode="contain" />
            </View>

            <PrimaryButton
              label="Edit Vehicle"
              onPress={() => navigation.navigate('EditVehicle', { vehicleId })}
            />

            <PrimaryButton
              label={isLoading ? 'Deleting...' : 'Delete Vehicle'}
              onPress={handleDelete}
              disabled={isLoading}
              variant="outline"
            />
          </ScreenContent>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 38, 0.25)',
  },
  plate: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textDark,
  },
  meta: {
    marginTop: spacing.xs,
    color: colors.text,
    textTransform: 'capitalize',
  },
  qrTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  qrHint: {
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  qrWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  error: {
    color: colors.accentRed,
    textAlign: 'center',
  },
});
