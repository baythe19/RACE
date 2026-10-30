export const PROFILE_MENU_ROUTES = {
  personal: 'PersonalInformation',
  vehicles: 'MyVehicles',
  sos: 'SosDetails',
  locations: 'SavedLocations',
  payments: 'PaymentMethods',
  notifications: 'Notifications',
  support: 'HelpSupport',
} as const;

export type HelpFaqItem = { question: string; answer: string };

/** Grouped FAQs for Help & Support — flat list kept for any legacy imports. */
export const HELP_FAQ_SECTIONS: Array<{ title: string; items: HelpFaqItem[] }> = [
  {
    title: 'BOOKINGS',
    items: [
      {
        question: 'How do I book towing, driver hire, or roadside help?',
        answer:
          'From Home, choose a service, set pickup (and drop if needed), review the fare, then pay the advance to confirm. Nearby partners receive your offer.',
      },
      {
        question: 'Which areas do you serve?',
        answer:
          'We operate in Bhubaneswar and nearby Odisha cities. If a pin is outside the service zone, the app blocks checkout so we can fulfill reliably.',
      },
    ],
  },
  {
    title: 'PRICING & PAYMENTS',
    items: [
      {
        question: 'How is my fare calculated?',
        answer:
          'Fare uses distance, vehicle type, service mode (instant / scheduled / emergency), and package rules. You see the breakdown before paying. Advance is collected first; any balance is due at drop-off.',
      },
      {
        question: 'Can I cancel or get a refund?',
        answer:
          'Yes from Booking details while the trip is still cancellable. Refund amount depends on status (pending, confirmed, partner assigned). The policy is shown before you confirm cancellation.',
      },
    ],
  },
  {
    title: 'YOUR TRIP',
    items: [
      {
        question: 'How do I track my partner?',
        answer:
          'Open the booking and tap Track. Live map, ETA, and trip-start OTP appear once a partner accepts and is on the way.',
      },
    ],
  },
];

export const HELP_FAQ_ITEMS: HelpFaqItem[] = HELP_FAQ_SECTIONS.flatMap(section => section.items);

export const HELP_SELF_SERVE_LINKS = [
  {
    id: 'bookings',
    title: 'My bookings',
    subtitle: 'Status, track, cancel',
  },
  {
    id: 'payments',
    title: 'Payments & wallet',
    subtitle: 'UPI, balance, passbook',
  },
  {
    id: 'sos',
    title: 'SOS & emergency',
    subtitle: 'Contacts and vehicle QR',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Inbox & push alerts',
  },
] as const;

export type HelpSelfServeLinkId = (typeof HELP_SELF_SERVE_LINKS)[number]['id'];
