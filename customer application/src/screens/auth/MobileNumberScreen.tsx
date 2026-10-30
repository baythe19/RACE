import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TextInput } from 'react-native';

import { KeyboardScreen } from '../../components/ui/AppKeyboard';
import { useAppDialog } from '../../hooks/useAppDialog';

import {
  AUTH_COLORS as COLORS,
  AUTH_DESIGN_HEIGHT,
  AUTH_DESIGN_WIDTH,
  AUTH_HERO_RATIO,
} from '../../components/auth/authDesign';
import {
  AuthHeader,
  GoldButton,
  HeadsetIcon,
  MobileNumberField,
  ScreenDivider,
  ShieldIcon,
  SupportCard,
  TermsAgreeRow,
  VerificationHint,
} from '../../components/auth/AuthPhoneChrome';
import {
  LoginIllustration,
  SignupIllustration,
} from '../../components/auth/AuthSceneIllustrations';
import AuthToast, { AuthLoadingOverlay } from '../../components/auth/AuthToast';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { clearSignupPath, setSignupPath } from '../../redux/onboarding/onboardingSlice';
import {
  getApiErrorMessage,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '../../services/auth/useAuthMutations';
import { ensurePreviewAuthSession, previewAdvanceFromMobileNumber } from '../../config/uiPreviewAuth';
import { isUiPreviewAuthFlow } from '../../config/uiPreviewMode';
import { getRoleMismatchMessage, isRoleMismatchError } from '../../utils/roleMismatch';
import type { AuthStackParamList } from '../../types/navigation';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'MobileNumber'>;

const MOBILE_REGEX = /^[6-9]\d{9}$/;

/** OTP verification screen for HanuSMS delivery. Can be forced off in preview via EXPO_PUBLIC_SKIP_OTP_AUTH=true */
const SKIP_OTP_AUTH = process.env.EXPO_PUBLIC_SKIP_OTP_AUTH === 'true';

function friendlyAuthError(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes('network') || text.includes('cannot reach')) {
    return 'No connection to RACE. Check Wi‑Fi, then try Continue again.';
  }
  if (text.includes('partner') || text.includes('role')) {
    return 'This number is on the RACE Partner app. Use a different number here.';
  }
  if (text.includes('invalid indian') || text.includes('invalid mobile')) {
    return 'Use a 10-digit Indian mobile that starts with 6, 7, 8, or 9.';
  }
  if (text.includes('otp') && text.includes('limit')) {
    return 'Too many codes sent. Wait a bit, then try again.';
  }
  if (text.includes('dev otp')) {
    return 'Could not sign you in automatically. Try again in a moment.';
  }
  return raw;
}

function extractOtpFromMessage(message?: string): string | null {
  if (!message) return null;
  const match = message.match(/\b(\d{6})\b/);
  return match?.[1] ?? null;
}

