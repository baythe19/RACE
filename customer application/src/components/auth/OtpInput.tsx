import React, { useEffect, useRef } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

type Props = {
  digits: string[];
  activeIndex: number;
  onChange: (digits: string[]) => void;
  onActiveIndexChange: (index: number) => void;
  px: (n: number) => number;
  length?: number;
  autoFocus?: boolean;
};

function digitsToValue(digits: string[], length: number): string {
  return digits.join('').replace(/\D/g, '').slice(0, length);
}

function valueToDigits(value: string, length: number): string[] {
  const clean = value.replace(/\D/g, '').slice(0, length);
  return Array.from({ length }, (_, i) => clean[i] ?? '');
}

function cursorIndexForValue(value: string, length: number): number {
  if (value.length === 0) return 0;
  return Math.min(value.length, length - 1);
}

/**
 * Single hidden field drives OTP entry so paste, SMS autofill, and backspace
 * work naturally; visible boxes are display-only.
 */
export default function OtpInput({
  digits,
  activeIndex,
  onChange,
  onActiveIndexChange,
  px,
  length = 6,
  autoFocus = true,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const value = digitsToValue(digits, length);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const applyValue = (raw: string) => {
    const nextValue = raw.replace(/\D/g, '').slice(0, length);
    onChange(valueToDigits(nextValue, length));
    onActiveIndexChange(cursorIndexForValue(nextValue, length));
  };

  const focusInput = () => {
    inputRef.current?.focus();
    onActiveIndexChange(cursorIndexForValue(value, length));
  };

  const activeBox = value.length >= length ? length - 1 : value.length;

  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={applyValue}
        onFocus={() => onActiveIndexChange(cursorIndexForValue(value, length))}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        caretHidden
        accessibilityLabel="One-time password"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: px(8) }}>
        {Array.from({ length }, (_, index) => {
          const digit = value[index] ?? '';
          const isActive = index === activeBox;
          return (
            <Pressable key={index} onPress={focusInput} accessibilityRole="button">
              <View
                style={{
                  width: px(44),
                  height: px(52),
                  borderRadius: px(12),
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? '#F3A200' : '#E7E7E9',
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text
                  style={{
                    fontSize: px(20),
                    fontWeight: '700',
                    color: '#17191E',
                  }}>
                  {digit}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
