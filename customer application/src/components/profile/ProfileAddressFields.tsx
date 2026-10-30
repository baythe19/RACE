import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronRight, MapPinned } from 'lucide-react-native';

import FormField from '../auth/FormField';
import SelectOptionModal from '../auth/SelectOptionModal';
import LocationPickerModal from '../common/LocationPickerModal';
import { INDIAN_STATE_OPTIONS } from '../../constants/indianStates';
import { FORM_PLACEHOLDER_COLOR } from '../../constants/profileForm';
import type { LocationResult } from '../../types/location';
import { toAddressFormValues } from '../../utils/googlePlaces';
import { getPhoneDigits } from '../../utils/phone';
import { colors, shadows, typography } from '../../theme';

export interface AddressFormValues {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

interface ProfileAddressFieldsProps {
  values: AddressFormValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<AddressFormValues>) => void;
  onClearError?: (key: string) => void;
  scale?: number;
}

export default function ProfileAddressFields({
  values,
  errors,
  onChange,
  onClearError,
  scale = 1,
}: ProfileAddressFieldsProps) {
  const px = (n: number) => Math.round(n * scale);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [statePickerOpen, setStatePickerOpen] = useState(false);

  const searchDisplayValue = [values.line1, values.line2, values.city, values.state, values.pincode]
    .filter(Boolean)
    .join(', ');

  const handleLocationSelect = (location: LocationResult) => {
    const mapped = toAddressFormValues(location);
    onChange(mapped);
    onClearError?.('addressLine1');
    onClearError?.('addressLine2');
    onClearError?.('city');
    onClearError?.('state');
    onClearError?.('pincode');
  };

  return (
    <View>
      <Text
        style={{
          fontSize: px(14),
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: px(8),
        }}>
        Select Address
      </Text>

      <Pressable
        onPress={() => setShowLocationPicker(true)}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: searchDisplayValue ? 'rgba(245,166,35,0.45)' : colors.border,
            borderRadius: px(14),
            backgroundColor: pressed ? colors.goldLight : colors.background,
            paddingHorizontal: px(12),
            minHeight: px(56),
            gap: px(12),
            marginBottom: px(14),
          },
          shadows.card,
        ]}>
        <View
          style={{
            width: px(40),
            height: px(40),
            borderRadius: px(20),
            backgroundColor: colors.goldLight,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          <MapPinned size={px(20)} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: px(12),
              fontWeight: typography.weights.bold,
              color: colors.primary,
              marginBottom: px(2),
            }}>
            Pick on map or search
          </Text>
          <Text
            style={{
              fontSize: px(14),
              color: searchDisplayValue ? colors.dark : colors.grey,
              fontWeight: searchDisplayValue ? typography.weights.semibold : typography.weights.regular,
              lineHeight: px(18),
            }}
            numberOfLines={2}>
            {searchDisplayValue || 'Select your address'}
          </Text>
        </View>
        <ChevronRight size={px(18)} color={colors.primary} strokeWidth={2.4} />
      </Pressable>

      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="Line 1 / House No."
        required
        Icon={MapPinned}
        value={values.line1}
        placeholder="e.g. Flat 4B, Rose Apartments"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onChangeText={text => {
          onChange({ line1: text });
          onClearError?.('addressLine1');
        }}
        error={errors.addressLine1}
      />
      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="Area / Locality"
        required
        value={values.line2}
        placeholder="e.g. Saheed Nagar"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onChangeText={text => {
          onChange({ line2: text });
          onClearError?.('addressLine2');
        }}
        error={errors.addressLine2}
      />
      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="City"
        required
        value={values.city}
        placeholder="e.g. Bhubaneswar"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onChangeText={text => {
          onChange({ city: text });
          onClearError?.('city');
        }}
        error={errors.city}
      />
      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="State"
        required
        value={values.state}
        placeholder="Select state"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        editable={false}
        onPress={() => setStatePickerOpen(true)}
        rightElement={<ChevronDown size={px(16)} color={colors.grey} />}
        error={errors.state}
      />
      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="Pincode"
        required
        value={values.pincode}
        placeholder="6 digits"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onChangeText={text => {
          onChange({ pincode: getPhoneDigits(text).slice(0, 6) });
          onClearError?.('pincode');
        }}
        keyboardType="number-pad"
        maxLength={6}
        error={errors.pincode}
      />

      <LocationPickerModal
        visible={showLocationPicker}
        title="Select your address"
        confirmLabel="Confirm address"
        onClose={() => setShowLocationPicker(false)}
        onLocationSelected={handleLocationSelect}
      />

      <SelectOptionModal
        visible={statePickerOpen}
        title="Select state"
        options={INDIAN_STATE_OPTIONS}
        selectedValue={values.state}
        searchable
        searchPlaceholder="Type state name…"
        onSelect={value => {
          onChange({ state: value });
          onClearError?.('state');
        }}
        onClose={() => setStatePickerOpen(false)}
      />
    </View>
  );
}
