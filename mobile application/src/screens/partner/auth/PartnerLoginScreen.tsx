import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
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
        role: partnerRole,
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
          role: partnerRole,
        });
        const backendRole = verifyResult.user.role;
        const isApprovedPartner =
          (backendRole === 'driver' || backendRole === 'vendor') &&
          verifyResult.user.isProfileCompleted &&
          !verifyResult.onboardingRequired;

        // Route straight to registration wizard instead of bypassing to dashboard
        if (hasExplicitRole && partnerRole) {
          goToRegistration(partnerRole);
        } else {
          navigation.navigate('PartnerRoleSelection');
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
      if (UI_PREVIEW_MUTATIONS_ENABLED) {
        navigation.navigate('PartnerOtpVerification', {
          mobileNumber: phoneToUse || '9876543210',
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
            {/* Title & Subtitle */}
            <View style={[styles.titleSection, { marginTop: px(18) }]}>
              <PartnerText style={[styles.titleText, { fontSize: px(28), lineHeight: px(34) }]}>
                {hasExplicitRole ? 'Sign in to RACE' : 'Partner Sign In'}
              </PartnerText>
              <PartnerText style={[styles.subtitleText, { fontSize: px(14.5), marginTop: px(8) }]}>
                {hasExplicitRole
                  ? "We'll verify your partner account with a secure OTP."
                  : 'Enter your phone number to sign in or register as a partner.'}
              </PartnerText>
            </View>

            {/* Role Card / Universal Partner Badge */}
            {hasExplicitRole && partnerRole ? (
              <View
                style={[
                  styles.roleBadgeCard,
                  {
                    marginTop: px(22),
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

                <PartnerText style={[styles.roleBadgeTitle, { fontSize: px(14.5) }]} numberOfLines={1}>
                  {roleDisplayTitle}
                </PartnerText>

                <View style={[styles.roleDivider, { height: px(18), marginHorizontal: px(8) }]} />

                <Pressable
                  onPress={handleChangeRole}
                  hitSlop={8}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <PartnerText style={[styles.changeRoleText, { fontSize: px(13.5) }]}>
                    {roleChangeLabel}
                  </PartnerText>
                </Pressable>
              </View>
            ) : (
              <View
                style={[
                  styles.roleBadgeCard,
                  {
                    marginTop: px(20),
                    paddingHorizontal: px(14),
                    paddingVertical: px(10),
                    borderRadius: px(14),
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                  },
                ]}>
                <View
                  style={[
                    styles.roleIconBox,
                    {
                      width: px(34),
                      height: px(34),
                      borderRadius: px(10),
                      backgroundColor: '#FEF3C7',
                    },
                  ]}>
                  <Sparkles size={px(17)} color="#D97706" strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1, marginLeft: px(10) }}>
                  <PartnerText style={{ fontSize: px(13.5), fontWeight: '700', color: '#1E293B' }}>
                    Roadside Partner Portal
                  </PartnerText>
                  <PartnerText style={{ fontSize: px(11.5), color: '#64748B', marginTop: px(1) }}>
                    Driver & Towing Vendor registration / sign in
                  </PartnerText>
                </View>
              </View>
            )}

            {/* Mobile Number Label & Inputs */}
            <View style={[styles.inputSection, { marginTop: px(26) }]}>
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

            {/* Quick Test Mode Buttons */}
            {UI_PREVIEW_MODE ? (
              <View style={{ marginTop: px(12), gap: px(8) }}>
                {UI_PREVIEW_MUTATIONS_ENABLED ? <Pressable
                  style={styles.devBtn}
                  onPress={() => void handleQuickMockLogin(isDriver ? 'driver' : 'vendor')}>
                  <Zap size={14} color="#D97706" />
                  <PartnerText style={styles.devBtnText}>
                    ⚡ 1-Tap {isDriver ? 'Driver' : 'Vendor'} Dashboard (Mock)
                  </PartnerText>
                </Pressable> : null}
                <Pressable
                  style={styles.devBtn}
                  onPress={() => goToRegistration(isDriver ? 'driver' : 'vendor')}>
                  <Sparkles size={14} color="#D97706" />
                  <PartnerText style={styles.devBtnText}>
                    ⚡ 1-Tap {isDriver ? 'Driver' : 'Vendor'} Registration Flow
                  </PartnerText>
                </Pressable>
              </View>
            ) : null}

            {/* Security Assurance with Word Wrapping */}
            <View style={[styles.securityNotice, { marginTop: px(16) }]}>
              <ShieldCheck size={px(18)} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }} />
              <PartnerText style={[styles.securityText, { fontSize: px(12.5) }]}>
                Your number is used to verify your partner account.
              </PartnerText>
            </View>

            {/* Partner Benefits Trust Card (Fills bottom void professionally) */}
            <View style={[styles.trustSectionCard, { marginTop: px(26), padding: px(16), borderRadius: px(16) }]}>
              <View style={styles.trustRow}>
                <View style={[styles.trustIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Zap size={px(16)} color="#D97706" strokeWidth={2.4} />
                </View>
                <View style={styles.trustTextCol}>
                  <PartnerText style={[styles.trustTitle, { fontSize: px(13.5) }]}>{isDriver ? 'Driver-Hire requests' : 'Towing & Driver-Hire leads'}</PartnerText>
                  <PartnerText style={[styles.trustSubtitle, { fontSize: px(12) }]}>{isDriver ? 'Receive requests from customers who need a driver' : 'Review service requests for your fleet'}</PartnerText>
                </View>
              </View>

              <View style={[styles.trustInnerDivider, { marginVertical: px(12) }]} />

              <View style={styles.trustRow}>
                <View style={[styles.trustIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Wallet size={px(16)} color="#059669" strokeWidth={2.4} />
                </View>
                <View style={styles.trustTextCol}>
                  <PartnerText style={[styles.trustTitle, { fontSize: px(13.5) }]}>{isDriver ? 'Vendor job details' : 'Connected Drivers'}</PartnerText>
                  <PartnerText style={[styles.trustSubtitle, { fontSize: px(12) }]}>{isDriver ? 'See assigned vehicles and job updates in your account' : 'Connect verified Drivers and assign fleet vehicles per job'}</PartnerText>
                </View>
              </View>
            </View>

            {/* Subtle Horizontal Divider */}
            <View style={[styles.footerDivider, { marginTop: px(26) }]} />

            {/* Terms and Privacy Footer */}
            <View style={[styles.footerBlock, { marginTop: px(10) }]}>
              <PartnerText style={[styles.footerText, { fontSize: px(12) }]}>
                By continuing, you agree to our
              </PartnerText>
              <PartnerText style={[styles.termsLink, { fontSize: px(12), marginTop: px(2) }]}>
                Terms & Privacy Policy
              </PartnerText>
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
