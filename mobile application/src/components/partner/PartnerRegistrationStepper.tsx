import { PartnerText } from './PartnerText';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { colors, spacing, typography } from '../../theme';

interface PartnerRegistrationStepperProps {
  steps: readonly string[];
  activeStep: number;
}

export default function PartnerRegistrationStepper({
  steps,
  activeStep,
}: PartnerRegistrationStepperProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < activeStep;
          const isActive = stepNumber === activeStep;

          return (
            <React.Fragment key={label}>
              <View style={styles.stepCol}>
                <View
                  style={[
                    styles.circle,
                    isCompleted
                      ? styles.circleCompleted
                      : isActive
                        ? styles.circleActive
                        : styles.circleIdle,
                  ]}>
                  {isCompleted ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <PartnerText
                      style={[
                        styles.circleText,
                        isActive ? styles.circleTextActive : styles.circleTextIdle,
                      ]}>
                      {stepNumber}
                    </PartnerText>
                  )}
                </View>
                <PartnerText
                  style={[
                    styles.label,
                    isCompleted
                      ? styles.labelCompleted
                      : isActive
                        ? styles.labelActive
                        : styles.labelIdle,
                  ]}
                  numberOfLines={2}>
                  {label}
                </PartnerText>
              </View>
              {index < steps.length - 1 ? (
                <View
                  style={[
                    styles.connector,
                    stepNumber < activeStep
                      ? styles.connectorCompleted
                      : stepNumber === activeStep
                        ? styles.connectorActive
                        : styles.connectorIdle,
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: colors.partnerRed,
  },
  circleCompleted: {
    backgroundColor: colors.success,
  },
  circleIdle: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  circleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  circleTextActive: {
    color: colors.dark,
  },
  circleTextIdle: {
    color: colors.grey,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 14,
  },
  labelActive: {
    color: colors.partnerRed,
    fontWeight: typography.weights.semibold,
  },
  labelCompleted: {
    color: colors.success,
    fontWeight: typography.weights.semibold,
  },
  labelIdle: {
    color: colors.grey,
    fontWeight: typography.weights.medium,
  },
  connector: {
    width: 18,
    height: 2,
    marginTop: 15,
    borderRadius: 1,
  },
  connectorActive: {
    backgroundColor: colors.partnerRed,
  },
  connectorCompleted: {
    backgroundColor: colors.success,
  },
  connectorIdle: {
    backgroundColor: colors.border,
    borderStyle: 'dotted',
    borderWidth: 1,
    borderColor: colors.border,
    height: 0,
  },
});
