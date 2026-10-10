import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Info, Pencil, ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PartnerOtpInput from '../../../components/partner/PartnerOtpInput';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import AuthToast from '../../../components/auth/AuthToast';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { completeOnboarding } from '../../../redux/auth/authSlice';
import { usePartnerOnboardingStore } from '../../../store/partnerOnboardingStore';
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
import { loginAsMockDriver, loginAsMockVendor, UI_PREVIEW_MODE } from '../../../config/uiPreviewMode';
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
  const { mobileNumber, devOtp, otpMessage } = route.params;
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
    const otp = devOtp ?? extractOtpFromMessage(otpMessage);
    if (!otp) return;
    showBackendOtpToast(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devOtp, otpMessage]);

  const goToPartnerMain = useCallback(() => {
    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    rootNavigation?.reset({
      index: 0,
      routes: [{ name: 'PartnerMain' }],
    });
  }, [navigation]);

  const goToRegistration = useCallback(
    (role: PartnerRole) => {
      const rootNavigation =
        navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
      // Keep auth under registration so Back works (reset caused unhandled GO_BACK).
      rootNavigation?.navigate('PartnerRegistration', { role, mobileNumber });
    },
    [mobileNumber, navigation],
  );

  const resolvePartnerRole = useCallback((): PartnerRole | null => {
    if (signupAccountType === 'vendor' || signupAccountType === 'driver') {
      return signupAccountType;
    }
    if (selectedRole === 'vendor' || selectedRole === 'driver') {
      return selectedRole;
    }
    return null;
  }, [selectedRole, signupAccountType]);

  const handleVerify = useCallback(
    async (code: string) => {
      if (verified || loading || verifyLockRef.current || code.length !== 6) {
        return;
      }

      verifyLockRef.current = true;
      setError('');

      try {
        const role = resolvePartnerRole();
        if (!role) {
          setError('Select Vendor or Driver before continuing');
          verifyLockRef.current = false;
          return;
        }

        const result = await verifyOtpMutation.mutateAsync({
          mobileNumber,
          otp: code,
          role,
        });
        setVerified(true);
        const backendRole = result.user.role;
        const isApprovedPartner =
          (backendRole === 'driver' || backendRole === 'vendor') &&
          result.user.isProfileCompleted &&
          !result.onboardingRequired;

        // Seeded demo drivers / approved partners skip registration UI.
        if (isApprovedPartner) {
          dispatch(completeOnboarding(result.user));
          goToPartnerMain();
          return;
        }

        if (role && (result.onboardingRequired || !result.user.isProfileCompleted)) {
          goToRegistration(role);
          return;
        }

        dispatch(completeOnboarding(result.user));
        goToPartnerMain();
      } catch (err) {
        if (UI_PREVIEW_MODE && (code === '123456' || code === '000000')) {
          const fallbackRole = resolvePartnerRole() ?? 'driver';
          if (fallbackRole === 'vendor') {
            await loginAsMockVendor(dispatch);
          } else {
            await loginAsMockDriver(dispatch);
          }
          goToPartnerMain();
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
      goToPartnerMain,
      goToRegistration,
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
      bottomBar={
        <>
          <ShieldCheck size={18} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.securityText}>
            Your data is secure and encrypted{'\n'}We never share your information
          </Text>
        </>
      }>
      <View style={styles.phoneRow}>
        <Text style={styles.phoneText}>{formatPartnerPhone(mobileNumber)}</Text>
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
      />

      <AuthToast message={backendOtpToast} type="success" />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.timerText}>
        Resend OTP in <Text style={styles.timerValue}>{formatTimer(secondsLeft)}</Text>
      </Text>

      <Pressable
        disabled={secondsLeft > 0 || loading}
        onPress={() => void handleResend()}
        style={styles.resendRow}>
        <Text style={styles.resendPrompt}>
          Didn't receive the code?{' '}
          <Text
            style={[
              styles.resendAction,
              (secondsLeft > 0 || loading) && styles.resendActionDisabled,
            ]}>
            Resend OTP
          </Text>
        </Text>
      </Pressable>

      <View style={styles.infoCard}>
        <Info size={18} color={colors.primary} strokeWidth={2.2} />
        <Text style={styles.infoText}>
          <Text style={styles.infoTitle}>Didn't get the code?</Text> Please check your SMS inbox
          or spam folder.
        </Text>
      </View>

      <Pressable
        disabled={otp.length !== 6 || loading || verified}
        onPress={() => void handleVerify(otp)}
        style={({ pressed }) => [
          styles.primaryButton,
          (otp.length !== 6 || verified) && !loading && styles.primaryButtonDisabled,
          pressed && otp.length === 6 && !loading && !verified && styles.pressed,
        ]}>
        {isVerifying ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator size="small" color={colors.dark} />
            <Text style={styles.primaryButtonLabel}>Verifying OTP...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonLabel}>
            {verified ? 'Verified' : 'Verify & Continue'}
          </Text>
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
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.partnerRedLight,
  },
  infoText: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.relaxed,
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
