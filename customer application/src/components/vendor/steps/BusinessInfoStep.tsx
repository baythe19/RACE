import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import FormField from '../../ui/FormField';
import { colors, spacing, typography } from '../../../theme';
import type { VendorDraft } from '../../../types/vendor';

interface Props {
  draft: VendorDraft;
  onChange: (patch: Partial<VendorDraft>) => void;
  isCompany?: boolean;
}

export default function BusinessInfoStep({ draft, onChange, isCompany }: Props) {
  return (
    <View>
      <Text style={styles.title}>
        {isCompany ? 'Business Information' : 'Personal Information'}
      </Text>
      {isCompany ? (
        <FormField
          dark
          label="Business Name"
          value={draft.businessName ?? ''}
          onChangeText={(v) => onChange({ businessName: v })}
          placeholder="Registered business name"
        />
      ) : null}
      <FormField
        dark
        label={isCompany ? 'Owner Name' : 'Full Name'}
        value={draft.ownerName}
        onChangeText={(v) => onChange({ ownerName: v })}
        placeholder="Full legal name"
      />
      <FormField
        dark
        label="Mobile Number"
        value={draft.mobileNumber}
        onChangeText={(v) => onChange({ mobileNumber: v.replace(/\D/g, '').slice(0, 10) })}
        keyboardType="number-pad"
        placeholder="10-digit mobile"
      />
      <FormField
        dark
        label="Email"
        value={draft.email ?? ''}
        onChangeText={(v) => onChange({ email: v })}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <FormField
        dark
        label={isCompany ? 'Business Address' : 'Address'}
        value={draft.address ?? ''}
        onChangeText={(v) => onChange({ address: v })}
        placeholder="Complete address"
      />
      {!isCompany ? (
        <>
          <FormField
            dark
            label="Date of Birth"
            value={draft.driverProfile?.dateOfBirth ?? ''}
            onChangeText={(v) =>
              onChange({
                driverProfile: { ...draft.driverProfile, dateOfBirth: v },
              })
            }
            placeholder="DD/MM/YYYY"
          />
          <FormField
            dark
            label="Emergency Contact Name"
            value={draft.driverProfile?.emergencyContact?.name ?? ''}
            onChangeText={(v) =>
              onChange({
                driverProfile: {
                  ...draft.driverProfile,
                  emergencyContact: {
                    name: v,
                    mobileNumber: draft.driverProfile?.emergencyContact?.mobileNumber ?? '',
                    relationship: draft.driverProfile?.emergencyContact?.relationship,
                  },
                },
              })
            }
          />
          <FormField
            dark
            label="Emergency Contact Number"
            value={draft.driverProfile?.emergencyContact?.mobileNumber ?? ''}
            onChangeText={(v) =>
              onChange({
                driverProfile: {
                  ...draft.driverProfile,
                  emergencyContact: {
                    name: draft.driverProfile?.emergencyContact?.name ?? '',
                    mobileNumber: v.replace(/\D/g, '').slice(0, 10),
                    relationship: draft.driverProfile?.emergencyContact?.relationship,
                  },
                },
              })
            }
            keyboardType="number-pad"
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textLight,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
});
