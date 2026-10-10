import {
  Building2,
  Camera,
  Car,
  CreditCard,
  FileText,
  Fingerprint,
  IdCard,
  Shield,
  Store,
  User,
} from 'lucide-react-native';

import type { PartnerDocumentFieldConfig } from '../components/partner/PartnerDocumentUploadList';

export const VENDOR_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  {
    id: 'aadhaar',
    label: 'Aadhaar Card',
    hint: 'Government issued ID proof.',
    required: true,
    Icon: Fingerprint,
  },
  {
    id: 'pan',
    label: 'PAN Card',
    hint: 'Permanent Account Number.',
    required: true,
    Icon: IdCard,
  },
  {
    id: 'gst',
    label: 'GST Certificate',
    hint: 'Goods and Services Tax registration.',
    required: false,
    Icon: FileText,
  },
  {
    id: 'business_registration',
    label: 'Business Registration Certificate',
    hint: 'Company / firm registration proof.',
    required: true,
    Icon: Building2,
  },
  {
    id: 'shop_photo',
    label: 'Shop / Office Photo',
    hint: 'Clear photo of your shop or office.',
    required: true,
    Icon: Store,
  },
  {
    id: 'cancelled_cheque',
    label: 'Cancelled Cheque / Passbook',
    hint: 'Bank account proof.',
    required: true,
    Icon: CreditCard,
  },
  {
    id: 'msme',
    label: 'MSME / Udyam Registration',
    hint: 'Optional government business registration.',
    required: false,
    Icon: FileText,
  },
  {
    id: 'profile_photo',
    label: 'Profile Photo',
    hint: 'Your passport size photo.',
    required: true,
    Icon: Camera,
  },
];

export const DRIVER_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  { id: 'aadhaar', label: 'Aadhaar Card', hint: 'Upload front side', required: true, Icon: Fingerprint },
  { id: 'pan', label: 'PAN Card', required: true, Icon: IdCard },
  { id: 'driving_license', label: 'Driving License', required: true, Icon: IdCard },
  { id: 'rc_book', label: 'RC Book', required: true, Icon: FileText },
  { id: 'insurance', label: 'Insurance Certificate', required: true, Icon: Shield },
  { id: 'vehicle_photo', label: 'Vehicle Photo', required: true, Icon: Car },
  { id: 'profile_photo', label: 'Profile Photo', required: true, Icon: User },
  {
    id: 'bank_passbook',
    label: 'Bank Details / Passbook',
    required: true,
    Icon: CreditCard,
  },
  {
    id: 'police_verification',
    label: 'Police Verification Certificate',
    hint: 'Police clearance certificate (optional).',
    required: false,
    Icon: Shield,
  },
  {
    id: 'medical_fitness',
    label: 'Medical Fitness Certificate',
    hint: 'Doctor fitness certificate (optional).',
    required: false,
    Icon: FileText,
  },
];

export function getRequiredDocumentIds(documents: PartnerDocumentFieldConfig[]): string[] {
  return documents.filter((doc) => doc.required).map((doc) => doc.id);
}
