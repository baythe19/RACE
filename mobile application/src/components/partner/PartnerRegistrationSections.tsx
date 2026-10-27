import { PartnerText } from './PartnerText';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors, radius, spacing, typography } from '../../theme';

interface PartnerSectionHeaderProps {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
}

export function PartnerSectionHeader({ Icon, title, subtitle }: PartnerSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.iconWrap}>
        <Icon size={20} color={colors.partnerRed} strokeWidth={2.2} />
      </View>
      <View style={styles.copy}>
        <PartnerText style={styles.title}>{title}</PartnerText>
        <PartnerText style={styles.subtitle}>{subtitle}</PartnerText>
      </View>
    </View>
  );
}

interface PartnerRegistrationFooterProps {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showBack?: boolean;
}

export function PartnerRegistrationFooter({
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  showBack = false,
}: PartnerRegistrationFooterProps) {
  if (!showBack) {
    return (
      <Pressable
        disabled={continueDisabled}
        onPress={onContinue}
        style={({ pressed }) => [
          styles.continueFull,
          continueDisabled && styles.disabled,
          pressed && !continueDisabled && styles.pressed,
        ]}>
        <PartnerText style={styles.continueLabel}>{continueLabel}</PartnerText>
      </Pressable>
    );
  }

  return (
    <View style={styles.splitRow}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
        <PartnerText style={styles.backLabel}>Back</PartnerText>
      </Pressable>
      <Pressable
        disabled={continueDisabled}
        onPress={onContinue}
        style={({ pressed }) => [
          styles.continueSplit,
          continueDisabled && styles.disabled,
          pressed && !continueDisabled && styles.pressed,
        ]}>
        <PartnerText style={styles.continueLabel}>{continueLabel}</PartnerText>
      </Pressable>
    </View>
  );
}

interface PartnerInfoBoxProps {
  children: ReactNode;
}

export function PartnerInfoBox({ children }: PartnerInfoBoxProps) {
  return <View style={styles.infoBox}>{children}</View>;
}

interface PartnerSecurityNoteProps {
  text: string;
}

export function PartnerSecurityNote({ text }: PartnerSecurityNoteProps) {
  return (
    <View style={styles.securityBox}>
      <PartnerText style={styles.securityText}>{text}</PartnerText>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.partnerRedLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.dark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.normal,
  },
  continueFull: {
    minHeight: 52,
    borderRadius: radius.button,
    backgroundColor: colors.partnerRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  backLabel: {
    color: colors.dark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  continueSplit: {
    flex: 2,
    minHeight: 52,
    borderRadius: radius.button,
    backgroundColor: colors.partnerRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueLabel: {
    color: colors.dark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.92,
  },
  infoBox: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.partnerRedLight,
    borderWidth: 1,
    borderColor: '#F5D98A',
  },
  securityBox: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.partnerRedLight,
  },
  securityText: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.relaxed,
    textAlign: 'center',
  },
});
