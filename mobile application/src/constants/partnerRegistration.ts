import type { LucideIcon } from 'lucide-react-native';

export interface PartnerRegistrationDocumentField {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
  Icon: LucideIcon;
}

export const DRIVER_REGISTRATION_STEPS = [
  'Personal Info',
  'Driver Details',
  'Documents',
  'Review',
] as const;

export const VENDOR_REGISTRATION_STEPS = [
  'Business',
  'Address',
  'Documents',
  'Review',
] as const;

export const VEHICLE_TYPE_OPTIONS = [
  'Flatbed Tow Truck',
  'Wheel Lift Tow Truck',
  'Recovery Vehicle',
  'Roadside Assistance Van',
  'Other',
];

export const INSURANCE_PROVIDER_OPTIONS = [
  'ICICI Lombard',
  'HDFC ERGO',
  'Bajaj Allianz',
  'New India Assurance',
  'Other',
];

export const BUSINESS_TYPE_OPTIONS = [
  'Private Limited Company',
  'Sole Proprietorship',
  'Partnership',
  'LLP',
  'Towing Company',
  'Roadside Assistance',
  'Other',
];

export const INDIAN_STATE_OPTIONS = [
  'Odisha',
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Gujarat',
  'Tamil Nadu',
  'Rajasthan',
  'West Bengal',
  'Uttar Pradesh',
  'Telangana',
  'Andhra Pradesh',
  'Kerala',
  'Madhya Pradesh',
  'Other',
];
