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
 * 6 Core documents needed for initial application review.
 * Matches RACE Driver Registration Screen 3 & patterdata.md exactly.
 */
export const CORE_REVIEW_DOCUMENTS: DriverDocumentConfig[] = [
  {
    id: 'driving_license',
    title: 'Driving licence',
    subtitle: 'Front side',
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
    subtitle: 'Clear face photo',
    requirement: 'required',
    badgeLabel: 'Required',
    Icon: User,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    backendDocType: 'profile_photo',
  },
  {
    id: 'government_photo_id',
    title: 'Government photo ID',
    subtitle: 'Aadhaar or another accepted ID',
    requirement: 'required',
    badgeLabel: 'Required',
    Icon: Fingerprint,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    backendDocType: 'aadhaar_card',
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
    id: 'payout_details',
    title: 'Before first payout — PAN and bank details',
    subtitle: 'Can add later • needed before first payout',
    requirement: 'later',
    badgeLabel: 'Later',
    Icon: Landmark,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    backendDocType: 'pan_card',
  },
  {
    id: 'additional_checks',
    title: 'Additional checks — Police verification / medical fitness',
    subtitle: 'May be required based on your service category',
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
