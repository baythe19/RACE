import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing, typography } from '../../theme';

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'dark-outline' | 'dark-filled' | 'outline-light';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
  labelSize?: number;
  borderRadius?: number;
}

export default function GoldButton({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  style,
  height = layout.buttonHeight,
  labelSize,
  borderRadius,
}: GoldButtonProps) {
  const isFilled = variant === 'filled';
  const isDarkOutline = variant === 'dark-outline';
  const isDarkFilled = variant === 'dark-filled';
  const isOutlineLight = variant === 'outline-light';

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { minHeight: height },
        borderRadius != null && { borderRadius },
        isFilled && styles.filled,
        variant === 'outline' && styles.outline,
        isOutlineLight && styles.outlineLight,
        isDarkOutline && styles.darkOutline,
        isDarkFilled && styles.darkFilled,
        disabled && !loading && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator
            color={
              isDarkFilled || isOutlineLight
                ? colors.background
                : isFilled
                  ? colors.dark
                  : colors.primary
            }
          />
          <Text
            style={[
              styles.label,
              labelSize != null && { fontSize: labelSize },
              isFilled && styles.filledLabel,
              variant === 'outline' && styles.outlineLabel,
              isDarkOutline && styles.darkOutlineLabel,
              isDarkFilled && styles.darkFilledLabel,
              isOutlineLight && styles.outlineLightLabel,
            ]}>
            {label}
          </Text>
        </View>
      ) : (
        <Text
          style={[
            styles.label,
            labelSize != null && { fontSize: labelSize },
            isFilled && styles.filledLabel,
            variant === 'outline' && styles.outlineLabel,
            isDarkOutline && styles.darkOutlineLabel,
            isDarkFilled && styles.darkFilledLabel,
            isOutlineLight && styles.outlineLightLabel,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  filled: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  outlineLight: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#4E3B16',
  },
  darkOutline: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.dark,
  },
  darkFilled: {
    backgroundColor: colors.dark,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  filledLabel: {
    color: colors.dark,
  },
  outlineLabel: {
    color: colors.primary,
  },
  darkOutlineLabel: {
    color: colors.dark,
  },
  darkFilledLabel: {
    color: colors.background,
  },
  outlineLightLabel: {
    color: colors.background,
    fontSize: typography.sizes.sm,
  },
});
