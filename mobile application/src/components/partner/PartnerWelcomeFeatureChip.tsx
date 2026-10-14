import { PartnerText } from './PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../theme';

interface PartnerWelcomeFeatureChipProps {
  emoji: string;
  label: string;
}

export default function PartnerWelcomeFeatureChip({
  emoji,
  label,
}: PartnerWelcomeFeatureChipProps) {
  return (
    <View style={styles.chip}>
      <PartnerText style={styles.emoji}>{emoji}</PartnerText>
      <PartnerText style={styles.label} numberOfLines={2}>
        {label}
      </PartnerText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 96,
    ...shadows.card,
  },
  emoji: {
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.dark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    lineHeight: typography.lineHeights.tight,
  },
});
