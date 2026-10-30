import { PartnerText } from './PartnerText';
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StatusBar, StyleSheet, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ArrowLeft, ArrowRight, Check, ChevronRight } from 'lucide-react-native';
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
  scrollEnabled?: boolean;
  stepLabels?: readonly string[];
}

const REF_W = 390;

export const DriverRegScrollContext = React.createContext<{ liftFocusedField: () => void }>({
  liftFocusedField: () => {},
});

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
  scrollEnabled,
  stepLabels,
}: DriverRegistrationLayoutProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const scrollViewRef = useRef<any>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // Reset to top smoothly when changing registration steps
    if (scrollViewRef.current?.scrollToPosition) {
      scrollViewRef.current.scrollToPosition(0, 0, false);
    } else if (scrollViewRef.current?.scrollTo) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [step]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Clamp scaling between 0.88x (small phones) and 1.22x (tablets/foldables) for solid responsiveness
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const steps = stepLabels ?? DRIVER_REGISTRATION_STEPS;
  const resolvedTitle = title ?? 'Driver registration';
  const resolvedSubtitle =
    subtitle ??
    (step === 1
      ? "Let's start with your personal and driving details."
      : step === 2
        ? 'Upload clear, readable photos of your KYC documents.'
        : 'Please review your details before submitting.');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, px(2)),
            paddingBottom: px(2),
            paddingHorizontal: px(12),
          },
        ]}>
        <Pressable
          onPress={onBack}
          hitSlop={14}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={px(20)} color="#111827" strokeWidth={2.4} />
        </Pressable>

        <View style={styles.logoCenter}>
          <PartnerHeaderLogo width={px(68)} showPartnerText={false} />
        </View>

        {/* Symmetrical placeholder for centering */}
        <View style={styles.topSpacer} />
      </View>

      {/* Centered Driver Registration Title */}
      <View style={[styles.titleHeaderWrap, { paddingVertical: px(2) }]}>
        <PartnerText style={[styles.headerRegistrationTitle, { fontSize: px(15.5) }]}>
          {resolvedTitle}
        </PartnerText>
      </View>

      {/* Horizontal 4-Step Stepper */}
      <View
        style={[
          styles.stepperWrap,
          {
            paddingHorizontal: px(8),
            paddingTop: px(4),
            paddingBottom: px(6),
          },
        ]}>
        <View style={styles.stepperRow}>
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < step;
            const isActive = stepNum === step;
            const circleSize = px(26);
            const lineHeight = px(2);

            return (
              <View key={label} style={styles.stepColumn}>
                {/* Connecting Line Left (from previous step center to this step center) */}
                {idx > 0 && (
                  <View
                    style={[
                      styles.connectorHalfLine,
                      {
                        left: 0,
                        right: '50%',
                        top: (circleSize - lineHeight) / 2,
                        height: lineHeight,
                        backgroundColor: stepNum <= step ? '#10B981' : '#E5E7EB',
                      },
                    ]}
                  />
                )}

                {/* Connecting Line Right (from this step center to next step center) */}
                {idx < steps.length - 1 && (
                  <View
                    style={[
                      styles.connectorHalfLine,
                      {
                        left: '50%',
                        right: 0,
                        top: (circleSize - lineHeight) / 2,
                        height: lineHeight,
                        backgroundColor: stepNum < step ? '#10B981' : '#E5E7EB',
                      },
                    ]}
                  />
                )}

                {/* Centered Arrow / Directional Chevron between columns */}
                {idx < steps.length - 1 && (
                  <View
                    style={[
                      styles.arrowContainer,
                      {
                        right: -px(6),
                        top: (circleSize - px(12)) / 2,
                        width: px(12),
                        height: px(12),
                      },
                    ]}>
                    <ChevronRight
                      size={px(10)}
                      color={stepNum < step ? '#10B981' : '#9CA3AF'}
                      strokeWidth={2.6}
                    />
                  </View>
                )}

                {/* Circle (Centered in Column, Covers the line in center) */}
                <View
                  style={[
                    styles.circle,
                    {
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                    },
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                    !isCompleted && !isActive && styles.circleIdle,
                  ]}>
                  {isCompleted ? (
                    <Check size={px(13)} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <PartnerText
                      style={[
                        styles.circleText,
                        { fontSize: px(11) },
                        isActive ? styles.circleTextActive : styles.circleTextIdle,
                      ]}>
                      {stepNum}
                    </PartnerText>
                  )}
                </View>

                {/* Step Label (Centered directly beneath circle) */}
                <PartnerText
                  numberOfLines={2}
                  style={[
                    styles.stepLabel,
                    { fontSize: px(10), lineHeight: px(13), marginTop: px(4), minHeight: px(26) },
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                    !isActive && !isCompleted && styles.stepLabelIdle,
                  ]}>
                  {label}
                </PartnerText>
              </View>
            );
          })}
        </View>
      </View>

      {/* Main Content Area: KeyboardAwareScrollView automatically scrolls up when any input is focused */}
      <DriverRegScrollContext.Provider
        value={{
          liftFocusedField: () => {
            // Soft safety net only — KeyboardAwareScrollView already keeps the
            // focused input visible (enableAutomaticScroll + extraScrollHeight).
            // Aggressive scrollToEnd/4000px calls here used to fling the page
            // far past the form, leaving a blank screen (user report 27 Oct).
            const scroller = scrollViewRef.current;
            if (!scroller) return;
            setTimeout(() => {
              if (typeof scroller.scrollResponderScrollTo === 'function') {
                scroller.scrollResponderScrollTo({ y: 0, animated: true });
              }
            }, 280);
          },
        }}>
      <KeyboardAwareScrollView
        innerRef={(ref: any) => {
          scrollViewRef.current = ref;
        }}
        style={styles.scrollView}
        bounces={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={px(90)}
        extraHeight={px(110)}
        keyboardOpeningTime={Platform.OS === 'ios' ? 250 : 0}
        scrollEnabled={scrollEnabled !== undefined ? scrollEnabled : true}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableResetScrollToCoords={false}
        contentContainerStyle={[
          styles.scrollContent,
          step === 4 && styles.scrollContentStep4,
          {
            paddingHorizontal: px(12),
            paddingTop: px(10),
            // Footer padding only — keyboard spacing is handled by
            // KeyboardAwareScrollView (extraHeight/extraScrollHeight). Adding
            // keyboardHeight here too used to double-compensate and blow a big
            // blank gap under the form when the keyboard opened.
            paddingBottom: insets.bottom + px(showFooter ? (step === 4 ? 80 : 94) : 28),
          },
        ]}>
        {/* Children Screen Body */}
        <View style={step === 4 ? styles.step4BodyWrap : undefined}>{children}</View>
      </KeyboardAwareScrollView>
      </DriverRegScrollContext.Provider>

      {/* Sticky Bottom Actions Bar (auto-hidden when typing on steps 1-3 so input is never covered) */}
      {showFooter && (!keyboardVisible || step === 4) ? (
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
                <PartnerText style={[styles.backActionLabel, { fontSize: px(15) }]}>Back</PartnerText>
              </Pressable>

              {(() => {
                const cleanLabel = continueLabel
                  .replace(/→/g, '')
                  .replace(/->/g, '')
                  .trim();
                // Fixed footer height keeps both action buttons in one place on
                // every step, even when the CTA label changes.
                const CTA_MAX_LABEL = 'Submit application';
                return (
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
                    accessibilityLabel={cleanLabel}>
                    <PartnerText
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.continueLabel,
                        { fontSize: px(CTA_MAX_LABEL.length > 15 ? 13.5 : 14.5) },
                        continueDisabled && styles.continueLabelDisabled,
                      ]}>
                      {continueLoading ? 'Please wait…' : cleanLabel}
                    </PartnerText>
                    {!continueLoading ? (
                      <ArrowRight
                        size={px(17)}
                        color={continueDisabled ? '#9CA3AF' : '#111827'}
                        strokeWidth={2.4}
                      />
                    ) : null}
                  </Pressable>
                );
              })()}
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
    borderBottomWidth: 0,
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
    borderBottomColor: '#F3F4F6',
    overflow: 'hidden',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  stepColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 2,
  },
  connectorHalfLine: {
    position: 'absolute',
    zIndex: 1,
  },
  arrowContainer: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 3,
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
    width: '100%',
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
  titleHeaderWrap: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerRegistrationTitle: {
    color: '#111827',
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  stepperLineTrack: {
    flex: 1,
    justifyContent: 'center',
  },
  stepperLine: {
    width: '100%',
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
  scrollContentStep4: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  step4BodyWrap: {
    flex: 1,
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
    gap: 10,
    width: '100%',
  },
  backActionBtn: {
    minWidth: 84,
    paddingHorizontal: 16,
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
    flex: 1,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
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
    flexShrink: 1,
  },
  continueLabelDisabled: {
    color: '#9CA3AF',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
