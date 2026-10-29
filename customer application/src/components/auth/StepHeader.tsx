import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, radius, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../types/navigation';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

interface StepHeaderProps {
  step: number;
  totalSteps?: number;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  scale?: number;
}

export default function StepHeader({
  step,
  totalSteps = 3,
  onBack,
  onSkip,
  showSkip = true,
  scale = 1,
}: StepHeaderProps) {
  const progress = (step / totalSteps) * 100;
  const px = (n: number) => Math.round(n * scale);

  return (
    <View style={[styles.wrap, { marginBottom: px(20) }]}>
      <View style={[styles.row, { marginBottom: px(12) }]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <ArrowLeft size={px(22)} color={colors.dark} strokeWidth={2.5} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={[styles.stepText, { fontSize: px(14) }]}>
          Step {step} of {totalSteps}
        </Text>
        {showSkip && onSkip ? (
          <Pressable onPress={onSkip} hitSlop={12}>
            <Text style={[styles.skip, { fontSize: px(14) }]}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>
      <View style={[styles.track, { height: px(4), borderRadius: px(2) }]}>
        <View style={[styles.fill, { width: `${progress}%`, borderRadius: px(2) }]} />
      </View>
    </View>
  );
}

interface AuthBackHeaderProps {
  onBack: () => void;
  rightElement?: ReactNode;
}

export function AuthBackHeader({ onBack, rightElement }: AuthBackHeaderProps) {
  return (
    <View style={styles.authRow}>
      <Pressable onPress={onBack} hitSlop={12}>
        <ArrowLeft size={22} color={colors.dark} strokeWidth={2.5} />
      </Pressable>
      <View style={styles.flex} />
      {rightElement}
    </View>
  );
}

export function useAuthNavigationBack(
  navigation: NativeStackNavigationProp<AuthStackParamList>,
) {
  return () => goBackWithinStack(navigation);
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 32,
  },
  stepText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  skip: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  skipPlaceholder: {
    width: 32,
  },
  track: {
    height: 4,
    borderRadius: radius.sm / 2,
    backgroundColor: colors.lightGrey,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm / 2,
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  flex: {
    flex: 1,
  },
});
