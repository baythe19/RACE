import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react-native';

import type { BookingTheme } from './bookingTheme';
import { colors, typography } from '../../theme';

/** Green used by the partner wizard for completed steps — same visual language. */
const STEP_DONE = '#10B981';
const STEP_IDLE_LINE = '#E5E7EB';
const STEP_IDLE_TEXT = '#9CA3AF';

interface StepperProps {
  /** 1-based active step. */
  step: number;
  labels: readonly string[];
  theme: BookingTheme;
  accentColor?: string;
}

/**
 * Horizontal multi-step progress bar (partner-app pattern):
 * circles with numbers / check marks, connecting lines that turn
 * green once the step is done, and a small chevron between steps.
 */
export function BookingStepper({ step, labels, theme: t, accentColor = colors.primary }: StepperProps) {
  const circleSize = t.px(26);
  const lineHeight = t.px(2);

  return (
    <View style={[styles.stepperWrap, { paddingHorizontal: t.px(2), paddingBottom: t.px(8) }]}>
      <View style={styles.stepperRow}>
        {labels.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < step;
          const isActive = stepNum === step;

          return (
            <View key={label} style={styles.stepColumn}>
              {/* Connector line: left half (previous step → this step) */}
              {idx > 0 ? (
                <View
                  style={[
                    styles.connectorHalfLine,
                    {
                      left: 0,
                      right: '50%',
                      top: (circleSize - lineHeight) / 2,
                      height: lineHeight,
                      backgroundColor: isCompleted ? STEP_DONE : STEP_IDLE_LINE,
                    },
                  ]}
                />
              ) : null}

              {/* Connector line: right half (this step → next step) */}
              {idx < labels.length - 1 ? (
                <View
                  style={[
                    styles.connectorHalfLine,
                    {
                      left: '50%',
                      right: 0,
                      top: (circleSize - lineHeight) / 2,
                      height: lineHeight,
                      backgroundColor: stepNum < step ? STEP_DONE : STEP_IDLE_LINE,
                    },
                  ]}
                />
              ) : null}

              {/* Chevron between columns */}
              {idx < labels.length - 1 ? (
                <View
                  style={[
                    styles.arrowContainer,
                    {
                      right: -t.px(6),
                      top: (circleSize - t.px(12)) / 2,
                      width: t.px(12),
                      height: t.px(12),
                    },
                  ]}>
                  <ChevronRight
                    size={t.px(10)}
                    color={stepNum < step ? STEP_DONE : STEP_IDLE_TEXT}
                    strokeWidth={2.6}
                  />
                </View>
              ) : null}

              {/* Circle */}
              <View
                style={[
                  styles.circle,
                  {
                    width: circleSize,
                    height: circleSize,
                    borderRadius: circleSize / 2,
                  },
                  isCompleted && styles.circleCompleted,
                  isActive && { backgroundColor: accentColor, borderColor: accentColor },
                  !isCompleted && !isActive && styles.circleIdle,
                ]}>
                {isCompleted ? (
                  <Check size={t.px(13)} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      { fontSize: t.px(11) },
                      isActive ? styles.circleTextActive : styles.circleTextIdle,
                    ]}>
                    {stepNum}
                  </Text>
                )}
              </View>

              {/* Label */}
              <Text
                numberOfLines={1}
                style={[
                  styles.stepLabel,
                  { fontSize: t.px(10), marginTop: t.px(4) },
                  isActive && [styles.stepLabelActive, { color: accentColor }],
                  isCompleted && styles.stepLabelCompleted,
                  !isActive && !isCompleted && styles.stepLabelIdle,
                ]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface BookingFlowHeaderProps {
  title: string;
  /** 1-based step; pass 0 (or omit steps) to render no stepper. */
  step: number;
  stepLabels?: readonly string[];
  onBack?: () => void;
  theme: BookingTheme;
  accentColor?: string;
  showStep?: boolean;
}

export default function BookingFlowHeader({
  title,
  step,
  stepLabels,
  onBack,
  theme: t,
  accentColor = colors.primary,
  showStep = true,
}: BookingFlowHeaderProps) {
  const showStepper = showStep && step > 0 && Array.isArray(stepLabels) && stepLabels.length > 0;

  return (
    <View style={[styles.centeredWrap, { marginBottom: t.headerBottom, paddingTop: t.px(4) }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backFloating}>
          <ArrowLeft size={t.iconMd} color={colors.dark} strokeWidth={2.5} />
        </Pressable>
      ) : null}
      {showStepper ? (
        <View style={{ width: '100%', paddingHorizontal: t.px(8) }}>
          <BookingStepper step={step} labels={stepLabels} theme={t} accentColor={accentColor} />
        </View>
      ) : null}
      <Text style={[styles.centeredTitle, { fontSize: t.screenTitle }]}>{title}</Text>
    </View>
  );
}

interface BookingScreenShellProps {
  title: string;
  step: number;
  stepLabels?: readonly string[];
  onBack?: () => void;
  theme: BookingTheme;
  children: ReactNode;
  footer?: ReactNode;
  headerVariant?: 'centered' | 'inline';
  accentColor?: string;
  showStep?: boolean;
}

export function BookingScreenShell({
  title,
  step,
  stepLabels,
  onBack,
  theme,
  children,
  footer,
  headerVariant = 'centered',
  accentColor,
  showStep = true,
}: BookingScreenShellProps) {
  return (
    <View style={styles.shell}>
      <BookingFlowHeader
        title={title}
        step={step}
        stepLabels={stepLabels}
        onBack={onBack}
        theme={theme}
        variant={headerVariant}
        accentColor={accentColor}
        showStep={showStep}
      />
      <View style={[styles.body, { paddingTop: theme.contentTop }]}>{children}</View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  centeredWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  backFloating: {
    position: 'absolute',
    zIndex: 2,
    left: 0,
    top: 4,
    padding: 4,
  },
  stepperWrap: {
    width: '100%',
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
    backgroundColor: colors.background,
    borderRadius: 6,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 3,
    backgroundColor: colors.background,
  },
  circleCompleted: {
    backgroundColor: STEP_DONE,
    borderColor: STEP_DONE,
  },
  circleIdle: {
    backgroundColor: colors.background,
    borderColor: STEP_IDLE_LINE,
  },
  circleText: {
    fontWeight: typography.weights.bold,
  },
  circleTextActive: {
    color: colors.background,
  },
  circleTextIdle: {
    color: STEP_IDLE_TEXT,
  },
  stepLabel: {
    width: '100%',
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  stepLabelActive: {
    fontWeight: typography.weights.bold,
  },
  stepLabelCompleted: {
    color: '#059669',
  },
  stepLabelIdle: {
    color: STEP_IDLE_TEXT,
  },
  centeredTitle: {
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  shell: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
