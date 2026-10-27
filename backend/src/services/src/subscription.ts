import { ConflictError, NotFoundError } from '../../utils/src/errors';
import { notificationService } from './notification';
import {
  SubscriptionPlanModel,
  UserSubscriptionModel,
  type ISubscriptionPlan,
  type IUserSubscription,
  type IVendorPlanBenefits,
} from '../../models/src/subscription';
import type {
  PlanResponseDto,
  SubscribeDto,
  UserSubscriptionResponseDto,
} from './subscriptionValidator';

type BillingCycle = 'monthly' | 'yearly';

/** Canonical RACE plans — customer towing/driver + vendor partner tiers. */
export const DEFAULT_PLANS = [
  {
    slug: 'towing_basic_monthly',
    name: 'Basic',
    audience: 'customer' as const,
    category: 'towing' as const,
    price: 299,
    billingCycle: 'monthly' as const,
    features: [
      { text: '2 Towing requests/month', included: true },
      { text: '30 min response time', included: true },
      { text: 'Standard support', included: true },
      { text: 'Priority dispatch', included: false },
      { text: 'Free roadside assistance', included: false },
    ],
    isMostPopular: false,
    actionType: 'purchase' as const,
  },
  {
    slug: 'towing_premium_monthly',
    name: 'Premium',
    audience: 'customer' as const,
    category: 'towing' as const,
    price: 599,
    billingCycle: 'monthly' as const,
    features: [
      { text: '5 Towing requests/month', included: true },
      { text: 'Priority 15 min response', included: true },
      { text: '24/7 Priority support', included: true },
      { text: 'Free roadside assistance', included: true },
      { text: 'Family coverage', included: false },
    ],
    isMostPopular: true,
    actionType: 'purchase' as const,
  },
  {
    slug: 'towing_family_monthly',
    name: 'Family',
    audience: 'customer' as const,
    category: 'towing' as const,
    price: 999,
    billingCycle: 'monthly' as const,
    features: [
      { text: 'Unlimited towing requests', included: true },
      { text: 'Up to 4 family vehicles', included: true },
      { text: 'Priority 10 min response', included: true },
      { text: '24/7 VIP support', included: true },
      { text: 'Free roadside assistance', included: true },
    ],
    isMostPopular: false,
    actionType: 'purchase' as const,
  },
  {
    slug: 'driver_monthly',
    name: 'Monthly Driver Package',
    audience: 'customer' as const,
    category: 'driver' as const,
    price: 1499,
    billingCycle: 'monthly' as const,
    features: [
      { text: 'Up to 4 hours/day included', included: true },
      { text: 'Professional & verified drivers', included: true },
      { text: 'Hatchback / Sedan / SUV packages', included: true },
      { text: '24/7 customer support', included: true },
    ],
    isMostPopular: true,
    actionType: 'purchase' as const,
  },
  {
    slug: 'driver_corporate_monthly',
    name: 'Corporate Package',
    audience: 'customer' as const,
    category: 'driver' as const,
    price: 4999,
    billingCycle: 'monthly' as const,
    features: [
      { text: 'Dedicated account manager', included: true },
      { text: 'Priority booking & support', included: true },
      { text: 'Custom billing & invoicing', included: true },
      { text: 'Fleet-ready driver coverage', included: true },
    ],
    isMostPopular: false,
    actionType: 'contact' as const,
  },
  {
    slug: 'vendor_starter_monthly',
    name: 'Partner Starter',
    audience: 'vendor' as const,
    category: 'partner' as const,
    price: 999,
    billingCycle: 'monthly' as const,
    features: [
      { text: 'Reduced commission (10%)', included: true },
      { text: 'Priority leads', included: false },
      { text: 'Featured listing', included: false },
      { text: 'Performance badge', included: false },
    ],
    benefits: {
      commissionRate: 10,
      reducedCommission: true,
      priorityLeads: false,
      featuredListing: false,
      performanceBadge: false,
    },
    isMostPopular: false,
    actionType: 'purchase' as const,
  },
  {
    slug: 'vendor_pro_monthly',
    name: 'Partner Pro',
    audience: 'vendor' as const,
    category: 'partner' as const,
    price: 2499,
    billingCycle: 'monthly' as const,
    features: [
      { text: 'Reduced commission (8%)', included: true },
      { text: 'Priority leads', included: true },
      { text: 'Featured listing', included: true },
      { text: 'Performance badge', included: false },
    ],
    benefits: {
      commissionRate: 8,
      reducedCommission: true,
      priorityLeads: true,
      featuredListing: true,
      performanceBadge: false,
    },
    isMostPopular: true,
    actionType: 'purchase' as const,
  },
  {
    slug: 'vendor_elite_monthly',
    name: 'Partner Elite',
    audience: 'vendor' as const,
    category: 'partner' as const,
    price: 4999,
    billingCycle: 'monthly' as const,
    features: [
      { text: 'Reduced commission (5%)', included: true },
      { text: 'Priority leads', included: true },
      { text: 'Featured listing', included: true },
      { text: 'Performance badge', included: true },
    ],
    benefits: {
      commissionRate: 5,
      reducedCommission: true,
      priorityLeads: true,
      featuredListing: true,
      performanceBadge: true,
    },
    isMostPopular: false,
    actionType: 'purchase' as const,
  },
];

