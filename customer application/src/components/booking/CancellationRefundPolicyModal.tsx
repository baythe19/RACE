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
import {
  AlertTriangle,
  X,
} from 'lucide-react-native';

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
  'Found another service',
  'Driver taking too long',
  'Changed plans / Emergency resolved',
  'Incorrect pickup location',
  'Other reason',
];

export default function CancellationRefundPolicyModal({
  visible,
  policy,
  isLoadingPolicy = false,
  isSubmitting = false,
  bookingStatus,
  cancelReason,
  onReasonChange,
  onConfirmCancel,
  onClose,
}: CancellationRefundPolicyModalProps) {
  const refundAmount = policy?.refundAmount ?? 0;
  const canCancel = policy?.canCancel !== false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <AlertTriangle size={px(22)} color="#B45309" strokeWidth={2.4} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>Cancel booking?</Text>
              <Text style={styles.subtitle}>MVP demo — simple rules, stub payments only</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}>
              <X size={px(20)} color={colors.grey} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Loading Indicator */}
            {isLoadingPolicy ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Checking if you can cancel…</Text>
              </View>
            ) : null}

            {!isLoadingPolicy && policy ? (
              <View style={styles.settlementCard}>
                <Text style={styles.settlementTitle}>
                  {canCancel ? 'What happens' : 'Cannot cancel now'}
                </Text>
                <Text style={styles.tierDesc}>{policy.reason}</Text>
                {canCancel && refundAmount > 0 ? (
                  <View style={[styles.settlementRow, styles.settlementTotalRow]}>
                    <Text style={styles.settlementTotalLabel}>Demo refund (app only)</Text>
                    <Text style={styles.settlementTotalValue}>₹{refundAmount}</Text>
                  </View>
                ) : null}
                <Text style={styles.settlementNotice}>
                  No real bank payout in MVP — advance was a stub payment. Tiered fees and Razorpay
                  come later.
                </Text>
              </View>
            ) : null}

            {!isLoadingPolicy && !canCancel && policy ? null : (
              <>
            <Text style={[styles.sectionHeading, { marginTop: px(14) }]}>
              Reason for cancellation (optional)
            </Text>
            <View style={styles.chipsContainer}>
              {REASON_CHIPS.map((chip) => {
                const isSelected = cancelReason === chip;
                return (
                  <Pressable
                    key={chip}
                    onPress={() => onReasonChange(chip)}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}>
                      {chip}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={cancelReason}
              onChangeText={onReasonChange}
              placeholder="Or share more details (optional)..."
              placeholderTextColor={colors.grey}
              style={styles.textInput}
              multiline
              numberOfLines={2}
            />
              </>
            )}
          </ScrollView>

          {/* Action Footer Buttons */}
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={styles.keepBookingButton}>
              <Text style={styles.keepBookingButtonText}>Keep Booking</Text>
            </Pressable>

            <Pressable
              onPress={onConfirmCancel}
              disabled={isSubmitting || isLoadingPolicy || !canCancel}
              style={[
                styles.cancelButton,
                (isSubmitting || isLoadingPolicy || !canCancel) && styles.buttonDisabled,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.cancelButtonText}>Confirm Cancellation</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: px(16),
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: px(18),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: px(18),
    paddingVertical: px(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFBEB',
  },
  headerIconContainer: {
    width: px(38),
    height: px(38),
    borderRadius: px(19),
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: px(12),
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: px(16),
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  subtitle: {
    fontSize: px(12),
    color: colors.grey,
    marginTop: px(2),
  },
  closeButton: {
    padding: px(6),
  },
  scrollBody: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: px(18),
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
    paddingVertical: px(10),
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: px(12),
    color: colors.grey,
  },
  sectionHeading: {
    fontSize: px(13),
    fontWeight: typography.weights.bold,
    color: colors.dark,
    marginBottom: px(10),
  },
  tiersContainer: {
    gap: px(8),
  },
  tierCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: px(12),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(12),
  },
  tierCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1.5,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: px(4),
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(6),
    flex: 1,
  },
  tierTitle: {
    fontSize: px(13),
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  },
  tierTitleActive: {
    fontWeight: typography.weights.bold,
    color: '#065F46',
  },
  tierBadge: {
    paddingHorizontal: px(8),
    paddingVertical: px(3),
    borderRadius: px(8),
  },
  badgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  badgeAmber: {
    backgroundColor: '#FEF3C7',
  },
  badgeRed: {
    backgroundColor: '#FEE2E2',
  },
  badgeMuted: {
    backgroundColor: '#E5E7EB',
  },
  tierBadgeText: {
    fontSize: px(11),
    fontWeight: typography.weights.bold,
  },
  badgeTextGreen: {
    color: '#15803D',
  },
  badgeTextAmber: {
    color: '#B45309',
  },
  badgeTextRed: {
    color: '#B91C1C',
  },
  badgeTextMuted: {
    color: colors.grey,
  },
  tierDesc: {
    fontSize: px(11.5),
    color: colors.grey,
    lineHeight: px(16),
  },
  activeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(5),
    marginTop: px(6),
  },
  activeTagText: {
    fontSize: px(11),
    fontWeight: typography.weights.semibold,
    color: '#047857',
  },
  settlementCard: {
    marginTop: px(14),
    backgroundColor: '#F8FAFC',
    borderRadius: px(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: px(14),
  },
  settlementTitle: {
    fontSize: px(13),
    fontWeight: typography.weights.bold,
    color: colors.dark,
    marginBottom: px(8),
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: px(4),
  },
  settlementLabel: {
    fontSize: px(12),
    color: colors.grey,
  },
  settlementValue: {
    fontSize: px(12),
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  },
  settlementTotalRow: {
    marginTop: px(6),
    paddingTop: px(8),
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  settlementTotalLabel: {
    fontSize: px(13),
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  settlementTotalValue: {
    fontSize: px(15),
    fontWeight: typography.weights.bold,
    color: '#059669',
  },
  settlementNotice: {
    fontSize: px(11),
    color: colors.grey,
    marginTop: px(8),
    lineHeight: px(15),
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: px(8),
  },
  chip: {
    paddingHorizontal: px(12),
    paddingVertical: px(7),
    borderRadius: px(14),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBEB',
  },
  chipText: {
    fontSize: px(11.5),
    color: colors.dark,
  },
  chipTextSelected: {
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  textInput: {
    marginTop: px(10),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: px(10),
    paddingHorizontal: px(12),
    paddingVertical: px(8),
    fontSize: px(12),
    color: colors.dark,
    minHeight: px(50),
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: px(10),
    paddingHorizontal: px(18),
    paddingVertical: px(14),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  keepBookingButton: {
    flex: 1,
    height: px(46),
    borderRadius: px(12),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBookingButtonText: {
    fontSize: px(14),
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  cancelButton: {
    flex: 1,
    height: px(46),
    borderRadius: px(12),
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: px(13),
    fontWeight: typography.weights.bold,
    color: '#DC2626',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
