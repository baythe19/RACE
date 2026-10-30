import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { isUiTestPermissiveMode, UI_PREVIEW_MUTATIONS_ENABLED } from '../../../constants/preview';
import { Sparkles } from 'lucide-react-native';

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

  const hasExplicitRole = Boolean(route.params?.role);

  // Read role from navigation params or store
  const [partnerRole, setPartnerRole] = useState<PartnerRole | null>(
    route.params?.role ??
    (signupAccountType === 'vendor' || signupAccountType === 'driver'
      ? signupAccountType
      : null) ??
    selectedRole ??
    null,
  );

  useEffect(() => {
    if (route.params?.role) {
      setPartnerRole(route.params.role);
      setSelectedRole(route.params.role);
    }
  }, [route.params?.role, setSelectedRole]);

  const handleChangeRole = () => {
    navigation.navigate('PartnerRoleSelection');
  };

  const isDriver = partnerRole === 'driver';
  const roleDisplayTitle = isDriver ? 'Driver account' : 'Towing Vendor account';
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

  const handleQuickMockLogin = async (role: 'driver' | 'vendor') => {
    if (role === 'driver') {
      await loginAsMockDriver(dispatch);
    } else {
      await loginAsMockVendor(dispatch);
    }
    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    rootNavigation?.navigate('PartnerMain' as never);
  };

  const handleSendOtp = async () => {
    setError('');

    let phoneToUse = mobileNumber;
    if (isUiTestPermissiveMode() && !phoneToUse) {
      phoneToUse = '9876543210';
      setMobileNumber('9876543210');
    }

    if (!partnerRole) {
      setPartnerRole('driver');
      setSelectedRole('driver');
    }

    if (!isValid && !isUiTestPermissiveMode()) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    try {
      const result = await sendOtpMutation.mutateAsync({
        mobileNumber: phoneToUse || '9876543210',
        role: partnerRole ?? 'driver',
      });

      // --- OTP auth bypass (when SKIP_OTP_AUTH is active) ---
      if (SKIP_OTP_AUTH) {
        const otp = result.devOtp ?? extractOtpFromMessage(result.message) ?? (UI_PREVIEW_MUTATIONS_ENABLED ? '123456' : null);
        if (!otp) {
          setError('Dev OTP unavailable. Turn off SKIP_OTP_AUTH or use a non-production API.');
          return;
        }
        const verifyResult = await verifyOtpMutation.mutateAsync({
          mobileNumber,
          otp,
          role: partnerRole ?? 'driver',
        });
        const backendRole = verifyResult.user.role;
        const isApprovedPartner =
          (backendRole === 'driver' || backendRole === 'vendor') &&
          verifyResult.user.isProfileCompleted &&
          !verifyResult.onboardingRequired;

        // Completed partner → dashboard. Registration wizard only for
        // genuinely incomplete accounts that picked an explicit role.
        if (isApprovedPartner) {
          goToPartnerMain();
          return;
        }
        if (hasExplicitRole && partnerRole) {
          goToRegistration(partnerRole);
        } else {
          navigation.navigate('PartnerRoleSelection', { mobileNumber });
        }
        return;
      }
      // --- end OTP bypass ---

      navigation.navigate('PartnerOtpVerification', {
        mobileNumber: phoneToUse || '9876543210',
        role: hasExplicitRole && partnerRole ? partnerRole : undefined,
        isExistingUser: result.isExistingUser ?? false,
        devOtp: result.devOtp,
        otpMessage: result.message,
      });
    } catch (err) {
      const errMsg = getApiErrorMessage(err, '');
      if (errMsg.toLowerCase().includes('registered as a vendor')) {
        setPartnerRole('vendor');
        setSelectedRole('vendor');
        try {
          const vendorResult = await sendOtpMutation.mutateAsync({
            mobileNumber: phoneToUse || '9876543210',
            role: 'vendor',
          });
          navigation.navigate('PartnerOtpVerification', {
            mobileNumber: phoneToUse || '9876543210',
            role: 'vendor',
            isExistingUser: vendorResult.isExistingUser ?? false,
            devOtp: vendorResult.devOtp,
            otpMessage: vendorResult.message,
          });
          return;
        } catch {
          setError('Detected Vendor account! Tap Send OTP again to continue.');
          return;
        }
      }
      if (errMsg.toLowerCase().includes('registered as a driver')) {
        setPartnerRole('driver');
        setSelectedRole('driver');
        try {
          const driverResult = await sendOtpMutation.mutateAsync({
            mobileNumber: phoneToUse || '9876543210',
            role: 'driver',
          });
          navigation.navigate('PartnerOtpVerification', {
            mobileNumber: phoneToUse || '9876543210',
            role: 'driver',
            isExistingUser: driverResult.isExistingUser ?? false,
            devOtp: driverResult.devOtp,
            otpMessage: driverResult.message,
          });
          return;
        } catch {
          setError('Detected Driver account! Tap Send OTP again to continue.');
          return;
        }
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
      if (UI_PREVIEW_MUTATIONS_ENABLED) {
        // UI-preview fallback only (preview builds point at a dead API URL).
        // Real backend errors must surface as errors — never fake an OTP.
        navigation.navigate('PartnerOtpVerification', {
          mobileNumber: phoneToUse || '9876543210',
          role: partnerRole ?? undefined,
          isExistingUser: false,
          devOtp: '123456',
          otpMessage: 'Dev mode: use OTP 123456',
        });
        return;
      }
      setError(errMsg || 'Unable to send OTP. Check your connection and try again.');
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
          {navigation.canGoBack() ? (
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <ArrowLeft size={px(24)} color="#111827" strokeWidth={2.4} />
            </Pressable>
          ) : (
            <View style={{ width: px(32) }} />
          )}

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
            {/* Welcome Headlines — Perfectly aligned with Role Selection screen layout */}
            <View style={[styles.headingBlock, { marginTop: px(16), paddingHorizontal: px(10) }]}>
              <PartnerText style={[styles.welcomeTitle, { fontSize: px(28), lineHeight: px(34) }]}>
                Welcome to
              </PartnerText>
              <PartnerText style={[styles.brandPartner, { fontSize: px(28), lineHeight: px(34) }]}>
                RACE Partner
              </PartnerText>
              <PartnerText style={[styles.subtitle, { fontSize: px(14.5), marginTop: px(6) }]}>
                Sign in or register to join India's roadside partner network.
              </PartnerText>
            </View>

            {/* Mobile Number Label & Inputs */}
            <View style={[styles.inputSection, { marginTop: px(28) }]}>
              <PartnerText style={[styles.fieldLabel, { fontSize: px(14) }]}>Mobile number</PartnerText>

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
                  <PartnerText style={[styles.countryCode, { fontSize: px(15) }]}>+91</PartnerText>
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
                  <PartnerTextInput
                    testID="partnerLoginMobile"
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
              disabled={(!isValid && !isUiTestPermissiveMode()) || isSubmitting}
              onPress={() => void handleSendOtp()}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  minHeight: px(54),
                  borderRadius: px(14),
                  marginTop: px(22),
                },
                (!isValid && !isUiTestPermissiveMode() || isSubmitting) && styles.primaryButtonDisabled,
                pressed && !isSubmitting && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send OTP">
              <PartnerText style={[styles.primaryButtonText, { fontSize: px(16.5) }]}>
                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
              </PartnerText>
              <ArrowRight
                size={px(20)}
                color="#111827"
                strokeWidth={2.6}
                style={{ marginLeft: px(8) }}
              />
            </Pressable>

            {/* Security Assurance with Word Wrapping */}
            <View style={[styles.securityNotice, { marginTop: px(18) }]}>
              <ShieldCheck
                size={px(16)}
                color="#9CA3AF"
                strokeWidth={2}
                style={{ flexShrink: 0, marginTop: px(1) }}
              />
              <PartnerText style={[styles.securityText, { fontSize: px(12.5) }]}>
                Your number is used to verify your partner account.
              </PartnerText>
            </View>

            {/* Subtle Horizontal Divider */}
            <View style={[styles.footerDivider, { marginTop: px(36) }]} />

            {/* Terms and Privacy Footer */}
            <View style={[styles.footerBlock, { marginTop: px(12) }]}>
              <PartnerText style={[styles.footerText, { fontSize: px(12) }]}>
                By continuing, you agree to our
              </PartnerText>
              <Pressable
                onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}
                hitSlop={8}
                accessibilityRole="link"
                accessibilityLabel="Read Terms and Privacy Policy"
                style={({ pressed }) => [styles.termsLinkBtn, pressed && styles.pressed]}>
                <PartnerText style={[styles.termsLink, { fontSize: px(12), marginTop: px(2) }]}>
                  Terms & Privacy Policy ↗
                </PartnerText>
              </Pressable>
            </View>

            {/* Discreet Dev Demo Mode (for offline QA testing) */}
            {UI_PREVIEW_MUTATIONS_ENABLED && (
              <View style={[styles.demoRow, { marginTop: px(14) }]}>
                <PartnerText style={[styles.demoLabel, { fontSize: px(10) }]}>Quick Preview:</PartnerText>
                <Pressable
                  onPress={() => void loginAsMockDriver(dispatch)}
                  style={styles.demoLink}>
                  <PartnerText style={styles.demoLinkText}>Driver</PartnerText>
                </Pressable>
                <PartnerText style={styles.demoDivider}>•</PartnerText>
                <Pressable
                  onPress={() => void loginAsMockVendor(dispatch)}
                  style={styles.demoLink}>
                  <PartnerText style={styles.demoLinkText}>Vendor</PartnerText>
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
  headingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    color: '#111827',
    textAlign: 'center',
    fontWeight: '500',
  },
  brandPartner: {
    color: '#111827',
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
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
    alignItems: 'flex-start',
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
    textDecorationLine: 'underline',
  },
  termsLinkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  devBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
});
