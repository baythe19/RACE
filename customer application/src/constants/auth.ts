export const AUTH_USER = {
  name: 'Rahul Kumar',
  phone: '+91 82494 72910',
  email: 'rahul.kumar@gmail.com',
};

/** Demo: registered returning user (10-digit mobile without country code) */
export const REGISTERED_PHONE_DIGITS = '8249472910';

/** Prefer Om Singh for partner demo login UI (legacy constant; prefer real HanuSMS OTP login). */
export const PARTNER_DEMO_PHONE = '8888880001';

/** @deprecated Fixed OTP removed — backend sends real HanuSMS OTP. */
export const DEMO_OTP = '';

/** Legacy seed phones — not used for login shortcuts anymore. */
export const PARTNER_DEMO_DRIVERS = [
  { name: 'Om Singh', phone: '8888880001', type: 'Tow Driver' },
  { name: 'Ramesh', phone: '8888880002', type: 'Full-Time Driver' },
  { name: 'Vaibhav', phone: '8888880003', type: 'Part-Time Driver' },
] as const;

export const DEMO_PIN = '1234';

export const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: '24/7 Roadside Assistance',
    subtitle:
      'Fast, reliable and professional help when you need it most.',
    image: 'truck' as const,
  },
  {
    id: '2',
    title: 'Trusted & Verified Experts',
    subtitle:
      'Our professionals are verified, trained and ready to assist.',
    image: 'driver' as const,
  },
  {
    id: '3',
    title: 'Quick Response Near You',
    subtitle: 'We reach you quickly with our nearby service network.',
    image: 'map' as const,
  },
  {
    id: '4',
    title: '24/7 Support Always Available',
    subtitle: "We're here for you anytime, anywhere.",
    image: 'support' as const,
  },
];

export const VEHICLE_TYPES = [
  { id: 'car', label: 'Car', icon: 'Car' as const },
  { id: 'bike', label: 'Bike', icon: 'Bike' as const },
  { id: 'ev', label: 'EV', icon: 'Car' as const },
  { id: 'truck', label: 'Truck', icon: 'Truck' as const },
  { id: 'auto', label: 'Auto', icon: 'Car' as const },
  { id: 'bus', label: 'Bus', icon: 'Bus' as const },
  { id: 'other', label: 'Other', icon: 'Car' as const },
];

export const VEHICLE_COLORS = [
  '#FFFFFF',
  '#9E9E9E',
  '#000000',
  '#C0C0C0',
  '#EF4444',
  '#3B82F6',
  '#6B7280',
];

export const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'Other'];

export const QR_ACTIONS = [
  { icon: 'Phone' as const, label: 'Contact Owner' },
  { icon: 'AlertCircle' as const, label: 'Emergency Alert' },
  { icon: 'Truck' as const, label: 'Request Towing' },
  { icon: 'MapPin' as const, label: 'Share Location' },
  { icon: 'Hospital' as const, label: 'Emergency Help' },
];
