import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { BookingStatus } from '../../types/booking';
import { colors, radius, spacing, typography } from '../../theme';

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; background: string }
> = {
  CREATED: { label: 'Created', color: colors.text, background: 'rgba(255,255,255,0.1)' },
  ASSIGNED: { label: 'Assigned', color: colors.primary, background: 'rgba(255,195,38,0.15)' },
  ACCEPTED: { label: 'Accepted', color: colors.primary, background: 'rgba(255,195,38,0.15)' },
  EN_ROUTE: { label: 'On The Way', color: colors.success, background: 'rgba(22,163,74,0.15)' },
  ARRIVED: { label: 'Arrived', color: colors.success, background: 'rgba(22,163,74,0.15)' },
  SERVICE_STARTED: { label: 'In Progress', color: colors.warning, background: 'rgba(0,188,212,0.15)' },
  SERVICE_COMPLETED: { label: 'Completed', color: colors.success, background: 'rgba(22,163,74,0.15)' },
  PAYMENT_PENDING: { label: 'Payment Due', color: colors.accentOrange, background: 'rgba(255,152,0,0.15)' },
  PAID: { label: 'Paid', color: colors.success, background: 'rgba(22,163,74,0.15)' },
};

interface StatusChipProps {
  status: BookingStatus;
  compact?: boolean;
}

export default function StatusChip({ status, compact }: StatusChipProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.chip, { backgroundColor: config.background }, compact && styles.compact]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <PartnerText style={[styles.label, { color: config.color }]}>{config.label}</PartnerText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  compact: {
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
