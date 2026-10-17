import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '../../theme';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Omit the drop shadow (flat border-only card). */
  flat?: boolean;
}

/** Light RACE card surface (matches customer app card treatment). */
export default function GlassCard({ children, style, padded = true, flat = false }: GlassCardProps) {
  return (
    <View style={[styles.card, !flat && styles.shadow, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  shadow: {
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
});
