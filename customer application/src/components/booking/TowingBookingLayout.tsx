import React, { type ReactNode } from 'react';
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

import GoldButton from '../auth/GoldButton';
import { BookingScreenShell } from './BookingFlowHeader';
import { BOOKING_REF_W, createBookingTheme } from './bookingTheme';
import { colors, typography } from '../../theme';

interface TowingBookingLayoutProps {
  title: string;
  /** 1-based wizard step (1–3). Pass 0 for non-wizard screens (confirmation, tracking, rate). */
  step: number;
  /** Labels for the horizontal stepper. Defaults to the 3-step towing wizard labels. */
  stepLabels?: readonly string[];
  onBack?: () => void;
  children: ReactNode;
  buttonLabel?: string;
  onContinue?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryVariant?: 'outline' | 'dark-outline';
  footerNote?: ReactNode;
  footerNoteBelow?: ReactNode;
  scrollable?: boolean;
  hideFooter?: boolean;
  continueDisabled?: boolean;
  showStep?: boolean;
  headerVariant?: 'centered' | 'inline';
  accentColor?: string;
}

const DEFAULT_STEPPER_LABELS = ['Vehicle & Tow', 'Pickup & Drop', 'Review'] as const;

export default function TowingBookingLayout({
  title,
  step,
  stepLabels,
  onBack,
  children,
  buttonLabel = 'Continue',
  onContinue,
  secondaryLabel,
  onSecondary,
  secondaryVariant = 'outline',
  footerNote,
  footerNoteBelow,
  scrollable = false,
  hideFooter = false,
  continueDisabled = false,
  showStep = true,
  headerVariant = 'centered',
  accentColor = colors.primary,
}: TowingBookingLayoutProps) {
  const { width } = useWindowDimensions();
  const s = width / BOOKING_REF_W;
  const t = createBookingTheme(s);

  const footer = hideFooter ? null : (
    <View
      style={{
        gap: t.px(10),
        paddingTop: t.footerTop,
        paddingBottom: t.footerBottom,
      }}>
      {footerNote}
      {onContinue ? (
        accentColor === colors.primary ? (
          <GoldButton
            label={buttonLabel}
            onPress={onContinue}
            height={t.buttonHeight}
            borderRadius={t.cardRadius}
            labelSize={t.buttonLabel}
            disabled={continueDisabled}
          />
        ) : (
          <Pressable
            onPress={onContinue}
            disabled={continueDisabled}
            style={({ pressed }) => ({
              minHeight: t.buttonHeight,
              borderRadius: t.cardRadius,
              backgroundColor: continueDisabled ? colors.border : accentColor,
              opacity: continueDisabled ? 0.55 : pressed ? 0.9 : 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: t.px(20),
            })}>
            <Text
              style={{
                fontSize: t.buttonLabel,
                fontWeight: typography.weights.bold,
                color: continueDisabled ? colors.grey : colors.dark,
              }}>
              {buttonLabel}
            </Text>
          </Pressable>
        )
      ) : null}
      {secondaryLabel && onSecondary ? (
        <GoldButton
          label={secondaryLabel}
          onPress={onSecondary}
          variant={secondaryVariant}
          height={t.buttonHeight}
          borderRadius={t.cardRadius}
          labelSize={t.buttonLabel}
        />
      ) : null}
      {footerNoteBelow}
    </View>
  );

  const body = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: t.px(8) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.flex,
            { paddingHorizontal: t.px(24), paddingBottom: t.px(4) },
          ]}>
          <BookingScreenShell
            title={title}
            step={step}
            stepLabels={stepLabels ?? DEFAULT_STEPPER_LABELS}
            onBack={onBack}
            theme={t}
            footer={footer}
            headerVariant={headerVariant}
            accentColor={accentColor}
            showStep={showStep}>
            {body}
          </BookingScreenShell>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function useBookingTheme() {
  const { width, height } = useWindowDimensions();
  const s = width / BOOKING_REF_W;
  const t = createBookingTheme(s);
  return { t, width, height, s, px: t.px };
}

/** @deprecated use useBookingTheme */
export function useTowingPx() {
  const { t, width, height, s } = useBookingTheme();
  return { s, width, height, px: t.px };
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
});
