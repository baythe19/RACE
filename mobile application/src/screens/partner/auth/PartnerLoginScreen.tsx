import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronDown,
  Clock,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../assets';
import AuthToast, { AuthLoadingOverlay } from '../../../components/auth/AuthToast';
import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { completeOnboarding } from '../../../redux/auth/authSlice';
import { setSignupPath } from '../../../redux/onboarding/onboardingSlice';
import {
  getApiErrorMessage,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '../../../services/auth/useAuthMutations';
import { usePartnerOnboardingStore } from '../../../store/partnerOnboardingStore';
import type {
  PartnerAuthStackParamList,
  PartnerRootStackParamList,
  PartnerRole,
} from '../../../types/partnerNavigation';
import { getRoleMismatchMessage, isRoleMismatchError } from '../../../utils/roleMismatch';
import { loginAsMockDriver, loginAsMockVendor, UI_PREVIEW_MODE } from '../../../config/uiPreviewMode';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerLogin'>;

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const REF_W = 390;

/** Re-enabled OTP verification screen for real SMS delivery. Can be forced off via EXPO_PUBLIC_SKIP_OTP_AUTH=true */
const SKIP_OTP_AUTH = process.env.EXPO_PUBLIC_SKIP_OTP_AUTH === 'true';

function extractOtpFromMessage(message?: string): string | null {
  if (!message) return null;
  const match = message.match(/\b(\d{6})\b/);
  return match?.[1] ?? null;
}

export default function PartnerLoginScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.auth.loading);
  const signupAccountType = useAppSelector((state) => state.onboarding.signupAccountType);
  const setSelectedRole = usePartnerOnboardingStore((state) => state.setSelectedRole);
  const selectedRole = usePartnerOnboardingStore((state) => state.selectedRole);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const sendOtpMutation = useSendOtpMutation();
  const verifyOtpMutation = useVerifyOtpMutation();
  // Allow any 10-digit mobile number for seamless testing with mock/real data
  const isValid = useMemo(() => mobileNumber.length === 10, [mobileNumber]);

  // Read role from navigation params or store
  const [partnerRole, setPartnerRole] = useState<PartnerRole>(
    route.params?.role ??
    (signupAccountType === 'vendor' || signupAccountType === 'driver'
      ? signupAccountType
      : null) ??
    selectedRole ??
    'driver',
  );

  useEffect(() => {
    if (route.params?.role) {
      setPartnerRole(route.params.role);
      setSelectedRole(route.params.role);
    }
  }, [route.params?.role, setSelectedRole]);

  const handleChangeRole = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('PartnerWelcome');
  };

  const isDriver = partnerRole === 'driver';
  const roleDisplayTitle = isDriver ? 'Driver account' : 'Vendor / Fleet account';
  const roleChangeLabel = isDriver ? 'Change type' : 'Change role';

  const goToPartnerMain = () => {
    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    const routeNames = rootNavigation?.getState()?.routeNames;
    if (routeNames && routeNames.includes('PartnerMain')) {
      rootNavigation?.reset({
        index: 0,
        routes: [{ name: 'PartnerMain' }],
      });
    }
  };

  const goToRegistration = (role: PartnerRole) => {
    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    rootNavigation?.navigate('PartnerRegistration', { role, mobileNumber });
  };

  const handleSendOtp = async () => {
    setError('');

    if (!partnerRole) {
      setError('Select Driver or Vendor before continuing');
      return;
    }

    if (!isValid) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    try {
      const result = await sendOtpMutation.mutateAsync({
        mobileNumber,
        role: partnerRole,
      });

      // --- OTP auth bypass (when SKIP_OTP_AUTH is active) ---
      if (SKIP_OTP_AUTH) {
        const otp = result.devOtp ?? extractOtpFromMessage(result.message);
        if (!otp) {
          setError('Dev OTP unavailable. Turn off SKIP_OTP_AUTH or use a non-production API.');
          return;
        }
        const verifyResult = await verifyOtpMutation.mutateAsync({
          mobileNumber,
          otp,
          role: partnerRole,
        });
        const backendRole = verifyResult.user.role;
        const isApprovedPartner =
          (backendRole === 'driver' || backendRole === 'vendor') &&
          verifyResult.user.isProfileCompleted &&
          !verifyResult.onboardingRequired;

        // Route straight to registration wizard instead of bypassing to dashboard
        goToRegistration(partnerRole);
        return;
      }
      // --- end OTP bypass ---

      navigation.navigate('PartnerOtpVerification', {
        mobileNumber,
        role: partnerRole,
        isExistingUser: result.isExistingUser ?? false,
        devOtp: result.devOtp,
        otpMessage: result.message,
      });
    } catch (err) {
      const errMsg = getApiErrorMessage(err, '');
      if (errMsg.toLowerCase().includes('registered as a vendor')) {
        setPartnerRole('vendor');
        setSelectedRole('vendor');
        setError('Detected Vendor account! Switched to Vendor mode — tap Send OTP.');
        return;
      }
      if (errMsg.toLowerCase().includes('registered as a driver')) {
        setPartnerRole('driver');
        setSelectedRole('driver');
        setError('Detected Driver account! Switched to Driver mode — tap Send OTP.');
        return;
      }
      if (isRoleMismatchError(err)) {
        setError(
          getRoleMismatchMessage(
            err,
            'This number belongs to another app role. Use the RACE Customer app or a different number.',
          ),
        );
        return;
      }
      if (UI_PREVIEW_MODE || __DEV__) {
        navigation.navigate('PartnerOtpVerification', {
          mobileNumber,
          role: partnerRole,
          isExistingUser: false,
          devOtp: '123456',
          otpMessage: 'Dev mode: use OTP 123456',
        });
        return;
      }
      setError(errMsg || (SKIP_OTP_AUTH ? 'Unable to sign in' : 'Unable to send OTP'));
    }
  };

  const isSubmitting = sendOtpMutation.isPending || verifyOtpMutation.isPending || loading;

  return (
    <>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Top Header Bar — Exactly aligned across all auth screens */}
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + px(4),
              paddingHorizontal: px(20),
              height: insets.top + px(54),
            },
          ]}>
          <Pressable
            onPress={handleChangeRole}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ArrowLeft size={px(24)} color="#111827" strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerLogoContainer}>
            <PartnerHeaderLogo width={px(104)} />
          </View>

          <View style={{ width: px(32) }} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scroll}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: px(20),
                paddingBottom: insets.bottom + px(18),
              },
            ]}>
            {/* Title & Subtitle — Left Aligned, Clean & Meaningful */}
            <View style={[styles.titleSection, { marginTop: px(18) }]}>
              <Text style={[styles.titleText, { fontSize: px(28), lineHeight: px(34) }]}>
                Sign in to RACE
              </Text>
              <Text style={[styles.subtitleText, { fontSize: px(14.5), marginTop: px(8) }]}>
                We'll verify your partner account with a secure OTP.
              </Text>
            </View>

            {/* Pre-Selected Role Card / Badge */}
            <View
              style={[
                styles.roleBadgeCard,
                {
                  marginTop: px(24),
                  paddingHorizontal: px(12),
                  paddingVertical: px(11),
                  borderRadius: px(16),
                },
              ]}>
              <View
                style={[
                  styles.roleIconBox,
                  {
                    width: px(36),
                    height: px(36),
                    borderRadius: px(10),
                    backgroundColor: isDriver ? '#FEF3C7' : '#F3F4F6',
                  },
                ]}>
                {isDriver ? (
                  <Image
                    source={images.icons.truck}
                    style={{ width: px(28), height: px(18) }}
                    resizeMode="contain"
                    accessibilityLabel="Driver"
                  />
                ) : (
                  <Building2 size={px(20)} color="#374151" strokeWidth={2.2} />
                )}
              </View>

              <Text style={[styles.roleBadgeTitle, { fontSize: px(14.5) }]} numberOfLines={1}>
                {roleDisplayTitle}
              </Text>

              {/* Vertical divider */}
              <View style={[styles.roleDivider, { height: px(18), marginHorizontal: px(8) }]} />

              {/* Change role link */}
              <Pressable
                onPress={handleChangeRole}
                hitSlop={8}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Text style={[styles.changeRoleText, { fontSize: px(13.5) }]}>
                  {roleChangeLabel}
                </Text>
              </Pressable>
            </View>

            {/* Mobile Number Label & Inputs */}
            <View style={[styles.inputSection, { marginTop: px(26) }]}>
              <Text style={[styles.fieldLabel, { fontSize: px(14) }]}>Mobile number</Text>

              <View style={[styles.phoneRow, { marginTop: px(8), gap: px(10) }]}>
                {/* Country Code Picker Box */}
                <View
                  style={[
                    styles.countryBox,
                    {
                      height: px(52),
                      borderRadius: px(12),
                      paddingHorizontal: px(12),
                    },
                  ]}>
                  <Text style={[styles.flagEmoji, { fontSize: px(16) }]}>🇮🇳</Text>
                  <Text style={[styles.countryCode, { fontSize: px(15) }]}>+91</Text>
                  <ChevronDown size={px(16)} color="#6B7280" strokeWidth={2.4} />
                </View>

                {/* 10-Digit Mobile Input Box */}
                <View
                  style={[
                    styles.phoneInputWrap,
                    {
                      height: px(52),
                      borderRadius: px(12),
                      borderColor: focused ? '#F59E0B' : '#E5E7EB',
                      borderWidth: focused ? 1.8 : 1.2,
                    },
                  ]}>
                  <TextInput
                    value={mobileNumber}
                    onChangeText={(text) => {
                      setMobileNumber(text.replace(/\D/g, '').slice(0, 10));
                      if (error) setError('');
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    keyboardType="phone-pad"
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#9CA3AF"
                    maxLength={10}
                    style={[styles.phoneInput, { fontSize: px(16) }]}
                  />
                </View>
              </View>
            </View>

            {/* Error Message Toast */}
            <AuthToast message={error} type="error" position="inline" onDismiss={() => setError('')} />

            {/* Primary CTA: Send OTP */}
            <Pressable
              disabled={!isValid || isSubmitting}
              onPress={() => void handleSendOtp()}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  minHeight: px(54),
                  borderRadius: px(14),
                  marginTop: px(22),
                },
                (!isValid || isSubmitting) && styles.primaryButtonDisabled,
                pressed && isValid && !isSubmitting && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send OTP">
              <Text style={[styles.primaryButtonText, { fontSize: px(16.5) }]}>
                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
              </Text>
              <ArrowRight
                size={px(20)}
                color="#111827"
                strokeWidth={2.6}
                style={{ marginLeft: px(8) }}
              />
            </Pressable>

            {/* Security Assurance with Word Wrapping */}
            <View style={[styles.securityNotice, { marginTop: px(16) }]}>
              <ShieldCheck size={px(18)} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }} />
              <Text style={[styles.securityText, { fontSize: px(12.5) }]}>
                Your number is used to verify your partner account.
              </Text>
            </View>

            {/* Partner Benefits Trust Card (Fills bottom void professionally) */}
            <View style={[styles.trustSectionCard, { marginTop: px(26), padding: px(16), borderRadius: px(16) }]}>
              <View style={styles.trustRow}>
                <View style={[styles.trustIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Zap size={px(16)} color="#D97706" strokeWidth={2.4} />
                </View>
                <View style={styles.trustTextCol}>
                  <Text style={[styles.trustTitle, { fontSize: px(13.5) }]}>Instant Roadside Requests</Text>
                  <Text style={[styles.trustSubtitle, { fontSize: px(12) }]}>Receive customer breakdowns in real-time</Text>
                </View>
              </View>

              <View style={[styles.trustInnerDivider, { marginVertical: px(12) }]} />

              <View style={styles.trustRow}>
                <View style={[styles.trustIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Wallet size={px(16)} color="#059669" strokeWidth={2.4} />
                </View>
                <View style={styles.trustTextCol}>
                  <Text style={[styles.trustTitle, { fontSize: px(13.5) }]}>Guaranteed Fast Settlements</Text>
                  <Text style={[styles.trustSubtitle, { fontSize: px(12) }]}>Direct deposits straight to your account</Text>
                </View>
              </View>
            </View>

            {/* Subtle Horizontal Divider */}
            <View style={[styles.footerDivider, { marginTop: px(26) }]} />

            {/* Terms and Privacy Footer */}
            <View style={[styles.footerBlock, { marginTop: px(10) }]}>
              <Text style={[styles.footerText, { fontSize: px(12) }]}>
                By continuing, you agree to our
              </Text>
              <Text style={[styles.termsLink, { fontSize: px(12), marginTop: px(2) }]}>
                Terms & Privacy Policy
              </Text>
            </View>

            {/* Discreet Dev Demo Mode (for offline QA testing) */}
            {(__DEV__ || UI_PREVIEW_MODE) && (
              <View style={[styles.demoRow, { marginTop: px(14) }]}>
                <Text style={[styles.demoLabel, { fontSize: px(10) }]}>Quick Preview:</Text>
                <Pressable
                  onPress={() => void loginAsMockDriver(dispatch)}
                  style={styles.demoLink}>
                  <Text style={styles.demoLinkText}>Driver</Text>
                </Pressable>
                <Text style={styles.demoDivider}>•</Text>
                <Pressable
                  onPress={() => void loginAsMockVendor(dispatch)}
                  style={styles.demoLink}>
                  <Text style={styles.demoLinkText}>Vendor</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <AuthLoadingOverlay visible={isSubmitting} label="Processing..." />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  titleSection: {
    alignItems: 'flex-start',
  },
  titleText: {
    fontWeight: '800',
    color: '#111827',
  },
  subtitleText: {
    fontWeight: '400',
    color: '#6B7280',
  },
  roleBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  roleIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadgeTitle: {
    flex: 1,
    marginLeft: 12,
    fontWeight: '800',
    color: '#111827',
  },
  roleDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  changeRoleText: {
    fontWeight: '600',
    color: '#D97706',
  },
  inputSection: {
    width: '100%',
  },
  fieldLabel: {
    fontWeight: '700',
    color: '#374151',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  flagEmoji: {
    includeFontPadding: false,
  },
  countryCode: {
    fontWeight: '600',
    color: '#111827',
  },
  phoneInputWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  phoneInput: {
    color: '#111827',
    fontWeight: '600',
    paddingVertical: 0,
  },
  primaryButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#FDE68A',
    opacity: 0.8,
  },
  primaryButtonText: {
    fontWeight: '800',
    color: '#111827',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  securityText: {
    color: '#6B7280',
    flexShrink: 1,
    textAlign: 'center',
    lineHeight: 18,
  },
  trustSectionCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  trustTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  trustSubtitle: {
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 1,
  },
  trustInnerDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  footerDivider: {
    width: 140,
    height: 1,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  footerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  termsLink: {
    color: '#D97706',
    fontWeight: '600',
    textAlign: 'center',
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: 0.65,
  },
  demoLabel: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  demoLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  demoLinkText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  demoDivider: {
    color: '#D1D5DB',
    fontSize: 10,
  },
  pressed: {
    opacity: 0.85,
  },
});
