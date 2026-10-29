import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthToast from '../../components/auth/AuthToast';
import GoldButton from '../../components/auth/GoldButton';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import {
  FUEL_TYPE_OPTIONS,
  IndFlagBadge,
  VEHICLE_COLOR_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  VEHICLE_YELLOW,
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

type Props = NativeStackScreenProps<ProfileStackParamList, 'AddVehicle'>;

// LayoutAnimation is enabled by default in the React Native New Architecture
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
  const returnToWizard = route.params?.returnToDriverWizard === true;
  const leaveScreen = () => {
    if (returnToWizard) {
      returnToDriverVehicleStep(navigation);
      return;
    }
    goBackWithinStack(navigation);
  };
  const { addVehicle, isLoading, error: storeError } = useVehicleStore();
  const sectionPad = px(16);

  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [vehicleSubtype, setVehicleSubtype] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('White');
  const [customColor, setCustomColor] = useState('');
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const numberInputRef = React.useRef<TextInput | null>(null);
  const brandInputRef = React.useRef<TextInput | null>(null);
  const modelInputRef = React.useRef<TextInput | null>(null);
  const customColorInputRef = React.useRef<TextInput | null>(null);
  const [error, setError] = useState('');

  const resolvedColor = showCustomColor ? customColor.trim() : color;
  const resolvedFuelType = vehicleType === 'ev' ? 'electric' : fuelType;
  const subtypeOptions = getVehicleSubtypes(vehicleType);
  const showSubtypeSection = hasVehicleSubtypes(vehicleType);

  const handleVehicleTypeChange = (type: VehicleType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVehicleType(type);
    setVehicleSubtype(null);
    if (type === 'ev') {
      setFuelType('electric');
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
    if (!resolvedColor) {
      setError('Please select a vehicle color');
      return;
    }
    if (showSubtypeSection && !vehicleSubtype) {
      setError('Please select a vehicle subtype');
      return;
    }

    try {
      await addVehicle({
        vehicleType,
        ...(vehicleSubtype ? { vehicleSubtype } : {}),
        fuelType: resolvedFuelType,
        vehicleNumber: normalizeVehicleNumberInput(vehicleNumber),
        brand: brand.trim(),
        model: model.trim(),
        color: resolvedColor,
      });
      leaveScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add vehicle');
    }
  };

  const handleMoreColor = () => {
    // Show the custom color input and focus it right away — no intermediate
    // alert dialog (user asked for direct, keyboard-friendly flows).
    setShowCustomColor(true);
    setColor('');
    setTimeout(() => customColorInputRef.current?.focus(), 120);
  };

  return (
    <ProfileSubScreenLayout
      title="Add Vehicle"
      keyboardAvoiding
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
            label={isLoading ? 'Saving...' : 'Save Vehicle'}
            onPress={() => void handleSubmit()}
            disabled={isLoading}
            style={[shadows.card, { width: '100%' }]}
            height={px(52)}
            borderRadius={px(14)}
          />
        </View>
      }>
      <View style={[styles.sectionCard, { padding: sectionPad, marginBottom: px(12) }]}>
        <SectionLabel px={px} label="Vehicle type" required />
        <TypeRow
          px={px}
          options={VEHICLE_TYPE_OPTIONS.slice(0, 4)}
          selectedId={vehicleType}
          onSelect={handleVehicleTypeChange}
        />
        <View style={{ height: px(8) }} />
        <TypeRow
          px={px}
          options={VEHICLE_TYPE_OPTIONS.slice(4)}
          selectedId={vehicleType}
          onSelect={handleVehicleTypeChange}
        />

        {showSubtypeSection ? (
          <View style={{ marginTop: px(18) }}>
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

      <View style={{ height: px(18) }} />
      <SectionLabel px={px} label="Registration number" required />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: px(52),
          borderRadius: px(12),
          borderWidth: 1.5,
          borderColor: focusedField === 'number' ? VEHICLE_YELLOW : colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: px(12),
          marginBottom: px(4),
        }}>
        <IndFlagBadge px={px} />
        <TextInput
          ref={numberInputRef}
          value={vehicleNumber}
          onChangeText={text => setVehicleNumber(normalizeVehicleNumberInput(text))}
          placeholder="OD 05 AB 1234"
          placeholderTextColor={FORM_PLACEHOLDER_COLOR}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => brandInputRef.current?.focus()}
          onFocus={() => setFocusedField('number')}
          onBlur={() => setFocusedField(null)}
          style={{
            flex: 1,
            fontSize: px(15),
            fontWeight: typography.weights.semibold,
            color: colors.dark,
            padding: 0,
          }}
        />
      </View>

      <LabeledInput
        px={px}
        inputRef={brandInputRef}
        label="Brand"
        required
        value={brand}
        onChangeText={setBrand}
        placeholder="e.g. Honda"
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
        focused={focusedField === 'model'}
        onFocus={() => setFocusedField('model')}
        onBlur={() => setFocusedField(null)}
        returnKeyType="done"
        onSubmitEditing={() => void handleSubmit()}
      />
      </View>

      <View style={[styles.sectionCard, { padding: sectionPad, marginBottom: px(12) }]}>
      <SectionLabel px={px} label="Colour" required />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: showCustomColor ? px(8) : px(16),
        }}>
        {VEHICLE_COLOR_OPTIONS.map(option => {
          const selected = !showCustomColor && color === option.name;
          return (
            <Pressable
              key={option.name}
              onPress={() => {
                setColor(option.name);
                setShowCustomColor(false);
                setCustomColor('');
              }}
              style={{
                width: px(36),
                height: px(36),
                borderRadius: px(18),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: selected ? 2.5 : 0,
                borderColor: VEHICLE_YELLOW,
              }}>
              <View
                style={{
                  width: px(28),
                  height: px(28),
                  borderRadius: px(14),
                  backgroundColor: option.hex,
                  borderWidth: option.name === 'White' ? 1 : 0,
                  borderColor: colors.border,
                }}
              />
            </Pressable>
          );
        })}
        <Pressable onPress={handleMoreColor}>
          <Text
            style={{
              fontSize: px(13),
              fontWeight: typography.weights.bold,
              color: VEHICLE_YELLOW,
            }}>
            More
          </Text>
        </Pressable>
      </View>

      {showCustomColor ? (
        <LabeledInput
          px={px}
          inputRef={customColorInputRef}
          label="Custom Color"
          required
          value={customColor}
          onChangeText={setCustomColor}
          placeholder="e.g. Maroon"
          focused={focusedField === 'customColor'}
          onFocus={() => setFocusedField('customColor')}
          onBlur={() => setFocusedField(null)}
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
      ) : null}

      {vehicleType !== 'ev' ? (
        <>
          <SectionLabel px={px} label="Fuel" required />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ height: px(42) }}
            contentContainerStyle={{ alignItems: 'center', gap: px(8) }}>
            {FUEL_TYPE_OPTIONS.filter(option => option.id !== 'electric').map(option => (
              <FuelChip
                key={option.id}
                px={px}
                option={option}
                selected={fuelType === option.id}
                onPress={() => setFuelType(option.id)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
      </View>

      <AuthToast message={error || storeError || ''} />
    </ProfileSubScreenLayout>
  );
}

function TypeRow({
  px,
  options,
  selectedId,
  onSelect,
}: {
  px: (n: number) => number;
  options: typeof VEHICLE_TYPE_OPTIONS;
  selectedId: VehicleType;
  onSelect: (id: VehicleType) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: px(8) }}>
      {options.map(option => {
        const selected = selectedId === option.id;
        const Icon = option.Icon;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={{
              flex: 1,
              height: px(72),
              borderRadius: px(12),
              borderWidth: 1.5,
              borderColor: selected ? VEHICLE_YELLOW : colors.border,
              backgroundColor: selected ? '#FEF3C7' : colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon size={px(20)} color={selected ? VEHICLE_YELLOW : colors.grey} strokeWidth={2} />
            <Text
              numberOfLines={1}
              style={{
                marginTop: px(6),
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

function FuelChip({
  px,
  option,
  selected,
  onPress,
}: {
  px: (n: number) => number;
  option: (typeof FUEL_TYPE_OPTIONS)[number];
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = option.Icon;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: px(4),
        paddingHorizontal: px(12),
        height: px(36),
        borderRadius: px(10),
        borderWidth: 1.5,
        borderColor: selected ? VEHICLE_YELLOW : colors.border,
        backgroundColor: selected ? '#FEF3C7' : colors.background,
      }}>
      <Icon size={px(14)} color={selected ? VEHICLE_YELLOW : colors.grey} strokeWidth={2} />
      <Text
        numberOfLines={1}
        style={{
          fontSize: px(12),
          fontWeight: typography.weights.bold,
          color: selected ? colors.dark : colors.grey,
        }}>
        {option.label}
      </Text>
    </Pressable>
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
        marginBottom: px(10),
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
}) {
  return (
    <View style={{ marginBottom: px(18) }}>
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

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
});
