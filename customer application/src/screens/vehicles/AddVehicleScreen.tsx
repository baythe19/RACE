import React, { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthToast from '../../components/auth/AuthToast';
import GoldButton from '../../components/auth/GoldButton';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import {
  ADD_VEHICLE_TYPE_OPTIONS,
  VEHICLE_YELLOW,
  VehiclePlaceholderImage,
} from '../../components/vehicles/vehicleUi';
import { FORM_PLACEHOLDER_COLOR } from '../../constants/profileForm';
import { getVehicleSubtypes, hasVehicleSubtypes } from '../../constants/vehicleSubtypes';
import { useVehicleStore } from '../../store/vehicleStore';
import type { ProfileStackParamList } from '../../types/navigation';
import type { FuelType, VehicleType } from '../../types/vehicle';
import { normalizeVehicleNumberInput } from '../../utils/vehicleFormat';
import { colors, shadows, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';
import { returnToDriverVehicleStep } from '../../navigation/driverWizardNavigation';

type Props =
  | NativeStackScreenProps<ProfileStackParamList, 'AddVehicle'>
  | NativeStackScreenProps<ProfileStackParamList, 'EditVehicle'>;

if (
  Platform.OS === 'android' &&
  !('nativeFabricUIManager' in globalThis) &&
  typeof UIManager.setLayoutAnimationEnabledExperimental === 'function'
) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch {
    // Ignore in modern RN architectures
  }
}

export default function AddVehicleScreen({ navigation, route }: Props) {
  const px = useProfilePx();
  const isEdit = route.name === 'EditVehicle';
  const editVehicleId = isEdit ? route.params.vehicleId : undefined;
  const returnToWizard =
    !isEdit && route.params && 'returnToDriverWizard' in route.params
      ? route.params.returnToDriverWizard === true
      : false;

  const leaveScreen = () => {
    if (returnToWizard) {
      returnToDriverVehicleStep(navigation);
      return;
    }
    goBackWithinStack(navigation);
  };

  const {
    addVehicle,
    updateVehicle,
    fetchVehicle,
    selectedVehicle,
    isLoading,
    error: storeError,
  } = useVehicleStore();

  const fieldGap = px(14);
  const blockGap = px(22);

  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [vehicleSubtype, setVehicleSubtype] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!isEdit);
  const numberInputRef = React.useRef<TextInput | null>(null);
  const brandInputRef = React.useRef<TextInput | null>(null);
  const modelInputRef = React.useRef<TextInput | null>(null);
  const [error, setError] = useState('');

  const subtypeOptions = getVehicleSubtypes(vehicleType);
  const showSubtypeSection = hasVehicleSubtypes(vehicleType);
  const resolvedFuelType: FuelType = vehicleType === 'ev' ? 'electric' : fuelType;

  useEffect(() => {
    if (!editVehicleId) return;
    void fetchVehicle(editVehicleId);
  }, [editVehicleId, fetchVehicle]);

  useEffect(() => {
    if (!isEdit || !editVehicleId || !selectedVehicle || selectedVehicle.id !== editVehicleId) {
      return;
    }
    setVehicleType(
      selectedVehicle.vehicleType === 'auto' ? 'other' : selectedVehicle.vehicleType,
    );
    setVehicleSubtype(selectedVehicle.vehicleSubtype ?? null);
    setFuelType(selectedVehicle.fuelType);
    setVehicleNumber(selectedVehicle.vehicleNumber);
    setBrand(selectedVehicle.brand);
    setModel(selectedVehicle.model);
    setHydrated(true);
  }, [isEdit, editVehicleId, selectedVehicle]);

  const handleVehicleTypeChange = (type: VehicleType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVehicleType(type);
    setVehicleSubtype(null);
    if (type === 'ev') {
      setFuelType('electric');
    } else if (fuelType === 'electric') {
      setFuelType('petrol');
    }
  };

  const handleSubtypeSelect = (subtype: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVehicleSubtype(subtype);
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    setError('');
    if (!vehicleNumber.trim() || !brand.trim() || !model.trim()) {
      setError('Vehicle number, brand, and model are required');
      return;
    }
    if (showSubtypeSection && !vehicleSubtype) {
      setError('Please select a vehicle subtype');
      return;
    }

    const payload = {
      vehicleType,
      ...(vehicleSubtype ? { vehicleSubtype } : {}),
      fuelType: resolvedFuelType,
      vehicleNumber: normalizeVehicleNumberInput(vehicleNumber),
      brand: brand.trim(),
      model: model.trim(),
    };

    try {
      if (isEdit && editVehicleId) {
        await updateVehicle(editVehicleId, payload);
      } else {
        await addVehicle(payload);
      }
      leaveScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save vehicle');
    }
  };

  if (isEdit && !hydrated) {
    return (
      <ProfileSubScreenLayout title="Edit Vehicle" onBack={leaveScreen}>
        <DataSkeleton variant="detail" />
      </ProfileSubScreenLayout>
    );
  }

  return (
    <ProfileSubScreenLayout
      title={isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
      keyboardAvoiding
      contentStyle={{ paddingTop: px(18), paddingBottom: px(8) }}
      onBack={leaveScreen}
      footer={
        <View
          style={{
            paddingHorizontal: px(20),
            paddingTop: px(12),
            paddingBottom: px(16),
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
          <GoldButton
            label={isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Save Vehicle'}
            onPress={() => void handleSubmit()}
            disabled={isLoading}
            style={[shadows.card, { width: '100%' }]}
            height={px(52)}
            borderRadius={px(14)}
          />
        </View>
      }>
      <SectionLabel px={px} label="Vehicle type" required />
      <TypeGrid
        px={px}
        options={ADD_VEHICLE_TYPE_OPTIONS}
        selectedId={vehicleType}
        onSelect={handleVehicleTypeChange}
      />

      {showSubtypeSection ? (
        <View style={{ marginTop: blockGap }}>
          <SectionLabel px={px} label="Subtype" required />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ height: px(40) }}
            contentContainerStyle={{ alignItems: 'center', gap: px(8), paddingRight: px(4) }}>
            {subtypeOptions.map(subtype => {
              const selected = vehicleSubtype === subtype;
              return (
                <Pressable
                  key={subtype}
                  onPress={() => handleSubtypeSelect(subtype)}
                  style={{
                    height: px(36),
                    paddingHorizontal: px(14),
                    borderRadius: px(10),
                    borderWidth: 1.5,
                    borderColor: selected ? VEHICLE_YELLOW : colors.border,
                    backgroundColor: selected ? '#FEF3C7' : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text
                    style={{
                      fontSize: px(13),
                      fontWeight: typography.weights.bold,
                      color: selected ? colors.dark : colors.grey,
                    }}>
                    {subtype}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ marginTop: blockGap, marginBottom: px(6) }}>
        <Text
          style={{
            fontSize: px(12),
            fontWeight: typography.weights.bold,
            color: colors.grey,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            marginBottom: px(12),
          }}>
          Registration & model
        </Text>

        <SectionLabel px={px} label="Registration number" required />
        <TextInput
          ref={numberInputRef}
          value={vehicleNumber}
          onChangeText={text => setVehicleNumber(normalizeVehicleNumberInput(text))}
          placeholder="OD 05 AB 1234"
          placeholderTextColor={FORM_PLACEHOLDER_COLOR}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => brandInputRef.current?.focus()}
          onFocus={() => setFocusedField('number')}
          onBlur={() => setFocusedField(null)}
          style={{
            height: px(52),
            borderRadius: px(12),
            borderWidth: 1.5,
            borderColor: focusedField === 'number' ? VEHICLE_YELLOW : colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: px(14),
            fontSize: px(15),
            fontWeight: typography.weights.semibold,
            color: colors.dark,
            marginBottom: fieldGap,
          }}
        />

        <LabeledInput
          px={px}
          inputRef={brandInputRef}
          label="Brand"
          required
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g. Honda"
          fieldGap={fieldGap}
          focused={focusedField === 'brand'}
          onFocus={() => setFocusedField('brand')}
          onBlur={() => setFocusedField(null)}
          returnKeyType="next"
          onSubmitEditing={() => modelInputRef.current?.focus()}
        />

        <LabeledInput
          px={px}
          inputRef={modelInputRef}
          label="Model"
          required
          value={model}
          onChangeText={setModel}
          placeholder="e.g. City ZX"
          fieldGap={0}
          focused={focusedField === 'model'}
          onFocus={() => setFocusedField('model')}
          onBlur={() => setFocusedField(null)}
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
      </View>

      <AuthToast message={error || storeError || ''} />
    </ProfileSubScreenLayout>
  );
}

function TypeGrid({
  px,
  options,
  selectedId,
  onSelect,
}: {
  px: (n: number) => number;
  options: typeof ADD_VEHICLE_TYPE_OPTIONS;
  selectedId: VehicleType;
  onSelect: (id: VehicleType) => void;
}) {
  const row1 = options.slice(0, 3);
  const row2 = options.slice(3, 6);

  return (
    <View style={{ gap: px(8) }}>
      <TypeRow px={px} options={row1} selectedId={selectedId} onSelect={onSelect} />
      {row2.length ? (
        <TypeRow px={px} options={row2} selectedId={selectedId} onSelect={onSelect} />
      ) : null}
    </View>
  );
}

function TypeRow({
  px,
  options,
  selectedId,
  onSelect,
}: {
  px: (n: number) => number;
  options: typeof ADD_VEHICLE_TYPE_OPTIONS;
  selectedId: VehicleType;
  onSelect: (id: VehicleType) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: px(8) }}>
      {options.map(option => {
        const selected = selectedId === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={{
              flex: 1,
              minHeight: px(84),
              borderRadius: px(14),
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? VEHICLE_YELLOW : colors.border,
              backgroundColor: selected ? '#FFFBEB' : colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: px(8),
              paddingHorizontal: px(4),
            }}>
            <View
              style={{
                width: px(52),
                height: px(40),
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: px(4),
              }}>
              <VehiclePlaceholderImage type={option.id} size={px(48)} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: px(11),
                fontWeight: typography.weights.bold,
                color: selected ? colors.dark : colors.grey,
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionLabel({
  px,
  label,
  required,
}: {
  px: (n: number) => number;
  label: string;
  required?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: px(13),
        fontWeight: typography.weights.bold,
        color: colors.dark,
        marginBottom: px(8),
      }}>
      {label}
      {required ? <Text style={{ color: colors.error }}> *</Text> : null}
    </Text>
  );
}

function LabeledInput({
  px,
  label,
  required,
  value,
  onChangeText,
  placeholder,
  focused,
  onFocus,
  onBlur,
  inputRef,
  returnKeyType = 'next',
  onSubmitEditing,
  fieldGap,
}: {
  px: (n: number) => number;
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  fieldGap?: number;
}) {
  return (
    <View style={{ marginBottom: fieldGap ?? px(14) }}>
      <SectionLabel px={px} label={label} required={required} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onFocus={onFocus}
        onBlur={onBlur}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        submitBehavior="blurAndSubmit"
        onSubmitEditing={onSubmitEditing}
        style={{
          height: px(52),
          borderRadius: px(12),
          borderWidth: 1.5,
          borderColor: focused ? VEHICLE_YELLOW : colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: px(14),
          fontSize: px(15),
          fontWeight: typography.weights.semibold,
          color: colors.dark,
        }}
      />
    </View>
  );
}
