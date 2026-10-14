import { PartnerTextInput } from '../partner/PartnerText';
import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { colors } from '../../theme';

type Props = {
  digits: string[];
  activeIndex: number;
  onChange: (digits: string[]) => void;
  onActiveIndexChange: (index: number) => void;
  px: (n: number) => number;
  length?: number;
};

export default function OtpInput({
  digits,
  activeIndex,
  onChange,
  onActiveIndexChange,
  px,
  length = 6,
}: Props) {
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleDigitInput = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    onChange(next);
    if (char && index < length - 1) {
      onActiveIndexChange(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') return;
    if (digits[index]) {
      const next = [...digits];
      next[index] = '';
      onChange(next);
      return;
    }
    if (index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      onChange(next);
      onActiveIndexChange(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: px(8) }}>
      {digits.map((digit, index) => {
        const isActive = activeIndex === index;
        return (
          <Pressable key={index} onPress={() => inputRefs.current[index]?.focus()}>
            <View
              style={{
                width: px(44),
                height: px(52),
                borderRadius: px(12),
                borderWidth: isActive ? 2 : 1,
                borderColor: isActive ? colors.primary : colors.border,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <PartnerTextInput
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={value => handleDigitInput(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                onFocus={() => onActiveIndexChange(index)}
                keyboardType="number-pad"
                maxLength={1}
                style={{
                  width: '100%',
                  height: '100%',
                  textAlign: 'center',
                  fontSize: px(20),
                  fontWeight: '700',
                  color: colors.dark,
                }}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
