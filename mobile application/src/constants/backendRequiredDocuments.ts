/**
 * Mirrors backend REQUIRED_DOCUMENTS (vendorValidator.ts).
 * UI document ids map to backend documentType values used on upload.
 */
export const BACKEND_REQUIRED_DOCUMENTS: Record<string, string[]> = {
  // Vendor picks one identity proof + one business identity proof in the
  // registration UI (see VENDOR_IDENTITY_DOCUMENTS / VENDOR_BUSINESS_DOCUMENTS).
  towing_company: [],
  mechanic: [],
  tow_truck_driver: [
    'aadhaar',
    'pan',
    'driving_license',
    'selfie',
    'police_verification',
    'medical_certificate',
    'vehicle_insurance',
    'fitness_certificate',
    'puc',
  ],
  full_time_driver: [
    'aadhaar',
    'pan',
    'driving_license',
    'selfie',
    'police_verification',
    'medical_certificate',
  ],
  part_time_driver: ['aadhaar', 'pan', 'driving_license', 'selfie'],
};

const VENDOR_IDENTITY_TYPES = ['aadhaar', 'pan', 'driving_license', 'voter_id'];
const VENDOR_BUSINESS_TYPES = [
  'shop_license',
  'gst',
  'msme',
  'commercial_licence',
  'commercial_permit',
];

export function getMissingRequiredDocuments(
  vendorType: string,
  uploadedUiDocIds: string[],
): string[] {
  const uploadedBackendTypes = new Set(
    uploadedUiDocIds.map((id) => VENDOR_UI_TO_BACKEND_DOC[id] ?? id),
  );
  if (vendorType === 'towing_company' || vendorType === 'mechanic') {
    const missing: string[] = [];
    if (!VENDOR_IDENTITY_TYPES.some((type) => uploadedBackendTypes.has(type))) {
      missing.push('identity proof');
    }
    if (!VENDOR_BUSINESS_TYPES.some((type) => uploadedBackendTypes.has(type))) {
      missing.push('business identity proof');
    }
    return missing;
  }
  const required = BACKEND_REQUIRED_DOCUMENTS[vendorType] ?? [];
  return required.filter((type) => !uploadedBackendTypes.has(type));
}

/** Maps partner registration UI document ids → backend documentType */
export const VENDOR_UI_TO_BACKEND_DOC: Record<string, string> = {
  aadhaar: 'aadhaar',
  pan: 'pan',
  gst: 'gst',
  voter_id: 'voter_id',
  shop_license: 'shop_license',
  business_registration: 'shop_license',
  shop_photo: 'vehicle_photo',
  cancelled_cheque: 'cancelled_cheque',
  profile_photo: 'selfie',
  driving_license: 'driving_license',
  police_verification: 'police_verification',
  medical_certificate: 'medical_certificate',
  vehicle_insurance: 'vehicle_insurance',
  fitness_certificate: 'fitness_certificate',
  puc: 'puc',
  rc_book: 'commercial_permit',
  insurance: 'vehicle_insurance',
  vehicle_photo: 'vehicle_photo',
  bank_passbook: 'cancelled_cheque',
};

export function mapVendorTypeFromBusinessLabel(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('tow') && lower.includes('truck')) return 'tow_truck_driver';
  if (lower.includes('mechanic')) return 'mechanic';
  if (lower.includes('full')) return 'full_time_driver';
  if (lower.includes('part')) return 'part_time_driver';
  return 'towing_company';
}
