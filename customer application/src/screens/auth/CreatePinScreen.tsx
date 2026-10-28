import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Delete, Shield } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import GoldButton from '../../components/auth/GoldButton';
import { AuthBackHeader } from '../../components/auth/StepHeader';
import { useAppDispatch } from '../../redux/hooks';
import { completeOnboarding } from '../../redux/auth/authSlice';
import { markCustomerOnboardingComplete } from '../../store/customerOnboarding';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../services/api';
import { setPin as setPinApi } from '../../services/profileService';
import type { AuthStackParamList } from '../../types/navigation';
import { colors, typography } from '../../theme';

const REF_W = 390;
const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

type Props = NativeStackScreenProps<AuthStackParamList, 'CreatePin'>;
type PinStep = 'pin' | 'confirm';

function PinDots({
  value,
  px,
  active,
}: {
  value: string;
  px: (n: number) => number;
  active?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: px(14) }}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => {
        const filled = i < value.length;
        return (
          <View
            key={i}
            style={{
              width: px(16),
              height: px(16),
              borderRadius: px(8),
              borderWidth: filled ? 0 : 1.5,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: filled ? colors.primary : colors.background,
            }}
          />
        );
      })}
    </View>
  );
}

export default function CreatePinScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { width, height } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const compact = height < 700;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<PinStep>('pin');
  const [pinSet, setPinSet] = useState(false);

  const goToPinStep = (clearConfirm = true) => {
    setStep('pin');
    setPinSet(false);
    if (clearConfirm) {
      setConfirmPin('');
    }
  };

  const goToConfirmStep = () => {
    if (pin.length < PIN_LENGTH) {
      return;
    }
    setStep('confirm');
  };

  const handleKey = (key: (typeof KEYS)[number]) => {
    if (key === '') {
      return;
    }

    if (key === 'del') {
      if (step === 'confirm') {
        if (confirmPin.length > 0) {
          setConfirmPin(prev => prev.slice(0, -1));
          return;
        }
        goToPinStep(true);
        setPin(prev => prev.slice(0, -1));
        return;
      }

      setPin(prev => prev.slice(0, -1));
      setPinSet(false);
      return;
    }

    if (step === 'pin') {
      if (pin.length >= PIN_LENGTH) {
        return;
      }
      const next = pin + key;
      setPin(next);
      setPinSet(false);
      if (next.length === PIN_LENGTH) {
        setTimeout(() => setStep('confirm'), 150);
      }
      return;
    }

    if (confirmPin.length >= PIN_LENGTH) {
      return;
    }
    setConfirmPin(prev => prev + key);
    setPinSet(false);
  };

  const handleSetPin = () => {
    if (pin.length < PIN_LENGTH) {
      Alert.alert('Incomplete PIN', 'Please enter a 4-digit PIN.');
      goToPinStep(true);
      return;
    }
    if (confirmPin.length < PIN_LENGTH) {
      Alert.alert('Confirm PIN', 'Please re-enter your PIN to confirm.');
      setStep('confirm');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Mismatch', 'PINs do not match. Please try again.');
      setConfirmPin('');
      setStep('confirm');
      return;
    }
    // Persist the PIN (server-side bcrypt hash) so it is real, not decoration.
    void (async () => {
      try {
        await setPinApi(undefined, pin);
        setPinSet(true);
      } catch (error) {
        Alert.alert('Could not save PIN', getApiErrorMessage(error));
      }
    })();
  };

  const handleGoHome = async () => {
    if (!pinSet) {
      Alert.alert('Set PIN first', 'Please set your PIN before continuing to Home.');
      return;
    }
    await markCustomerOnboardingComplete();
    useAuthStore.getState().setCustomerOnboardingStep('done');
    dispatch(completeOnboarding());
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={[styles.body, { paddingHorizontal: px(24) }]}>
        <AuthBackHeader onBack={() => navigation.goBack()} />

        <View style={[styles.content, compact && styles.contentCompact]}>
          <View
            style={{
              alignSelf: 'center',
              width: px(compact ? 60 : 72),
              height: px(compact ? 60 : 72),
              borderRadius: px(compact ? 30 : 36),
              backgroundColor: colors.goldLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: px(compact ? 12 : 20),
            }}>
            <Shield size={px(compact ? 28 : 34)} color={colors.primary} strokeWidth={2} />
          </View>

          <Text
            style={{
              fontSize: px(compact ? 22 : 24),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              textAlign: 'center',
              marginBottom: px(6),
            }}>
            Create Your PIN
          </Text>
          <Text
            style={{
              fontSize: px(13),
              color: colors.grey,
              textAlign: 'center',
              marginBottom: px(compact ? 16 : 24),
              lineHeight: px(18),
            }}>
            Set a 4-digit PIN for quick & secure login
          </Text>

          <Pressable
            onPress={() => goToPinStep()}
            style={({ pressed }) => [styles.pinSection, pressed && styles.pinSectionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Edit entered PIN">
            <Text
              style={{
                textAlign: 'center',
                marginBottom: px(8),
                fontSize: px(13),
                fontWeight: step === 'pin' ? typography.weights.bold : typography.weights.semibold,
                color: step === 'pin' ? colors.dark : colors.grey,
              }}>
              Enter PIN
            </Text>
            <PinDots value={pin} px={px} active={step === 'pin'} />
            {step === 'confirm' ? (
              <Text style={styles.changeHint}>Tap here to change PIN</Text>
            ) : null}
          </Pressable>

          <Pressable
            onPress={goToConfirmStep}
            disabled={pin.length < PIN_LENGTH}
            style={({ pressed }) => [
              styles.pinSection,
              { marginTop: px(14) },
              pressed && pin.length === PIN_LENGTH && styles.pinSectionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Confirm PIN">
            <Text
              style={{
                textAlign: 'center',
                marginBottom: px(8),
                fontSize: px(13),
                fontWeight: step === 'confirm' ? typography.weights.bold : typography.weights.semibold,
                color: step === 'confirm' ? colors.dark : colors.grey,
              }}>
              Confirm PIN
            </Text>
            <PinDots value={confirmPin} px={px} active={step === 'confirm'} />
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(8),
              marginTop: px(compact ? 12 : 16),
              borderRadius: px(10),
              backgroundColor: colors.goldLight,
              padding: px(10),
            }}>
            <Shield size={px(14)} color={colors.primary} strokeWidth={2} />
            <Text style={{ flex: 1, fontSize: px(11), color: colors.dark }}>
              Never share your PIN with anyone
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={{ gap: px(8), marginBottom: px(12) }}>
            {[0, 1, 2].map(row => (
              <View key={row} style={{ flexDirection: 'row', gap: px(8) }}>
                {KEYS.slice(row * 3, row * 3 + 3).map(key => (
                  <Pressable
                    key={`${row}-${key}`}
                    onPress={() => handleKey(key)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: px(compact ? 46 : 52),
                      borderRadius: px(12),
                      borderWidth: key === '' ? 0 : 1,
                      borderColor: colors.border,
                      backgroundColor: pressed ? colors.goldLight : colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}>
                    {key === 'del' ? (
                      <Delete size={px(20)} color={colors.dark} strokeWidth={2} />
                    ) : key ? (
                      <Text
                        style={{
                          fontSize: px(22),
                          fontWeight: typography.weights.bold,
                          color: colors.dark,
                        }}>
                        {key}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <GoldButton
            label="Set PIN"
            onPress={handleSetPin}
            style={{ width: '100%' }}
            height={px(50)}
            labelSize={px(16)}
            borderRadius={px(14)}
          />

          <Text
            style={{
              fontSize: px(12),
              color: colors.grey,
              textAlign: 'center',
              marginTop: px(14),
              marginBottom: px(6),
            }}>
            {pinSet
              ? 'PIN set! Tap below to start using RACE Service'
              : 'Set your PIN, then tap Go to Home to continue'}
          </Text>
          <Pressable onPress={handleGoHome}>
            <Text
              style={{
                fontSize: px(15),
                fontWeight: typography.weights.bold,
                color: pinSet ? colors.primary : colors.grey,
                textAlign: 'center',
              }}>
              Go to Home →
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  contentCompact: {
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  pinSection: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  pinSectionPressed: {
    backgroundColor: colors.goldLight,
  },
  changeHint: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    paddingBottom: 4,
  },
});
