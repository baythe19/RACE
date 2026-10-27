import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthToast from '../../components/auth/AuthToast';
import FormField from '../../components/ui/FormField';
import GlassCard from '../../components/ui/GlassCard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { useAppDispatch } from '../../redux/hooks';
import { completeOnboarding } from '../../redux/auth/authSlice';
import { finishVehicleOnboarding } from '../../redux/onboarding/onboardingSlice';
import {
  getApiErrorMessage,
  useCreateVehicleMutation,
} from '../../services/vehicles/useVehicleQueries';
import type { AuthStackParamList } from '../../types/navigation';
import { UI_PREVIEW_AUTH_FLOW } from '../../config/uiPreviewMode';
import { FUEL_TYPE_IDS, VEHICLE_TYPE_IDS } from '../../components/vehicles/vehicleUi';
import type { FuelType, VehicleType } from '../../types/vehicle';
import { colors, radius, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'AddFirstVehicle'>;

const VEHICLE_TYPES = VEHICLE_TYPE_IDS;
const FUEL_TYPES = FUEL_TYPE_IDS;

export default function AddFirstVehicleScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateVehicleMutation();

  const finishMainApp = () => {
    dispatch(finishVehicleOnboarding());
    dispatch(completeOnboarding());
  };

  const handleSkip = () => {
    finishMainApp();
  };

  const handleSubmit = async () => {
    setError('');
    if (UI_PREVIEW_AUTH_FLOW) {
      navigation.replace('VehicleSuccess', {
        vehicleId: 'ui-preview-vehicle',
        vehicleNumber: vehicleNumber.trim() || 'OD02AB1234',
      });
      return;
    }
    if (!vehicleNumber.trim() || !brand.trim() || !model.trim()) {
      setError('Vehicle number, brand, and model are required');
      return;
    }

    try {
      const vehicle = await createMutation.mutateAsync({
        vehicleType,
        fuelType: vehicleType === 'ev' ? 'electric' : fuelType,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim() || undefined,
        photo: photoUrl.trim() || undefined,
      });
      navigation.replace('VehicleSuccess', {
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to add vehicle'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Add Your First Vehicle</Text>
          <Text style={styles.subtitle}>Unlock emergency QR and faster roadside assistance.</Text>

          <GlassCard>
            <ChipRow label="Vehicle Type" options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
            {vehicleType !== 'ev' ? (
              <ChipRow label="Fuel Type" options={FUEL_TYPES} value={fuelType} onChange={setFuelType} />
            ) : null}

            <FormField label="Vehicle Number" value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="OD02AB1234" autoCapitalize="characters" />
            <FormField label="Brand" value={brand} onChangeText={setBrand} placeholder="Hyundai" />
            <FormField label="Model" value={model} onChangeText={setModel} placeholder="i20" />
            <FormField label="Color" value={color} onChangeText={setColor} placeholder="White" />
            <FormField label="Vehicle Photo URL (optional)" value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://..." autoCapitalize="none" />

            <AuthToast message={error} />

            <PrimaryButton
              label={createMutation.isPending ? 'Saving...' : 'Save & Generate QR'}
              onPress={() => void handleSubmit()}
              disabled={createMutation.isPending}
            />
            <PrimaryButton label="Skip for now" onPress={handleSkip} variant="outline" />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <TouchableOpacity key={option} onPress={() => onChange(option)} style={[styles.chip, value === option && styles.chipActive]}>
            <Text style={[styles.chipText, value === option && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
  },
  subtitle: { color: colors.grey, marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 20 },
  field: { marginBottom: spacing.md },
  label: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.grey, textTransform: 'capitalize' },
  chipTextActive: { color: colors.dark, fontWeight: typography.weights.bold },
});
