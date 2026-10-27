import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export default function ProgressStepper({ currentStep, totalSteps, labels }: ProgressStepperProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const active = step <= currentStep;
          return (
            <View key={step} style={styles.stepItem}>
              <View style={[styles.dot, active && styles.dotActive]}>
                <PartnerText style={[styles.dotText, active && styles.dotTextActive]}>{step}</PartnerText>
              </View>
              {step < totalSteps ? <View style={[styles.line, step < currentStep && styles.lineActive]} /> : null}
            </View>
          );
        })}
      </View>
      {labels?.[currentStep - 1] ? (
        <PartnerText style={styles.label}>{labels[currentStep - 1]}</PartnerText>
      ) : (
        <PartnerText style={styles.label}>
          Step {currentStep} of {totalSteps}
        </PartnerText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotText: {
    color: colors.subtext,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  dotTextActive: {
    color: colors.textLight,
  },
  line: {
    width: 28,
    height: 2,
    backgroundColor: colors.glass.border,
    marginHorizontal: spacing.xs,
  },
  lineActive: {
    backgroundColor: colors.primary,
  },
  label: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.subtext,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
