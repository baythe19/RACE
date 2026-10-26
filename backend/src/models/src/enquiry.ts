import { Schema, model, type Document, Types } from 'mongoose';

export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'ASSIGNED' | 'CLOSED' | 'CANCELLED';

export interface IEnquiryStatusHistory {
  status: EnquiryStatus;
  timestamp: Date;
  note?: string;
}

export interface IEnquiry extends Document {
  enquiryNumber: string;
  customerId: Types.ObjectId;
  customerName: string;
  customerMobile: string;
  serviceType: string;
  city?: string;
  notes?: string;
  status: EnquiryStatus;
  statusHistory: IEnquiryStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema = new Schema<IEnquiry>(
  {
    enquiryNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerMobile: { type: String, required: true, trim: true },
    serviceType: { type: String, required: true, default: 'full_time_driver' },
    city: { type: String, trim: true, default: 'Bhubaneswar' },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'ASSIGNED', 'CLOSED', 'CANCELLED'],
      default: 'NEW',
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  { timestamps: true },
);

EnquirySchema.index({ customerId: 1, createdAt: -1 });

export const EnquiryModel = model<IEnquiry>('Enquiry', EnquirySchema);
