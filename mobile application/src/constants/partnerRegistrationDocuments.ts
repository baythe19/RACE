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
import { VENDOR_UI_TO_BACKEND_DOC } from './backendRequiredDocuments';

export const VENDOR_CORE_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  {
    id: 'aadhaar',
    label: 'Aadhaar Card',
    hint: 'Front & back of owner / partner Aadhaar',
    required: true,
    Icon: Fingerprint,
  },
  {
    id: 'pan',
    label: 'PAN Card',
    hint: 'Owner / Business PAN card',
    required: true,
    Icon: IdCard,
  },
  {
    id: 'business_registration',
    label: 'Business Registration Certificate',
    hint: 'Trade licence / Company / Firm registration proof',
    required: true,
    Icon: Building2,
  },
  {
    id: 'gst',
    label: 'GST Certificate',
    hint: 'GST registration certificate (REG-06)',
    required: true,
    Icon: FileText,
  },
];

export const VENDOR_OPTIONAL_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  {
    id: 'msme',
    label: 'MSME / Udyam Certificate',
    hint: 'For priority business verification',
    required: false,
    Icon: FileText,
  },
  {
    id: 'cancelled_cheque',
    label: 'Cancelled Cheque / Bank Passbook',
    hint: 'Needed for business earnings payout',
    required: false,
    Icon: CreditCard,
  },
];

export const VENDOR_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  ...VENDOR_CORE_DOCUMENTS,
  ...VENDOR_OPTIONAL_DOCUMENTS,
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

/** Vendor identity bucket — owner/company identity proof (pick one). */
export const VENDOR_IDENTITY_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  {
    id: 'aadhaar',
    label: 'Aadhaar Card',
    hint: 'Government issued identity proof.',
    required: false,
    Icon: Fingerprint,
  },
  {
    id: 'pan',
    label: 'PAN Card',
    hint: 'Permanent Account Number of owner / company.',
    required: false,
    Icon: IdCard,
  },
  {
    id: 'driving_license',
    label: 'Driving License',
    hint: 'Owner or authorised person.',
    required: false,
    Icon: IdCard,
  },
  {
    id: 'voter_id',
    label: 'Voter ID',
    hint: 'Election photo identity card.',
    required: false,
    Icon: User,
  },
];

/** Vendor business bucket — business proof (pick one). */
export const VENDOR_BUSINESS_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  {
    id: 'business_registration',
    label: 'Business Registration Certificate',
    hint: 'Company / firm registration.',
    required: false,
    Icon: Building2,
  },
  {
    id: 'gst',
    label: 'GST Certificate',
    hint: 'Goods and Services Tax registration.',
    required: false,
    Icon: FileText,
  },
  {
    id: 'shop_license',
    label: 'Shop & Establishment License',
    hint: 'Municipal / trade license.',
    required: false,
    Icon: Store,
  },
  {
    id: 'msme',
    label: 'MSME / Udyam Registration',
    hint: 'Government business registration.',
    required: false,
    Icon: FileText,
  },
];

export const VENDOR_IDENTITY_DOC_IDS = VENDOR_IDENTITY_DOCUMENTS.map((d) => d.id);
export const VENDOR_BUSINESS_DOC_IDS = VENDOR_BUSINESS_DOCUMENTS.map((d) => d.id);

export function isSameDocId(incomingId: string, sourceId: string): boolean {
  if (incomingId === sourceId) return true;
  return VENDOR_UI_TO_BACKEND_DOC[incomingId] === VENDOR_UI_TO_BACKEND_DOC[sourceId];
}

export function getVendorDocumentTypeLabel(id: string): string {
  const all = [...VENDOR_IDENTITY_DOCUMENTS, ...VENDOR_BUSINESS_DOCUMENTS, ...VENDOR_DOCUMENTS];
  return all.find((doc) => isSameDocId(doc.id, id))?.label ?? id.replace(/_/g, ' ');
}
