import { PartnerText, PartnerTextInput } from './PartnerText';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { RotateCcw, Sparkles } from 'lucide-react-native';

import { colors, radius, spacing, typography } from '../../theme';

const OTP_LENGTH = 6;

interface PartnerOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onComplete?: (value: string) => void;
  suggestedOtp?: string;
  onClear?: () => void;
}

export default function PartnerOtpInput({
  value,
  onChange,
  disabled = false,
  onComplete,
  suggestedOtp,
  onClear,
}: PartnerOtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const completedRef = useRef('');
  const [isFocused, setIsFocused] = useState(false);

  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (value.length === OTP_LENGTH && value !== completedRef.current) {
      completedRef.current = value;
      onComplete?.(value);
      return;
    }
    if (value.length < OTP_LENGTH) {
      completedRef.current = '';
    }
  }, [onComplete, value]);

  const handleChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(next);
  };

  const handleClear = () => {
    onChange('');
    completedRef.current = '';
    onClear?.();
    inputRef.current?.focus();
  };

  const handleFill = (code: string) => {
    const next = code.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(next);
    inputRef.current?.focus();
    if (next.length === OTP_LENGTH) {
      completedRef.current = next;
      onComplete?.(next);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.root}>
      {/* Interactive Box Region */}
      <Pressable
        onPress={focusInput}
        style={styles.boxesContainer}
        accessibilityRole="button"
        accessibilityLabel="One-time password input, tap to enter 6 digit code">
        {/* Visual Digit Boxes */}
        <View style={styles.row} pointerEvents="none">
          {Array.from({ length: OTP_LENGTH }, (_, index) => {
            const digit = value[index] ?? '';
            const isFilled = digit.length > 0;
            const isCurrentActive =
              isFocused &&
              !disabled &&
              (index === activeIndex || (value.length === OTP_LENGTH && index === OTP_LENGTH - 1));

            return (
              <View
                key={index}
                style={[
                  styles.box,
                  isCurrentActive
                    ? styles.boxFocused
                    : isFilled
                      ? styles.boxFilled
                      : styles.boxIdle,
                ]}>
                <PartnerText style={styles.digitText}>{digit}</PartnerText>
                {isCurrentActive && !isFilled ? <View style={styles.activeCaret} /> : null}
              </View>
            );
          })}
        </View>

        {/* Real Native TextInput placed over entire boxes area */}
        <PartnerTextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          editable={!disabled}
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          importantForAutofill="yes"
          caretHidden
          style={styles.overlayInput}
          accessibilityLabel="One-time password input"
        />
      </Pressable>

      {/* Action Controls: Clear all & Quick fill */}
      <View style={styles.actionsRow}>
        {value.length > 0 ? (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Clear all entered digits">
            <RotateCcw size={13} color={colors.grey} strokeWidth={2.4} />
            <PartnerText style={styles.actionText}>Clear all</PartnerText>
          </Pressable>
        ) : (
          <View style={styles.actionPlaceholder} />
        )}

        {suggestedOtp && value !== suggestedOtp ? (
          <Pressable
            onPress={() => handleFill(suggestedOtp)}
            hitSlop={8}
            style={({ pressed }) => [styles.pasteChip, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Fill code ${suggestedOtp}`}>
            <Sparkles size={13} color={colors.primary} strokeWidth={2.4} />
            <PartnerText style={styles.pasteChipText}>Fill {suggestedOtp}</PartnerText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
  },
  boxesContainer: {
    width: '100%',
    maxWidth: 380,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    minWidth: 40,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  boxIdle: {
    borderColor: colors.border,
  },
  boxFilled: {
    borderColor: colors.partnerRed,
    backgroundColor: '#FFFDFD',
  },
  boxFocused: {
    borderColor: colors.partnerRed,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    shadowColor: colors.partnerRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  digitText: {
    textAlign: 'center',
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    padding: 0,
  },
  activeCaret: {
    position: 'absolute',
    bottom: 12,
    width: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.partnerRed,
  },
  actionsRow: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 28,
  },
  actionPlaceholder: {
    width: 20,
    height: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.lightGrey,
  },
  actionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  pasteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(243, 162, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(243, 162, 0, 0.3)',
  },
  pasteChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  actionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
