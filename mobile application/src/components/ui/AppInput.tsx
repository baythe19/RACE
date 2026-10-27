import { PartnerText, PartnerTextInput } from '../partner/PartnerText';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function AppInput({
  label,
  error,
  containerStyle,
  style,
  ...inputProps
}: AppInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <PartnerText style={styles.label}>{label}</PartnerText> : null}
      <PartnerTextInput
        placeholderTextColor={colors.grey}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? <PartnerText style={styles.error}>{error}</PartnerText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  input: {
    height: 52,
    borderRadius: radius.input,
    backgroundColor: colors.lightGrey,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    color: colors.dark,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
});
