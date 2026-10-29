import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Delete, Shield } from 'lucide-react-native';

import GoldButton from '../../components/auth/GoldButton';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import { getApiErrorMessage } from '../../services/api';
import { setPin as setPinApi } from '../../services/profileService';
import { colors, typography } from '../../theme';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

type PinStep = 'current' | 'new' | 'confirm';

function PinDots({ value, px, active }: { value: string; px: (n: number) => number; active?: boolean }) {
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

export default function CreatePinScreen() {
  const px = useProfilePx();
  const [step, setStep] = useState<PinStep>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const stepConfig: Record<
    PinStep,
    { label: string; value: string; setValue: React.Dispatch<React.SetStateAction<string>> }
  > = {
    current: { label: 'Current PIN', value: currentPin, setValue: setCurrentPin },
    new: { label: 'New PIN', value: newPin, setValue: setNewPin },
    confirm: { label: 'Confirm New PIN', value: confirmPin, setValue: setConfirmPin },
  };

  const active = stepConfig[step];

  const handleKey = (key: (typeof KEYS)[number]) => {
    if (key === '') return;

    if (key === 'del') {
      active.setValue(prev => prev.slice(0, -1));
      return;
    }

    if (active.value.length >= PIN_LENGTH) return;

    const next = active.value + key;
    active.setValue(next);

    if (next.length !== PIN_LENGTH) return;

    if (step === 'current') {
      setTimeout(() => setStep('new'), 200);
      return;
    }

    if (step === 'new') {
      setTimeout(() => setStep('confirm'), 200);
    }
  };

  const handleUpdate = async () => {
    if (currentPin.length < PIN_LENGTH) {
      Alert.alert('Required', 'Enter your current PIN.');
      setStep('current');
      return;
    }
    if (newPin.length < PIN_LENGTH) {
      Alert.alert('Required', 'Enter a new 4-digit PIN.');
      setStep('new');
      return;
    }
    if (confirmPin.length < PIN_LENGTH) {
      Alert.alert('Required', 'Confirm your new PIN.');
      setStep('confirm');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'New PINs do not match. Try again.');
      setConfirmPin('');
      setStep('confirm');
      return;
    }
    if (newPin === currentPin) {
      Alert.alert('Same PIN', 'New PIN must be different from current PIN.');
      setNewPin('');
      setConfirmPin('');
      setStep('new');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await setPinApi(currentPin, newPin);
      Alert.alert('PIN Updated', 'Your PIN has been changed successfully.');
    } catch (error) {
      Alert.alert('Could not update PIN', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileSubScreenLayout title="Change PIN" subtitle="Verify current PIN, then set a new one">
      <View
        style={{
          alignSelf: 'center',
          width: px(72),
          height: px(72),
          borderRadius: px(36),
          backgroundColor: colors.goldLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: px(20),
        }}>
        <Shield size={px(34)} color={colors.primary} strokeWidth={2} />
      </View>

      {(['current', 'new', 'confirm'] as PinStep[]).map(pinStep => {
        const config = stepConfig[pinStep];
        const isActive = step === pinStep;
        return (
          <View
            key={pinStep}
            style={{
              marginBottom: px(16),
              opacity: isActive || config.value.length > 0 ? 1 : 0.45,
            }}>
            <Text
              style={{
                textAlign: 'center',
                marginBottom: px(10),
                fontSize: px(13),
                fontWeight: isActive ? typography.weights.bold : typography.weights.semibold,
                color: isActive ? colors.dark : colors.grey,
              }}>
              {config.label}
            </Text>
            <PinDots value={config.value} px={px} active={isActive} />
          </View>
        );
      })}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: px(8),
          marginTop: px(4),
          marginBottom: px(20),
          borderRadius: px(10),
          backgroundColor: colors.goldLight,
          padding: px(12),
        }}>
        <Shield size={px(16)} color={colors.primary} strokeWidth={2} />
        <Text style={{ flex: 1, fontSize: px(11), color: colors.dark }}>
          Never share your PIN with anyone
        </Text>
      </View>

      <View style={{ gap: px(10), marginBottom: px(20) }}>
        {[0, 1, 2].map(row => (
          <View key={row} style={{ flexDirection: 'row', gap: px(10) }}>
            {KEYS.slice(row * 3, row * 3 + 3).map(key => (
              <Pressable
                key={`${row}-${key}`}
                onPress={() => handleKey(key)}
                style={{
                  flex: 1,
                  height: px(52),
                  borderRadius: px(12),
                  borderWidth: key === '' ? 0 : 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {key === 'del' ? (
                  <Delete size={px(20)} color={colors.dark} strokeWidth={2} />
                ) : key ? (
                  <Text style={{ fontSize: px(22), fontWeight: typography.weights.bold, color: colors.dark }}>
                    {key}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <GoldButton
        label={saving ? 'Updating…' : 'Update PIN'}
        disabled={saving}
        onPress={handleUpdate}
        style={{ width: '100%' }}
        height={px(52)}
        borderRadius={px(14)}
      />
    </ProfileSubScreenLayout>
  );
}
