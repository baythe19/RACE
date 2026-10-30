import {
  CUSTOMER_SUBSCRIPTION_FALLBACK,
  filterPlansByCategory,
  presentCustomerPlan,
  sortCustomerPlans,
  type PlanCategoryFilter,
} from '../constants/customerSubscriptionPlans';
import type { SubscriptionPlan } from '../types/profile';

export function mergeCustomerSubscriptionPlans(apiPlans: SubscriptionPlan[]): SubscriptionPlan[] {
  const base = apiPlans.length > 0 ? apiPlans : CUSTOMER_SUBSCRIPTION_FALLBACK;
  const customer = base.filter(
    p =>
      !p.category ||
      p.category === 'towing' ||
      p.category === 'driver' ||
      p.slug?.startsWith('towing_') ||
      p.slug?.startsWith('driver_'),
  );
  const merged = customer.length > 0 ? customer : CUSTOMER_SUBSCRIPTION_FALLBACK;
  return sortCustomerPlans(merged.map(presentCustomerPlan));
}

export function visiblePlans(
  apiPlans: SubscriptionPlan[],
  category: PlanCategoryFilter,
): SubscriptionPlan[] {
  return filterPlansByCategory(mergeCustomerSubscriptionPlans(apiPlans), category);
}
