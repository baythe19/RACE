import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, Phone, User } from 'lucide-react-native';

import FormField from '../auth/FormField';
import SelectOptionModal from '../auth/SelectOptionModal';
import { EMERGENCY_RELATIONSHIP_OPTIONS, FORM_PLACEHOLDER_COLOR } from '../../constants/profileForm';
import { colors, typography } from '../../theme';
import { getPhoneDigits } from '../../utils/phone';

export interface EmergencyContactFormValues {
  name: string;
  phone: string;
  relationship: string;
}

interface ProfileEmergencyContactFieldsProps {
  values: EmergencyContactFormValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<EmergencyContactFormValues>) => void;
  onClearError?: (key: string) => void;
  scale?: number;
}

export default function ProfileEmergencyContactFields({
  values,
  errors,
  onChange,
  onClearError,
  scale = 1,
}: ProfileEmergencyContactFieldsProps) {
  const px = (n: number) => Math.round(n * scale);
  const [relationPickerOpen, setRelationPickerOpen] = useState(false);

  const relationshipOptions = EMERGENCY_RELATIONSHIP_OPTIONS.map(option => ({
    label: option,
    value: option,
  }));

  return (
    <View>
      <View style={{ marginBottom: px(12) }}>
        <Text
          style={{
            fontSize: px(14),
            fontWeight: typography.weights.bold,
            color: colors.dark,
          }}>
          Emergency Contact
        </Text>
      </View>

      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="Contact Name"
        required
        Icon={User}
        value={values.name}
        placeholder="e.g. Rahul Sharma"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onChangeText={text => {
          onChange({ name: text });
          onClearError?.('emergencyName');
        }}
        error={errors.emergencyName}
      />
      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="Mobile Number"
        required
        Icon={Phone}
        iconColor={colors.error}
        value={values.phone}
        placeholder="10-digit mobile number"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onChangeText={text => {
          onChange({ phone: getPhoneDigits(text).slice(0, 10) });
          onClearError?.('emergencyPhone');
        }}
        keyboardType="phone-pad"
        maxLength={10}
        error={errors.emergencyPhone}
      />
      <FormField
        variant="outlined"
        compact
        scale={scale}
        label="Relationship"
        required
        Icon={User}
        value={values.relationship}
        placeholder="Select relationship"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        editable={false}
        onPress={() => setRelationPickerOpen(true)}
        error={errors.emergencyRelationship}
        rightElement={
          <Pressable onPress={() => setRelationPickerOpen(true)} hitSlop={8}>
            <ChevronDown size={px(18)} color={colors.grey} />
          </Pressable>
        }
      />

      <SelectOptionModal
        visible={relationPickerOpen}
        title="Select Relationship"
        options={relationshipOptions}
        selectedValue={values.relationship}
        onSelect={value => {
          onChange({ relationship: value });
          onClearError?.('emergencyRelationship');
        }}
        onClose={() => setRelationPickerOpen(false)}
      />
    </View>
  );
}
