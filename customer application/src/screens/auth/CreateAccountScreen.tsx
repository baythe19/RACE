import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Phone } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FormField from '../../components/auth/FormField';
import GoldButton from '../../components/auth/GoldButton';
import { AuthBackHeader } from '../../components/auth/StepHeader';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useAuthActions } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { getRoleMismatchMessage, isRoleMismatchError } from '../../utils/roleMismatch';
import { useSignupDraftStore } from '../../store/signupDraftStore';
import type { AuthStackParamList } from '../../types/navigation';
import { formatPhoneE164, getPhoneDigits } from '../../utils/phone';
import { colors, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateAccount'>;

export default function CreateAccountScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const { dialog, showDialog } = useAppDialog();

  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { sendOtp, isLoading } = useAuthActions();
  const setDraft = useSignupDraftStore(state => state.setDraft);

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSignUp = async () => {
    const nextErrors: Record<string, string> = {};

    if (getPhoneDigits(phone).length !== 10) {
      nextErrors.phone = 'Enter valid 10-digit number';
    }
    if (!termsAccepted) {
      showDialog({
        tone: 'warning',
        title: 'Terms Required',
        message: 'Please accept terms',
        primaryLabel: 'OK',
      });
      return;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const phoneDigits = getPhoneDigits(phone);

    setDraft({ phone: phoneDigits });

    try {
      const result = await sendOtp({ mobileNumber: phoneDigits });

      navigation.navigate('OTP', {
        phone: formatPhoneE164(phoneDigits),
        isExistingUser: result.isExistingUser,
        devOtp: result.devOtp,
        otpMessage: result.message,
      });
    } catch (error) {
      if (isRoleMismatchError(error)) {
        setErrors({
          phone: getRoleMismatchMessage(
            error,
            'This number is registered as a partner. Use the RACE Partner app.',
          ),
        });
      } else {
        setErrors({ phone: getApiErrorMessage(error, 'Unable to send OTP') });
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {dialog}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: px(24),
            paddingTop: px(4),
            paddingBottom: px(16),
            justifyContent: 'space-between',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.main}>
            <View style={{ marginBottom: px(4) }}>
              <AuthBackHeader onBack={() => goBackWithinStack(navigation)} />
            </View>

            <Text
              style={{
                marginTop: px(8),
                fontSize: px(26),
                fontWeight: typography.weights.extrabold,
                color: colors.dark,
                textAlign: 'center',
              }}>
              Create Account
            </Text>

            <Text
              style={{
                marginTop: px(6),
                marginBottom: px(24),
                fontSize: px(14),
                color: colors.grey,
                textAlign: 'center',
                lineHeight: px(20),
              }}>
              Enter your mobile number to get started
            </Text>

            <FormField
              variant="outlined"
              compact
              scale={s}
              label="Mobile Number"
              required
              Icon={Phone}
              value={phone}
              onChangeText={text => {
                setPhone(getPhoneDigits(text).slice(0, 10));
                clearError('phone');
              }}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="9876543210"
              error={errors.phone}
            />

            <Pressable
              style={[styles.termsRow, { marginBottom: px(20), gap: px(10) }]}
              onPress={() => setTermsAccepted(v => !v)}>
              <View
                style={[
                  styles.checkbox,
                  { width: px(20), height: px(20), borderRadius: px(4) },
                  termsAccepted && styles.checkboxChecked,
                ]}>
                {termsAccepted ? (
                  <Check size={px(13)} color={colors.background} strokeWidth={3} />
                ) : null}
              </View>
              <Text style={{ flex: 1, fontSize: px(13), color: colors.grey, lineHeight: px(20) }}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}>
                  Terms & Conditions
                </Text>
                {' and '}
                <Text
                  style={styles.termsLink}
                  onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}>
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>

            <GoldButton
              label={isLoading ? 'Sending OTP...' : 'Send OTP'}
              onPress={() => void handleSignUp()}
              style={{ width: '100%' }}
              height={px(54)}
              labelSize={px(17)}
              borderRadius={px(14)}
              disabled={isLoading}
            />
          </View>

          <View style={[styles.footer, { paddingTop: px(16) }]}>
            <Text style={{ color: colors.grey, fontSize: px(14) }}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: typography.weights.bold,
                  fontSize: px(14),
                }}>
                Login
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  flex: {
    flex: 1,
  },
  main: {
    width: '100%',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
