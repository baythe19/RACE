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
  Check,
  ChevronDown,
  IndianRupee,
  Lock,
  Send,
  ShieldCheck,
  Smartphone,
  Zap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../assets';
import AuthToast, { AuthLoadingOverlay } from '../../../components/auth/AuthToast';
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
import { colors, layout, radius, shadows, spacing, typography } from '../../../theme';
import { loginAsMockDriver, loginAsMockVendor, UI_PREVIEW_MODE } from '../../../config/uiPreviewMode';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerLogin'>;

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const REF_W = 390;
const LINK_BLUE = '#2563EB';
const PAGE_BG = '#F7F7F5';
const SUCCESS_GREEN = '#22C55E';

/** Re-enabled OTP verification screen for real SMS delivery. Can be forced off via EXPO_PUBLIC_SKIP_OTP_AUTH=true */
const SKIP_OTP_AUTH = process.env.EXPO_PUBLIC_SKIP_OTP_AUTH === 'true';

function extractOtpFromMessage(message?: string): string | null {
  if (!message) return null;
  const match = message.match(/\b(\d{6})\b/);
  return match?.[1] ?? null;
}

const TRUST_ITEMS = [
  { title: 'Verified Partners', subtitle: 'Trusted vendors & drivers', Icon: ShieldCheck },
  { title: '24x7 Assistance', subtitle: 'Always ready on the road', Icon: Zap },
  { title: 'Faster Payouts', subtitle: 'Quick settlements', Icon: IndianRupee },
] as const;

