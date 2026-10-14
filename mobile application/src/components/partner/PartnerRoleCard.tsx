import { PartnerText } from './PartnerText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors, radius, spacing, typography } from '../../theme';
import type { PartnerRole } from '../../store/partnerOnboardingStore';

export interface PartnerRoleFeature {
  label: string;
  Icon: LucideIcon;
}

interface PartnerRoleCardProps {
  role: PartnerRole;
  title: string;
  description: string;
  Icon: LucideIcon;
  features: PartnerRoleFeature[];
  selected: boolean;
  onPress: () => void;
}

export default function PartnerRoleCard({
  title,
  description,
  Icon,
  features,
  selected,
  onPress,
}: PartnerRoleCardProps) {
  const accent = colors.primary;
  const mutedIcon = selected ? '#8A7020' : colors.grey;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.cardSelected : styles.cardIdle,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.radio, selected ? styles.radioSelected : styles.radioIdle]} />

      <View style={styles.body}>
        <View style={[styles.iconCircle, selected ? styles.iconCircleSelected : styles.iconCircleIdle]}>
          <Icon size={28} color={selected ? accent : colors.grey} strokeWidth={2} />
        </View>

        <PartnerText style={styles.title}>{title}</PartnerText>
        <PartnerText style={styles.description}>{description}</PartnerText>
      </View>

      <View style={[styles.featureBar, selected ? styles.featureBarSelected : styles.featureBarIdle]}>
        {features.map(({ label, Icon: FeatureIcon }) => (
          <View key={label} style={styles.featureItem}>
            <FeatureIcon size={13} color={mutedIcon} strokeWidth={2.2} />
            <PartnerText
              style={[styles.featureLabel, selected ? styles.featureLabelSelected : null]}
              numberOfLines={1}>
              {label}
            </PartnerText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardSelected: {
    backgroundColor: colors.goldLight,
    borderColor: colors.primary,
  },
  cardIdle: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  radio: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    zIndex: 1,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioIdle: {
    borderColor: '#C8C8C8',
    backgroundColor: colors.background,
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconCircleSelected: {
    backgroundColor: '#FFE8B0',
  },
  iconCircleIdle: {
    backgroundColor: colors.lightGrey,
  },
  title: {
    color: colors.dark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.sm,
    color: colors.grey,
    fontSize: typography.sizes.md,
    lineHeight: 21,
    textAlign: 'center',
  },
  featureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  featureBarSelected: {
    backgroundColor: '#F3E4BC',
  },
  featureBarIdle: {
    backgroundColor: colors.lightGrey,
  },
  featureItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  featureLabel: {
    color: colors.grey,
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    flexShrink: 1,
  },
  featureLabelSelected: {
    color: '#6B5A2A',
  },
});
