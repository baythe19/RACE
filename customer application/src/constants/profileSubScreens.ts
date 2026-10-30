import type { LucideIcon } from 'lucide-react-native';
import {
  Bell,
  FileText,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  Shield,
  Smartphone,
  Trash2,
} from 'lucide-react-native';

export const PROFILE_MENU_ROUTES = {
  personal: 'PersonalInformation',
  vehicles: 'MyVehicles',
  sos: 'SosDetails',
  locations: 'SavedLocations',
  payments: 'PaymentMethods',
  notifications: 'Notifications',
  support: 'HelpSupport',
  settings: 'Settings',
} as const;

export const HELP_FAQ_ITEMS = [
  {
    question: 'How do I book a towing service?',
    answer:
      'From Home, tap Towing, set pickup and drop, review the fare, then pay the advance to confirm. A nearby partner gets your offer.',
  },
  {
    question: 'What areas do you cover?',
    answer:
      'We currently serve Bhubaneswar and nearby Odisha cities. Bookings outside the service area are blocked so we can fulfill them reliably.',
  },
  {
    question: 'How is the price calculated?',
    answer:
      'Fare uses distance, vehicle type, and service package. You see the breakdown before paying. Advance is collected first; the balance is due at drop-off.',
  },
  {
    question: 'Can I cancel my booking?',
    answer:
      'Yes from Booking details while the trip is still cancellable. Refund amount depends on status (pending / confirmed / driver assigned). Policy shows before you confirm.',
  },
  {
    question: 'How do I track my driver?',
    answer:
      'Open the booking and tap Track. Live map, ETA, and trip-start OTP appear when the driver is assigned and on the way.',
  },
] as const;

export type SettingsToggleId = 'push' | 'email' | 'sms' | 'emergency';

export type SettingsRow =
  | {
      id: string;
      title: string;
      subtitle?: string;
      Icon: LucideIcon;
      kind: 'nav';
      value?: string;
      danger?: boolean;
      muted?: boolean;
    }
  | {
      id: SettingsToggleId;
      title: string;
      subtitle?: string;
      Icon: LucideIcon;
      kind: 'toggle';
      defaultOn: boolean;
      locked?: boolean;
    };

export const SETTINGS_SECTIONS: Array<{
  title: string;
  items: SettingsRow[];
}> = [
  {
    title: 'ACCOUNT SETTINGS',
    items: [
      { id: 'pin', title: 'Change PIN', subtitle: 'Update your 4-digit PIN', Icon: KeyRound, kind: 'nav' },
      {
        id: 'password',
        title: 'Change Password',
        subtitle: 'For accounts with a password set',
        Icon: Lock,
        kind: 'nav',
      },
      {
        id: 'mobile',
        title: 'Change Mobile Number',
        subtitle: 'Update registered phone number',
        Icon: Smartphone,
        kind: 'nav',
      },
    ],
  },
  {
    title: 'NOTIFICATION SETTINGS',
    items: [
      {
        id: 'push',
        title: 'Push Notifications',
        subtitle: 'Booking updates & offers',
        Icon: Bell,
        kind: 'toggle',
        defaultOn: true,
      },
      {
        id: 'email',
        title: 'Email Notifications',
        subtitle: 'Receipts & newsletters',
        Icon: Mail,
        kind: 'toggle',
        defaultOn: false,
      },
      {
        id: 'sms',
        title: 'SMS Alerts',
        subtitle: 'OTP & booking alerts',
        Icon: MessageCircle,
        kind: 'toggle',
        defaultOn: true,
      },
      {
        id: 'emergency',
        title: 'Emergency Alerts',
        subtitle: 'SOS & critical updates',
        Icon: Shield,
        kind: 'toggle',
        defaultOn: true,
        locked: true,
      },
    ],
  },
  {
    title: 'ACCOUNT ACTIONS',
    items: [
      {
        id: 'delete',
        title: 'Delete Account',
        subtitle: 'Request removal via support',
        Icon: Trash2,
        kind: 'nav',
        danger: true,
      },
    ],
  },
  {
    title: 'APP INFO',
    items: [
      { id: 'version', title: 'Version', Icon: FileText, kind: 'nav', value: '1.0.0', muted: true },
      { id: 'terms', title: 'Terms & Conditions', Icon: FileText, kind: 'nav', muted: true },
      { id: 'privacy', title: 'Privacy Policy', Icon: Shield, kind: 'nav', muted: true },
    ],
  },
];
