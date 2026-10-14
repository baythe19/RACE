import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

interface LocationBarProps {
  location: string;
}

export default function LocationBar({ location }: LocationBarProps) {
  return (
    <View style={styles.wrap}>
      <PartnerText style={styles.label}>Service location</PartnerText>
      <PartnerText style={styles.value}>{location}</PartnerText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.textLight,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
});
