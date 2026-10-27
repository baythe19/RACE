import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Info, Pencil, ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PartnerOtpInput from '../../../components/partner/PartnerOtpInput';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import AuthToast from '../../../components/auth/AuthToast';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { setCredentials } from '../../../redux/auth/authSlice';
import { saveTokens } from '../../../services/api';
import { usePartnerOnboardingStore } from '../../../store/partnerOnboardingStore';
import { usePartnerRegistrationStore } from '../../../store/partnerRegistrationStore';
import {
  getApiErrorMessage,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '../../../services/auth/useAuthMutations';
import type {
  PartnerAuthStackParamList,
  PartnerRootStackParamList,
  PartnerRole,
} from '../../../types/partnerNavigation';
import { getRoleMismatchMessage, isRoleMismatchError } from '../../../utils/roleMismatch';
import { isUiTestPermissiveMode, UI_PREVIEW_MUTATIONS_ENABLED } from '../../../constants/preview';
import { colors, radius, spacing, typography } from '../../../theme';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerOtpVerification'>;

const RESEND_SECONDS = 60;

function formatPartnerPhone(mobileNumber: string): string {
  const digits = mobileNumber.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `+91 ${digits}`;
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function PartnerOtpVerificationScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const { mobileNumber, devOtp, otpMessage, isExistingUser, role: paramRole } = route.params;
  const loading = useAppSelector((state) => state.auth.loading);
  const signupAccountType = useAppSelector((state) => state.onboarding.signupAccountType);
  const selectedRole = usePartnerOnboardingStore((state) => state.selectedRole);

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [verified, setVerified] = useState(false);
  const [backendOtpToast, setBackendOtpToast] = useState('');
  const verifyLockRef = useRef(false);
  const backendOtpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extractOtpFromMessage = (message?: string): string | null => {
    if (!message) return null;
    const match = message.match(/\b(\d{6})\b/);
    return match?.[1] ?? null;
  };

  const showBackendOtpToast = (otpValue: string) => {
    setBackendOtpToast(`OTP: ${otpValue}`);
    if (backendOtpTimerRef.current) clearTimeout(backendOtpTimerRef.current);
    backendOtpTimerRef.current = setTimeout(() => setBackendOtpToast(''), 8000);
  };

  const verifyOtpMutation = useVerifyOtpMutation();
  const sendOtpMutation = useSendOtpMutation();

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    const devCode = devOtp ?? extractOtpFromMessage(otpMessage);
    if (!devCode) return;
    showBackendOtpToast(devCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devOtp, otpMessage]);

  const resolvePartnerRole = useCallback((): PartnerRole => {
    if (paramRole === 'vendor' || paramRole === 'driver') {
      return paramRole;
    }
    if (signupAccountType === 'vendor' || signupAccountType === 'driver') {
      return signupAccountType;
    }
    if (selectedRole === 'vendor' || selectedRole === 'driver') {
      return selectedRole;
    }
    return 'driver';
  }, [paramRole, selectedRole, signupAccountType]);

  const goToRegistration = useCallback(
    (targetRole: PartnerRole) => {
      usePartnerRegistrationStore.getState().setRole(targetRole);
      if (mobileNumber) {
        usePartnerRegistrationStore.getState().setDriverPersonal({ mobileNumber });
        usePartnerRegistrationStore.getState().setVendorBusiness({ mobileNumber });
      }
      const rootNavigation =
        navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
      if (rootNavigation) {
        rootNavigation.navigate('PartnerRegistration', { role: targetRole, mobileNumber });
      } else {
        (navigation as any).navigate('PartnerRegistration', { role: targetRole, mobileNumber });
      }
    },
    [mobileNumber, navigation],
  );

  const handleVerify = useCallback(
    async (code: string) => {
      const finalCode: string | undefined =
        code && code.length === 6
          ? code
          : isUiTestPermissiveMode()
            ? devOtp
            : undefined;

      if (!finalCode || verified || loading || verifyLockRef.current || finalCode.length !== 6) {
        return;
      }

      verifyLockRef.current = true;
      setError('');

      const role = resolvePartnerRole();

      try {
        const result = await verifyOtpMutation.mutateAsync({
          mobileNumber,
          otp: finalCode,
          role,
        });
        setVerified(true);

        dispatch(
          setCredentials({
            user: { ...result.user, role: result.user.role ?? role },
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            onboardingRequired: result.onboardingRequired,
          }),
        );

        if (result.onboardingRequired) {
          if (paramRole === 'driver' || paramRole === 'vendor') {
            goToRegistration(paramRole);
          } else {
            navigation.replace('PartnerRoleSelection', { mobileNumber });
          }
        }
        return;
      } catch (err) {
        if (UI_PREVIEW_MUTATIONS_ENABLED) {
          const fallbackRole = resolvePartnerRole();
          setVerified(true);

          const token = `mock-${fallbackRole}-token`;
          await saveTokens(token, token);
          dispatch(
            setCredentials({
              user: {
                id: `new-${fallbackRole}-${Date.now()}`,
                mobileNumber,
                role: fallbackRole,
                fullName: fallbackRole === 'driver' ? 'New Driver' : 'New Vendor',
                email: '',
                isVerified: false,
                isProfileCompleted: false,
              },
              accessToken: token,
              refreshToken: token,
              onboardingRequired: true,
            }),
          );

          if (paramRole === 'driver' || paramRole === 'vendor') {
            goToRegistration(paramRole);
          } else {
            navigation.replace('PartnerRoleSelection', { mobileNumber });
          }
          return;
        }
        if (isRoleMismatchError(err)) {
          setError(
            getRoleMismatchMessage(
              err,
              'This number belongs to another app role. Use the RACE Customer app or a different number.',
            ),
          );
        } else {
          setError(getApiErrorMessage(err, 'Invalid OTP'));
        }
        setOtp('');
        verifyLockRef.current = false;
      }
    },
    [
      dispatch,
      goToRegistration,
      isExistingUser,
      loading,
      mobileNumber,
      resolvePartnerRole,
      verified,
      verifyOtpMutation,
    ],
  );

  const handleResend = async () => {
    if (secondsLeft > 0 || loading) {
      return;
    }

    setError('');
    verifyLockRef.current = false;

    try {
      const role = resolvePartnerRole();
      if (!role) {
        setError('Select Vendor or Driver before continuing');
        return;
      }

      const result = await sendOtpMutation.mutateAsync({ mobileNumber, role });
      const nextOtp = result.devOtp ?? extractOtpFromMessage(result.message);
      if (nextOtp) showBackendOtpToast(nextOtp);
      setSecondsLeft(RESEND_SECONDS);
      setOtp('');
      navigation.setParams({
        isExistingUser: result.isExistingUser,
        devOtp: result.devOtp,
        otpMessage: result.message,
      });
    } catch (err) {
      if (isRoleMismatchError(err)) {
        setError(
          getRoleMismatchMessage(
            err,
            'This number belongs to another app role. Use the RACE Customer app or a different number.',
          ),
        );
      } else {
        setError(getApiErrorMessage(err, 'Unable to resend OTP'));
      }
    }
  };

  const isVerifying = loading && otp.length === 6;

  return (
    <PartnerScreenLayout
      title="Verify OTP"
      subtitle="Enter the 6-digit code sent to your mobile"
      onBack={() => navigation.goBack()}
      toast={
        backendOtpToast ? (
          <AuthToast
            message={backendOtpToast}
            type="info"
            actionLabel="Auto-fill"
            onAction={() => {
              const code =
                extractOtpFromMessage(backendOtpToast) ??
                devOtp ??
                extractOtpFromMessage(otpMessage);
              setOtp(code ?? '');
              setBackendOtpToast('');
              if (code) void handleVerify(code);
            }}
            onDismiss={() => setBackendOtpToast('')}
          />
        ) : error ? (
          <AuthToast
            message={error}
            type="error"
            onDismiss={() => setError('')}
          />
        ) : null
      }
      bottomBar={
        <>
          <ShieldCheck size={18} color={colors.primary} strokeWidth={2.2} />
          <PartnerText style={styles.securityText}>
            Your data is secure and encrypted{'\n'}We never share your information
          </PartnerText>
        </>
      }>
      <View style={styles.phoneRow}>
        <PartnerText style={styles.phoneText}>{formatPartnerPhone(mobileNumber)}</PartnerText>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Edit mobile number">
          <Pencil size={16} color={colors.primary} strokeWidth={2.2} />
        </Pressable>
      </View>

      <PartnerOtpInput
        value={otp}
        onChange={(value) => {
          setOtp(value);
          if (error) {
            setError('');
          }
          if (value.length < 6) {
            verifyLockRef.current = false;
          }
        }}
        disabled={loading || verified}
        onComplete={(code) => void handleVerify(code)}
        suggestedOtp={devOtp ?? extractOtpFromMessage(otpMessage) ?? undefined}
        onClear={() => {
          setOtp('');
          setError('');
          verifyLockRef.current = false;
        }}
      />

      {error ? <PartnerText style={styles.errorText}>{error}</PartnerText> : null}

      <PartnerText style={styles.timerText}>
        Resend OTP in <PartnerText style={styles.timerValue}>{formatTimer(secondsLeft)}</PartnerText>
      </PartnerText>

      <Pressable
        disabled={secondsLeft > 0 || loading}
        onPress={() => void handleResend()}
        style={styles.resendRow}>
        <PartnerText style={[styles.resendPrompt, (secondsLeft > 0 || loading) && styles.resendActionDisabled]}>
          Didn't receive the code?{' '}
          <PartnerText
            style={[
              styles.resendAction,
              (secondsLeft > 0 || loading) && styles.resendActionDisabled,
            ]}>
            Resend OTP
          </PartnerText>
        </PartnerText>
      </Pressable>

      {secondsLeft === 0 ? (
        <View style={styles.infoCard}>
          <Info size={16} color={colors.primary} strokeWidth={2.2} />
          <PartnerText style={styles.infoText} numberOfLines={1}>
            <PartnerText style={styles.infoTitle}>Didn't get the code?</PartnerText> Check SMS or spam folder.
          </PartnerText>
        </View>
      ) : null}

      <Pressable
        disabled={(!isUiTestPermissiveMode() && otp.length !== 6) || loading || verified}
        onPress={() => void handleVerify(otp)}
        style={({ pressed }) => [
          styles.primaryButton,
          (!isUiTestPermissiveMode() && otp.length !== 6 || verified) && !loading && styles.primaryButtonDisabled,
          pressed && !loading && !verified && styles.pressed,
        ]}>
        {isVerifying ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator size="small" color={colors.dark} />
            <PartnerText style={styles.primaryButtonLabel}>Verifying OTP...</PartnerText>
          </View>
        ) : (
          <PartnerText style={styles.primaryButtonLabel}>
            {verified ? 'Verified' : 'Verify & Continue'}
          </PartnerText>
        )}
      </Pressable>
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  phoneText: {
    color: colors.dark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  editButton: {
    padding: spacing.xs,
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.error,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  timerText: {
    marginTop: spacing.xl,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  timerValue: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  resendRow: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  resendPrompt: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  resendAction: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  resendActionDisabled: {
    opacity: 0.45,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.partnerRedLight,
  },
  infoText: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  infoTitle: {
    fontWeight: typography.weights.bold,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryButtonLabel: {
    color: colors.dark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  securityText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: typography.lineHeights.normal,
  },
  pressed: {
    opacity: 0.9,
  },
});
