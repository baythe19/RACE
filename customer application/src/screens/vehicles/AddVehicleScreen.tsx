import React, { useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Camera } from 'lucide-react-native';
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

export default function AddVehicleScreen({ navigation }: Props) {
  const px = useProfilePx();
  const { addVehicle, isLoading, error: storeError } = useVehicleStore();

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
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add vehicle');
    }
  };

  const handleMoreColor = () => {
    Alert.alert('Custom Color', 'Enter a custom color name', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Use Custom',
        onPress: () => {
          setShowCustomColor(true);
          setColor('');
        },
      },
    ]);
  };

  return (
    <ProfileSubScreenLayout
      title="Add Vehicle"
      keyboardAvoiding
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
      <SectionLabel px={px} label="Vehicle Type" required />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(10), marginBottom: px(20) }}>
        {VEHICLE_TYPE_OPTIONS.map(option => {
          const selected = vehicleType === option.id;
          const Icon = option.Icon;
          return (
            <Pressable
              key={option.id}
              onPress={() => handleVehicleTypeChange(option.id)}
              style={{
                width: px(72),
                height: px(78),
                borderRadius: px(12),
                borderWidth: 1.5,
                borderColor: selected ? VEHICLE_YELLOW : colors.border,
                backgroundColor: selected ? '#FEF3C7' : colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: px(8),
              }}>
              <View style={{ marginBottom: px(6) }}>
                <Icon
                  size={px(24)}
                  color={selected ? VEHICLE_YELLOW : colors.grey}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={{
                  fontSize: px(11),
                  fontWeight: selected ? typography.weights.bold : typography.weights.semibold,
                  color: selected ? colors.dark : colors.grey,
                }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showSubtypeSection ? (
        <>
          <SectionLabel px={px} label="Vehicle Subtype" required />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: px(10),
              paddingBottom: px(20),
            }}
            style={{ marginBottom: 0 }}>
            {subtypeOptions.map(subtype => {
              const selected = vehicleSubtype === subtype;
              return (
                <Pressable
                  key={subtype}
                  onPress={() => handleSubtypeSelect(subtype)}
                  style={{
                    paddingHorizontal: px(16),
                    paddingVertical: px(10),
                    borderRadius: px(24),
                    backgroundColor: selected ? VEHICLE_YELLOW : '#F3F4F6',
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
        </>
      ) : null}

      <SectionLabel px={px} label="Vehicle Number" required />
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
          marginBottom: px(18),
        }}>
        <IndFlagBadge px={px} />
        <TextInput
          value={vehicleNumber}
          onChangeText={text => setVehicleNumber(normalizeVehicleNumberInput(text))}
          placeholder="OD 05 AB 1234"
          placeholderTextColor={FORM_PLACEHOLDER_COLOR}
          autoCapitalize="characters"
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
        label="Vehicle Brand"
        required
        value={brand}
        onChangeText={setBrand}
        placeholder="e.g. Honda"
        focused={focusedField === 'brand'}
        onFocus={() => setFocusedField('brand')}
        onBlur={() => setFocusedField(null)}
      />

      <LabeledInput
        px={px}
        label="Vehicle Model"
        required
        value={model}
        onChangeText={setModel}
        placeholder="e.g. City ZX"
        focused={focusedField === 'model'}
        onFocus={() => setFocusedField('model')}
        onBlur={() => setFocusedField(null)}
      />

      <SectionLabel px={px} label="Vehicle Color" required />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: px(12),
          marginBottom: showCustomColor ? px(10) : px(18),
          alignItems: 'center',
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
          label="Custom Color"
          required
          value={customColor}
          onChangeText={setCustomColor}
          placeholder="e.g. Maroon"
          focused={focusedField === 'customColor'}
          onFocus={() => setFocusedField('customColor')}
          onBlur={() => setFocusedField(null)}
        />
      ) : null}

      {vehicleType !== 'ev' ? (
        <>
          <SectionLabel px={px} label="Fuel Type" required />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(10), marginBottom: px(20) }}>
            {FUEL_TYPE_OPTIONS.map(option => {
              const selected = fuelType === option.id;
              const Icon = option.Icon;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setFuelType(option.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: px(6),
                    paddingHorizontal: px(14),
                    paddingVertical: px(10),
                    borderRadius: px(24),
                    borderWidth: 1.5,
                    borderColor: selected ? VEHICLE_YELLOW : colors.border,
                    backgroundColor: selected ? '#FEF3C7' : colors.background,
                  }}>
                  <Icon
                    size={px(16)}
                    color={selected ? VEHICLE_YELLOW : colors.grey}
                    strokeWidth={2}
                  />
                  <Text
                    style={{
                      fontSize: px(13),
                      fontWeight: typography.weights.bold,
                      color: selected ? VEHICLE_YELLOW : colors.dark,
                    }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Pressable
        onPress={() => Alert.alert('Photo', 'Camera coming soon')}
        style={{
          borderRadius: px(14),
          borderWidth: 1.5,
          borderColor: VEHICLE_YELLOW,
          borderStyle: 'dashed',
          paddingVertical: px(28),
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: px(16),
        }}>
        <Camera size={px(28)} color={VEHICLE_YELLOW} strokeWidth={2} />
        <Text
          style={{
            marginTop: px(8),
            fontSize: px(13),
            fontWeight: typography.weights.bold,
            color: VEHICLE_YELLOW,
          }}>
          Add Vehicle Photo (Optional)
        </Text>
      </Pressable>

      <AuthToast message={error || storeError || ''} />
    </ProfileSubScreenLayout>
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
        fontSize: px(14),
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
}) {
  return (
    <View style={{ marginBottom: px(18) }}>
      <SectionLabel px={px} label={label} required={required} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onFocus={onFocus}
        onBlur={onBlur}
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