function formatMobileDisplay(value: string) {
  if (value.length <= 5) return value;
  return `${value.slice(0, 5)} ${value.slice(5)}`;
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
  const isValid = useMemo(() => MOBILE_REGEX.test(mobileNumber), [mobileNumber]);

  // Track active role with local state so user can toggle directly on this screen
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

  const handleSelectRole = (newRole: PartnerRole) => {
    setPartnerRole(newRole);
    setSelectedRole(newRole);
    dispatch(setSignupPath({ accountType: newRole, vendorType: null }));
    if (error) setError('');
  };

  const roleLabel = partnerRole === 'vendor' ? 'Vendor' : 'Driver';

  const goToPartnerMain = () => {
    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    rootNavigation?.reset({
      index: 0,
      routes: [{ name: 'PartnerMain' }],
    });
  };

  const goToRegistration = (role: PartnerRole) => {
    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    rootNavigation?.navigate('PartnerRegistration', { role, mobileNumber });
  };

  const handleSendOtp = async () => {
    setError('');

    if (!partnerRole) {
      setError('Select Vendor or Driver before continuing');
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

      // --- OTP auth bypass (temporary) ---
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

        if (isApprovedPartner) {
          dispatch(completeOnboarding(verifyResult.user));
          goToPartnerMain();
          return;
        }
        if (verifyResult.onboardingRequired || !verifyResult.user.isProfileCompleted) {
          goToRegistration(partnerRole);
          return;
        }
        dispatch(completeOnboarding(verifyResult.user));
        goToPartnerMain();
        return;
      }
      // --- end OTP bypass ---

      navigation.navigate('PartnerOtpVerification', {
        mobileNumber,
        isExistingUser: result.isExistingUser ?? false,
        devOtp: result.devOtp,
        otpMessage: result.message,
      });
    } catch (err) {
      const errMsg = getApiErrorMessage(err, '');
      if (errMsg.toLowerCase().includes('registered as a vendor')) {
        handleSelectRole('vendor');
        setError('Detected Vendor account! Switched to Vendor mode — tap Continue.');
        return;
      }
      if (errMsg.toLowerCase().includes('registered as a driver')) {
        handleSelectRole('driver');
        setError('Detected Driver account! Switched to Driver mode — tap Continue.');
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
      if (UI_PREVIEW_MODE && !SKIP_OTP_AUTH) {
        navigation.navigate('PartnerOtpVerification', {
          mobileNumber,
          isExistingUser: false,
          devOtp: '123456',
          otpMessage: 'Dev mode: use OTP 123456',
        });
        return;
      }
      setError(errMsg || (SKIP_OTP_AUTH ? 'Unable to sign in' : 'Unable to send OTP'));
    }
  };

  const handleChangeRole = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('PartnerRoleSelection');
  };

  const inputBorderColor = focused || isValid ? colors.primary : colors.border;

  return (
    <>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />

        <View style={[styles.topBar, { paddingHorizontal: px(layout.screenPadding) }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ArrowLeft size={22} color={colors.dark} strokeWidth={2.5} />
          </Pressable>

          <View style={styles.brandBlock}>
            <Text style={[styles.brandRace, { fontSize: px(18), lineHeight: px(22) }]}>RACE</Text>
            <Text style={[styles.brandPartner, { fontSize: px(11), lineHeight: px(14) }]}>
              PARTNER
            </Text>
          </View>

          <View style={styles.backButton} />
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
                paddingHorizontal: px(layout.screenPadding),
                paddingBottom: insets.bottom + px(spacing.xl),
              },
            ]}>
            <View style={[styles.welcomeBlock, { marginTop: px(spacing.sm) }]}>
              <Text style={[styles.welcomeTitle, { fontSize: px(28), lineHeight: px(34) }]}>
                Welcome back!
              </Text>
              <Text
                style={[
                  styles.welcomeSubtitle,
                  { fontSize: px(14), lineHeight: px(21), marginTop: px(6) },
                ]}>
                {SKIP_OTP_AUTH
                  ? 'Enter your mobile number to sign in to RACE Partner.'
                  : 'Sign in to your RACE Partner account with a secure OTP.'}
              </Text>
              {roleLabel ? (
                <View style={[styles.rolePill, { marginTop: px(10) }]}>
                  <Text style={styles.rolePillText}>Continuing as {roleLabel}</Text>
                </View>
              ) : null}
            </View>

            <View pointerEvents="none">
              <Image
                source={images.homeHeroTruck}
                style={[styles.heroImage, { height: px(110), marginTop: px(spacing.md) }]}
                resizeMode="contain"
                accessibilityLabel="RACE Partner tow truck"
              />
            </View>

            <View
              style={[
                styles.card,
                {
                  marginTop: px(spacing.md),
                  paddingHorizontal: px(spacing.xl),
                  paddingTop: px(spacing.xxl),
                  paddingBottom: px(spacing.xl),
                  borderRadius: px(18),
                },
              ]}>
              <View style={styles.phoneIconWrap}>
                <Smartphone size={px(26)} color={colors.primary} strokeWidth={2.2} />
              </View>

              <Text style={[styles.cardTitle, { fontSize: px(20), marginTop: px(14) }]}>
                Enter mobile number
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  { fontSize: px(13), lineHeight: px(19), marginTop: px(6) },
                ]}>
                {SKIP_OTP_AUTH
                  ? 'We will sign you in with this number.'
                  : "We'll send a 6-digit OTP to verify your partner account."}
              </Text>

              <View style={[styles.roleSelectorRow, { marginTop: px(14), marginBottom: px(4) }]}>
                <Pressable
                  onPress={() => handleSelectRole('driver')}
                  hitSlop={6}
                  style={[
                    styles.roleSelectorBtn,
                    partnerRole === 'driver' && styles.roleSelectorBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.roleSelectorText,
                      partnerRole === 'driver' && styles.roleSelectorTextActive,
                    ]}>
                    🚗 Driver
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSelectRole('vendor')}
                  hitSlop={6}
                  style={[
                    styles.roleSelectorBtn,
                    partnerRole === 'vendor' && styles.roleSelectorBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.roleSelectorText,
                      partnerRole === 'vendor' && styles.roleSelectorTextActive,
                    ]}>
                    🏢 Vendor / Fleet
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { fontSize: px(13), marginTop: px(18) }]}>
                Mobile number
              </Text>

              <View style={[styles.phoneRow, { marginTop: px(8), gap: px(10) }]}>
                <View style={[styles.countryBox, { minHeight: px(52), borderRadius: px(12) }]}>
                  <Text style={[styles.countryCode, { fontSize: px(15) }]}>+91</Text>
                  <ChevronDown size={px(16)} color={colors.grey} strokeWidth={2.5} />
                </View>

                <View
                  style={[
                    styles.phoneInputWrap,
                    {
                      minHeight: px(52),
                      borderRadius: px(12),
                      borderColor: inputBorderColor,
                    },
                  ]}>
                  <TextInput
                    value={formatMobileDisplay(mobileNumber)}
                    onChangeText={(text) => {
                      setMobileNumber(text.replace(/\D/g, '').slice(0, 10));
                      if (error) setError('');
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    keyboardType="number-pad"
                    placeholder="98765 43210"
                    placeholderTextColor={colors.textMuted}
                    maxLength={11}
                    style={[styles.phoneInput, { fontSize: px(16) }]}
                  />
                  {isValid ? (
                    <View style={styles.validCheck}>
                      <Check size={14} color={SUCCESS_GREEN} strokeWidth={3} />
                    </View>
                  ) : null}
                </View>
              </View>

              <AuthToast message={error} type="error" />

              <Pressable
                disabled={!isValid || loading}
                onPress={() => void handleSendOtp()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    marginTop: px(spacing.lg),
                    minHeight: px(54),
                    borderRadius: px(14),
                    zIndex: 999,
                    elevation: 5,
                  },
                  (!isValid || loading) && styles.sendButtonDisabled,
                  pressed && isValid && !loading && styles.pressed,
                ]}>
                <Send size={px(18)} color={colors.dark} strokeWidth={2.4} />
                <Text style={[styles.sendButtonLabel, { fontSize: px(16) }]}>
                  {loading
                    ? SKIP_OTP_AUTH
                      ? 'Signing in...'
                      : 'Sending OTP...'
                    : SKIP_OTP_AUTH
                      ? 'Continue'
                      : 'Send OTP'}
                </Text>
              </Pressable>

              {/* Instant Mock Preview Shortcuts */}
              <View style={{ marginTop: px(spacing.md), padding: px(12), backgroundColor: '#F3F4F6', borderRadius: px(10) }}>
                <Text style={{ fontSize: px(11), fontWeight: '700', color: colors.primaryDark, textAlign: 'center' }}>
                  ⚡ QUICK DEMO MODE (NO BACKEND)
                </Text>
                <View style={{ flexDirection: 'row', gap: px(8), marginTop: px(8) }}>
                  <Pressable
                    onPress={() => void loginAsMockDriver(dispatch)}
                    style={({ pressed }) => [styles.demoSmallButton, pressed && styles.pressed]}>
                    <Text style={styles.demoSmallButtonText}>🚗 Demo Driver</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void loginAsMockVendor(dispatch)}
                    style={({ pressed }) => [styles.demoSmallButton, pressed && styles.pressed]}>
                    <Text style={styles.demoSmallButtonText}>🏢 Demo Vendor</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleChangeRole}
                style={({ pressed }) => [
                  styles.changeRoleRow,
                  { marginTop: px(spacing.lg) },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.changeRoleText, { fontSize: px(13) }]}>
                  Wrong role? <Text style={styles.changeRoleLink}>Change role</Text>
                </Text>
              </Pressable>

              <View style={[styles.safeRow, { marginTop: px(spacing.xl) }]}>
                <Lock size={13} color={colors.grey} strokeWidth={2.2} />
                <Text style={[styles.safeText, { fontSize: px(12) }]}>
                  Your data is safe and secure with RACE
                </Text>
              </View>
            </View>

            <View style={[styles.trustRow, { marginTop: px(spacing.xl), gap: px(8) }]}>
              {TRUST_ITEMS.map(({ title, subtitle, Icon }) => (
                <View key={title} style={styles.trustItem}>
                  <View style={styles.trustIconWrap}>
                    <Icon size={16} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.trustTitle, { fontSize: px(11) }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text
                    style={[styles.trustSubtitle, { fontSize: px(10), lineHeight: px(13) }]}
                    numberOfLines={2}>
                    {subtitle}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.encryptionRow, { marginTop: px(spacing.lg) }]}>
              <ShieldCheck size={14} color={colors.grey} strokeWidth={2.2} />
              <Text style={[styles.encryptionText, { fontSize: px(11) }]}>
                Secured by enterprise-grade encryption
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <AuthLoadingOverlay
        visible={loading}
        label={SKIP_OTP_AUTH ? 'Signing in...' : 'Sending OTP...'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: { alignItems: 'center' },
  brandRace: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  brandPartner: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.6,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  welcomeBlock: { alignItems: 'flex-start' },
  welcomeTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
  },
  welcomeSubtitle: { color: colors.grey },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#F5D98A',
  },
  rolePillText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  heroImage: {
    width: '100%',
    maxWidth: 260,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  phoneIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  cardTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: colors.grey,
    textAlign: 'center',
  },
  fieldLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.lightGrey,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryCode: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  phoneInput: {
    flex: 1,
    color: colors.dark,
    fontWeight: typography.weights.medium,
    paddingVertical: spacing.md,
  },
  validCheck: { marginLeft: spacing.xs },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  changeRoleRow: { alignItems: 'center' },
  changeRoleText: {
    color: colors.grey,
    textAlign: 'center',
  },
  changeRoleLink: {
    color: LINK_BLUE,
    fontWeight: typography.weights.semibold,
  },
  safeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  safeText: { color: colors.grey },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  trustTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  trustSubtitle: {
    color: colors.grey,
    textAlign: 'center',
    marginTop: 2,
  },
  encryptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  encryptionText: { color: colors.grey },
  roleSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleSelectorBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  roleSelectorBtnActive: {
    backgroundColor: colors.background,
    ...shadows.card,
  },
  roleSelectorText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  roleSelectorTextActive: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  pressed: { opacity: 0.9 },
  demoSmallButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoSmallButtonText: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: 12,
  },
});
