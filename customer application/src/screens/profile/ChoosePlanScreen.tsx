import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import SubscriptionCard from '../../components/subscription/SubscriptionCard';
import LoadingState from '../../components/ui/LoadingState';
import Screen, { ScreenContent } from '../../components/ui/Screen';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setBillingPeriod } from '../../redux/subscriptions/subscriptionsSlice';
import { getApiErrorMessage } from '../../services/api';
import {
  useCancelSubscriptionMutation,
  useCurrentSubscriptionQuery,
  useSubscribeMutation,
  useSubscriptionPlansQuery,
} from '../../services/subscriptions/useSubscriptionQueries';
import type { ProfileStackParamList } from '../../types/navigation';
import { colors, spacing, typography } from '../../theme';

export default function ChoosePlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const dispatch = useAppDispatch();
  const plans = useAppSelector(state => state.subscriptions.plans);
  const billingPeriod = useAppSelector(state => state.subscriptions.billingPeriod);
  const { isLoading } = useSubscriptionPlansQuery(billingPeriod);
  const { data: currentSub } = useCurrentSubscriptionQuery();
  const subscribe = useSubscribeMutation();
  const cancelSub = useCancelSubscriptionMutation();

  const handleSelect = (planSlug: string, actionType?: string) => {
    if (actionType === 'contact') {
      Alert.alert('Corporate Plan', 'Please contact RACE support to activate corporate billing.');
      return;
    }

    subscribe.mutate(
      { planSlug, billingCycle: billingPeriod },
      {
        onSuccess: () => {
          Alert.alert('Subscribed', 'Your plan is now active.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
        onError: error => Alert.alert('Subscription failed', getApiErrorMessage(error)),
      },
    );
  };

  const handleCancel = () => {
    Alert.alert('Cancel subscription', 'Are you sure you want to cancel your current plan?', [
      { text: 'Keep plan', style: 'cancel' },
      {
        text: 'Cancel plan',
        style: 'destructive',
        onPress: () => {
          cancelSub.mutate(undefined, {
            onSuccess: () => Alert.alert('Cancelled', 'Your subscription has been cancelled.'),
            onError: error => Alert.alert('Cancel failed', getApiErrorMessage(error)),
          });
        },
      },
    ]);
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
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenContent>
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>Get more with RACE Premium</Text>

            {currentSub?.status === 'active' ? (
              <View style={styles.activeBanner}>
                <Text style={styles.activeTitle}>Current plan: {currentSub.planName ?? currentSub.planId}</Text>
                {currentSub.expiresAt ? (
                  <Text style={styles.activeMeta}>
                    Renews / expires {new Date(currentSub.expiresAt).toLocaleDateString('en-IN')}
                  </Text>
                ) : null}
                <Pressable onPress={handleCancel} disabled={cancelSub.isPending}>
                  <Text style={styles.cancelLink}>{cancelSub.isPending ? 'Cancelling...' : 'Cancel subscription'}</Text>
                </Pressable>
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
                  Yearly — Save 20%
                </Text>
              </Pressable>
            </View>

            {plans.map(plan => (
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
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textDark,
    textAlign: 'center',
  },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  activeBanner: {
    backgroundColor: colors.goldLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
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
    backgroundColor: colors.backgroundSoft,
    borderRadius: 24,
    padding: 4,
    marginBottom: spacing.xl,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 20, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontWeight: typography.weights.semibold, color: colors.textMuted, fontSize: typography.sizes.sm },
  toggleTextActive: { color: colors.textDark },
  disclaimer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
});
