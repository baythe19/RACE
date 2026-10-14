import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from '../ui/PrimaryButton';
import type { SubscriptionPlan } from '../../types/profile';
import { colors, radius, spacing, typography } from '../../theme';

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  selected?: boolean;
  onSelect: () => void;
}

export default function SubscriptionCard({ plan, selected, onSelect }: SubscriptionCardProps) {
  const isPremium = plan.popular;

  return (
    <View
      style={[
        styles.card,
        isPremium && styles.premium,
        selected && !isPremium && styles.selected,
      ]}>
      {plan.popular ? (
        <View style={styles.badge}>
          <PartnerText style={styles.badgeText}>MOST POPULAR</PartnerText>
        </View>
      ) : null}
      <PartnerText style={[styles.name, isPremium && styles.namePremium]}>{plan.name}</PartnerText>
      <PartnerText style={[styles.price, isPremium && styles.pricePremium]}>
        ₹{plan.price}
        <PartnerText style={styles.period}>/{plan.period === 'yearly' ? 'year' : 'month'}</PartnerText>
      </PartnerText>
      <View style={styles.features}>
        {plan.features.map((feature) => (
          <View key={feature.label} style={styles.featureRow}>
            <Ionicons
              name={feature.included ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={feature.included ? (isPremium ? colors.textLight : colors.primary) : colors.textMuted}
            />
            <PartnerText
              style={[
                styles.featureText,
                !feature.included && styles.featureMuted,
                isPremium && styles.featureTextPremium,
              ]}>
              {feature.label}
            </PartnerText>
          </View>
        ))}
      </View>
      <PrimaryButton
        label={plan.popular ? 'Get Premium →' : 'Get Started'}
        onPress={onSelect}
        variant={isPremium ? 'primary' : 'outline'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  premium: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selected: {
    borderColor: colors.textDark,
    borderWidth: 2,
  },
  badge: {
    alignSelf: 'flex-end',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textDark,
  },
  namePremium: { color: colors.textDark },
  price: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
    marginVertical: spacing.sm,
  },
  pricePremium: { color: colors.textDark },
  period: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
  },
  features: { marginBottom: spacing.lg, gap: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textDark,
  },
  featureTextPremium: { color: colors.textDark },
  featureMuted: { color: colors.textMuted },
});
