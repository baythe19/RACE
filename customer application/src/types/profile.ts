export type SavedLocationType = 'home' | 'office' | 'custom';

export interface SavedLocation {
  id: string;
  type: SavedLocationType;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export type PaymentMethodType = 'upi' | 'card' | 'netbanking' | 'wallet';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  details: string;
  isDefault?: boolean;
  provider?: string;
}

export interface WalletBalance {
  balance: number;
  currency: string;
}

export type NotificationCategory = 'booking' | 'payment' | 'offers' | 'subscription' | 'general';

export interface NotificationPreference {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  category: NotificationCategory;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  read: boolean;
  createdAt: string;
  /** Raw backend metadata — booking rows carry bookingId/bookingType for deep links. */
  metadata?: Record<string, string>;
}

export interface AppSettings {
  language: string;
  darkMode: boolean;
  pushEnabled: boolean;
}

export type SubscriptionPlanId = string;

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  slug?: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: Array<{ label: string; included: boolean }>;
  popular?: boolean;
  description?: string;
  category?: string;
  actionType?: string;
}

export interface UserSubscription {
  planId: SubscriptionPlanId;
  planName?: string;
  status: 'active' | 'expired' | 'none' | 'cancelled';
  expiresAt?: string;
}
