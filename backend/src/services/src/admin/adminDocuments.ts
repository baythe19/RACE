import path from 'path';

import { UserModel } from '../../../models/src/user';
import { vendorRepository } from '../vendorRepository';
import { storageService } from '../../../storage/src';
import { NotFoundError } from '../../../utils/src/errors';

const VENDOR_DOCUMENT_ALIASES: Record<string, string> = {
  'business-reg': 'shop_license',
  bank: 'cancelled_cheque',
  insurance: 'vehicle_insurance',
  dl: 'driving_license',
  aadhaar: 'aadhaar',
  gst: 'gst',
  pan: 'pan',
  police: 'police_verification',
  medical: 'medical_certificate',
};

const DRIVER_DOCUMENT_TYPES: Record<string, string> = {
  dl: 'Driving License',
  aadhaar: 'Aadhaar Card',
  police: 'Police Verification',
  medical: 'Medical Fitness Certificate',
};

function inferMimeType(fileName: string, explicitMimeType?: string): string {
  if (explicitMimeType) return explicitMimeType;
  switch (path.extname(fileName).toLowerCase()) {
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

export const adminDocumentsService = {
  async getVendorDocument(vendorId: string, docKey: string) {
    if (!docKey) throw new NotFoundError('Document not found');
    const documentType = VENDOR_DOCUMENT_ALIASES[docKey] ?? docKey;
    const document = await vendorRepository.findDocument(vendorId, documentType);
    if (!document) throw new NotFoundError('Uploaded vendor document not found');

    const filename = document.fileName || path.basename(new URL(document.fileUrl).pathname);
    return {
      filename: filename.replace(/["\r\n]/g, '_'),
      mimeType: inferMimeType(filename, document.mimeType),
      buffer: await storageService.readUploadedFile(document.fileUrl),
    };
  },

  async getDriverDocument(driverId: string, docKey: string) {
    if (!docKey) throw new NotFoundError('Document not found');
    const user = await UserModel.findOne({ _id: driverId, role: 'driver' })
      .select('driverProfile.documents')
      .exec();
    const documents = user?.driverProfile?.documents ?? [];
    const indexMatch = docKey.match(/^doc-(\d+)$/);
    const expectedType = DRIVER_DOCUMENT_TYPES[docKey];
    const document = indexMatch
      ? documents[Number(indexMatch[1])]
      : documents.find(
          (item) =>
            item.type === expectedType ||
            item.type.toLowerCase() === docKey.replace(/-/g, ' ').toLowerCase(),
        );
    if (!document?.url) throw new NotFoundError('Uploaded driver document not found');

    const filename = path.basename(new URL(document.url).pathname);
    return {
      filename: filename.replace(/["\r\n]/g, '_'),
      mimeType: inferMimeType(filename),
      buffer: await storageService.readUploadedFile(document.url),
    };
  },
};
