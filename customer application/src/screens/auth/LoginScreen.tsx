import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Lock,
  Send,
  Smartphone,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../assets';
import { sendOtp } from '../../services/authService';
import { getApiErrorMessage } from '../../services/api';
import { getRoleMismatchMessage, isRoleMismatchError } from '../../utils/roleMismatch';
import type { AuthStackParamList } from '../../types/navigation';
import {
  formatPhoneE164,
  getPhoneDigits,
  isValidIndianMobile,
} from '../../utils/phone';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;
const SUCCESS_GREEN = '#22C55E';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function formatMobileDisplay(value: string) {
  if (value.length <= 5) return value;
  return `${value.slice(0, 5)} ${value.slice(5)}`;
}

export default function LoginScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = width / REF_W;
  const px = (n: number) => Math.max(1, Math.round(n * s));

  const [phoneDigits, setPhoneDigits] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const isValid = isValidIndianMobile(phoneDigits);

  const handlePhoneChange = (value: string) => {
    setPhoneDigits(getPhoneDigits(value).slice(0, 10));
    if (phoneError) setPhoneError('');
  };

  const handleContinue = async () => {
    if (isSubmitting) return;
    if (!isValid) {
      setPhoneError('Enter a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);
    setPhoneError('');
    try {
      const result = await sendOtp({
        mobileNumber: getPhoneDigits(phoneDigits),
      });
      navigation.navigate('OTP', {
        phone: formatPhoneE164(phoneDigits),
        isExistingUser: result.isExistingUser,
        devOtp: result.devOtp,
        otpMessage: result.message,
      });
    } catch (error) {
      if (isRoleMismatchError(error)) {
        setPhoneError(
          getRoleMismatchMessage(
            error,
            'This number is registered as a partner. Use the RACE Partner app or a different number.',
          ),
        );
      } else {
        setPhoneError(getApiErrorMessage(error, 'Unable to send OTP'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBorderColor = phoneError
    ? colors.error
    : focused || isValid
      ? colors.primary
      : colors.border;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.pageBg} />

      <View style={[styles.topBar, { paddingHorizontal: px(layout.screenPadding) }]}>
        <Pressable
          onPress={() => goBackWithinStack(navigation)}
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft size={22} color={colors.dark} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.brandBlock}>
          <Text style={[styles.brandRace, { fontSize: px(18) }]}>RACE</Text>
          <Text style={[styles.brandService, { fontSize: px(11) }]}>SERVICE</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: px(layout.screenPadding),
            paddingBottom: insets.bottom + px(spacing.xl),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.welcomeTitle, { fontSize: px(28), lineHeight: px(34) }]}>
            Welcome back!
          </Text>
          <Text style={[styles.welcomeSubtitle, { fontSize: px(14), lineHeight: px(21) }]}>
            Sign in with a secure OTP to continue.
          </Text>

          <Image
            source={images.homeHeroTruck}
            style={[styles.heroImage, { height: px(100), marginTop: px(spacing.md) }]}
            resizeMode="contain"
          />

          <View
            style={[
              styles.card,
              {
                marginTop: px(spacing.md),
                padding: px(spacing.xl),
                borderRadius: px(18),
              },
            ]}>
            <View style={styles.phoneIconWrap}>
              <Smartphone size={px(26)} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.cardTitle, { fontSize: px(20), marginTop: px(14) }]}>
              Enter mobile number
            </Text>
            <Text style={[styles.cardSubtitle, { fontSize: px(13), marginTop: px(6) }]}>
              We'll send a 6-digit OTP to verify your number
            </Text>

            <Text style={[styles.fieldLabel, { fontSize: px(13), marginTop: px(22) }]}>
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
                  value={formatMobileDisplay(phoneDigits)}
                  onChangeText={handlePhoneChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="number-pad"
                  maxLength={11}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.phoneInput, { fontSize: px(16) }]}
                />
                {isValid ? <Check size={14} color={SUCCESS_GREEN} strokeWidth={3} /> : null}
              </View>
            </View>

            {phoneError ? (
              <Text style={[styles.errorText, { fontSize: px(12), marginTop: px(8) }]}>
                {phoneError}
              </Text>
            ) : null}

            <Text style={[styles.terms, { fontSize: px(11), marginTop: px(16) }]}>
              By continuing, you agree to our{' '}
              <Text
                style={styles.termsLink}
                onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}>
                Terms of Service
              </Text>{' '}
              &{' '}
              <Text
                style={styles.termsLink}
                onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}>
                Privacy Policy
              </Text>
            </Text>

            <Pressable
              disabled={!isValid || isSubmitting}
              onPress={() => void handleContinue()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  marginTop: px(spacing.lg),
                  minHeight: px(54),
                  borderRadius: px(14),
                },
                (!isValid || isSubmitting) && styles.sendButtonDisabled,
                pressed && isValid && !isSubmitting && styles.pressed,
              ]}>
              <Send size={px(18)} color={colors.dark} strokeWidth={2.4} />
              <Text style={[styles.sendButtonLabel, { fontSize: px(16) }]}>
                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
              </Text>
            </Pressable>

            <View style={[styles.safeRow, { marginTop: px(spacing.xl) }]}>
              <Lock size={13} color={colors.grey} strokeWidth={2.2} />
              <Text style={{ fontSize: px(12), color: colors.grey }}>
                Your data is safe and secure with RACE
              </Text>
            </View>
          </View>

          <View style={[styles.footer, { paddingTop: px(spacing.lg) }]}>
            <Text style={{ color: colors.grey, fontSize: px(14) }}>New to RACE? </Text>
            <Pressable onPress={() => navigation.navigate('CreateAccount')}>
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: typography.weights.bold,
                  fontSize: px(14),
                }}>
                Create account
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBg },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: { alignItems: 'center' },
  brandRace: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  brandService: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.6,
  },
  welcomeTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    marginTop: spacing.sm,
  },
  welcomeSubtitle: { color: colors.grey, marginTop: 6 },
  heroImage: { width: '100%', maxWidth: 240, alignSelf: 'center' },
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
  cardSubtitle: { color: colors.grey, textAlign: 'center', lineHeight: 19 },
  fieldLabel: { color: colors.dark, fontWeight: typography.weights.bold },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
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
  countryCode: { color: colors.dark, fontWeight: typography.weights.bold },
  phoneInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  phoneInput: {
    flex: 1,
    color: colors.dark,
    fontWeight: typography.weights.medium,
    paddingVertical: spacing.md,
  },
  errorText: { color: colors.error },
  terms: { color: colors.grey, lineHeight: 16, textAlign: 'center' },
  termsLink: { color: colors.primary, fontWeight: typography.weights.semibold },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonLabel: { color: colors.dark, fontWeight: typography.weights.bold },
  dividerRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  safeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.9 },
});
