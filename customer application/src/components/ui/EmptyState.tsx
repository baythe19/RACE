import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from './PrimaryButton';
import { colors, spacing, typography } from '../../theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Fill leftover screen height and center icon+copy in the middle. */
  fill?: boolean;
}

export default function EmptyState({
  icon = 'document-text-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  fill = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, fill && styles.fill]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  fill: {
    flexGrow: 1,
    alignSelf: 'stretch',
    minHeight: 320,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,195,38,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.lineHeights.normal,
  },
  action: {
    marginTop: spacing.xl,
    width: '100%',
  },
});
