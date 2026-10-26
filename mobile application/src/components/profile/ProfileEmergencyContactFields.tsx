import { usePartnerDialog } from '../../hooks/usePartnerDialog';
import { PartnerText } from '../partner/PartnerText';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, Phone, User } from 'lucide-react-native';

import FormField from '../auth/FormField';
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
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const [relDialogOpen, setRelDialogOpen] = useState(false);

  const handleRelationshipPress = () => {
    setRelDialogOpen(true);
  };

  return (
    <View>
      <View style={{ marginBottom: px(12) }}>
        <PartnerText
          style={{
            fontSize: px(14),
            fontWeight: typography.weights.bold,
            color: colors.dark,
          }}>
          Emergency Contact
        </PartnerText>
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
        onPress={handleRelationshipPress}
        error={errors.emergencyRelationship}
        rightElement={
          <Pressable onPress={handleRelationshipPress} hitSlop={8}>
            <ChevronDown size={px(18)} color={colors.grey} />
          </Pressable>
        }
      />

      {/* Relationship chooser (replaces system Alert options) */}
      <Modal transparent animationType="fade" visible={relDialogOpen} onRequestClose={() => setRelDialogOpen(false)}>
        <Pressable style={relStyles.overlay} onPress={() => setRelDialogOpen(false)}>
          <Pressable style={relStyles.sheet} onPress={e => e.stopPropagation()}>
            <PartnerText style={relStyles.title}>Select Relationship</PartnerText>
            {EMERGENCY_RELATIONSHIP_OPTIONS.map(option => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => {
                  setRelDialogOpen(false);
                  onChange({ relationship: option });
                  onClearError?.('emergencyRelationship');
                }}
                style={({ pressed }) => [relStyles.option, pressed && relStyles.optionPressed]}>
                <PartnerText style={relStyles.optionText}>{option}</PartnerText>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setRelDialogOpen(false)}
              style={({ pressed }) => [relStyles.option, relStyles.closeRow, pressed && relStyles.optionPressed]}>
              <PartnerText style={relStyles.closeText}>Cancel</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {partnerDialog}
    </View>
  );
}

const relStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,25,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#191919',
    marginTop: 14,
    marginBottom: 4,
  },
  option: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  optionPressed: {
    backgroundColor: '#F8FAFC',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191919',
  },
  closeRow: {
    marginTop: 4,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
});
