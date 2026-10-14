import { PartnerText } from './PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShieldCheck, Clock, Users, type LucideIcon } from 'lucide-react-native';

import { colors, radius, shadows, spacing, typography } from '../../theme';

const FEATURES: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShieldCheck, label: 'Trusted &\nSecure' },
  { icon: Clock, label: '24/7\nSupport' },
  { icon: Users, label: 'Grow Your\nBusiness' },
];

export default function PartnerWelcomeTrustCard() {
  return (
    <View style={styles.card}>
      {FEATURES.map((feature, index) => {
        const Icon = feature.icon;
        const isLast = index === FEATURES.length - 1;

        return (
          <View key={feature.label} style={[styles.item, !isLast && styles.itemDivider]}>
            <View style={styles.iconWrap}>
              <Icon size={22} color={colors.primary} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.label}>{feature.label}</PartnerText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    ...shadows.card,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.xs,
  },
  itemDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
