import { Schema, model, type Document, Types } from 'mongoose';

export type VendorDocumentType =
  | 'aadhaar'
  | 'pan'
  | 'gst'
  | 'shop_license'
  | 'msme'
  | 'cancelled_cheque'
  | 'commercial_licence'
  | 'driving_license'
  | 'police_verification'
  | 'medical_certificate'
  | 'vehicle_insurance'
  | 'fitness_certificate'
  | 'puc'
  | 'commercial_permit'
  | 'selfie'
  | 'vehicle_photo'
  | 'voter_id'
  | 'other';

export type DocumentVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'resubmission_required';

export interface IVendorDocument extends Document {
  vendorId: Types.ObjectId;
  documentType: VendorDocumentType;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  verificationStatus: DocumentVerificationStatus;
  reviewNotes?: string;
  uploadedAt: Date;
}

const VendorDocumentSchema = new Schema<IVendorDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    documentType: {
      type: String,
      enum: [
        'aadhaar',
        'pan',
        'gst',
        'shop_license',
        'msme',
        'cancelled_cheque',
        'commercial_licence',
        'driving_license',
        'police_verification',
        'medical_certificate',
        'vehicle_insurance',
        'fitness_certificate',
        'puc',
        'commercial_permit',
        'selfie',
        'vehicle_photo',
        'voter_id',
        'other',
      ],
      required: true,
    },
    fileUrl: { type: String, required: true },
    fileName: { type: String },
    mimeType: { type: String },
    verificationStatus: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'resubmission_required'],
      default: 'pending',
    },
    reviewNotes: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

VendorDocumentSchema.index({ vendorId: 1, documentType: 1 }, { unique: true });

export const VendorDocumentModel = model<IVendorDocument>(
  'VendorDocument',
  VendorDocumentSchema,
);
