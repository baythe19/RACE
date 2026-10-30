import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bus,
  Camera,
  Car,
  Check,
  CreditCard,
  Fuel,
  Palette,
  Shield,
  Truck,
  Bike,
  type LucideIcon,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FormField from '../../components/auth/FormField';
import GoldButton from '../../components/auth/GoldButton';
import StepHeader from '../../components/auth/StepHeader';
import {
  FUEL_TYPES,
  VEHICLE_COLORS,
  VEHICLE_TYPES,
} from '../../constants/auth';
import { getVehicleSubtypes, hasVehicleSubtypes } from '../../constants/vehicleSubtypes';
import { useCreateVehicleMutation } from '../../services/vehicles/useVehicleQueries';
import { getApiErrorMessage } from '../../services/api';
import { useAppDialog } from '../../hooks/useAppDialog';
import { buildCreateVehiclePayload } from '../../utils/vehicleFormPayload';
import { finishCustomerOnboarding } from '../../utils/finishCustomerOnboarding';
import type { AuthStackParamList } from '../../types/navigation';
import type { VehicleType } from '../../types/vehicle';
import { colors, shadows, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<AuthStackParamList, 'VehicleRegistration'>;

const TYPE_ICONS: Record<string, LucideIcon> = {
  Car,
  Bike,
  Truck,
  Bus,
};

export default function VehicleRegistrationScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const { dialog, showDialog } = useAppDialog();
  const createVehicleMutation = useCreateVehicleMutation();

  const [selectedType, setSelectedType] = useState<VehicleType>('car');
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [number, setNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedFuel, setSelectedFuel] = useState('Petrol');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const typeCardW = px(62);
  const subtypeOptions = getVehicleSubtypes(selectedType);
  const showSubtypeSection = hasVehicleSubtypes(selectedType);

  const handleTypeSelect = (typeId: VehicleType) => {
    setSelectedType(typeId);
    setSelectedSubtype(null);
    clearError('subtype');
    if (typeId === 'ev') {
      setSelectedFuel('Electric');
    }
  };

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleContinue = async () => {
    const nextErrors: Record<string, string> = {};
    if (!number.trim()) nextErrors.number = 'Please enter vehicle number';
    if (!brand.trim()) nextErrors.brand = 'Please enter brand';
    if (!model.trim()) nextErrors.model = 'Please enter model';
    if (showSubtypeSection && !selectedSubtype) {
      nextErrors.subtype = 'Please select a vehicle subtype';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      const vehicle = await createVehicleMutation.mutateAsync(
        buildCreateVehiclePayload({
          vehicleType: selectedType,
          vehicleSubtype: selectedSubtype ?? undefined,
          vehicleNumber: number,
          brand,
          model,
          colorHex: selectedColor,
          fuelLabel: selectedFuel,
        }),
      );
      navigation.navigate('QRCode', {
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
      });
    } catch (error) {
      showDialog({
        tone: 'error',
        title: 'Vehicle',
        message: getApiErrorMessage(error, 'Unable to save vehicle'),
        primaryLabel: 'OK',
      });
    }
  };

  const handleSkip = async () => {
    await finishCustomerOnboarding();
  };

  const sectionLabel = (text: string) => (
    <Text
      style={{
        fontSize: px(13),
        fontWeight: typography.weights.medium,
        color: colors.grey,
        marginBottom: px(10),
      }}>
      {text}
      <Text style={{ color: colors.error }}> *</Text>
    </Text>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingHorizontal: px(24),
            paddingBottom: px(16),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <StepHeader
            step={2}
            scale={s}
            onBack={() => goBackWithinStack(navigation)}
            onSkip={handleSkip}
          />

          <Text
            style={{
              fontSize: px(24),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              textAlign: 'center',
            }}>
            Add Your Vehicle
          </Text>
          <Text
            style={{
              marginTop: px(6),
              marginBottom: px(22),
              fontSize: px(14),
              color: colors.grey,
              textAlign: 'center',
            }}>
            We'll serve you better with vehicle details.
          </Text>

          {sectionLabel('Vehicle Type')}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: px(20),
            }}>
            {VEHICLE_TYPES.map(type => {
              const Icon = TYPE_ICONS[type.icon] ?? Car;
              const selected = selectedType === type.id;
              return (
                <Pressable
                  key={type.id}
                  style={{
                    width: typeCardW,
                    height: px(72),
                    borderRadius: px(12),
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: px(6),
                  }}
                  onPress={() => handleTypeSelect(type.id as VehicleType)}>
                  <Icon
                    size={px(22)}
                    color={selected ? colors.primary : colors.dark}
                  />
                  <Text
                    style={{
                      fontSize: px(11),
                      fontWeight: typography.weights.semibold,
                      color: selected ? colors.primary : colors.dark,
                    }}>
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {showSubtypeSection ? (
            <>
              {sectionLabel('Vehicle Subtype')}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: px(8),
                  paddingBottom: px(4),
                }}
                style={{ marginBottom: px(16) }}>
                {subtypeOptions.map(subtype => {
                  const selected = selectedSubtype === subtype;
                  return (
                    <Pressable
                      key={subtype}
                      onPress={() => {
                        setSelectedSubtype(subtype);
                        clearError('subtype');
                      }}
                      style={{
                        paddingHorizontal: px(16),
                        paddingVertical: px(10),
                        borderRadius: px(20),
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : colors.background,
                      }}>
                      <Text
                        style={{
                          fontSize: px(13),
                          fontWeight: selected
                            ? typography.weights.bold
                            : typography.weights.semibold,
                          color: selected ? colors.background : colors.dark,
                        }}>
                        {subtype}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {errors.subtype ? (
                <Text
                  style={{
                    color: colors.error,
                    fontSize: px(12),
                    marginTop: px(-10),
                    marginBottom: px(14),
                  }}>
                  {errors.subtype}
                </Text>
              ) : null}
            </>
          ) : null}

          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Vehicle Number"
            required
            Icon={CreditCard}
            value={number}
            onChangeText={text => {
              setNumber(text);
              clearError('number');
            }}
            autoCapitalize="characters"
            style={{ letterSpacing: 1 }}
            placeholder="OD 05 AB 1234"
            error={errors.number}
          />

          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Vehicle Brand"
            required
            Icon={Shield}
            value={brand}
            onChangeText={text => {
              setBrand(text);
              clearError('brand');
            }}
            placeholder="e.g. Honda"
            error={errors.brand}
          />

          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Vehicle Model"
            required
            Icon={Car}
            value={model}
            onChangeText={text => {
              setModel(text);
              clearError('model');
            }}
            placeholder="e.g. City ZX"
            error={errors.model}
          />

          {sectionLabel('Vehicle Color')}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: px(8),
              marginBottom: px(20),
            }}>
            <View
              style={{
                width: px(28),
                height: px(28),
                borderRadius: px(14),
                backgroundColor: colors.lightGrey,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Palette size={px(16)} color={colors.grey} />
            </View>
            {VEHICLE_COLORS.map(color => {
              const selected = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  style={{
                    width: px(28),
                    height: px(28),
                    borderRadius: px(14),
                    backgroundColor: color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: color === '#FFFFFF' ? 1 : 0,
                    borderColor: colors.border,
                    ...(selected
                      ? { borderWidth: 2, borderColor: colors.primary }
                      : null),
                  }}
                  onPress={() => setSelectedColor(color)}>
                  {selected ? (
                    <Check
                      size={px(14)}
                      color={color === '#000000' ? colors.background : colors.dark}
                      strokeWidth={3}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {sectionLabel('Fuel Type')}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: px(8),
              marginBottom: px(20),
            }}>
            <View
              style={{
                width: px(28),
                height: px(28),
                borderRadius: px(14),
                backgroundColor: colors.lightGrey,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Fuel size={px(16)} color={colors.grey} />
            </View>
            {FUEL_TYPES.map(fuel => {
              const selected = selectedFuel === fuel;
              return (
                <Pressable
                  key={fuel}
                  style={{
                    height: px(34),
                    paddingHorizontal: px(14),
                    borderRadius: px(18),
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setSelectedFuel(fuel)}>
                  <Text
                    style={{
                      fontSize: px(13),
                      fontWeight: selected
                        ? typography.weights.bold
                        : typography.weights.semibold,
                      color: colors.dark,
                    }}>
                    {fuel}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={{
              borderWidth: 1.5,
              borderColor: colors.border,
              borderStyle: 'dashed',
              borderRadius: px(12),
              paddingVertical: px(28),
              alignItems: 'center',
            }}
            onPress={() =>
              showDialog({
                tone: 'info',
                title: 'Photo',
                message: 'Camera coming soon',
                primaryLabel: 'Got it',
              })
            }>
            <Camera size={px(28)} color={colors.primary} />
            <Text
              style={{
                marginTop: px(8),
                fontSize: px(14),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              Add Vehicle Photo
            </Text>
            <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(2) }}>
              (Optional)
            </Text>
          </Pressable>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: px(24),
            paddingTop: px(12),
            paddingBottom: Math.max(insets.bottom, px(16)),
            backgroundColor: colors.background,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}>
          <GoldButton
            label={createVehicleMutation.isPending ? 'Saving...' : 'Save & Continue'}
            onPress={() => void handleContinue()}
            style={[styles.fullBtn, shadows.card]}
            height={px(54)}
            labelSize={px(17)}
            borderRadius={px(14)}
            disabled={createVehicleMutation.isPending}
          />
        </View>
      </KeyboardAvoidingView>
      {dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  fullBtn: {
    width: '100%',
  },
});
