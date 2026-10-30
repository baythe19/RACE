import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import SubscriptionCard from '../../components/subscription/SubscriptionCard';
import ProfileSubScreenLayout from '../../components/profile/ProfileSubScreenLayout';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setBillingPeriod } from '../../redux/subscriptions/subscriptionsSlice';
import type { PlanCategoryFilter } from '../../constants/customerSubscriptionPlans';
import { getApiErrorMessage } from '../../services/api/apiClient';
import {
  useCancelSubscriptionMutation,
  useCurrentSubscriptionQuery,
  useSubscribeMutation,
  useSubscriptionPlansQuery,
} from '../../services/subscriptions/useSubscriptionQueries';
import { visiblePlans } from '../../utils/subscriptionPlanDisplay';
import { colors, spacing, typography } from '../../theme';

type Props = {
  onSubscribed?: () => void;
  showCancel?: boolean;
};

const CATEGORY_CHIPS: { id: PlanCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All plans' },
  { id: 'towing', label: 'Towing' },
  { id: 'driver', label: 'Driver' },
];

export default function SubscriptionPlansView({ onSubscribed, showCancel = false }: Props) {
  const dispatch = useAppDispatch();
  const { dialog, showDialog } = useAppDialog();
  const plans = useAppSelector(state => state.subscriptions.plans);
  const billingPeriod = useAppSelector(state => state.subscriptions.billingPeriod);
  const { isLoading, isError, refetch } = useSubscriptionPlansQuery(billingPeriod);
  const { data: currentSub } = useCurrentSubscriptionQuery();
  const subscribe = useSubscribeMutation();
  const cancelSub = useCancelSubscriptionMutation();
  const [category, setCategory] = useState<PlanCategoryFilter>('all');

  const displayPlans = useMemo(
    () => visiblePlans(plans, category),
    [plans, category],
  );

  const handleSelect = (planSlug: string, actionType?: string) => {
    if (subscribe.isPending) return;
    if (actionType === 'contact') {
      showDialog({
        tone: 'info',
        title: 'Corporate plan',
        message: 'Email support@race.in or use Help & Support to activate corporate billing.',
        primaryLabel: 'OK',
      });
      return;
    }

    subscribe.mutate(
      { planSlug, billingCycle: billingPeriod },
      {
        onSuccess: () => {
          showDialog({
            tone: 'success',
            title: 'Plan activated',
            message: 'Your membership is active. Benefits apply on your next booking.',
            primaryLabel: 'Done',
            onPrimary: onSubscribed,
          });
        },
        onError: error =>
          showDialog({
            tone: 'error',
            title: 'Could not subscribe',
            message: getApiErrorMessage(error),
            primaryLabel: 'OK',
          }),
      },
    );
  };

  const handleCancel = () => {
    if (cancelSub.isPending) return;
    showDialog({
      tone: 'confirm',
      title: 'Cancel subscription',
      message: 'You will lose plan benefits after the current period ends.',
      secondaryLabel: 'Keep plan',
      primaryLabel: 'Cancel plan',
      destructive: true,
      onPrimary: () => {
        cancelSub.mutate(undefined, {
          onSuccess: () =>
            showDialog({
              tone: 'success',
              title: 'Cancelled',
              message: 'Your subscription has been cancelled.',
              primaryLabel: 'OK',
            }),
          onError: error =>
            showDialog({
              tone: 'error',
              title: 'Cancel failed',
              message: getApiErrorMessage(error),
              primaryLabel: 'OK',
            }),
        });
      },
    });
  };

  if (isLoading && plans.length === 0) {
    return <LoadingState message="Loading plans…" />;
  }

  return (
    <ProfileSubScreenLayout
      title="Choose your plan"
      subtitle="Speed · Race · Prime · Premium — pick towing or driver cover. Test billing only in MVP."
      subtitleNumberOfLines={3}>
      {dialog}

      {currentSub?.status === 'active' ? (
        <View style={styles.activeBanner}>
          <Text style={styles.activeTitle}>
            Active: {currentSub.planName ?? currentSub.planId}
          </Text>
          {currentSub.expiresAt ? (
            <Text style={styles.activeMeta}>
              Valid until {new Date(currentSub.expiresAt).toLocaleDateString('en-IN')}
            </Text>
          ) : null}
          {showCancel ? (
            <Pressable onPress={handleCancel} disabled={cancelSub.isPending}>
              <Text style={styles.cancelLink}>
                {cancelSub.isPending ? 'Cancelling…' : 'Cancel subscription'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, billingPeriod === 'monthly' && styles.toggleActive]}
          onPress={() => dispatch(setBillingPeriod('monthly'))}>
          <Text style={[styles.toggleText, billingPeriod === 'monthly' && styles.toggleTextActive]}>
            Monthly
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, billingPeriod === 'yearly' && styles.toggleActive]}
          onPress={() => dispatch(setBillingPeriod('yearly'))}>
          <Text style={[styles.toggleText, billingPeriod === 'yearly' && styles.toggleTextActive]}>
            Yearly · Save 20%
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}>
        {CATEGORY_CHIPS.map(chip => {
          const active = category === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setCategory(chip.id)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isError && plans.length === 0 ? (
        <EmptyState
          title="Could not load plans"
          subtitle="Showing standard RACE tiers. Pull to retry when you are back online."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      ) : null}

      {displayPlans.map(plan => {
        const slug = plan.slug ?? plan.id;
        const isCurrent = currentSub?.status === 'active' && currentSub.planId === slug;
        return (
          <SubscriptionCard
            key={slug}
            plan={plan}
            billingPeriod={billingPeriod}
            isCurrent={isCurrent}
            disabled={subscribe.isPending}
            onSelect={() => handleSelect(slug, plan.actionType)}
          />
        );
      })}

      <Text style={styles.disclaimer}>
        All plans include 24/7 emergency support and verified professionals. Payments are stubbed in
        this MVP build.
      </Text>
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  activeBanner: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  activeTitle: { fontWeight: typography.weights.bold, color: colors.textDark },
  activeMeta: { color: colors.textMuted, marginTop: spacing.xs, fontSize: typography.sizes.sm },
  cancelLink: {
    marginTop: spacing.sm,
    color: colors.error,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: spacing.md,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.background, ...{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 } },
  toggleText: { fontWeight: typography.weights.semibold, color: colors.textMuted, fontSize: typography.sizes.sm },
  toggleTextActive: { color: colors.textDark },
  chipsRow: { gap: 8, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBF5',
  },
  chipText: { fontSize: 13, fontWeight: typography.weights.semibold, color: colors.grey },
  chipTextActive: { color: colors.textDark },
  disclaimer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