function mapPlan(plan: ISubscriptionPlan): PlanResponseDto {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    audience: plan.audience ?? 'customer',
    category: plan.category,
    price: plan.price,
    currency: plan.currency,
    billingCycle: plan.billingCycle,
    features: plan.features,
    benefits: plan.benefits
      ? {
          commissionRate: plan.benefits.commissionRate,
          priorityLeads: Boolean(plan.benefits.priorityLeads),
          featuredListing: Boolean(plan.benefits.featuredListing),
          performanceBadge: Boolean(plan.benefits.performanceBadge),
          reducedCommission: Boolean(plan.benefits.reducedCommission),
        }
      : undefined,
    isMostPopular: plan.isMostPopular,
    actionType: plan.actionType,
  };
}

function mapUserSub(sub: IUserSubscription): UserSubscriptionResponseDto {
  return {
    id: sub.id,
    planSlug: sub.planSlug,
    planName: sub.planName,
    audience: sub.audience ?? 'customer',
    category: sub.category,
    billingCycle: sub.billingCycle,
    price: sub.price,
    currency: sub.currency,
    status: sub.status,
    startedAt: sub.startedAt.toISOString(),
    expiresAt: sub.expiresAt.toISOString(),
  };
}

/** P2: add a billing cycle without month-end drift (Jan 31 + 1mo = Feb 28). */
function addCycle(from: Date, billingCycle: BillingCycle): Date {
  const to = new Date(from);
  if (billingCycle === 'yearly') {
    to.setFullYear(to.getFullYear() + 1);
    return to;
  }
  const dayOfMonth = to.getDate();
  to.setMonth(to.getMonth() + 1);
  const daysInTargetMonth = new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate();
  to.setDate(Math.min(dayOfMonth, daysInTargetMonth));
  return to;
}

export class SubscriptionService {
  /** P3: seed once per process — plans are static; skip the 8 upserts per request. */
  private plansSeededAt: Date | null = null;
  private static PLANS_SEED_TTL_MS = 10 * 60 * 1000;

  private async ensurePlansSeededFresh(): Promise<void> {
    if (
      this.plansSeededAt &&
      Date.now() - this.plansSeededAt.getTime() < SubscriptionService.PLANS_SEED_TTL_MS
    ) {
      return;
    }
    await this.ensurePlansSeeded();
    this.plansSeededAt = new Date();
  }

  /** Upsert canonical plans so admin seed and runtime stay aligned. */
  async ensurePlansSeeded(): Promise<void> {
    for (const plan of DEFAULT_PLANS) {
      await SubscriptionPlanModel.findOneAndUpdate(
        { slug: plan.slug },
        {
          $set: {
            name: plan.name,
            audience: plan.audience,
            category: plan.category,
            price: plan.price,
            currency: 'INR',
            billingCycle: plan.billingCycle,
            features: plan.features,
            benefits: 'benefits' in plan ? plan.benefits : undefined,
            isMostPopular: plan.isMostPopular,
            actionType: plan.actionType,
            isActive: true,
          },
        },
        { upsert: true, new: true },
      );
    }

    // Deactivate legacy conflicting demo slugs if present
    await SubscriptionPlanModel.updateMany(
      {
        slug: {
          $in: [
            'customer-basic',
            'customer-plus',
            'customer-annual',
            'vendor-starter',
            'vendor-pro',
            'vendor-enterprise',
          ],
        },
      },
      { $set: { isActive: false } },
    );
  }

