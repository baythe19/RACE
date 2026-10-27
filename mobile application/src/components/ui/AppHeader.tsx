import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import type { Brand } from '../../types/models';

interface AppHeaderProps {
  brand: Brand;
}

export default function AppHeader({ brand }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.textWrap}>
        <PartnerText style={styles.product}>{brand.productName}</PartnerText>
        <PartnerText style={styles.name}>{brand.name}</PartnerText>
      </View>
      <View style={styles.badge}>
        <PartnerText style={styles.badgeText}>24/7</PartnerText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  textWrap: {
    flex: 1,
  },
  product: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    color: colors.textLight,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.textDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
  },
});
