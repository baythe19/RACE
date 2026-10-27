import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, layout, radius, spacing, typography } from '../../theme';
import type { ButtonVariant } from '../../types/models';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
}

export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isOutline = variant === 'outline';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isOutline ? styles.outline : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <PartnerText
        style={[
          styles.label,
          isOutline ? styles.outlineLabel : styles.primaryLabel,
        ]}>
        {label}
      </PartnerText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  primaryLabel: {
    color: colors.dark,
  },
  outlineLabel: {
    color: colors.primary,
  },
});
