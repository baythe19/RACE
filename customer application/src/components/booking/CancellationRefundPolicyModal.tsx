import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import { colors, shadows, typography } from '../../theme';
import type { CancellationPolicy } from '../../types/serviceBooking';

const px = (n: number) => Math.round(n);

interface CancellationRefundPolicyModalProps {
  visible: boolean;
  policy: CancellationPolicy | null;
  isLoadingPolicy?: boolean;
  isSubmitting?: boolean;
  bookingStatus?: string;
  cancelReason: string;
  onReasonChange: (reason: string) => void;
  onConfirmCancel: () => void;
  onClose: () => void;
}

const REASON_CHIPS = [
  'Taking too long',
  'Plans changed',
  'Wrong pickup',
  'Other service',
  'Other',
] as const;

export default function CancellationRefundPolicyModal({
  visible,
  policy,
  isLoadingPolicy = false,
  isSubmitting = false,
  cancelReason,
  onReasonChange,
  onConfirmCancel,
  onClose,
}: CancellationRefundPolicyModalProps) {
  const canCancel = policy?.canCancel !== false;
  const refundAmount = policy?.refundAmount ?? 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Cancel booking?</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X size={px(22)} color={colors.grey} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {isLoadingPolicy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Checking cancellation…</Text>
              </View>
            ) : null}

            {!isLoadingPolicy && policy ? (
              <View style={[styles.summaryCard, !canCancel && styles.summaryCardBlocked]}>
                {!canCancel ? (
                  <Text style={styles.summaryText}>{policy.reason}</Text>
                ) : (
                  <>
                    {refundAmount > 0 ? (
                      <View style={styles.refundRow}>
                        <Text style={styles.refundLabel}>Estimated refund</Text>
                        <Text style={styles.refundValue}>₹{refundAmount.toLocaleString('en-IN')}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.summaryText}>{policy.reason}</Text>
                  </>
                )}
              </View>
            ) : null}

            {!isLoadingPolicy && canCancel ? (
              <>
                <Text style={styles.sectionLabel}>Reason (optional)</Text>
                <View style={styles.chipsContainer}>
                  {REASON_CHIPS.map(chip => {
                    const selected = cancelReason === chip;
                    return (
                      <Pressable
                        key={chip}
                        onPress={() => onReasonChange(chip)}
                        style={[styles.chip, selected && styles.chipSelected]}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{chip}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={cancelReason}
                  onChangeText={onReasonChange}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={colors.grey}
                  style={styles.textInput}
                  multiline
                  numberOfLines={2}
                />
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.keepButton}>
              <Text style={styles.keepButtonText}>Keep booking</Text>
            </Pressable>
            <Pressable
              onPress={onConfirmCancel}
              disabled={isSubmitting || isLoadingPolicy || !canCancel}
              style={[styles.cancelButton, (isSubmitting || isLoadingPolicy || !canCancel) && styles.buttonDisabled]}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.cancelButtonText}>Yes, cancel</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: px(20),
  },
  container: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderRadius: px(16),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: px(18),
    paddingVertical: px(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: px(17),
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  scrollBody: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: px(18),
    paddingVertical: px(16),
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: px(10),
    paddingVertical: px(12),
  },
  loadingText: {
    fontSize: px(13),
    color: colors.grey,
  },
  summaryCard: {
    borderRadius: px(12),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    padding: px(14),
    gap: px(8),
  },
  summaryCardBlocked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  summaryText: {
    fontSize: px(13),
    color: colors.dark,
    lineHeight: px(19),
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refundLabel: {
    fontSize: px(13),
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  },
  refundValue: {
    fontSize: px(18),
    fontWeight: typography.weights.bold,
    color: '#059669',
  },
  sectionLabel: {
    marginTop: px(16),
    marginBottom: px(10),
    fontSize: px(12),
    fontWeight: typography.weights.bold,
    color: colors.grey,
    letterSpacing: 0.3,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: px(8),
  },
  chip: {
    paddingHorizontal: px(12),
    paddingVertical: px(8),
    borderRadius: px(999),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,195,38,0.12)',
  },
  chipText: {
    fontSize: px(12),
    color: colors.dark,
  },
  chipTextSelected: {
    fontWeight: typography.weights.bold,
  },
  textInput: {
    marginTop: px(10),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: px(12),
    paddingHorizontal: px(12),
    paddingVertical: px(10),
    fontSize: px(13),
    color: colors.dark,
    minHeight: px(44),
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: px(10),
    paddingHorizontal: px(18),
    paddingVertical: px(14),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  keepButton: {
    flex: 1,
    minHeight: px(46),
    borderRadius: px(12),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButtonText: {
    fontSize: px(14),
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  cancelButton: {
    flex: 1,
    minHeight: px(46),
    borderRadius: px(12),
    borderWidth: 1.5,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: px(14),
    fontWeight: typography.weights.bold,
    color: '#DC2626',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
