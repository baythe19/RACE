import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ArrowLeft, Calendar, Check, ChevronRight, Zap } from 'lucide-react-native';

import type { BookingTheme } from './bookingTheme';
import { colors, typography } from '../../theme';

export type HeaderTagVariant = 'instant' | 'scheduled' | 'emergency';

const TAG_ICONS: Record<HeaderTagVariant, typeof Zap> = {
  instant: Zap,
  scheduled: Calendar,
  emergency: AlertTriangle,
};

function HeaderModeTag({
  label,
  variant,
  accentColor,
  t,
}: {
  label: string;
  variant?: HeaderTagVariant;
  accentColor: string;
  t: BookingTheme;
}) {
  const Icon = TAG_ICONS[variant ?? 'instant'];
  const iconSize = t.px(13);

  return (
    <View style={[styles.tagRow, { gap: t.px(4), maxWidth: t.px(92) }]}>
      <Icon size={iconSize} color={accentColor} strokeWidth={2.4} />
      <Text
        numberOfLines={1}
        style={{
          fontSize: t.px(11),
          fontWeight: typography.weights.bold,
          color: accentColor,
          letterSpacing: 0.15,
        }}>
        {label}
      </Text>
    </View>
  );
}

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
  variant?: 'centered' | 'inline';
  accentColor?: string;
  showStep?: boolean;
  /** Compact pill shown top-right (e.g. Instant / Scheduled). */
  headerTag?: string;
  headerTagVariant?: HeaderTagVariant;
}

export default function BookingFlowHeader({
  title,
  step,
  stepLabels,
  onBack,
  theme: t,
  variant = 'centered',
  accentColor = colors.primary,
  showStep = true,
  headerTag,
  headerTagVariant,
}: BookingFlowHeaderProps) {
  const showStepper = showStep && step > 0 && Array.isArray(stepLabels) && stepLabels.length > 0;

  if (variant === 'inline') {
    return (
      <View style={[styles.wrap, { marginBottom: t.headerBottom }]}>
        <View style={styles.row}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={styles.side}>
              <ArrowLeft size={t.iconMd} color={colors.dark} strokeWidth={2.5} />
            </Pressable>
          ) : (
            <View style={styles.side} />
          )}
          <Text style={[styles.inlineTitle, { fontSize: t.screenTitle }]} numberOfLines={2}>
            {title}
          </Text>
          {headerTag ? (
            <View style={styles.tagSide}>
              <HeaderModeTag
                label={headerTag}
                variant={headerTagVariant}
                accentColor={accentColor}
                t={t}
              />
            </View>
          ) : (
            <View style={styles.side} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.centeredWrap, { marginBottom: t.headerBottom, paddingTop: t.px(4) }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backFloating}>
          <ArrowLeft size={t.iconMd} color={colors.dark} strokeWidth={2.5} />
        </Pressable>
      ) : null}
      {headerTag ? (
        <View style={[styles.tagFloating, { top: t.px(6) }]}>
          <HeaderModeTag
            label={headerTag}
            variant={headerTagVariant}
            accentColor={accentColor}
            t={t}
          />
        </View>
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.centeredTitle,
          {
            fontSize: t.screenTitle,
            lineHeight: t.screenTitle + 4,
            minHeight: t.screenTitle + 6,
            paddingTop: onBack ? t.px(2) : 0,
          },
        ]}>
        {title}
      </Text>
      {showStepper ? (
        <View style={{ width: '100%', paddingHorizontal: t.px(8), marginTop: t.px(6) }}>
          <BookingStepper step={step} labels={stepLabels} theme={t} accentColor={accentColor} />
        </View>
      ) : null}
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
  headerTag?: string;
  headerTagVariant?: HeaderTagVariant;
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
  headerTag,
  headerTagVariant,
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
        headerTag={headerTag}
        headerTagVariant={headerTagVariant}
      />
      <View style={[styles.body, { paddingTop: theme.contentTop }]}>{children}</View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    width: 32,
    alignItems: 'flex-start',
  },
  inlineTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    paddingHorizontal: 8,
    letterSpacing: -0.3,
  },
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
  tagFloating: {
    position: 'absolute',
    zIndex: 2,
    right: 0,
  },
  tagSide: {
    minWidth: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    letterSpacing: -0.3,
  },
  shell: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
