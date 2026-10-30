import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { SubscriptionPlan, UserSubscription } from '../../types/profile';
import { apiClient } from '../api/apiClient';

interface BackendPlan {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: Array<{ text: string; included: boolean }>;
  isMostPopular: boolean;
  actionType: string;
}

interface BackendUserSubscription {
  id: string;
  planSlug: string;
  planName: string;
  category: string;
  billingCycle: string;
  price: number;
  currency: string;
  status: string;
  startedAt: string;
  expiresAt: string;
}

function mapPlan(plan: BackendPlan): SubscriptionPlan {
  return {
    id: plan.slug,
    slug: plan.slug,
    name: plan.name,
    price: plan.price,
    period: plan.billingCycle,
    features: plan.features.map((f) => ({ label: f.text, included: f.included })),
    popular: plan.isMostPopular,
    category: plan.category,
    actionType: plan.actionType,
  };
}

function mapUserSubscription(sub: BackendUserSubscription): UserSubscription {
  return {
    planId: sub.planSlug,
    planName: sub.planName,
    status: sub.status === 'active' ? 'active' : sub.status === 'cancelled' ? 'expired' : 'expired',
    expiresAt: sub.expiresAt,
  };
}

export async function listSubscriptionPlans(
  _billingCycle?: 'monthly' | 'yearly',
): Promise<SubscriptionPlan[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<BackendPlan[]>>(
    API_ENDPOINTS.subscriptionPlans,
    { params: { audience: 'customer' } },
  );
  return data.data.map(mapPlan);
}

export async function getCurrentSubscription(): Promise<UserSubscription | null> {
  const { data } = await apiClient.get<ApiSuccessResponse<BackendUserSubscription | null>>(
    API_ENDPOINTS.subscriptions,
  );
  return data.data ? mapUserSubscription(data.data) : null;
}

export async function subscribeToPlan(
  planSlug: string,
  billingCycle?: 'monthly' | 'yearly',
): Promise<UserSubscription> {
  const { data } = await apiClient.post<ApiSuccessResponse<BackendUserSubscription>>(
    API_ENDPOINTS.subscriptions,
    { planSlug, billingCycle },
  );
  return mapUserSubscription(data.data);
}

export async function cancelSubscription(): Promise<UserSubscription> {
  const { data } = await apiClient.post<ApiSuccessResponse<BackendUserSubscription>>(
    `${API_ENDPOINTS.subscriptions}/cancel`,
  );
  return mapUserSubscription(data.data);
}
