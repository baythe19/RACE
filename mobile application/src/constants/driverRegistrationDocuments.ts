import type { LucideIcon } from 'lucide-react-native';
import {
  Building2,
  Calendar,
  Camera,
  Car,
  CreditCard,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  IdCard,
  Landmark,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Truck,
  User,
  UserCheck,
} from 'lucide-react-native';

export type DocumentRequirementType = 'required' | 'conditional' | 'later';

export interface DriverDocumentConfig {
  id: string;
  title: string;
  subtitle: string;
  requirement: DocumentRequirementType;
  badgeLabel: string;
  Icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  backendDocType: string;
}

/**
 * 4 Core documents needed for initial application review.
 * Driver provides Driving Licence, Profile Photo, Aadhaar Card, and PAN Card upfront.
 */
export const CORE_REVIEW_DOCUMENTS: DriverDocumentConfig[] = [
  {
    id: 'driving_license',
    title: 'Driving licence photo',
    subtitle: 'Front side photo of your valid DL',
    requirement: 'required',
    badgeLabel: 'Required',
    Icon: IdCard,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    backendDocType: 'driving_license',
  },
  {
    id: 'profile_photo',
    title: 'Profile photo',
    subtitle: 'Clear, well-lit front face photo',
    requirement: 'required',
    badgeLabel: 'Required',
    Icon: User,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    backendDocType: 'profile_photo',
  },
  {
    id: 'aadhaar_card',
    title: 'Aadhaar card',
    subtitle: 'Front & back of Aadhaar for identity verification',
    requirement: 'required',
    badgeLabel: 'Required',
    Icon: Fingerprint,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    backendDocType: 'aadhaar_card',
  },
  {
    id: 'pan_card',
    title: 'PAN card',
    subtitle: 'PAN card for identity and payout confirmation',
    requirement: 'required',
    badgeLabel: 'Required',
    Icon: CreditCard,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    backendDocType: 'pan_card',
  },
];

/**
 * Conditional documents requested based on vehicle category & ownership.
 */
export const CONDITIONAL_DOCUMENTS: DriverDocumentConfig[] = [];

/**
 * Deferred documents that can be completed before first payout or when requested.
 */
export const LATER_DOCUMENTS: DriverDocumentConfig[] = [
  {
    id: 'bank_details',
    title: 'Bank account / Passbook',
    subtitle: 'Can add now or before first payout',
    requirement: 'later',
    badgeLabel: 'Optional',
    Icon: Landmark,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    backendDocType: 'cancelled_cheque',
  },
  {
    id: 'additional_checks',
    title: 'Additional checks — Police verification / fitness',
    subtitle: 'Only if requested by verification team',
    requirement: 'later',
    badgeLabel: 'If requested',
    Icon: Stethoscope,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    backendDocType: 'police_verification',
  },
];

export const ALL_DRIVER_DOCUMENTS: DriverDocumentConfig[] = [
  ...CORE_REVIEW_DOCUMENTS,
  ...CONDITIONAL_DOCUMENTS,
  ...LATER_DOCUMENTS,
];

export function getRequiredDriverDocumentIds(): string[] {
  return CORE_REVIEW_DOCUMENTS.map((doc) => doc.id);
}
