import {
  Bell,
  Car,
  CreditCard,
  Headphones,
  MapPin,
  Siren,
  User as UserIcon,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

export const PROFILE_MENU_ITEMS: Array<{
  id: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}> = [
  {
    id: 'personal',
    title: 'Personal Information',
    subtitle: 'Update your details',
    Icon: UserIcon,
  },
  {
    id: 'vehicles',
    title: 'My Vehicles',
    subtitle: 'Manage your vehicles',
    Icon: Car,
  },
  {
    id: 'sos',
    title: 'SOS Details',
    subtitle: 'Emergency contacts & vehicle info',
    Icon: Siren,
  },
  {
    id: 'locations',
    title: 'Saved Locations',
    subtitle: 'Home, Work and other places',
    Icon: MapPin,
  },
  {
    id: 'payments',
    title: 'Payment Methods',
    subtitle: 'Cards, UPI and Wallets',
    Icon: CreditCard,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Inbox & alert preferences',
    Icon: Bell,
  },
  {
    id: 'support',
    title: 'Help & Support',
    subtitle: 'FAQs, chat & account help',
    Icon: Headphones,
  },
];
