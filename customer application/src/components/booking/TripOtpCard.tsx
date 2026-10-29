import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { colors, radius, shadows, spacing, typography } from '../../theme';

type Props = {
  otp?: string;
  title?: string;
  subtitle?: string;
  /** Tighter list-card layout */
  compact?: boolean;
};

export default function TripOtpCard({
  otp,
  title = 'Trip OTP',
  subtitle = 'Share with driver on arrival.',
  compact = false,
}: Props) {
  if (!otp) return null;

  const digits = otp.split('');

  return (
    <View style={[styles.card, compact && styles.cardCompact, shadows.cardSoft]}>
      <View style={styles.header}>
        <ShieldCheck size={compact ? 15 : 17} color={colors.dark} strokeWidth={2.2} />
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      </View>
      <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
      <View style={[styles.digitsRow, compact && { gap: spacing.xs, marginTop: 2 }]}>
        {digits.map((digit, index) => (
          <View key={`${digit}-${index}`} style={[styles.digitBox, compact && styles.digitBoxCompact]}>
            <Text style={[styles.digit, compact && styles.digitCompact]}>{digit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardCompact: {
    padding: spacing.sm + 2,
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  titleCompact: {
    fontSize: typography.sizes.sm,
  },
  subtitle: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 17,
  },
  subtitleCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  digitsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  digitBox: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxCompact: {
    minHeight: 38,
    borderRadius: 8,
  },
  digit: {
    color: colors.dark,
    fontSize: 22,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 1,
  },
  digitCompact: {
    fontSize: 18,
  },
});
