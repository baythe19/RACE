import React from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthFormLayout from '../../components/auth/AuthFormLayout';
import GoldButton from '../../components/auth/GoldButton';
import type { AuthStackParamList } from '../../types/navigation';
import { colors, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);

  return (
    <AuthFormLayout onBack={() => goBackWithinStack(navigation)}>
      <View
        style={{
          alignSelf: 'center',
          width: px(72),
          height: px(72),
          borderRadius: px(36),
          backgroundColor: colors.goldLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: px(16),
          marginBottom: px(16),
        }}>
        <Smartphone size={px(32)} color={colors.primary} strokeWidth={2.2} />
      </View>

      <Text
        style={{
          fontSize: px(24),
          fontWeight: typography.weights.extrabold,
          color: colors.dark,
          textAlign: 'center',
          marginBottom: px(8),
        }}>
        No Password Needed
      </Text>
      <Text
        style={{
          fontSize: px(14),
          color: colors.grey,
          textAlign: 'center',
          lineHeight: px(20),
          marginBottom: px(24),
        }}>
        RACE uses OTP login. Enter your mobile number on the login screen to receive an OTP.
      </Text>

      <GoldButton
        label="Back to Login"
        onPress={() => navigation.navigate('Login')}
        style={{ width: '100%', marginTop: px(8) }}
        height={px(54)}
        labelSize={px(17)}
        borderRadius={px(14)}
      />
    </AuthFormLayout>
  );
}
