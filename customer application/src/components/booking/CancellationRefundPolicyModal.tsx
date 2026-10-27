import React, { useMemo } from 'react';
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
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
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
  // Determine active policy tier (1 = 100% full refund, 2 = 50% / nominal fee, 3 = non-refundable)
  const activeTier = useMemo<1 | 2 | 3>(() => {
    if (policy) {
      if (policy.refundPercent >= 100) return 1;
      if (policy.refundPercent > 0) return 2;
      return 3;
    }
    const st = (bookingStatus ?? '').toUpperCase();
    if (st === 'CONFIRMED' || st === 'PENDING') return 1;
    if (st === 'DRIVER_ASSIGNED') return 2;
    return 3;
  }, [policy, bookingStatus]);

  const advancePaid = (policy?.cancellationFee ?? 0) + (policy?.refundAmount ?? 0);
  const refundAmount = policy?.refundAmount ?? 0;
  const cancellationFee = policy?.cancellationFee ?? 0;

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
              <ShieldAlert size={px(22)} color="#B45309" strokeWidth={2.4} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>Cancellation & Refund Policy</Text>
              <Text style={styles.subtitle}>
                Review tiered terms applicable to your active booking
              </Text>
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
                <Text style={styles.loadingText}>Fetching real-time policy terms...</Text>
              </View>
            ) : null}

            {/* Tiered Policy Matrix */}
            <Text style={styles.sectionHeading}>Refund Schedule</Text>
            <View style={styles.tiersContainer}>
              {/* Tier 1 */}
              <View
                style={[
                  styles.tierCard,
                  activeTier === 1 && styles.tierCardActive,
                ]}>
                <View style={styles.tierHeader}>
                  <View style={styles.tierTitleRow}>
                    <Clock
                      size={px(16)}
                      color={activeTier === 1 ? '#047857' : colors.grey}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.tierTitle,
                        activeTier === 1 && styles.tierTitleActive,
                      ]}>
                      Before Driver Dispatched
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.tierBadge,
                      activeTier === 1 ? styles.badgeGreen : styles.badgeMuted,
                    ]}>
                    <Text
                      style={[
                        styles.tierBadgeText,
                        activeTier === 1 ? styles.badgeTextGreen : styles.badgeTextMuted,
                      ]}>
                      100% Refund
                    </Text>
                  </View>
                </View>
                <Text style={styles.tierDesc}>
                  Cancelled within 5 min or before driver assignment. Zero cancellation fee.
                </Text>
                {activeTier === 1 && (
                  <View style={styles.activeTagRow}>
                    <CheckCircle2 size={px(14)} color="#047857" strokeWidth={2.4} />
                    <Text style={styles.activeTagText}>Your booking qualifies for this tier</Text>
                  </View>
                )}
              </View>

              {/* Tier 2 */}
              <View
                style={[
                  styles.tierCard,
                  activeTier === 2 && styles.tierCardActive,
                ]}>
                <View style={styles.tierHeader}>
                  <View style={styles.tierTitleRow}>
                    <AlertTriangle
                      size={px(16)}
                      color={activeTier === 2 ? '#B45309' : colors.grey}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.tierTitle,
                        activeTier === 2 && styles.tierTitleActive,
                      ]}>
                      Driver Assigned / En Route
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.tierBadge,
                      activeTier === 2 ? styles.badgeAmber : styles.badgeMuted,
                    ]}>
                    <Text
                      style={[
                        styles.tierBadgeText,
                        activeTier === 2 ? styles.badgeTextAmber : styles.badgeTextMuted,
                      ]}>
                      50% Refund
                    </Text>
                  </View>
                </View>
                <Text style={styles.tierDesc}>
                  Driver mobilised. Nominal dispatch fee deducted to compensate partner travel.
                </Text>
                {activeTier === 2 && (
                  <View style={styles.activeTagRow}>
                    <CheckCircle2 size={px(14)} color="#B45309" strokeWidth={2.4} />
                    <Text style={[styles.activeTagText, { color: '#B45309' }]}>
                      Your booking qualifies for this tier
                    </Text>
                  </View>
                )}
              </View>

              {/* Tier 3 */}
              <View
                style={[
                  styles.tierCard,
                  activeTier === 3 && styles.tierCardActive,
                ]}>
                <View style={styles.tierHeader}>
                  <View style={styles.tierTitleRow}>
                    <HelpCircle
                      size={px(16)}
                      color={activeTier === 3 ? '#DC2626' : colors.grey}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.tierTitle,
                        activeTier === 3 && styles.tierTitleActive,
                      ]}>
                      Driver Arrived at Pickup
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.tierBadge,
                      activeTier === 3 ? styles.badgeRed : styles.badgeMuted,
                    ]}>
                    <Text
                      style={[
                        styles.tierBadgeText,
                        activeTier === 3 ? styles.badgeTextRed : styles.badgeTextMuted,
                      ]}>
                      Non-Refundable
                    </Text>
                  </View>
                </View>
                <Text style={styles.tierDesc}>
                  Driver reached breakdown spot. Advance covers flatbed fuel and operational dispatch.
                </Text>
                {activeTier === 3 && (
                  <View style={styles.activeTagRow}>
                    <CheckCircle2 size={px(14)} color="#DC2626" strokeWidth={2.4} />
                    <Text style={[styles.activeTagText, { color: '#DC2626' }]}>
                      Your booking qualifies for this tier
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Refund Settlement Breakdown Card */}
            {policy ? (
              <View style={styles.settlementCard}>
                <Text style={styles.settlementTitle}>Settlement Calculation</Text>
                {advancePaid > 0 ? (
                  <View style={styles.settlementRow}>
                    <Text style={styles.settlementLabel}>Advance Paid</Text>
                    <Text style={styles.settlementValue}>₹{advancePaid}</Text>
                  </View>
                ) : null}
                {cancellationFee > 0 ? (
                  <View style={styles.settlementRow}>
                    <Text style={styles.settlementLabel}>Dispatch / Cancellation Fee</Text>
                    <Text style={[styles.settlementValue, { color: '#DC2626' }]}>
                      - ₹{cancellationFee}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.settlementRow, styles.settlementTotalRow]}>
                  <Text style={styles.settlementTotalLabel}>Net Refund Due</Text>
                  <Text style={styles.settlementTotalValue}>₹{refundAmount}</Text>
                </View>
                <Text style={styles.settlementNotice}>
                  Refunds are returned via the original payment method within 5–7 business days.
                </Text>
              </View>
            ) : null}

            {/* Cancellation Reason Selection */}
            <Text style={[styles.sectionHeading, { marginTop: px(14) }]}>
              Reason for Cancellation
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
              disabled={isSubmitting || isLoadingPolicy}
              style={[
                styles.cancelButton,
                (isSubmitting || isLoadingPolicy) && styles.buttonDisabled,
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
