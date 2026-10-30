import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Sparkles } from 'lucide-react-native';

import PrimaryButton from '../ui/PrimaryButton';
import { getPlanPrice, getPlanPriceLabel } from '../../constants/choosePlan';
import type { BillingCycle } from '../../constants/choosePlan';
import type { SubscriptionPlan } from '../../types/profile';
import { colors, shadows, spacing, typography } from '../../theme';

const OUTLINE = '#E7E5E4';

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  billingPeriod: BillingCycle;
  selected?: boolean;
  onSelect: () => void;
  disabled?: boolean;
  isCurrent?: boolean;
}

export default function SubscriptionCard({
  plan,
  billingPeriod,
  selected,
  onSelect,
  disabled = false,
  isCurrent,
}: SubscriptionCardProps) {
  const highlighted = Boolean(plan.popular);
  const monthlyBase = plan.price;
  const displayPrice = getPlanPrice(monthlyBase, billingPeriod);
  const priceCaption = getPlanPriceLabel(monthlyBase, billingPeriod);
  const isContact = plan.actionType === 'contact';

  return (
    <Pressable
      onPress={disabled ? undefined : onSelect}
      style={({ pressed }) => [
        styles.card,
        highlighted && styles.cardHighlight,
        selected && styles.cardSelected,
        isCurrent && styles.cardCurrent,
        pressed && !disabled ? { opacity: 0.96 } : null,
      ]}>
      {highlighted ? (
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Sparkles size={12} color={colors.primaryDark} strokeWidth={2.2} />
            <Text style={styles.badgeText}>Recommended</Text>
          </View>
        </View>
      ) : null}

      {isCurrent ? (
        <Text style={styles.currentPill}>Your plan</Text>
      ) : null}

      <Text style={styles.name}>{plan.name}</Text>
      {plan.description ? (
        <Text style={styles.tagline} numberOfLines={2}>
          {plan.description}
        </Text>
      ) : null}

      <View style={styles.priceRow}>
        <Text style={styles.price}>₹{displayPrice.toLocaleString('en-IN')}</Text>
        <Text style={styles.priceMeta}>
          {billingPeriod === 'yearly' ? '/ year' : '/ month'}
          {billingPeriod === 'yearly' ? (
            <Text style={styles.priceSave}> · 20% off</Text>
          ) : null}
        </Text>
      </View>
      <Text style={styles.priceEquiv}>{priceCaption}</Text>

      <View style={styles.features}>
        {plan.features.map(feature => (
          <View key={feature.label} style={styles.featureRow}>
            <View
              style={[
                styles.featureIcon,
                feature.included ? styles.featureIconOn : styles.featureIconOff,
              ]}>
              {feature.included ? (
                <Check size={12} color={colors.dark} strokeWidth={3} />
              ) : null}
            </View>
            <Text
              style={[styles.featureText, !feature.included && styles.featureMuted]}
              numberOfLines={2}>
              {feature.label}
            </Text>
          </View>
        ))}
      </View>

      <PrimaryButton
        label={
          disabled
            ? 'Processing…'
            : isCurrent
              ? 'Current plan'
              : isContact
                ? 'Contact RACE'
                : `Choose ${plan.name}`
        }
        onPress={onSelect}
        variant={highlighted ? 'primary' : 'outline'}
        disabled={disabled || isCurrent}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: OUTLINE,
    ...shadows.card,
  },
  cardHighlight: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardSelected: {
    borderColor: colors.dark,
    borderWidth: 2,
  },
  cardCurrent: {
    backgroundColor: '#FFFBF5',
  },
  badgeRow: { flexDirection: 'row', marginBottom: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  currentPill: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textDark,
  },
  tagline: {
    marginTop: 4,
    fontSize: typography.sizes.sm,
    color: colors.grey,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: spacing.md,
  },
  price: {
    fontSize: 28,
    fontWeight: typography.weights.extrabold,
    color: colors.textDark,
  },
  priceMeta: {
    fontSize: typography.sizes.sm,
    color: colors.grey,
    fontWeight: typography.weights.medium,
  },
  priceSave: {
    color: colors.primaryDark,
    fontWeight: typography.weights.semibold,
  },
  priceEquiv: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  features: { marginBottom: spacing.lg, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureIconOn: { backgroundColor: '#DCFCE7' },
  featureIconOff: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: OUTLINE },
  featureText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textDark,
    lineHeight: 19,
  },
  featureMuted: { color: colors.textMuted, textDecorationLine: 'line-through' },
});
