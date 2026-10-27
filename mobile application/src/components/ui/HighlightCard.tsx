import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Circle, Clock, Phone, Radio, type LucideIcon } from 'lucide-react-native';

import { colors, radius, spacing, typography } from '../../theme';
import type { Highlight, HighlightIcon } from '../../types/models';

const HIGHLIGHT_ICONS: Record<HighlightIcon, LucideIcon> = {
  clock: Clock,
  phone: Phone,
  live: Radio,
};

interface HighlightCardProps {
  item: Highlight;
}

export default function HighlightCard({ item }: HighlightCardProps) {
  const Icon = HIGHLIGHT_ICONS[item.icon] ?? Circle;

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon size={18} color={colors.primary} strokeWidth={2} />
        {item.icon === 'live' ? <View style={styles.liveDot} /> : null}
      </View>
      <PartnerText style={styles.value}>{item.value}</PartnerText>
      <PartnerText style={styles.label}>{item.label}</PartnerText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    position: 'relative',
  },
  liveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  value: {
    color: colors.textDark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.extrabold,
    marginBottom: 2,
  },
  label: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    lineHeight: typography.lineHeights.tight,
  },
});
