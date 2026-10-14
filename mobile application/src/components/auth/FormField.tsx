import { PartnerText, PartnerTextInput } from '../partner/PartnerText';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors, radius, spacing, typography } from '../../theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  variant?: 'filled' | 'outlined';
  compact?: boolean;
  scale?: number;
  error?: string;
  Icon?: LucideIcon;
  iconColor?: string;
  rightElement?: ReactNode;
  helperText?: string;
  helperColor?: string;
  onPress?: () => void;
  editable?: boolean;
}

export default function FormField({
  label,
  required,
  optional,
  variant = 'filled',
  compact = false,
  scale = 1,
  error,
  Icon,
  iconColor = colors.grey,
  rightElement,
  helperText,
  helperColor,
  onPress,
  editable = true,
  style,
  ...inputProps
}: FormFieldProps) {
  const isOutlined = variant === 'outlined';
  const iconSize = compact ? Math.round(20 * scale) : 20;
  const fieldRadius = compact ? Math.round(12 * scale) : radius.input;
  const fieldHeight = compact ? Math.round(52 * scale) : undefined;
  const fieldPadH = compact ? Math.round(16 * scale) : spacing.lg;
  const labelSize = compact ? Math.round(12 * scale) : typography.sizes.sm;
  const inputSize = compact ? Math.round(14 * scale) : typography.sizes.md;

  const content = (
    <View
      style={[
        isOutlined ? styles.outlinedField : styles.field,
        compact && isOutlined && {
          minHeight: fieldHeight,
          paddingHorizontal: fieldPadH,
          borderRadius: fieldRadius,
        },
        error ? styles.fieldError : null,
      ]}>
      {Icon ? (
        <View style={[styles.fieldIcon, compact && { marginRight: Math.round(8 * scale) }]}>
          <Icon size={iconSize} color={iconColor} />
        </View>
      ) : null}
      <PartnerTextInput
        style={[
          styles.input,
          compact && {
            paddingVertical: Math.round(10 * scale),
            fontSize: inputSize,
            fontWeight: typography.weights.medium,
          },
          style,
        ]}
        placeholderTextColor="#9CA3AF"
        selectionColor={colors.primary}
        cursorColor={colors.dark}
        autoCorrect={false}
        editable={editable && !onPress}
        pointerEvents={onPress ? 'none' : 'auto'}
        {...inputProps}
      />
      {rightElement}
    </View>
  );

  if (isOutlined) {
    return (
      <View style={[styles.container, compact && { marginBottom: Math.round(16 * scale) }]}>
        <View style={styles.outlinedWrap}>
          <PartnerText
            style={[
              styles.outlinedLabel,
              {
                fontSize: labelSize,
                top: Math.round(-8 * scale),
                left: Math.round(12 * scale),
              },
            ]}>
            {label}
            {required ? <PartnerText style={styles.required}> *</PartnerText> : null}
          </PartnerText>
          {onPress ? (
            <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
              {content}
            </Pressable>
          ) : (
            content
          )}
        </View>
        {helperText ? (
          <PartnerText style={[styles.helper, helperColor ? { color: helperColor } : null]}>
            {helperText}
          </PartnerText>
        ) : null}
        {error ? <PartnerText style={styles.error}>{error}</PartnerText> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <PartnerText style={styles.label}>
          {label}
          {required ? <PartnerText style={styles.required}> *</PartnerText> : null}
        </PartnerText>
        {optional ? <PartnerText style={styles.optional}>(Optional)</PartnerText> : null}
      </View>
      {onPress ? (
        <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
          {content}
        </Pressable>
      ) : (
        content
      )}
      {helperText ? (
        <PartnerText style={[styles.helper, helperColor ? { color: helperColor } : null]}>
          {helperText}
        </PartnerText>
      ) : null}
      {error ? <PartnerText style={styles.error}>{error}</PartnerText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  required: {
    color: colors.error,
  },
  optional: {
    fontSize: typography.sizes.xs,
    color: colors.grey,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGrey,
    borderRadius: radius.input,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldError: {
    borderColor: colors.error,
  },
  fieldIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    color: colors.dark,
    paddingVertical: spacing.md,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.9,
  },
  helper: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.grey,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  outlinedWrap: {
    position: 'relative',
  },
  outlinedField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.input,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlinedLabel: {
    position: 'absolute',
    top: -10,
    left: 14,
    zIndex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 4,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.dark,
  },
});
