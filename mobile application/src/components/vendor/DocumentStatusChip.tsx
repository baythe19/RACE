import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import type { DocumentVerificationStatus } from '../../types/vendor';

const STATUS_LABELS: Record<DocumentVerificationStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  resubmission_required: 'Resubmit',
};

const STATUS_COLORS: Record<DocumentVerificationStatus, string> = {
  pending: colors.textMuted,
  under_review: colors.primary,
  approved: '#2E7D32',
  rejected: colors.accentRed,
  resubmission_required: '#E65100',
};

interface DocumentStatusChipProps {
  status: DocumentVerificationStatus;
}

export default function DocumentStatusChip({ status }: DocumentStatusChipProps) {
  return (
    <View style={[styles.chip, { borderColor: STATUS_COLORS[status] }]}>
      <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
      <PartnerText style={[styles.label, { color: STATUS_COLORS[status] }]}>
        {STATUS_LABELS[status]}
      </PartnerText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
});
