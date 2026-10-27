export function mapActivityType(entityType: string): 'vendor' | 'driver' | 'booking' | 'payment' | 'customer' | 'system' {
  if (entityType.includes('vendor')) return 'vendor';
  if (entityType.includes('driver')) return 'driver';
  if (entityType.includes('booking')) return 'booking';
  if (entityType.includes('transaction') || entityType.includes('payment')) return 'payment';
  if (entityType.includes('customer') || entityType.includes('user')) return 'customer';
  return 'system';
}

export function driverInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'DR'
  );
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function mapVendorTypeLabel(type?: string): string {
  if (!type) return '—';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mapLocationPoint(loc?: {
  label?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}) {
  return {
    address: loc?.address ?? loc?.label ?? '—',
    lat: loc?.latitude ?? 20.2961,
    lng: loc?.longitude ?? 85.8245,
  };
}

export function mapDocStatus(status: string): 'VERIFIED' | 'PENDING' | 'REJECTED' {
  if (status === 'VERIFIED') return 'VERIFIED';
  if (status === 'REJECTED') return 'REJECTED';
  return 'PENDING';
}

export function mapVerificationStage(
  stage?: string,
  status?: string,
): 'VERIFIED' | 'PENDING' | 'REJECTED' {
  if (stage === 'rejected' || status === 'rejected') return 'REJECTED';
  if (stage === 'approved' && status === 'approved') return 'VERIFIED';
  return 'PENDING';
}

export function mapVerificationStageLabel(stage?: string): string {
  if (!stage) return 'Not submitted';
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function deriveDocumentsStatus(
  documents: Array<{ status: string }>,
): 'VERIFIED' | 'PENDING' | 'REJECTED' {
  if (!documents.length) return 'PENDING';
  if (documents.some((doc) => doc.status === 'REJECTED')) return 'REJECTED';
  if (documents.every((doc) => doc.status === 'VERIFIED')) return 'VERIFIED';
  return 'PENDING';
}

export function buildVendorDocuments(vendor: {
  _id: { toString(): string };
  status: string;
  verificationStage: string;
  submittedAt?: Date;
  createdAt?: Date;
  bankDetails?: { accountNumber?: string };
  towVehicle?: { registrationNumber?: string };
  documentReviews?: Array<{ key: string; status: string }>;
}) {
  const uploadedAt = (vendor.submittedAt ?? vendor.createdAt ?? new Date()).toISOString();
  const rejected = vendor.verificationStage === 'rejected' || vendor.status === 'rejected';
  const approved = vendor.status === 'approved' && vendor.verificationStage === 'approved';
  const reviewMap = new Map((vendor.documentReviews ?? []).map((review) => [review.key, review.status]));

  const defaultDocStatus = (): 'VERIFIED' | 'PENDING' | 'REJECTED' => {
    if (rejected) return 'REJECTED';
    if (approved) return 'VERIFIED';
    return 'PENDING';
  };

  const vendorId = vendor._id.toString();
  const definitions = [
    { key: 'business-reg', name: 'Business Registration' },
    { key: 'gst', name: 'GST Certificate' },
    { key: 'pan', name: 'PAN Card' },
    { key: 'bank', name: 'Bank Statement' },
    { key: 'rc', name: 'Vehicle RC Copy' },
    { key: 'insurance', name: 'Insurance Certificate' },
  ];

  return definitions.map((doc) => {
    const reviewedStatus = reviewMap.get(doc.key);
    const status = reviewedStatus ? mapDocStatus(reviewedStatus) : defaultDocStatus();

    return {
      id: `${vendorId}-${doc.key}`,
      key: doc.key,
      name: doc.name,
      status,
      url: `/admin/documents/vendor/${vendorId}/${doc.key}`,
      uploadedAt,
    };
  });
}

export function buildDriverDocuments(driver: {
  _id: { toString(): string };
  status: string;
  createdAt?: Date;
  documents?: Array<{
    type: string;
    url: string;
    status: string;
    uploadedAt: Date;
  }>;
}) {
  const DRIVER_DOC_KEYS: Record<string, string> = {
    'Driving License': 'dl',
    'Aadhaar Card': 'aadhaar',
    'Police Verification': 'police',
    'Medical Fitness Certificate': 'medical',
  };

  if (driver.documents?.length) {
    const driverId = driver._id.toString();
    return driver.documents.map((doc, index) => {
      const docKey = DRIVER_DOC_KEYS[doc.type] ?? `doc-${index}`;
      return {
        id: `${driverId}-${docKey}`,
        key: docKey,
        name: doc.type,
        status: mapDocStatus(doc.status),
        url: `/admin/documents/driver/${driverId}/${docKey}`,
        uploadedAt: doc.uploadedAt.toISOString(),
      };
    });
  }

  // Placeholder documents (nothing uploaded yet). They must never claim
  // VERIFIED — there is no file behind them, and the proxy would 404.
  const uploadedAt = (driver.createdAt ?? new Date()).toISOString();
  const rejected = driver.status === 'REJECTED';
  const driverId = driver._id.toString();

  return [
    { key: 'dl', name: 'Driving License' },
    { key: 'aadhaar', name: 'Aadhaar Card' },
    { key: 'police', name: 'Police Verification' },
    { key: 'medical', name: 'Medical Fitness Certificate' },
  ].map((doc) => ({
    id: `${driverId}-${doc.key}`,
    name: doc.name,
    // No file uploaded: awaiting upload, even when the driver is already
    // approved (approval can pre-date document submission in testing flows).
    status: (rejected ? 'REJECTED' : 'PENDING') as 'REJECTED' | 'PENDING',
    // No url → admin card keeps Open/Download disabled (no 404 on click).
    url: undefined,
    uploadedAt,
  }));
}
