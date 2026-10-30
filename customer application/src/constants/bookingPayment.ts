import type { LucideIcon } from 'lucide-react-native';
import { Smartphone, Wallet } from 'lucide-react-native';

export type BookingPaymentFlow = 'towing' | 'driver' | 'roadside';

export type PaymentMethodId = 'wallet' | 'upi' | 'gpay' | 'cash';

export type PaymentMethodOption = {
  id: PaymentMethodId;
  label: string;
  subtitle: string;
  Icon: LucideIcon;
};

/** Booking flows only — no credit/debit card (profile Payment Methods stays unchanged). */
export const BOOKING_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'wallet', label: 'RACE Wallet', subtitle: '₹1,250 available', Icon: Wallet },
  { id: 'upi', label: 'UPI', subtitle: 'PhonePe / GPay / Paytm', Icon: Smartphone },
  {
    id: 'gpay',
    label: 'Google Pay',
    subtitle: 'Coming soon · launches after MVP',
    Icon: Smartphone,
  },
];

