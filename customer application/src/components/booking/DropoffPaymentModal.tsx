import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  MapPin,
  QrCode,
  ShieldCheck,
  Smartphone,
} from 'lucide-react-native';

import {
  confirmCustomerPaymentMode,
  type ConfirmPaymentModeResult,
} from '../../services/bookings/serviceBookingApi';
import type { ServiceBookingType } from '../../types/serviceBooking';
import { colors, radius, shadows, spacing, typography } from '../../theme';

type Props = {
  visible: boolean;
  bookingId: string;
  bookingType: ServiceBookingType;
  fare?: number;
  completionOtp?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE' | null;
  paymentConfirmedByCustomer?: boolean;
  onSuccess?: (result: ConfirmPaymentModeResult) => void;
  onClose?: () => void;
};

type PaymentOption = 'CASH' | 'UPI' | 'ONLINE';

export default function DropoffPaymentModal({
  visible,
  bookingId,
  bookingType,
  fare = 0,
  completionOtp: serverOtp,
  paymentCollectionMode: serverMode,
  paymentConfirmedByCustomer: serverConfirmed,
  onSuccess,
  onClose,
}: Props) {
  const [selectedMode, setSelectedMode] = useState<PaymentOption>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localConfirmedOtp, setLocalConfirmedOtp] = useState<string | null>(null);
  const [localConfirmedMode, setLocalConfirmedMode] = useState<PaymentOption | null>(null);

  const activeOtp = localConfirmedOtp || serverOtp;
  const isConfirmed = Boolean(activeOtp || serverConfirmed || localConfirmedMode);
  const activeMode = localConfirmedMode || serverMode || selectedMode;

  const handleConfirmPayment = async () => {
    if (!bookingId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await confirmCustomerPaymentMode({
        bookingId,
        bookingType,
        paymentMode: selectedMode,
      });

      setLocalConfirmedOtp(result.completionOtp);
      setLocalConfirmedMode(result.paymentMode);
      onSuccess?.(result);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to confirm payment mode. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'CASH':
        return 'Cash to Driver';
      case 'UPI':
        return 'UPI / QR Code';
      case 'ONLINE':
        return 'In-App Payment';
      default:
        return mode;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Badge */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <MapPin size={24} color={colors.primary} />
              </View>
              <Text style={styles.title}>Driver Arrived at Destination</Text>
              <Text style={styles.subtitle}>
                Your vehicle has safely reached the destination. Complete settlement below.
              </Text>
            </View>

            {/* Fare Summary Card */}
            <View style={styles.fareCard}>
              <Text style={styles.fareLabel}>Total Fare Due</Text>
              <Text style={styles.fareAmount}>₹{Math.round(fare)}</Text>
              <View style={[styles.statusBadge, isConfirmed ? styles.statusConfirmed : styles.statusPending]}>
                <Text style={[styles.statusBadgeText, isConfirmed ? styles.statusConfirmedText : styles.statusPendingText]}>
                  {isConfirmed ? `Payment Confirmed (${getModeLabel(activeMode)})` : 'Awaiting Payment Confirmation'}
                </Text>
              </View>
            </View>

            {isConfirmed && activeOtp ? (
              /* OTP Display Section */
              <View style={styles.otpSection}>
                <View style={styles.otpHeaderRow}>
                  <ShieldCheck size={22} color="#15803D" />
                  <Text style={styles.otpSectionTitle}>Trip Completion OTP</Text>
                </View>

                <Text style={styles.otpInstructions}>
                  Please share this 4-digit code with your driver to complete the trip.
                </Text>

                <View style={styles.otpDigitsContainer}>
                  {activeOtp.split('').map((digit, idx) => (
                    <View key={`otp-${idx}`} style={styles.otpDigitBox}>
                      <Text style={styles.otpDigitText}>{digit}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.smsNoticeRow}>
                  <Smartphone size={15} color={colors.grey} />
                  <Text style={styles.smsNoticeText}>
                    Code has also been sent via SMS to your registered number.
                  </Text>
                </View>

                <View style={styles.waitingPartnerBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.waitingPartnerText}>
                    Waiting for driver to verify OTP and close the job...
                  </Text>
                </View>
              </View>
            ) : (
              /* Mode Selection Section */
              <View style={styles.modeSection}>
                <Text style={styles.sectionHeading}>Choose How You Are Paying</Text>

                {/* Option 1: UPI / QR (Priority #1) */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[
                    styles.modeOption,
                    selectedMode === 'UPI' && styles.modeOptionSelected,
                  ]}
                  onPress={() => setSelectedMode('UPI')}
                >
                  <View style={[styles.modeIconCircle, selectedMode === 'UPI' && styles.modeIconCircleSelected]}>
                    <QrCode size={20} color={selectedMode === 'UPI' ? colors.primary : colors.dark} />
                  </View>
                  <View style={styles.modeDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.modeTitle}>UPI / QR Code</Text>
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedBadgeText}>Fastest</Text>
                      </View>
                    </View>
                    <Text style={styles.modeSubtitle}>Scan driver's QR code or pay via GPay, PhonePe, Paytm</Text>
                  </View>
                  <View style={[styles.radioCircle, selectedMode === 'UPI' && styles.radioCircleSelected]}>
                    {selectedMode === 'UPI' && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>

                {/* Option 2: Cash to Driver (Priority #2) */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[
                    styles.modeOption,
                    selectedMode === 'CASH' && styles.modeOptionSelected,
                  ]}
                  onPress={() => setSelectedMode('CASH')}
                >
                  <View style={[styles.modeIconCircle, selectedMode === 'CASH' && styles.modeIconCircleSelected]}>
                    <Banknote size={20} color={selectedMode === 'CASH' ? colors.primary : colors.dark} />
                  </View>
                  <View style={styles.modeDetails}>
                    <Text style={styles.modeTitle}>Cash to Driver</Text>
                    <Text style={styles.modeSubtitle}>Hand physical cash directly to the driver on spot</Text>
                  </View>
                  <View style={[styles.radioCircle, selectedMode === 'CASH' && styles.radioCircleSelected]}>
                    {selectedMode === 'CASH' && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>

                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  style={[styles.confirmButton, isSubmitting && styles.buttonDisabled]}
                  onPress={handleConfirmPayment}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" />
                      <Text style={styles.confirmButtonText}>
                        Confirm Payment (₹{Math.round(fare)})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    ...shadows.card,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.grey,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  fareCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  fareLabel: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fareAmount: {
    fontSize: 34,
    fontWeight: typography.weights.extrabold,
    color: '#0F172A',
    marginVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  statusPendingText: {
    color: '#92400E',
  },
  statusConfirmedText: {
    color: '#15803D',
  },
  modeSection: {
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    marginBottom: 12,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  modeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F5F3FF',
  },
  modeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeIconCircleSelected: {
    backgroundColor: '#EDE9FE',
  },
  modeDetails: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  recommendedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#15803D',
  },
  modeSubtitle: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },
  otpSection: {
    backgroundColor: '#FEF9C3',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE047',
    padding: 18,
    marginTop: 6,
    alignItems: 'center',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  otpSectionTitle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: '#854D0E',
  },
  otpInstructions: {
    fontSize: 13,
    color: '#713F12',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  otpDigitsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  otpDigitBox: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  otpDigitText: {
    fontSize: 26,
    fontWeight: typography.weights.extrabold,
    color: '#1E293B',
    letterSpacing: 1,
  },
  smsNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  smsNoticeText: {
    fontSize: 11,
    color: colors.grey,
    textAlign: 'center',
  },
  waitingPartnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  waitingPartnerText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.dark,
  },
});
