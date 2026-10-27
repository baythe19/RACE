import { Schema, model, type Document, Types } from 'mongoose';

export type SubscriptionAudience = 'customer' | 'vendor';
export type SubscriptionCategory = 'towing' | 'driver' | 'partner';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface IVendorPlanBenefits {
  /** Platform commission % when subscribed (e.g. 8). Falls back to global settings if unset. */
  commissionRate?: number;
  priorityLeads: boolean;
  featuredListing: boolean;
  performanceBadge: boolean;
  reducedCommission: boolean;
}

export interface ISubscriptionPlan extends Document {
  slug: string;
  name: string;
  audience: SubscriptionAudience;
  category: SubscriptionCategory;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  features: { text: string; included: boolean }[];
  benefits?: IVendorPlanBenefits;
  isMostPopular: boolean;
  actionType: 'purchase' | 'contact';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserSubscription extends Document {
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  planSlug: string;
  planName: string;
  audience: SubscriptionAudience;
  category: SubscriptionCategory;
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlanFeatureSchema = new Schema(
  { text: { type: String, required: true }, included: { type: Boolean, required: true } },
  { _id: false },
);

const VendorBenefitsSchema = new Schema(
  {
    commissionRate: { type: Number },
    priorityLeads: { type: Boolean, default: false },
    featuredListing: { type: Boolean, default: false },
    performanceBadge: { type: Boolean, default: false },
    reducedCommission: { type: Boolean, default: false },
  },
  { _id: false },
);

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    audience: { type: String, enum: ['customer', 'vendor'], required: true, default: 'customer', index: true },
    category: { type: String, enum: ['towing', 'driver', 'partner'], required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
    features: { type: [PlanFeatureSchema], default: [] },
    benefits: { type: VendorBenefitsSchema },
    isMostPopular: { type: Boolean, default: false },
    actionType: { type: String, enum: ['purchase', 'contact'], default: 'purchase' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const UserSubscriptionSchema = new Schema<IUserSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    planSlug: { type: String, required: true },
    planName: { type: String, required: true },
    audience: { type: String, enum: ['customer', 'vendor'], required: true, default: 'customer', index: true },
    category: { type: String, enum: ['towing', 'driver', 'partner'], required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

UserSubscriptionSchema.index({ userId: 1, audience: 1, category: 1, status: 1 });

/** P1: one ACTIVE subscription per user+audience+category — double-tap safe. */
UserSubscriptionSchema.index(
  { userId: 1, audience: 1, category: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

export const SubscriptionPlanModel = model<ISubscriptionPlan>(
  'SubscriptionPlan',
  SubscriptionPlanSchema,
);
export const UserSubscriptionModel = model<IUserSubscription>(
  'UserSubscription',
  UserSubscriptionSchema,
);
