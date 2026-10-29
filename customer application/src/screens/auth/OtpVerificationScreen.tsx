import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AUTH_COLORS as COLORS, AUTH_DESIGN_WIDTH } from '../../components/auth/authDesign';
import { KeyboardFormView } from '../../components/ui/AppKeyboard';
import {
  AuthHeader,
  GoldButton,
  ShieldIcon,
  noFontPadding,
} from '../../components/auth/AuthPhoneChrome';
import AuthToast, { AuthLoadingOverlay } from '../../components/auth/AuthToast';
import OtpInput from '../../components/auth/OtpInput';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { clearSignupPath } from '../../redux/onboarding/onboardingSlice';
import {
  getApiErrorMessage,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '../../services/auth/useAuthMutations';
import { ensurePreviewAuthSession, previewAdvanceFromOtp } from '../../config/uiPreviewAuth';
import { isUiPreviewAuthFlow } from '../../config/uiPreviewMode';
import { getRoleMismatchMessage, isRoleMismatchError } from '../../utils/roleMismatch';
import type { AuthStackParamList } from '../../types/navigation';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const RESEND_SECONDS = 60;

function formatPhone(mobileNumber: string): string {
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

export default function OtpVerificationScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const { mobileNumber, isExistingUser = false, devOtp, otpMessage } = route.params;
  const loading = useAppSelector(state => state.auth.loading);
  const partnerSignupRequired = useAppSelector(state => state.onboarding.partnerSignupRequired);
  const signupVendorType = useAppSelector(state => state.onboarding.signupVendorType);

  const { width } = useWindowDimensions();
  const screenWidth = Math.min(width, 430);
  const scale = screenWidth / AUTH_DESIGN_WIDTH;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [verified, setVerified] = useState(false);
  const [backendOtpToast, setBackendOtpToast] = useState('');
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);
  const verifyLockRef = useRef(false);
  const backendOtpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extractOtpFromMessage = (message?: string): string | null => {
    if (!message) return null;
    const match = message.match(/\b(\d{6})\b/);
    return match?.[1] ?? null;
  };

  const showBackendOtpToast = (code: string) => {
    setBackendOtpToast(`OTP: ${code}`);
    if (backendOtpTimerRef.current) clearTimeout(backendOtpTimerRef.current);
    backendOtpTimerRef.current = setTimeout(() => setBackendOtpToast(''), 8000);
  };

  const otpDigits = Array.from({ length: 6 }, (_, i) => otp[i] ?? '');
  const verifyOtpMutation = useVerifyOtpMutation();
  const sendOtpMutation = useSendOtpMutation();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // Only show / use QA OTP when the API returned one (whitelist / mock).
  const testingOtp = devOtp ?? extractOtpFromMessage(otpMessage) ?? null;

  useEffect(() => {
    if (!testingOtp) return;
    showBackendOtpToast(testingOtp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testingOtp]);

  const handleVerify = useCallback(
    async (codeOverride?: string) => {
      if (isUiPreviewAuthFlow()) {
        previewAdvanceFromOtp(navigation, dispatch, isExistingUser);
        return;
      }

      const code = (codeOverride ?? otp).replace(/\D/g, '').slice(0, 6);
      if (verified || loading || verifyLockRef.current || code.length !== 6) {
        return;
      }

      verifyLockRef.current = true;
      setError('');
      setSuccess('');

      try {
        const result = await verifyOtpMutation.mutateAsync({ mobileNumber, otp: code });
        setVerified(true);
        setSuccess(isExistingUser ? 'Login successful' : 'OTP verified');

        if (isExistingUser || result.user.isProfileCompleted) {
          dispatch(clearSignupPath());
        }
        if (result.onboardingRequired && !result.user.isProfileCompleted) {
          navigation.replace('ProfileWizard');
          return;
        }
        if (partnerSignupRequired && signupVendorType && result.user.isProfileCompleted) {
          navigation.replace('VendorWizard', { vendorType: signupVendorType });
          return;
        }
      } catch (err) {
        // Preview-only soft login. Never accept magic OTPs when preview is off —
        // that would ship into APKs and bypass real HanuSMS verification.
        if (isUiPreviewAuthFlow()) {
          ensurePreviewAuthSession(dispatch, isExistingUser);
          if (!isExistingUser) {
            navigation.replace('ProfileWizard');
          }
          return;
        }
        if (isRoleMismatchError(err)) {
          setError(
            getRoleMismatchMessage(
              err,
              'This number is registered as a partner. Use the RACE Partner app or a different number.',
            ),
          );
        } else {
          const message = getApiErrorMessage(err, 'Invalid OTP');
          setError(message);
          // Exhausted / stale codes → unlock Resend immediately so QA isn't stuck.
          if (/expired|already used/i.test(message)) {
            setSecondsLeft(0);
          }
        }
        setOtp('');
        setActiveOtpIndex(0);
        verifyLockRef.current = false;
      }
    },
    [
      dispatch,
      isExistingUser,
      loading,
      mobileNumber,
      navigation,
      otp,
      partnerSignupRequired,
      signupVendorType,
      verified,
      verifyOtpMutation,
    ],
  );

  const handleResend = async () => {
    if (secondsLeft > 0 || loading) return;
    setError('');
    setSuccess('');
    verifyLockRef.current = false;

    try {
      const result = await sendOtpMutation.mutateAsync({ mobileNumber });
      const nextOtp = result.devOtp ?? extractOtpFromMessage(result.message);
      if (nextOtp) showBackendOtpToast(nextOtp);
      setSuccess(
        nextOtp
          ? `OTP resent — use ${nextOtp} (QA / whitelist)`
          : 'OTP resent successfully. Check SMS.',
      );
      setSecondsLeft(RESEND_SECONDS);
      setOtp('');
      setActiveOtpIndex(0);
      navigation.setParams({
        isExistingUser: result.isExistingUser ?? isExistingUser,
        devOtp: result.devOtp,
        otpMessage: result.message,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to resend OTP'));
    }
  };

  const handleOtpChange = (digits: string[]) => {
    const next = digits.join('');
    setOtp(next);
    if (error) setError('');
    if (next.length < 6) {
      verifyLockRef.current = false;
    }
    if (next.length === 6) {
      void handleVerify(next);
    }
  };

  const fillTestingOtp = () => {
    const code = testingOtp;
    if (!code) return;
    if (verifyLockRef.current || verified) return;
    setError('');
    setOtp(code);
    setActiveOtpIndex(5);
    void handleVerify(code);
  };

  const px = (n: number) => Math.max(1, Math.round(n * scale));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} translucent={false} />
      <KeyboardFormView style={styles.fill} contentContainerStyle={styles.scrollContent}>
          <AuthHeader scale={scale} onBack={() => goBackWithinStack(navigation)} />

          <Text
            style={[
              noFontPadding,
              {
                marginTop: 18 * scale,
                marginHorizontal: 24 * scale,
                color: '#111318',
                fontSize: 34 * scale,
                lineHeight: 42 * scale,
                fontWeight: '800',
                letterSpacing: -1.1 * scale,
              },
            ]}>
            {isExistingUser ? 'Welcome back' : 'Enter the code'}
          </Text>
          <Text
            style={[
              noFontPadding,
              {
                marginTop: 8 * scale,
                marginHorizontal: 24 * scale,
                color: COLORS.secondary,
                fontSize: 17 * scale,
                lineHeight: 24 * scale,
              },
            ]}>
            We sent a 6-digit verification code to
          </Text>

          <View
            style={{
              marginTop: 10 * scale,
              marginHorizontal: 24 * scale,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <Text
              style={[
                noFontPadding,
                {
                  color: COLORS.ink,
                  fontSize: 16 * scale,
                  lineHeight: 22 * scale,
                  fontWeight: '600',
                },
              ]}>
              {formatPhone(mobileNumber)}
            </Text>
            <Pressable
              onPress={() => goBackWithinStack(navigation)}
              hitSlop={8}
              style={{ marginLeft: 10 * scale }}
              accessibilityRole="button"
              accessibilityLabel="Edit mobile number">
              <Text
                style={[
                  noFontPadding,
                  {
                    color: COLORS.orange,
                    fontSize: 15 * scale,
                    fontWeight: '700',
                  },
                ]}>
                Edit
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 28 * scale }}>
            <OtpInput
              digits={otpDigits}
              activeIndex={activeOtpIndex}
              onActiveIndexChange={setActiveOtpIndex}
              onChange={handleOtpChange}
              px={px}
            />
          </View>

          {testingOtp ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use testing OTP"
              onPress={fillTestingOtp}
              style={{
                marginHorizontal: 24 * scale,
                marginTop: 12 * scale,
                paddingVertical: 10 * scale,
                paddingHorizontal: 14 * scale,
                borderRadius: 12 * scale,
                borderWidth: 1,
                borderColor: '#F5C518',
                backgroundColor: '#FFF8E1',
              }}>
              <Text
                style={[
                  noFontPadding,
                  {
                    color: '#7A5A00',
                    fontSize: 13 * scale,
                    fontWeight: '700',
                    textAlign: 'center',
                  },
                ]}>
                QA OTP {testingOtp} — tap to fill & verify
              </Text>
              <Text
                style={[
                  noFontPadding,
                  {
                    marginTop: 4 * scale,
                    color: '#9A7A20',
                    fontSize: 11 * scale,
                    textAlign: 'center',
                  },
                ]}>
                Test numbers: 9876543210 or 9000000xxx → use code from API above
              </Text>
            </Pressable>
          ) : null}

          <View style={{ marginHorizontal: 24 * scale, marginTop: 16 * scale }}>
            <AuthToast message={backendOtpToast} type="success" />
            <AuthToast message={error} type="error" />
            <AuthToast message={success} type="success" />
          </View>

          <GoldButton
            scale={scale}
            isSignup={false}
            gradientId="otpButtonGold"
            marginTop={28}
            label={
              isUiPreviewAuthFlow()
                ? 'Continue'
                : loading && otp.length === 6
                  ? 'Verifying...'
                  : verified
                    ? 'Verified'
                    : isExistingUser
                      ? 'Verify & Login'
                      : 'Verify & Continue'
            }
            disabled={isUiPreviewAuthFlow() ? false : otp.length !== 6 || loading || verified}
            onPress={() => void handleVerify()}
          />

          <Text
            style={[
              noFontPadding,
              {
                marginTop: 22 * scale,
                textAlign: 'center',
                color: '#82838E',
                fontSize: 14 * scale,
                lineHeight: 20 * scale,
              },
            ]}>
            Resend code in{' '}
            <Text style={{ color: COLORS.orange, fontWeight: '700' }}>{formatTimer(secondsLeft)}</Text>
          </Text>

          <Pressable
            disabled={secondsLeft > 0 || loading}
            onPress={() => void handleResend()}
            style={{ marginTop: 8 * scale, alignItems: 'center' }}>
            <Text
              style={[
                noFontPadding,
                {
                  color: secondsLeft > 0 || loading ? '#C4C4CC' : COLORS.orange,
                  fontSize: 15 * scale,
                  fontWeight: '700',
                },
              ]}>
              Resend OTP
            </Text>
          </Pressable>

          <View style={{ marginTop: 'auto', paddingTop: 28 * scale, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldIcon size={22 * scale} />
              <Text
                style={[
                  noFontPadding,
                  {
                    marginLeft: 8 * scale,
                    color: '#90909C',
                    fontSize: 13 * scale,
                    lineHeight: 19 * scale,
                  },
                ]}>
                Your data is safe and secure with RACE.
              </Text>
            </View>
          </View>
      </KeyboardFormView>
      <AuthLoadingOverlay visible={loading} label="Verifying OTP..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
});
