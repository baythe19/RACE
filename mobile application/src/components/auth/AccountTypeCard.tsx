import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import GlassCard from '../ui/GlassCard';
import { colors, radius, spacing, typography } from '../../theme';

interface AccountTypeCardProps {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function AccountTypeCard({
  emoji,
  title,
  subtitle,
  onPress,
  disabled,
}: AccountTypeCardProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.88}>
      <GlassCard style={[styles.card, disabled && styles.disabled]}>
        <View style={styles.row}>
          <PartnerText style={styles.emoji}>{emoji}</PartnerText>
          <View style={styles.textWrap}>
            <PartnerText style={styles.title}>{title}</PartnerText>
            <PartnerText style={styles.subtitle}>{subtitle}</PartnerText>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  disabled: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 34 },
  textWrap: { flex: 1 },
  title: {
    color: colors.textLight,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  subtitle: { color: colors.subtext, marginTop: spacing.xs, lineHeight: 20 },
});
