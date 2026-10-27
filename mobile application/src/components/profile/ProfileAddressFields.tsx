import { PartnerText } from '../partner/PartnerText';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, MapPin } from 'lucide-react-native';

import FormField from '../auth/FormField';
import LocationPickerModal from '../common/LocationPickerModal';
import { FORM_PLACEHOLDER_COLOR } from '../../constants/profileForm';
import type { LocationResult } from '../../types/location';
import { toAddressFormValues } from '../../utils/googlePlaces';
import { getPhoneDigits } from '../../utils/phone';
import { colors, typography } from '../../theme';

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
      <PartnerText
        style={{
          fontSize: px(14),
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: px(8),
        }}>
        Select Address
      </PartnerText>

      <Pressable onPress={() => setShowLocationPicker(true)} style={{ marginBottom: px(12) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: px(12),
            backgroundColor: colors.background,
            paddingHorizontal: px(12),
            minHeight: px(52),
            gap: px(10),
          }}>
          <MapPin size={px(18)} color={colors.primary} />
          <PartnerText
            style={{
              flex: 1,
              fontSize: px(15),
              color: searchDisplayValue ? colors.dark : colors.grey,
              fontWeight: searchDisplayValue ? typography.weights.semibold : typography.weights.regular,
            }}
            numberOfLines={2}>
            {searchDisplayValue || 'Select your address'}
          </PartnerText>
          <ChevronRight size={px(18)} color={colors.grey} />
        </View>
      </Pressable>

      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="Line 1 / House No."
        required
        Icon={MapPin}
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
        placeholder="e.g. Odisha"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onChangeText={text => {
          onChange({ state: text });
          onClearError?.('state');
        }}
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
        openSearchOnShow
        onClose={() => setShowLocationPicker(false)}
        onLocationSelected={handleLocationSelect}
      />
    </View>
  );
}
