import type { SubscriptionPlan } from '../types/profile';

/** Customer-facing tier names (backend slugs stay canonical for subscribe API). */
export const PLAN_TIER_PRESENTATION: Record<
  string,
  { displayName: string; tagline: string; sortOrder: number; highlight?: boolean }
> = {
  towing_basic_monthly: {
    displayName: 'Speed',
    tagline: 'Essential towing — great for occasional breakdowns',
    sortOrder: 1,
  },
  towing_premium_monthly: {
    displayName: 'Race',
    tagline: 'Priority dispatch & faster response',
    sortOrder: 2,
    highlight: true,
  },
  towing_family_monthly: {
    displayName: 'Prime',
    tagline: 'Multi-vehicle & family coverage',
    sortOrder: 3,
  },
  driver_monthly: {
    displayName: 'Premium',
    tagline: 'Professional driver hours included',
    sortOrder: 4,
  },
  driver_corporate_monthly: {
    displayName: 'Corporate',
    tagline: 'Fleet & invoicing — talk to RACE',
    sortOrder: 5,
  },
};

const FALLBACK_FEATURES = {
  speed: [
    { label: '2 towing requests / month', included: true },
    { label: '~30 min standard ETA', included: true },
    { label: '24/7 emergency line', included: true },
    { label: 'Priority dispatch', included: false },
  ],
  race: [
    { label: '5 towing requests / month', included: true },
    { label: 'Priority ~15 min ETA', included: true },
    { label: 'Roadside assist included', included: true },
    { label: 'VIP support line', included: false },
  ],
  prime: [
    { label: 'Unlimited towing requests', included: true },
    { label: 'Up to 4 vehicles on plan', included: true },
    { label: 'Fastest dispatch tier', included: true },
    { label: 'Roadside + home assist', included: true },
  ],
  premium: [
    { label: 'Up to 4 driver hours / day', included: true },
    { label: 'Verified professional drivers', included: true },
    { label: 'Hatchback · Sedan · SUV', included: true },
    { label: '24/7 booking support', included: true },
  ],
};

/** Shown when API returns nothing (offline, yearly filter bug, empty DB). */
export const CUSTOMER_SUBSCRIPTION_FALLBACK: SubscriptionPlan[] = [
  {
    id: 'towing_basic_monthly',
    slug: 'towing_basic_monthly',
    name: 'Speed',
    price: 299,
    period: 'monthly',
    category: 'towing',
    features: FALLBACK_FEATURES.speed,
    actionType: 'purchase',
  },
  {
    id: 'towing_premium_monthly',
    slug: 'towing_premium_monthly',
    name: 'Race',
    price: 599,
    period: 'monthly',
    category: 'towing',
    popular: true,
    features: FALLBACK_FEATURES.race,
    actionType: 'purchase',
  },
  {
    id: 'towing_family_monthly',
    slug: 'towing_family_monthly',
    name: 'Prime',
    price: 999,
    period: 'monthly',
    category: 'towing',
    features: FALLBACK_FEATURES.prime,
    actionType: 'purchase',
  },
  {
    id: 'driver_monthly',
    slug: 'driver_monthly',
    name: 'Premium',
    price: 1499,
    period: 'monthly',
    category: 'driver',
    features: FALLBACK_FEATURES.premium,
    actionType: 'purchase',
  },
];

export type PlanCategoryFilter = 'all' | 'towing' | 'driver';

export function presentCustomerPlan(plan: SubscriptionPlan): SubscriptionPlan {
  const slug = plan.slug ?? plan.id;
  const tier = PLAN_TIER_PRESENTATION[slug];
  if (!tier) return plan;
  return {
    ...plan,
    name: tier.displayName,
    description: tier.tagline,
    popular: tier.highlight ?? plan.popular,
  };
}

export function sortCustomerPlans(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return [...plans].sort((a, b) => {
    const sa = PLAN_TIER_PRESENTATION[a.slug ?? a.id]?.sortOrder ?? 99;
    const sb = PLAN_TIER_PRESENTATION[b.slug ?? b.id]?.sortOrder ?? 99;
    return sa - sb;
  });
}

export function filterPlansByCategory(
  plans: SubscriptionPlan[],
  category: PlanCategoryFilter,
): SubscriptionPlan[] {
  if (category === 'all') return plans;
  return plans.filter(p => p.category === category);
}