export default function MobileNumberScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(state => state.auth.loading);
  const { dialog, showDialog } = useAppDialog();
  const signupAccountType = useAppSelector(state => state.onboarding.signupAccountType);
  const signupVendorType = useAppSelector(state => state.onboarding.signupVendorType);
  const partnerSignupRequired = useAppSelector(state => state.onboarding.partnerSignupRequired);

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const screenWidth = Math.min(width, 430);
  const innerHeight = height - insets.top - insets.bottom;
  const scale = Math.min(screenWidth / AUTH_DESIGN_WIDTH, innerHeight / AUTH_DESIGN_HEIGHT);

  const isSignup = Boolean(signupAccountType);
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('+91');
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(!isSignup);

  const inputRef = useRef<TextInput>(null);
  const heroFactor = useRef(new Animated.Value(1)).current;
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const fullHeroHeight = screenWidth * AUTH_HERO_RATIO;
  const heroHeight = useMemo(
    () =>
      heroFactor.interpolate({
        inputRange: [0.48, 1],
        outputRange: [fullHeroHeight * 0.48, fullHeroHeight],
      }),
    [fullHeroHeight, heroFactor],
  );
  const keyboardOpen = keyboardHeight > 80;

  const sendOtpMutation = useSendOtpMutation();
  const verifyOtpMutation = useVerifyOtpMutation();

  const switchMode = (nextMode: 'login' | 'signup') => {
    Keyboard.dismiss();
    setError('');
    setCountryMenuOpen(false);
    setTermsAccepted(nextMode === 'login');
    if (nextMode === 'signup') {
      dispatch(setSignupPath({ accountType: 'customer', vendorType: null }));
    } else {
      dispatch(clearSignupPath());
    }
  };

  const handleBack = () => {
    if (isSignup) {
      switchMode('login');
      return;
    }
    if (navigation.canGoBack()) {
      goBackWithinStack(navigation);
      return;
    }
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSignup) {
        switchMode('login');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [isSignup]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animate = (open: boolean, duration: number) => {
      Animated.parallel([
        Animated.timing(heroFactor, {
          toValue: open ? (Platform.OS === 'ios' ? 0.58 : 0.48) : 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(chromeOpacity, {
          toValue: open ? 0 : 1,
          duration: Math.max(180, duration - 40),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    };

    const show = Keyboard.addListener(showEvent, event => {
      setCountryMenuOpen(false);
      setKeyboardHeight(event.endCoordinates.height);
      animate(true, event.duration && event.duration > 0 ? event.duration : 280);
    });
    const hide = Keyboard.addListener(hideEvent, event => {
      setKeyboardHeight(0);
      animate(false, event.duration && event.duration > 0 ? event.duration : 240);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [chromeOpacity, heroFactor]);

  const handleContinue = async () => {
    if (loading || sendOtpMutation.isPending) return;

    if (isUiPreviewAuthFlow()) {
      Keyboard.dismiss();
      setError('');
      previewAdvanceFromMobileNumber(navigation, dispatch, isSignup);
      return;
    }

    const digits = phone.replace(/\D/g, '');
    setError('');

    if (!MOBILE_REGEX.test(digits)) {
      inputRef.current?.focus();
      setError(
        digits.length === 0
          ? 'Enter your 10-digit mobile number to continue.'
          : 'That number looks short or invalid. Use 10 digits starting with 6, 7, 8, or 9.',
      );
      return;
    }

    if (country !== '+91') {
      setError('RACE currently signs in with Indian numbers only (+91).');
      return;
    }

    if (!termsAccepted) {
      setError('Tick “I agree to Terms & Privacy” before you continue.');
      return;
    }

    Keyboard.dismiss();

    try {
      const result = await sendOtpMutation.mutateAsync({ mobileNumber: digits });
      const isExistingUser = result.isExistingUser ?? false;
      if (isExistingUser) {
        dispatch(clearSignupPath());
      }

      if (SKIP_OTP_AUTH) {
        const otp = result.devOtp ?? extractOtpFromMessage(result.message);
        if (!otp) {
          setError('Could not sign you in automatically. Try Continue again.');
          return;
        }
        const verifyResult = await verifyOtpMutation.mutateAsync({
          mobileNumber: digits,
          otp,
        });
        if (isExistingUser || verifyResult.user.isProfileCompleted) {
          dispatch(clearSignupPath());
        }
        if (verifyResult.onboardingRequired && !verifyResult.user.isProfileCompleted) {
          navigation.replace('ProfileWizard');
          return;
        }
        if (partnerSignupRequired && signupVendorType && verifyResult.user.isProfileCompleted) {
          navigation.replace('VendorWizard', { vendorType: signupVendorType });
          return;
        }
        return;
      }

      navigation.navigate('OtpVerification', {
        mobileNumber: digits,
        isExistingUser,
        devOtp: result.devOtp,
        otpMessage: result.message,
      });
    } catch (err) {
      if (isRoleMismatchError(err)) {
        setError(
          getRoleMismatchMessage(
            err,
            'This number is registered as a partner. Use the RACE Partner app or a different number.',
          ),
        );
        return;
      }
      if (__DEV__ || isUiPreviewAuthFlow()) {
        navigation.navigate('OtpVerification', {
          mobileNumber: digits,
          isExistingUser: !isSignup,
          devOtp: '123456',
          otpMessage: 'Dev mode: use OTP 123456',
        });
        return;
      }
      setError(
        friendlyAuthError(
          getApiErrorMessage(err, SKIP_OTP_AUTH ? 'Unable to sign in' : 'Unable to send OTP'),
        ),
      );
    }
  };

  const handleHelp = () => {
    showDialog({
      tone: 'info',
      title: '24/7 roadside support',
      message: "We're here whenever you need us.",
      primaryLabel: 'Got it',
    });
  };

  const handleTerms = () => {
    void Linking.openURL('https://www.raceservice.in/terms.html');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {dialog}
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} translucent={false} />

      <KeyboardScreen>
        <View style={[styles.fill, { width: screenWidth, alignSelf: 'center' }]}>
          {countryMenuOpen ? (
            <Pressable
              accessibilityLabel="Close country list"
              onPress={() => setCountryMenuOpen(false)}
              style={[StyleSheet.absoluteFill, { zIndex: 12 }]}
            />
          ) : null}

          <AuthHeader scale={scale} onBack={handleBack} />

          <Animated.View style={{ width: screenWidth, height: heroHeight, overflow: 'hidden' }}>
            {isSignup ? (
              <SignupIllustration width={screenWidth} compact={1} />
            ) : (
              <LoginIllustration width={screenWidth} compact={1} />
            )}
          </Animated.View>

          <Text
            numberOfLines={1}
            style={{
              marginTop: 10 * scale,
              marginHorizontal: 24 * scale,
              color: '#0B0C10',
              fontSize: 28 * scale,
              lineHeight: 40 * scale,
              fontWeight: '800',
              letterSpacing: -0.6 * scale,
              textAlign: 'left',
              includeFontPadding: true,
            }}>
            {isSignup ? "Let's get you moving" : 'Welcome back'}
          </Text>
          <Animated.View
            pointerEvents={keyboardOpen ? 'none' : 'auto'}
            style={{
              opacity: chromeOpacity,
              maxHeight: keyboardOpen ? 0 : 40 * scale,
              overflow: 'hidden',
            }}>
            <Text
              numberOfLines={1}
              style={{
                marginTop: 4 * scale,
                marginHorizontal: 24 * scale,
                color: COLORS.secondary,
                fontSize: 16 * scale,
                lineHeight: 26 * scale,
                paddingBottom: 3 * scale,
                textAlign: 'left',
                includeFontPadding: true,
              }}>
              {isSignup ? 'Create your account in seconds.' : "Let's get you back on the road."}
            </Text>
          </Animated.View>

          <View style={{ marginTop: 18 * scale }}>
            <MobileNumberField
              scale={scale}
              country={country}
              phone={phone}
              inputRef={inputRef}
              menuOpen={countryMenuOpen}
              onPhoneChange={value => {
                // Indian mobile: digits only, hard-capped at 10.
                setPhone(value.replace(/\D/g, '').slice(0, 10));
                if (error) setError('');
              }}
              onToggleCountryMenu={() => {
                Keyboard.dismiss();
                setCountryMenuOpen(open => !open);
              }}
              onSelectCountry={code => {
                setCountry(code);
                setCountryMenuOpen(false);
              }}
              onSubmit={() => void handleContinue()}
            />
          </View>

          {error ? (
            <View style={{ marginHorizontal: 24 * scale, marginTop: 8 * scale }}>
              <AuthToast message={error} type="error" />
            </View>
          ) : null}

          <VerificationHint scale={scale} />
          <TermsAgreeRow
            scale={scale}
            accepted={termsAccepted}
            onToggle={() => {
              setTermsAccepted(value => !value);
              if (error) setError('');
            }}
            onPressTerms={handleTerms}
          />
          <GoldButton
            scale={scale}
            isSignup={isSignup}
            marginTop={keyboardOpen ? 12 : 22}
            onPress={() => void handleContinue()}
            disabled={loading || sendOtpMutation.isPending}
          />

          <Animated.View
            pointerEvents={keyboardOpen ? 'none' : 'auto'}
            style={{
              flexGrow: keyboardOpen ? 0 : 1,
              height: keyboardOpen ? 0 : undefined,
              opacity: chromeOpacity,
              overflow: 'hidden',
            }}>

          <ScreenDivider scale={scale} isSignup={isSignup} marginTop={22} />
          <View
            style={{
              marginTop: 18 * scale,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              style={{
                color: '#494951',
                fontSize: 16 * scale,
                lineHeight: 26 * scale,
                includeFontPadding: true,
                paddingBottom: 2 * scale,
              }}>
              {isSignup ? 'Already have an account?' : 'New to RACE?'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => switchMode(isSignup ? 'login' : 'signup')}
              hitSlop={6}
              style={{ marginLeft: 6 * scale }}>
              <Text
                style={{
                  color: COLORS.orange,
                  fontSize: 16 * scale,
                  lineHeight: 26 * scale,
                  includeFontPadding: true,
                  paddingBottom: 2 * scale,
                }}>
                {isSignup ? 'Sign in' : 'Create account'}
              </Text>
            </Pressable>
          </View>

          {/* Preview builds only — never show in APK when isUiPreviewAuthFlow()=false */}
          {isUiPreviewAuthFlow() ? (
            <View
              style={{
                marginTop: 14 * scale,
                padding: 12 * scale,
                backgroundColor: '#F3F4F6',
                borderRadius: 12 * scale,
                alignItems: 'center',
              }}>
              <Text style={{ fontSize: 11 * scale, fontWeight: '700', color: COLORS.orange }}>
                ⚡ QUICK DEMO MODE (NO BACKEND)
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => ensurePreviewAuthSession(dispatch, true)}
                style={({ pressed }) => ({
                  marginTop: 8 * scale,
                  backgroundColor: COLORS.orange,
                  paddingVertical: 8 * scale,
                  paddingHorizontal: 16 * scale,
                  borderRadius: 8 * scale,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 * scale }}>
                  🚀 Explore Customer App (Demo)
                </Text>
              </Pressable>
            </View>
          ) : null}

          {isSignup ? (
            <>
              <View style={styles.flexSpacer} />
              <SupportCard scale={scale} onPress={handleHelp} />
            </>
          ) : (
            <>
              <View style={styles.flexSpacer} />

              <View style={{ marginBottom: 18 * scale, alignItems: 'center' }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleHelp}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                  <HeadsetIcon size={22 * scale} />
                  <Text
                    style={{
                      marginLeft: 5 * scale,
                      color: COLORS.orange,
                      fontSize: 14 * scale,
                      lineHeight: 22 * scale,
                      paddingBottom: 2 * scale,
                      includeFontPadding: true,
                    }}>
                    Need help?
                  </Text>
                </Pressable>
                <View
                  style={{
                    marginTop: 10 * scale,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                  <ShieldIcon size={22 * scale} />
                  <Text
                    style={{
                      marginLeft: 8 * scale,
                      color: '#90909C',
                      fontSize: 13 * scale,
                      lineHeight: 22 * scale,
                      paddingBottom: 2 * scale,
                      includeFontPadding: true,
                    }}>
                    Your data is safe and secure with RACE.
                  </Text>
                </View>
              </View>
            </>
          )}
          </Animated.View>
        </View>
      </KeyboardScreen>

      <AuthLoadingOverlay
        visible={loading}
        label={
          SKIP_OTP_AUTH
            ? isSignup
              ? 'Creating your account…'
              : 'Signing you in…'
            : 'Sending your code…'
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fill: { flex: 1 },
  flexSpacer: { flex: 1, minHeight: 4 },
});