  async listPlans(filters?: {
    billingCycle?: string;
    audience?: string;
    category?: string;
  }): Promise<PlanResponseDto[]> {
    await this.ensurePlansSeededFresh();
    const filter: Record<string, unknown> = { isActive: true };
    if (filters?.billingCycle) filter.billingCycle = filters.billingCycle;
    if (filters?.audience) filter.audience = filters.audience;
    if (filters?.category) filter.category = filters.category;
    const plans = await SubscriptionPlanModel.find(filter).sort({
      audience: 1,
      category: 1,
      price: 1,
    });
    return plans.map(mapPlan);
  }

  async getUserSubscription(
    userId: string,
    options?: { audience?: string; category?: string },
  ): Promise<UserSubscriptionResponseDto | null> {
    const query: Record<string, unknown> = {
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    };
    if (options?.audience) query.audience = options.audience;
    if (options?.category) query.category = options.category;

    const sub = await UserSubscriptionModel.findOne(query).sort({ createdAt: -1 });
    return sub ? mapUserSub(sub) : null;
  }

  async listUserSubscriptions(userId: string): Promise<UserSubscriptionResponseDto[]> {
    const subs = await UserSubscriptionModel.find({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    return subs.map(mapUserSub);
  }

  async subscribe(userId: string, dto: SubscribeDto): Promise<UserSubscriptionResponseDto> {
    await this.ensurePlansSeededFresh();

    const plan = await SubscriptionPlanModel.findOne({
      slug: dto.planSlug,
      isActive: true,
    });

    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    if (plan.actionType === 'contact') {
      throw new ConflictError('Please contact support for corporate plans');
    }

    // P1 race-safe duplicate guard: atomic check inside the unique-index scope.
    // The partial unique index {userId, audience, category} on active subs is
    // the hard guarantee; this pre-check just gives a friendly message first.
    const existing = await this.getUserSubscription(userId, {
      audience: plan.audience,
      category: plan.category,
    });
    if (existing) {
      throw new ConflictError(
        `You already have an active ${plan.category} subscription. Cancel it before switching plans.`,
      );
    }

    const billingCycle = dto.billingCycle ?? plan.billingCycle;
    const price =
      billingCycle === 'yearly' ? Math.round(plan.price * 12 * 0.8) : plan.price;

    const startedAt = new Date();
    const expiresAt = addCycle(startedAt, billingCycle);

    try {
      const sub = await UserSubscriptionModel.create({
        userId,
        planId: plan.id,
        planSlug: plan.slug,
        planName: plan.name,
        audience: plan.audience,
        category: plan.category,
        billingCycle,
        price,
        currency: plan.currency,
        status: 'active',
        startedAt,
        expiresAt,
      });

      await notificationService.createForUser(userId, {
        type: 'SUBSCRIPTION',
        title: 'Subscription Activated',
        message: `Your ${plan.name} plan is now active until ${expiresAt.toLocaleDateString()}.`,
        metadata: { planSlug: plan.slug },
      });

      return mapUserSub(sub);
    } catch (error) {
      // P1: concurrent double-tap lost the race against the partial unique
      // index — surface the same friendly conflict as the pre-check.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000
      ) {
        throw new ConflictError(
          `You already have an active ${plan.category} subscription. Cancel it before switching plans.`,
        );
      }
      throw error;
    }
  }

  async cancel(
    userId: string,
    options?: { category?: string },
  ): Promise<UserSubscriptionResponseDto> {
    const query: Record<string, unknown> = { userId, status: 'active' };
    if (options?.category) query.category = options.category;

    const sub = await UserSubscriptionModel.findOne(query).sort({ createdAt: -1 });

    if (!sub) {
      throw new NotFoundError('No active subscription found');
    }

    sub.status = 'cancelled';
    sub.cancelledAt = new Date();
    await sub.save();

    return mapUserSub(sub);
  }

  /** Active vendor plan benefits for commission / lead ranking. */
  async getVendorBenefits(vendorUserId: string): Promise<IVendorPlanBenefits | null> {
    const sub = await UserSubscriptionModel.findOne({
      userId: vendorUserId,
      audience: 'vendor',
      status: 'active',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!sub) return null;

    const plan = await SubscriptionPlanModel.findById(sub.planId);
    return plan?.benefits ?? null;
  }
}

export const subscriptionService = new SubscriptionService();
