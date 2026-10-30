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
import { BookingScreenShell, type HeaderTagVariant } from './BookingFlowHeader';
import { BOOKING_REF_W, createBookingTheme } from './bookingTheme';
import {
  getTowingServiceModeHeaderTag,
  getTowingServiceModeHeaderTagVariant,
} from './TowingServiceModeBanner';
import { TOWING_BOOKING_STEP_LABELS } from '../../constants/towingBooking';
import { useTowingBooking } from '../../context/TowingBookingContext';
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
  continueLoading?: boolean;
  showStep?: boolean;
  headerVariant?: 'centered' | 'inline';
  accentColor?: string;
  /** Compact label beside title (Instant, Scheduled, …). Wizard steps 1–3 auto-fill from booking context when omitted. */
  headerTag?: string;
  headerTagVariant?: HeaderTagVariant;
}

const DEFAULT_STEPPER_LABELS = TOWING_BOOKING_STEP_LABELS;

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
  continueLoading = false,
  showStep = true,
  headerVariant = 'centered',
  accentColor = colors.primary,
  headerTag,
  headerTagVariant,
}: TowingBookingLayoutProps) {
  const { width } = useWindowDimensions();
  const s = width / BOOKING_REF_W;
  const t = createBookingTheme(s);
  const { booking } = useTowingBooking();
  const isWizardStep = showStep && step >= 1 && step <= 3;
  const resolvedHeaderTag =
    headerTag ?? (isWizardStep ? getTowingServiceModeHeaderTag(booking.serviceMode) : undefined);
  const resolvedHeaderTagVariant =
    headerTagVariant ??
    (isWizardStep ? getTowingServiceModeHeaderTagVariant(booking.serviceMode) : undefined);

  const footer = hideFooter ? null : (
    <View
      style={{
        gap: t.px(10),
        paddingTop: t.footerTop,
        paddingBottom: t.footerBottom,
      }}>
      {footerNote}
      {onContinue ? (
        <GoldButton
          label={buttonLabel}
          onPress={onContinue}
          height={t.buttonHeight}
          borderRadius={t.cardRadius}
          labelSize={t.buttonLabel}
          disabled={continueDisabled}
          loading={continueLoading}
        />
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
      contentContainerStyle={{ flexGrow: 1, paddingBottom: t.px(20) }}
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
            showStep={showStep}
            headerTag={resolvedHeaderTag}
            headerTagVariant={resolvedHeaderTagVariant}>
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
