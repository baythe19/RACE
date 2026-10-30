import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import SubscriptionCard from '../../components/subscription/SubscriptionCard';
import LoadingState from '../../components/ui/LoadingState';
import Screen, { ScreenContent } from '../../components/ui/Screen';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setBillingPeriod } from '../../redux/subscriptions/subscriptionsSlice';
import {
  useCurrentSubscriptionQuery,
  useSubscribeMutation,
  useSubscriptionPlansQuery,
} from '../../services/subscriptions/useSubscriptionQueries';
import { getApiErrorMessage } from '../../services/api/apiClient';
import type { ProfileStackParamList } from '../../types/navigation';
import { colors, spacing, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SubscriptionPlans'>;

export default function SubscriptionPlansScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { dialog, showDialog } = useAppDialog();
  const plans = useAppSelector((state) => state.subscriptions.plans);
  const billingPeriod = useAppSelector((state) => state.subscriptions.billingPeriod);
  const { isLoading } = useSubscriptionPlansQuery(billingPeriod);
  useCurrentSubscriptionQuery();
  const subscribe = useSubscribeMutation();

  const handleSelect = (planSlug: string, actionType?: string) => {
    if (subscribe.isPending) return;
    if (actionType === 'contact') {
      showDialog({
        tone: 'info',
        title: 'Corporate Plan',
        message: 'Please contact RACE support to activate corporate billing.',
        primaryLabel: 'OK',
      });
      return;
    }

    subscribe.mutate(
      { planSlug, billingCycle: billingPeriod },
      {
        onSuccess: () => goBackWithinStack(navigation),
        onError: (error) => {
          showDialog({
            tone: 'error',
            title: 'Subscription failed',
            message: getApiErrorMessage(error),
            primaryLabel: 'OK',
          });
        },
      },
    );
  };

  if (isLoading && plans.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading subscription plans..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe}>
        {dialog}
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenContent>
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>
              MVP pilot: plans activate with test billing only — no recurring card charge yet.
            </Text>

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
                  Yearly — Save 20%
                </Text>
              </Pressable>
            </View>

            {plans.map((plan) => (
              <SubscriptionCard
                key={plan.id}
                plan={plan}
                disabled={subscribe.isPending}
                onSelect={() => handleSelect(plan.slug ?? plan.id, plan.actionType)}
              />
            ))}

            <Text style={styles.disclaimer}>
              All plans include 24/7 emergency support and verified professionals.
            </Text>
          </ScreenContent>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.textDark, textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 24,
    padding: 4,
    marginBottom: spacing.xl,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 20, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontWeight: typography.weights.semibold, color: colors.textMuted, fontSize: typography.sizes.sm },
  toggleTextActive: { color: colors.textDark },
  disclaimer: { textAlign: 'center', color: colors.textMuted, fontSize: typography.sizes.sm, fontStyle: 'italic', marginTop: spacing.md },
});
