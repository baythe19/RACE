import { Schema, model, type Document, Types } from 'mongoose';

export type VendorVehicleStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'INACTIVE';
export type VendorVehicleDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface IVendorVehicleDocument {
  type: string;
  url: string;
  fileName: string;
  status: VendorVehicleDocumentStatus;
  uploadedAt: Date;
}

export interface IVendorVehicle extends Document {
  vendorId: Types.ObjectId;
  registrationNo: string;
  type: string;
  vehicleModel: string;
  year?: number;
  status: VendorVehicleStatus;
  insuranceExpiry?: Date;
  maintenanceNote?: string;
  documents?: IVendorVehicleDocument[];
  /** P0-2: booking this truck is atomically pinned to (null when free). */
  activeBookingId?: Types.ObjectId | null;
  activeBookingType?: 'towing' | 'driver' | null;
  createdAt: Date;
  updatedAt: Date;
}

const VendorVehicleSchema = new Schema<IVendorVehicle>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    registrationNo: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, required: true },
    vehicleModel: { type: String, required: true },
    year: { type: Number },
    status: {
      type: String,
      enum: ['ACTIVE', 'UNDER_MAINTENANCE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    insuranceExpiry: { type: Date },
    maintenanceNote: { type: String },
    activeBookingId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    activeBookingType: {
      type: String,
      enum: ['towing', 'driver', null],
      default: null,
    },
    documents: {
      type: [{
        type: { type: String, required: true },
        url: { type: String, required: true },
        fileName: { type: String, required: true },
        status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
        uploadedAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
  },
  { timestamps: true },
);

VendorVehicleSchema.index({ vendorId: 1, registrationNo: 1 }, { unique: true });
VendorVehicleSchema.index({ vendorId: 1, status: 1, activeBookingId: 1 });

export const VendorVehicleModel = model<IVendorVehicle>('VendorVehicle', VendorVehicleSchema);
