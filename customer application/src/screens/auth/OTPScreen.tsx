import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Info, MessageCircle, Pencil, ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthFormLayout from '../../components/auth/AuthFormLayout';
import AuthToast from '../../components/auth/AuthToast';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useAuthActions } from '../../hooks/useAuth';
import { sendOtp } from '../../services/authService';
import { getApiErrorMessage } from '../../services/api';
import { getRoleMismatchMessage, isRoleMismatchError } from '../../utils/roleMismatch';
import { useAuthStore } from '../../store/authStore';
import { getCustomerOnboardingRouteFromStep } from '../../store/customerOnboardingRoute';
import type { AuthStackParamList } from '../../types/navigation';
import { getPhoneDigits } from '../../utils/phone';
import { maskMobile } from '../../utils/mask';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

export default function OTPScreen({ navigation, route }: Props) {
  const { phone, isExistingUser, devOtp, otpMessage } = route.params;
  const { verifyOtp: verifyOtpAction, error: authError, isLoading, clearError } = useAuthActions();
  const { dialog, showDialog } = useAppDialog();
  const { width } = useWindowDimensions();
  const px = (n: number) => Math.max(1, Math.round(n * (width / REF_W)));

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');
  const [backendOtpToast, setBackendOtpToast] = useState('');
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const isVerifyingRef = useRef(false);
  const lastVerifiedOtpRef = useRef<string | null>(null);
  const otpToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const otpValue = digits.join('');
  const mobileNumber = getPhoneDigits(phone);
  const destinationLabel = maskMobile(phone);

  const extractOtpFromMessage = (message?: string): string | null => {
    if (!message) return null;
    const match = message.match(/\b(\d{6})\b/);
    return match?.[1] ?? null;
  };

  const showBackendOtpToast = (otp: string) => {
    setBackendOtpToast(`OTP: ${otp}`);
    if (otpToastTimerRef.current) clearTimeout(otpToastTimerRef.current);
    otpToastTimerRef.current = setTimeout(() => setBackendOtpToast(''), 8000);
  };

  useEffect(() => {
    const otp = devOtp ?? extractOtpFromMessage(otpMessage);
    if (!otp) return;
    showBackendOtpToast(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devOtp, otpMessage]);

  const verifyOtp = useCallback(
    async (value: string) => {
      const code = value.replace(/\D/g, '').slice(0, 6);
      if (code.length < 6) {
        setError('Please enter the 6-digit OTP');
        return;
      }
      if (isAuthenticated) return;
      if (lastVerifiedOtpRef.current === code) return;
      if (isVerifyingRef.current) return;

      isVerifyingRef.current = true;
      clearError();
      setError('');
      try {
        await verifyOtpAction({
          mobileNumber,
          otp: code,
        });
        lastVerifiedOtpRef.current = code;
        if (useAuthStore.getState().onboardingRequired) {
          const step = useAuthStore.getState().customerOnboardingStep;
          navigation.navigate(getCustomerOnboardingRouteFromStep(step));
        }
      } catch (err) {
        lastVerifiedOtpRef.current = null;
        if (isRoleMismatchError(err)) {
          setError(
            getRoleMismatchMessage(
              err,
              'This number is registered as a partner. Use the RACE Partner app or a different number.',
            ),
          );
        } else {
          setError(getApiErrorMessage(err, 'Invalid OTP. Please try again'));
        }
        setDigits(['', '', '', '', '', '']);
        setActiveIndex(0);
        inputRefs.current[0]?.focus();
      } finally {
        isVerifyingRef.current = false;
      }
    },
    [clearError, isAuthenticated, mobileNumber, navigation, verifyOtpAction],
  );

  const applyOtpValue = useCallback(
    (raw: string) => {
      const chars = raw.replace(/\D/g, '').slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      chars.forEach((char, index) => {
        next[index] = char;
      });
      setDigits(next);
      if (error) setError('');
      const nextIndex = Math.min(chars.length, 5);
      setActiveIndex(nextIndex);
      if (chars.length === 6) {
        void verifyOtp(chars.join(''));
      } else {
        inputRefs.current[nextIndex]?.focus();
      }
    },
    [error, verifyOtp],
  );

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const updateDigits = (next: string[]) => {
    setDigits(next);
    if (error) setError('');
    if (next.join('').length === 6) {
      void verifyOtp(next.join(''));
    }
  };

  const handleDigitInput = (index: number, value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length > 1) {
      applyOtpValue(digitsOnly);
      return;
    }

    const char = digitsOnly.slice(-1);
    const next = [...digits];
    next[index] = char;
    updateDigits(next);
    if (char && index < 5) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') return;
    if (digits[index]) {
      const next = [...digits];
      next[index] = '';
      updateDigits(next);
      return;
    }
    if (index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      updateDigits(next);
      setActiveIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setError('');
    clearError();
    try {
      lastVerifiedOtpRef.current = null;
      const result = await sendOtp({ mobileNumber });
      const nextOtp = result.devOtp ?? extractOtpFromMessage(result.message);
      if (nextOtp) showBackendOtpToast(nextOtp);
      setTimer(60);
      setDigits(['', '', '', '', '', '']);
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
      showDialog({
        tone: 'success',
        title: 'OTP Sent',
        message: `A new OTP has been sent to ${destinationLabel}`,
        primaryLabel: 'OK',
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to resend OTP'));
    } finally {
      setIsResending(false);
    }
  };

  const timerLabel = `00:${String(timer).padStart(2, '0')}`;
  const isVerifying = isLoading && otpValue.length === 6;

  return (
    <AuthFormLayout onBack={() => goBackWithinStack(navigation)}>
      {dialog}
      <View style={[styles.card, shadows.card, { borderRadius: px(18), padding: px(spacing.xl) }]}>
        <View style={[styles.iconWrap, { width: px(64), height: px(64), borderRadius: px(32) }]}>
          <MessageCircle size={px(28)} color={colors.primary} strokeWidth={2.2} />
        </View>

        <Text style={[styles.title, { fontSize: px(24) }]}>Enter OTP</Text>
        <Text style={[styles.subtitle, { fontSize: px(14), lineHeight: px(20) }]}>
          We have sent a 6-digit code to your mobile number
        </Text>

        <View style={[styles.phoneRow, { marginTop: px(10), marginBottom: px(24), gap: px(6) }]}>
          <Text style={[styles.phoneText, { fontSize: px(14) }]}>{destinationLabel}</Text>
          <Pressable onPress={() => goBackWithinStack(navigation)} hitSlop={8} style={styles.editBtn}>
            <Pencil size={15} color={colors.primary} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={[styles.otpRow, { gap: px(8), marginBottom: px(16) }]}>
          <TextInput
            value=""
            onChangeText={applyOtpValue}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            keyboardType="number-pad"
            style={styles.hiddenInput}
          />
          {digits.map((digit, index) => {
            const isActive = activeIndex === index;
            return (
              <Pressable
                key={index}
                onPress={() => {
                  setActiveIndex(index);
                  inputRefs.current[index]?.focus();
                }}
                style={{
                  width: px(46),
                  height: px(54),
                  borderRadius: px(12),
                  borderWidth: isActive ? 2 : 1.5,
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                <TextInput
                  ref={ref => {
                    inputRefs.current[index] = ref;
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    fontSize: px(22),
                    fontWeight: typography.weights.bold,
                    color: digit || isActive ? colors.dark : 'transparent',
                    textAlign: 'center',
                    padding: 0,
                  }}
                  value={digit}
                  onChangeText={value => handleDigitInput(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  onFocus={() => setActiveIndex(index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              </Pressable>
            );
          })}
        </View>

        <AuthToast message={backendOtpToast} type="success" />
        {error || authError ? (
          <Text style={[styles.errorText, { fontSize: px(13), marginBottom: px(12) }]}>
            {error || authError}
          </Text>
        ) : null}

        <Text style={[styles.timerText, { fontSize: px(13) }]}>
          Resend OTP in <Text style={styles.timerValue}>{timerLabel}</Text>
        </Text>

        <Pressable
          onPress={() => void handleResend()}
          disabled={timer > 0 || isResending}
          style={{ marginTop: px(8), marginBottom: px(18) }}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: px(14),
              fontWeight: typography.weights.bold,
              color: timer > 0 || isResending ? colors.border : colors.primary,
            }}>
            {isResending ? 'Resending...' : "Didn't receive the code? Resend OTP"}
          </Text>
        </Pressable>

        <View style={styles.infoCard}>
          <Info size={18} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.infoText}>
            <Text style={styles.infoTitle}>Tip: </Text>
            Check your SMS inbox or spam folder if the code does not arrive.
          </Text>
        </View>

        <Pressable
          disabled={otpValue.length !== 6 || isLoading}
          onPress={() => void verifyOtp(otpValue)}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              marginTop: px(spacing.lg),
              minHeight: px(54),
              borderRadius: px(14),
            },
            (otpValue.length !== 6 || isLoading) && styles.primaryButtonDisabled,
            pressed && otpValue.length === 6 && !isLoading && styles.pressed,
          ]}>
          {isVerifying ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={colors.dark} />
              <Text style={[styles.primaryButtonLabel, { fontSize: px(16) }]}>Verifying...</Text>
            </View>
          ) : (
            <Text style={[styles.primaryButtonLabel, { fontSize: px(16) }]}>
              {isExistingUser ? 'Verify & Login' : 'Verify & Continue'}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.securityRow, { marginTop: px(spacing.xl) }]}>
        <ShieldCheck size={18} color={colors.primary} strokeWidth={2.2} />
        <Text style={[styles.securityText, { fontSize: px(11), lineHeight: px(16) }]}>
          Your data is secure and encrypted
        </Text>
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  iconWrap: {
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.grey,
    textAlign: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneText: {
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  editBtn: { padding: 4 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  errorText: { color: colors.error, textAlign: 'center' },
  timerText: { textAlign: 'center', color: colors.grey },
  timerValue: { color: colors.primary, fontWeight: typography.weights.bold },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.goldLight,
  },
  infoText: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  infoTitle: { fontWeight: typography.weights.bold },
  primaryButton: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.55 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primaryButtonLabel: { color: colors.dark, fontWeight: typography.weights.bold },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  securityText: { color: colors.grey, textAlign: 'center' },
  pressed: { opacity: 0.9 },
});
