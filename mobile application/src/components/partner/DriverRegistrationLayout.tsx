import React, { type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PartnerHeaderLogo from './PartnerHeaderLogo';
import { DRIVER_REGISTRATION_STEPS } from '../../constants/partnerRegistration';

interface DriverRegistrationLayoutProps {
  step: 1 | 2 | 3 | 4;
  title?: string;
  subtitle?: string;
  onBack: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  children: ReactNode;
  showFooter?: boolean;
  footerOverride?: ReactNode;
}

const REF_W = 390;

export default function DriverRegistrationLayout({
  step,
  title,
  subtitle,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  continueLoading = false,
  children,
  showFooter = true,
  footerOverride,
}: DriverRegistrationLayoutProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Clamp scaling between 0.88x (small phones) and 1.22x (tablets/foldables) for solid responsiveness
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const resolvedTitle =
    title ?? (step === 4 ? 'Review your application' : 'Driver registration');
  const resolvedSubtitle =
    subtitle ??
    (step === 1
      ? "Let's start with your basic details."
      : step === 2
        ? 'Tell us about your vehicle.'
        : step === 3
          ? 'Upload clear, readable photos or PDFs.'
          : 'Please review your details before submitting.');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + px(4),
            minHeight: insets.top + px(58),
            paddingHorizontal: px(16),
          },
        ]}>
        <Pressable
          onPress={onBack}
          hitSlop={14}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={px(22)} color="#111827" strokeWidth={2.4} />
        </Pressable>

        <View style={styles.logoCenter}>
          <PartnerHeaderLogo width={px(104)} />
        </View>

        {/* Symmetrical placeholder for centering */}
        <View style={styles.topSpacer} />
      </View>

      {/* Horizontal 4-Step Stepper */}
      <View style={[styles.stepperWrap, { paddingHorizontal: px(16), paddingBottom: px(12) }]}>
        <View style={styles.stepperRow}>
          {DRIVER_REGISTRATION_STEPS.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < step;
            const isActive = stepNum === step;

            return (
              <React.Fragment key={label}>
                <View style={styles.stepNode}>
                  <View
                    style={[
                      styles.circle,
                      { width: px(30), height: px(30), borderRadius: px(15) },
                      isCompleted && styles.circleCompleted,
                      isActive && styles.circleActive,
                      !isCompleted && !isActive && styles.circleIdle,
                    ]}>
                    {isCompleted ? (
                      <Check size={px(15)} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Text
                        style={[
                          styles.circleText,
                          { fontSize: px(13) },
                          isActive ? styles.circleTextActive : styles.circleTextIdle,
                        ]}>
                        {stepNum}
                      </Text>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.stepLabel,
                      { fontSize: px(11), marginTop: px(4) },
                      isActive && styles.stepLabelActive,
                      isCompleted && styles.stepLabelCompleted,
                      !isActive && !isCompleted && styles.stepLabelIdle,
                    ]}>
                    {label}
                  </Text>
                </View>

                {idx < DRIVER_REGISTRATION_STEPS.length - 1 ? (
                  <View
                    style={[
                      styles.stepperLine,
                      { height: px(2.5), marginTop: px(14) },
                      stepNum < step ? styles.lineCompleted : styles.lineIdle,
                    ]}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Main Content Area */}
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: px(20),
              paddingTop: px(16),
              paddingBottom: insets.bottom + px(showFooter ? 94 : 28),
            },
          ]}>
          {/* Main Title & Step Indicator Row */}
          <View style={styles.titleRow}>
            <Text style={[styles.mainTitle, { fontSize: px(22) }]}>
              {resolvedTitle}
            </Text>
            <Text style={[styles.stepBadge, { fontSize: px(15) }]}>
              Step {step} of 4
            </Text>
          </View>
          <Text style={[styles.mainSubtitle, { fontSize: px(13.5), marginTop: px(4) }]}>
            {resolvedSubtitle}
          </Text>

          {/* Children Screen Body */}
          <View style={{ marginTop: px(16) }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Actions Bar */}
      {showFooter ? (
        footerOverride ? (
          footerOverride
        ) : (
          <View
            style={[
              styles.footerBar,
              {
                paddingHorizontal: px(20),
                paddingTop: px(12),
                paddingBottom: Math.max(insets.bottom + px(8), px(16)),
              },
            ]}>
            <View style={styles.footerRow}>
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [
                  styles.backActionBtn,
                  { height: px(48), borderRadius: px(12) },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Go back">
                <Text style={[styles.backActionLabel, { fontSize: px(15) }]}>Back</Text>
              </Pressable>

              <Pressable
                onPress={onContinue}
                disabled={continueDisabled || continueLoading}
                style={({ pressed }) => [
                  styles.continueBtn,
                  { height: px(48), borderRadius: px(12) },
                  continueDisabled && styles.continueBtnDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={continueLabel}>
                <Text
                  style={[
                    styles.continueLabel,
                    { fontSize: px(15) },
                    continueDisabled && styles.continueLabelDisabled,
                  ]}>
                  {continueLoading ? 'Please wait…' : continueLabel}
                </Text>
                {!continueLoading ? (
                  <ArrowRight
                    size={px(18)}
                    color={continueDisabled ? '#9CA3AF' : '#111827'}
                    strokeWidth={2.4}
                  />
                ) : null}
              </Pressable>
            </View>
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  logoCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSpacer: {
    width: 34,
  },
  stepperWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stepNode: {
    alignItems: 'center',
    minWidth: 54,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  circleActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  circleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  circleIdle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  circleText: {
    fontWeight: '700',
  },
  circleTextActive: {
    color: '#FFFFFF',
  },
  circleTextIdle: {
    color: '#9CA3AF',
  },
  stepLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#D97706',
  },
  stepLabelCompleted: {
    color: '#059669',
  },
  stepLabelIdle: {
    color: '#9CA3AF',
  },
  stepperLine: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  lineCompleted: {
    backgroundColor: '#10B981',
  },
  lineIdle: {
    backgroundColor: '#E5E7EB',
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  mainTitle: {
    color: '#111827',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  stepBadge: {
    color: '#D97706',
    fontWeight: '700',
  },
  mainSubtitle: {
    color: '#6B7280',
    lineHeight: 20,
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backActionLabel: {
    color: '#111827',
    fontWeight: '600',
  },
  continueBtn: {
    flex: 2,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  continueBtnDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueLabel: {
    color: '#111827',
    fontWeight: '700',
  },
  continueLabelDisabled: {
    color: '#9CA3AF',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
