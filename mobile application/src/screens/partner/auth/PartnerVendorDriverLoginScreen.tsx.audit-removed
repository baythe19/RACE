import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../assets';
import AuthToast, { AuthLoadingOverlay } from '../../../components/auth/AuthToast';
import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { completeOnboarding } from '../../../redux/auth/authSlice';
import {
  getApiErrorMessage,
  useDriverCredentialLoginMutation,
} from '../../../services/auth/useAuthMutations';
import type {
  PartnerAuthStackParamList,
  PartnerRootStackParamList,
} from '../../../types/partnerNavigation';
import { loginAsMockDriver } from '../../../config/uiPreviewMode';
import { UI_PREVIEW_MUTATIONS_ENABLED } from '../../../constants/preview';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerVendorDriverLogin'>;

const REF_W = 390;

export default function PartnerVendorDriverLoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.auth.loading);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginIdFocused, setLoginIdFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const loginMutation = useDriverCredentialLoginMutation();

  const canSubmit = loginId.trim().length >= 3 && password.length >= 6 && !loading;

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

  const handleLogin = async () => {
    setError('');
    if (loginId.trim().length < 3) {
      setError('Enter the Login ID provided by your vendor');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({
        loginId: loginId.trim(),
        password,
      });
      dispatch(completeOnboarding(result.user));
      goToPartnerMain();
    } catch (err) {
      if (UI_PREVIEW_MUTATIONS_ENABLED) {
        await loginAsMockDriver(dispatch);
        goToPartnerMain();
        return;
      }
      setError(getApiErrorMessage(err, 'Invalid login ID or password'));
    }
  };

  const isSubmitting = loginMutation.isPending || loading;

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
            onPress={() => navigation.goBack()}
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
                paddingBottom: insets.bottom + px(16),
              },
            ]}>
            {/* Title & Subtitle — Left Aligned, Clean & Professional */}
            <View style={[styles.titleSection, { marginTop: px(16) }]}>
              <PartnerText style={[styles.titleText, { fontSize: px(28), lineHeight: px(34) }]}>
                Vendor Driver Login
              </PartnerText>
              <PartnerText style={[styles.subtitleText, { fontSize: px(14.5), marginTop: px(8) }]}>
                Sign in with the ID and password given by your vendor.
              </PartnerText>
            </View>

            {/* Pre-Selected Role Card / Badge */}
            <View
              style={[
                styles.roleBadgeCard,
                {
                  marginTop: px(22),
                  paddingHorizontal: px(14),
                  paddingVertical: px(12),
                  borderRadius: px(16),
                },
              ]}>
              <View
                style={[
                  styles.roleIconBox,
                  {
                    width: px(38),
                    height: px(38),
                    borderRadius: px(19),
                    backgroundColor: '#F3F4F6',
                    overflow: 'hidden',
                  },
                ]}>
                <Image
                  source={images.vendorDriverAvatar}
                  style={{ width: px(38), height: px(38) }}
                  resizeMode="cover"
                  accessibilityLabel="Vendor Driver"
                />
              </View>

              <PartnerText style={[styles.roleBadgeTitle, { fontSize: px(15) }]}>
                Vendor Driver account
              </PartnerText>

              <View style={[styles.roleDivider, { height: px(18) }]} />

              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={8}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <PartnerText style={[styles.changeRoleText, { fontSize: px(14) }]}>
                  Change type
                </PartnerText>
              </Pressable>
            </View>

            {/* Credentials Input Fields */}
            <View style={[styles.inputSection, { marginTop: px(24) }]}>
              {/* Login ID */}
              <PartnerText style={[styles.fieldLabel, { fontSize: px(14) }]}>Login ID</PartnerText>
              <View
                style={[
                  styles.inputWrap,
                  {
                    height: px(52),
                    borderRadius: px(12),
                    marginTop: px(8),
                    borderColor: loginIdFocused ? '#F59E0B' : '#E5E7EB',
                    borderWidth: loginIdFocused ? 1.8 : 1.2,
                  },
                ]}>
                <KeyRound size={px(18)} color="#9CA3AF" style={{ marginRight: px(10) }} />
                <PartnerTextInput
                  value={loginId}
                  onChangeText={(text) => {
                    setLoginId(text);
                    if (error) setError('');
                  }}
                  onFocus={() => setLoginIdFocused(true)}
                  onBlur={() => setLoginIdFocused(false)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="e.g. DRV-1002"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.textInput, { fontSize: px(15.5) }]}
                />
              </View>

              {/* Password */}
              <PartnerText style={[styles.fieldLabel, { fontSize: px(14), marginTop: px(16) }]}>Password</PartnerText>
              <View
                style={[
                  styles.inputWrap,
                  {
                    height: px(52),
                    borderRadius: px(12),
                    marginTop: px(8),
                    borderColor: passwordFocused ? '#F59E0B' : '#E5E7EB',
                    borderWidth: passwordFocused ? 1.8 : 1.2,
                  },
                ]}>
                <Lock size={px(18)} color="#9CA3AF" style={{ marginRight: px(10) }} />
                <PartnerTextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  placeholder="Enter vendor password"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.textInput, { fontSize: px(15.5) }]}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                  style={styles.eyeButton}>
                  {showPassword ? (
                    <EyeOff size={px(18)} color="#6B7280" />
                  ) : (
                    <Eye size={px(18)} color="#6B7280" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Error Message Toast */}
            <AuthToast message={error} type="error" position="inline" onDismiss={() => setError('')} />

            {/* Primary CTA: Sign In */}
            <Pressable
              disabled={!canSubmit || isSubmitting}
              onPress={() => void handleLogin()}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  minHeight: px(52),
                  borderRadius: px(14),
                  marginTop: px(22),
                },
                (!canSubmit || isSubmitting) && styles.primaryButtonDisabled,
                pressed && canSubmit && !isSubmitting && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign In">
              <PartnerText style={[styles.primaryButtonText, { fontSize: px(16.5) }]}>
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </PartnerText>
              <ArrowRight
                size={px(20)}
                color="#111827"
                strokeWidth={2.6}
                style={{ marginLeft: px(8) }}
              />
            </Pressable>

            {/* Security Assurance */}
            <View style={[styles.securityNotice, { marginTop: px(16) }]}>
              <ShieldCheck size={px(18)} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }} />
              <PartnerText style={[styles.securityText, { fontSize: px(12.5) }]}>
                Credentials are managed by your registered RACE vendor.
              </PartnerText>
            </View>

            {/* Subtle Horizontal Divider */}
            <View style={[styles.footerDivider, { marginTop: px(36) }]} />

            {/* Terms and Privacy Footer */}
            <View style={[styles.footerBlock, { marginTop: px(12) }]}>
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
                <PartnerText style={[styles.demoLabel, { fontSize: px(10) }]}>Demo Login:</PartnerText>
                <Pressable
                  onPress={() => void loginAsMockDriver(dispatch)}
                  style={styles.demoLink}>
                  <PartnerText style={styles.demoLinkText}>Mock Driver Dashboard</PartnerText>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <AuthLoadingOverlay visible={isSubmitting} label="Signing in..." />
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
    overflow: 'hidden',
  },
  roleBadgeTitle: {
    flex: 1,
    marginLeft: 10,
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    color: '#111827',
    fontWeight: '600',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 6,
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
  pressed: {
    opacity: 0.85,
  },
});
