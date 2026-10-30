import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FormField from '../../components/auth/FormField';
import GoldButton from '../../components/auth/GoldButton';
import OtpInput from '../../components/auth/OtpInput';
import { AuthBackHeader } from '../../components/auth/StepHeader';
import { useAppDialog } from '../../hooks/useAppDialog';
import { DEMO_OTP } from '../../constants/auth';
import type { AuthStackParamList } from '../../types/navigation';
import { colors, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const { phone } = route.params;
  const { dialog, showDialog } = useAppDialog();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = () => {
    if (digits.join('') !== DEMO_OTP) {
      showDialog({
        tone: 'error',
        title: 'Invalid OTP',
        message: 'Please enter the correct OTP.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (!password.trim() || password.length < 6) {
      showDialog({
        tone: 'warning',
        title: 'Weak Password',
        message: 'Password must be at least 6 characters.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (password !== confirm) {
      showDialog({
        tone: 'warning',
        title: 'Mismatch',
        message: 'Passwords do not match.',
        primaryLabel: 'OK',
      });
      return;
    }
    showDialog({
      tone: 'success',
      title: 'Success',
      message: 'Your password has been reset.',
      primaryLabel: 'Login',
      onPrimary: () => navigation.navigate('Login'),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {dialog}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: px(24), paddingBottom: px(24) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AuthBackHeader onBack={() => goBackWithinStack(navigation)} />

          <Text
            style={{
              fontSize: px(24),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              textAlign: 'center',
              marginBottom: px(8),
            }}>
            Reset Password
          </Text>
          <Text
            style={{
              fontSize: px(14),
              color: colors.grey,
              textAlign: 'center',
              marginBottom: px(20),
            }}>
            Enter OTP sent to {phone}
          </Text>

          <OtpInput
            digits={digits}
            activeIndex={activeIndex}
            onChange={setDigits}
            onActiveIndexChange={setActiveIndex}
            px={px}
          />

          <View style={{ marginTop: px(20), gap: px(12) }}>
            <FormField
              label="New Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              Icon={Lock}
              variant="outlined"
              compact
              scale={s}
              secureTextEntry={!showPassword}
              rightElement={
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  {showPassword ? (
                    <EyeOff size={px(20)} color={colors.grey} />
                  ) : (
                    <Eye size={px(20)} color={colors.grey} />
                  )}
                </Pressable>
              }
            />
            <FormField
              label="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter new password"
              Icon={Lock}
              variant="outlined"
              compact
              scale={s}
              secureTextEntry={!showConfirm}
              rightElement={
                <Pressable onPress={() => setShowConfirm(v => !v)} hitSlop={8}>
                  {showConfirm ? (
                    <EyeOff size={px(20)} color={colors.grey} />
                  ) : (
                    <Eye size={px(20)} color={colors.grey} />
                  )}
                </Pressable>
              }
            />
          </View>

          <GoldButton
            label="Reset Password"
            onPress={handleReset}
            style={{ width: '100%', marginTop: px(20) }}
            height={px(54)}
            labelSize={px(17)}
            borderRadius={px(14)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
});
