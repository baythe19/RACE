import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../../theme';
import type { VerificationStage } from '../../types/vendor';

const STAGES: Array<{ key: VerificationStage; label: string }> = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'document_review', label: 'Document Review' },
  { key: 'background_check', label: 'Background Check' },
  { key: 'selfie_match', label: 'Selfie Match' },
  { key: 'approved', label: 'Approved' },
];

interface VerificationTimelineProps {
  currentStage: VerificationStage;
  statusHistory?: Array<{ status: string; note?: string; changedAt: string }>;
  theme?: 'light' | 'dark';
}

export default function VerificationTimeline({
  currentStage,
  statusHistory = [],
  theme = 'dark',
}: VerificationTimelineProps) {
  const isLight = theme === 'light';
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const isRejected = currentStage === 'rejected';

  return (
    <View style={styles.wrap}>
      {STAGES.map((stage, index) => {
        const done = !isRejected && index <= currentIndex;
        const active = stage.key === currentStage;
        const historyItem = statusHistory.find((h) => h.status === stage.key);

        return (
          <View key={stage.key} style={styles.row}>
            <View style={styles.lineCol}>
              <View
                style={[
                  styles.dot,
                  isLight && styles.dotLight,
                  done && styles.dotDone,
                  active && styles.dotActive,
                  isRejected && index === 0 && styles.dotRejected,
                ]}>
                {done ? (
                  <Ionicons name="checkmark" size={12} color={colors.textLight} />
                ) : null}
              </View>
              {index < STAGES.length - 1 ? (
                <View style={[styles.line, isLight && styles.lineLight, done && styles.lineDone]} />
              ) : null}
            </View>
            <View style={styles.content}>
              <PartnerText
                style={[
                  styles.label,
                  isLight && styles.labelLight,
                  active && (isLight ? styles.labelActiveLight : styles.labelActive),
                ]}>
                {stage.label}
              </PartnerText>
              {historyItem?.note ? (
                <PartnerText style={[styles.note, isLight && styles.noteLight]}>{historyItem.note}</PartnerText>
              ) : null}
            </View>
          </View>
        );
      })}
      {isRejected ? (
        <View style={styles.rejectedBanner}>
          <Ionicons name="close-circle" size={18} color={colors.accentRed} />
          <PartnerText style={styles.rejectedText}>Application rejected</PartnerText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  lineCol: { alignItems: 'center', width: 24 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  dotLight: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dotDone: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  dotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  dotRejected: { borderColor: colors.accentRed, backgroundColor: colors.accentRed },
  line: { flex: 1, width: 2, backgroundColor: colors.glass.border, minHeight: 28 },
  lineLight: { backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.secondary },
  content: { flex: 1, paddingBottom: spacing.md },
  label: { color: colors.subtext, fontWeight: typography.weights.semibold },
  labelLight: { color: colors.grey },
  labelActive: { color: colors.textLight },
  labelActiveLight: { color: colors.dark },
  note: { color: colors.textMuted, fontSize: typography.sizes.sm, marginTop: 2 },
  noteLight: { color: colors.grey },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
  },
  rejectedText: { color: colors.accentRed, fontWeight: typography.weights.bold },
});
