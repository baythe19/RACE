export type HighlightIcon = 'clock' | 'phone' | 'live';

export interface Highlight {
  id: string;
  value: string;
  label: string;
  icon: HighlightIcon;
}

export interface Brand {
  name: string;
  productName: string;
  website: string;
  tagline: string;
  description: string;
  location: string;
  phone: string;
  phoneRaw: string;
  email: string;
  company: string;
  highlights: Highlight[];
  features: string[];
}

export interface Profile {
  id: string;
  mobileNumber: string;
  fullName?: string;
  email?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string;
  emergencyContact?: {
    name: string;
    mobileNumber: string;
    relationship?: string;
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  profilePhoto?: string;
  isVerified: boolean;
  isProfileCompleted: boolean;
  role: 'customer' | 'vendor' | 'driver';
  isAvailable?: boolean;
}

export interface Service {
  id: string;
  label: string;
  description?: string;
}

export type CategoryId = 'towing' | 'driver' | 'roadside' | 'future';

export interface ServiceCategory {
  id: CategoryId;
  title: string;
  icon: string;
  description?: string;
  services: Service[];
}

export interface CategoryTheme {
  background: string;
  accent: string;
  iconBackground: string;
}

export type LogoSize = 'small' | 'medium' | 'large';

export type ButtonVariant = 'primary' | 'outline';

export interface User {
  name: string;
  phone: string;
  email: string;
  avatar: string | null;
  isVerified: boolean;
  isPremium: boolean;
  wallet: number;
  coupons: number;
  rewards: number;
  invoices: number;
}

export interface Vehicle {
  id: string;
  type: string;
  brand: string;
  model: string;
  number: string;
  color: string;
  fuel: string;
  isPrimary: boolean;
}

export interface BookingDriver {
  name: string;
  rating?: number;
  photo: string | null;
  experience?: string;
  /** Driver mobile for Call on active cards; falls back to support if missing. */
  phone?: string;
}

export interface ActiveBookingLocation {
  primary: string;
  secondary?: string;
}

export interface ActiveBooking {
  id: string;
  displayId: string;
  service: string;
  status: string;
  pickup: ActiveBookingLocation;
  /** Omitted when service is on-site at pickup only. */
  drop?: ActiveBookingLocation | null;
  eta: string;
  driver: BookingDriver;
  bookingType: 'towing' | 'driver';
  bookingKind?: 'towing' | 'driver' | 'roadside';
  dispatchHint?: string;
  tripStartOtp?: string;
}

export interface BookingHistoryItem {
  id: string;
  displayId: string;
  service: string;
  date: string;
  location: string;
  amount: number;
  status: string;
  bookingType: 'towing' | 'driver';
}

export interface PricedService {
  id: string;
  name: string;
  description: string;
  price: number;
  unit?: string;
  icon: string;
}

export interface FutureService {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  icon: string;
  type: string;
}

export interface SavedLocation {
  id: string;
  label: string;
  address: string;
  icon: string;
}

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  isPopular?: boolean;
  features: PlanFeature[] | string[];
}

export interface SavedCard {
  type: string;
  last4: string;
  holder: string;
  expiry: string;
  isDefault: boolean;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  label: string;
  date: string;
  amount: number;
}

export interface PaymentData {
  walletBalance: number;
  savedCard: SavedCard;
  upi: string;
  transactions: WalletTransaction[];
}

export interface BookingDetailPayment {
  baseFare: number;
  distanceCharge: number;
  platformFee: number;
  total: number;
  method: string;
}

export interface BookingDetail {
  id: string;
  status: string;
  date: string;
  service: string;
  subService: string;
  vehicle: string;
  towingType: string;
  pickup: string;
  drop: string;
  time: string;
  duration: string;
  distance: string;
  driver: Omit<BookingDriver, 'photo'>;
  payment: BookingDetailPayment;
}
