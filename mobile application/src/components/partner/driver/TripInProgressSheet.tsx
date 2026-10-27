import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Linking,
  Keyboard,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  MapPin,
  Phone,
  FileText,
  Navigation,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react-native';

const OTP_LENGTH = 4;

interface Props {
  bookingNumber: string;
  dropAddress: string;
  /** Formatted remaining distance to the drop, or null when unknown. */
  distanceLabel: string | null;
  durationMinutes: number | null;
  /** Driver is at the drop: lead with Complete job instead of Resume navigation. */
  atDrop?: boolean;
  /** ISO time the trip started (status IN_PROGRESS); drives the real timer. */
  startedAt?: string;
  onResumeNavigation: () => void;
  customerMobile?: string;
  onCompletePress: () => void;
  acting?: boolean;
  insetsTop?: number;
  insetsBottom?: number;
  customerPaymentMode?: 'CASH' | 'UPI' | 'ONLINE' | null;
  customerPaymentConfirmed?: boolean;
  fareAmount?: number;
  completionOtp?: string;
  setCompletionOtp?: (otp: string) => void;
  otpError?: string;
  onVerifyAndComplete?: () => void;
}

function formatStopwatch(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function TripInProgressSheet({
  bookingNumber,
  dropAddress,
  distanceLabel,
  durationMinutes,
  atDrop = false,
  startedAt,
  onResumeNavigation,
  customerMobile,
  onCompletePress,
  acting = false,
  insetsTop = 0,
  insetsBottom = 0,
  customerPaymentMode,
  customerPaymentConfirmed = false,
  fareAmount,
  completionOtp = '',
  setCompletionOtp,
  otpError,
  onVerifyAndComplete,
}: Props) {
  const startMs = startedAt ? +new Date(startedAt) : NaN;
  const secondsSince = () =>
    Number.isFinite(startMs) ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0;
  const [elapsed, setElapsed] = useState(secondsSince);
  const [collapsed, setCollapsed] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event => {
      const { height } = event.endCoordinates;
      setKeyboardHeight(height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Real stopwatch: counts from when the backend moved the job to IN_PROGRESS.
  useEffect(() => {
    setElapsed(secondsSince());
    const timer = setInterval(() => setElapsed(secondsSince()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMs]);

  const canCompleteWithOtp = completionOtp.length === OTP_LENGTH && !acting;

  return (
    <>
      {/* Top Floating Service in Progress Pill */}
      <View style={[styles.topPillContainer, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.pillSurface}>
          <View style={styles.fileIcon}>
            <FileText size={16} color="#2563EB" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.pillTitle}>{atDrop ? 'At drop location' : 'Service in progress'}</Text>
            <Text style={styles.pillSubtitle}>#{bookingNumber}</Text>
          </View>
          <View style={styles.timerBadge}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.timerText}>{formatStopwatch(elapsed)}</Text>
          </View>
        </View>
      </View>

      {/* Bottom Sheet Card */}
      <View style={[styles.bottomSheet, { bottom: keyboardHeight }]} pointerEvents="box-none">
        <View style={[styles.sheetSurface, { paddingBottom: Math.max(insetsBottom, 12) + 12 }]}>
          {/* Collapsible Drag Handle */}
          <Pressable
            onPress={() => setCollapsed(prev => !prev)}
            hitSlop={12}
            style={styles.handleContainer}>
            <View style={styles.handle} />
          </Pressable>

          {/* Destination & Distance Row */}
          <View style={styles.destRow}>
            <View style={styles.destPinCircle}>
              <MapPin size={20} color="#EF4444" strokeWidth={2.5} />
            </View>
            <View style={styles.destCol}>
              <Text style={styles.destTitle} numberOfLines={1}>
                {dropAddress}
              </Text>
              <Text style={styles.destSubtitle}>Drop location</Text>
            </View>
            {distanceLabel && durationMinutes != null ? (
              <View style={styles.distanceEtaCol}>
                <Text style={styles.distanceText}>{distanceLabel}</Text>
                <Text style={styles.etaText}>{durationMinutes} min</Text>
              </View>
            ) : null}
          </View>

          {atDrop ? (
            /* AT DROP SETTLEMENT CARD */
            <View style={styles.settlementSection}>
              {/* Payment Status Banner */}
              <View
                style={[
                  styles.paymentBanner,
                  customerPaymentConfirmed
                    ? styles.paymentBannerConfirmed
                    : styles.paymentBannerPending,
                ]}>
                {customerPaymentConfirmed ? (
                  <CheckCircle2 size={18} color="#15803D" strokeWidth={2.4} />
                ) : (
                  <AlertCircle size={18} color="#D97706" strokeWidth={2.4} />
                )}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text
                    style={[
                      styles.paymentBannerTitle,
                      { color: customerPaymentConfirmed ? '#15803D' : '#92400E' },
                    ]}>
                    {customerPaymentConfirmed
                      ? `Payment confirmed: ${
                          customerPaymentMode === 'CASH'
                            ? 'CASH TO DRIVER'
                            : customerPaymentMode === 'UPI'
                              ? 'UPI TRANSFER'
                              : 'IN-APP PAYMENT'
                        }`
                      : 'Waiting for customer payment confirmation'}
                  </Text>
                  <Text
                    style={[
                      styles.paymentBannerSub,
                      { color: customerPaymentConfirmed ? '#166534' : '#B45309' },
                    ]}>
                    {customerPaymentConfirmed
                      ? `Amount: ₹${fareAmount ?? '—'} · Customer shares the SMS code.`
                      : `Fare: ₹${fareAmount ?? '—'} · Customer pays on their phone, then the SMS code unlocks.`}
                  </Text>
                </View>
              </View>

              {customerPaymentConfirmed ? (
              <View style={styles.otpCard}>
                <View style={styles.otpHeader}>
                  <ShieldCheck size={18} color="#2563EB" strokeWidth={2.4} />
                  <Text style={styles.otpHeaderTitle}>Customer Completion OTP</Text>
                </View>
                <Text style={styles.otpSubtitle}>
                  Enter the 4-digit code provided by the customer to finish the job.
                </Text>

                <Pressable
                  onPress={() => inputRef.current?.focus()}
                  style={styles.boxesRow}
                  accessibilityRole="button"
                  accessibilityLabel="Tap to enter customer completion OTP">
                  {Array.from({ length: OTP_LENGTH }, (_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.box,
                        completionOtp.length === idx && styles.boxFocused,
                        Boolean(otpError) && styles.boxError,
                      ]}>
                      <Text style={styles.boxChar}>{completionOtp[idx] ?? ''}</Text>
                    </View>
                  ))}
                  <TextInput
                    ref={inputRef}
                    value={completionOtp}
                    onChangeText={text =>
                      setCompletionOtp?.(text.replace(/\D/g, '').slice(0, OTP_LENGTH))
                    }
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    style={styles.hiddenInput}
                    returnKeyType="done"
                    onSubmitEditing={() => canCompleteWithOtp && onVerifyAndComplete?.()}
                  />
                </Pressable>

                {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
              </View>
              ) : (
              <View style={styles.otpCard}>
                <Text style={styles.otpHeaderTitle}>Customer chooses how to pay</Text>
                <Text style={styles.otpSubtitle}>
                  Same choices as the customer screen. The completion code stays hidden until they confirm.
                </Text>
                <View style={styles.payChoices}>
                  <View style={styles.payChoice}>
                    <Banknote size={16} color="#0F172A" />
                    <Text style={styles.payChoiceText}>Cash to driver</Text>
                  </View>
                  <View style={styles.payChoice}>
                    <Smartphone size={16} color="#0F172A" />
                    <Text style={styles.payChoiceText}>UPI</Text>
                  </View>
                  <View style={styles.payChoice}>
                    <CreditCard size={16} color="#0F172A" />
                    <Text style={styles.payChoiceText}>In-app</Text>
                  </View>
                </View>
              </View>
              )}

              {/* Actions row: Call customer & Verify & Complete Job */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {customerMobile ? (
                  <Pressable
                    onPress={() => void Linking.openURL(`tel:${customerMobile}`)}
                    style={({ pressed }) => [
                      styles.callCustomerBtn,
                      pressed && { opacity: 0.8 },
                    ]}>
                    <Phone size={18} color="#2563EB" strokeWidth={2.4} />
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={customerPaymentConfirmed ? onVerifyAndComplete : undefined}
                  disabled={!customerPaymentConfirmed || !canCompleteWithOtp || acting}
                  style={({ pressed }) => [
                    styles.verifyCompleteBtn,
                    !canCompleteWithOtp && styles.verifyCompleteBtnDisabled,
                    pressed && { opacity: 0.9 },
                  ]}>
                  {acting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.verifyCompleteBtnText}>
                      {!customerPaymentConfirmed
                        ? 'Waiting for payment'
                        : canCompleteWithOtp
                          ? 'Verify OTP & Complete Job'
                          : 'Enter 4-Digit OTP'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            /* EN ROUTE TO DROP ACTIONS */
            <>
              {!collapsed ? (
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() =>
                      customerMobile ? void Linking.openURL(`tel:${customerMobile}`) : undefined
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Call customer"
                    style={({ pressed }) => [
                      styles.actionCircle,
                      pressed && styles.actionCirclePressed,
                    ]}>
                    <View style={styles.iconBg}>
                      <Phone size={20} color="#2563EB" strokeWidth={2.4} />
                    </View>
                    <Text style={styles.actionLabel}>Call customer</Text>
                  </Pressable>
                </View>
              ) : null}

              <Pressable
                onPress={onResumeNavigation}
                accessibilityRole="button"
                accessibilityLabel="Resume navigation to drop"
                style={({ pressed }) => [styles.resumeBtn, pressed && styles.resumeBtnPressed]}>
                <Navigation size={18} color="#0F172A" strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={styles.resumeBtnText}>Resume navigation</Text>
              </Pressable>

              <Pressable
                onPress={onCompletePress}
                disabled={acting}
                accessibilityRole="button"
                accessibilityLabel="Arrive at Drop Location"
                style={({ pressed }) => [
                  styles.completeBtn,
                  styles.completeBtnSecondary,
                  pressed && styles.completeBtnPressed,
                ]}>
                <Text style={[styles.completeBtnText, styles.completeBtnSecondaryText]}>
                  Arrive at Drop Location
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topPillContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 25,
  },
  pillSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pillSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  sheetSurface: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 6,
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  destPinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destCol: {
    flex: 1,
  },
  destTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  destSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  distanceEtaCol: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  etaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 18,
  },
  actionCircle: {
    alignItems: 'center',
  },
  actionCirclePressed: {
    opacity: 0.7,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  resumeBtn: {
    backgroundColor: '#FEA701',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resumeBtnPressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.98 }],
  },
  resumeBtnText: {
    color: '#0F172A',
    fontSize: 16.5,
    fontWeight: '800',
  },
  completeBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    shadowOpacity: 0,
    elevation: 0,
  },
  completeBtnSecondaryText: {
    color: '#DC2626',
  },
  completeBtn: {
    backgroundColor: '#EF4444', // Red CTA from Screen 9 design
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  completeBtnPressed: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 0.98 }],
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
  },
  settlementSection: {
    marginTop: 4,
  },
  paymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  paymentBannerConfirmed: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  paymentBannerPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  paymentBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  paymentBannerSub: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  otpCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otpHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  otpSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
    marginBottom: 12,
  },
  payChoices: {
    gap: 8,
  },
  payChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  payChoiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
  },
  box: {
    width: 52,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  boxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  boxChar: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  otpErrorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 8,
  },
  callCustomerBtn: {
    width: 48,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyCompleteBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyCompleteBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  verifyCompleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
