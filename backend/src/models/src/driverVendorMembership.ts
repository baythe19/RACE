import { Schema, model, type Document, Types } from 'mongoose';

export type DriverVendorMembershipStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'DECLINED'
  | 'REVOKED'
  | 'EXPIRED';

export interface IDriverVendorMembership extends Document {
  vendorUserId: Types.ObjectId;
  driverUserId: Types.ObjectId;
  status: DriverVendorMembershipStatus;
  invitedBy: Types.ObjectId;
  invitedAt: Date;
  /** P1 (v6 audit): PENDING invitations die after this instant. */
  expiresAt?: Date;
  decidedBy?: Types.ObjectId;
  decidedAt?: Date;
  revokedBy?: Types.ObjectId;
  revokedAt?: Date;
  revocationReason?: string;
  /** Unique while pending/active to enforce one outstanding or active vendor per driver. */
  driverLockKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriverVendorMembershipSchema = new Schema<IDriverVendorMembership>(
  {
    vendorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driverUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'DECLINED', 'REVOKED', 'EXPIRED'],
      required: true,
      index: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    revokedAt: Date,
    revocationReason: { type: String, trim: true, maxlength: 500 },
    driverLockKey: { type: String },
  },
  { timestamps: true },
);

DriverVendorMembershipSchema.index({ driverLockKey: 1 }, { unique: true, sparse: true });
DriverVendorMembershipSchema.index({ driverUserId: 1, status: 1, updatedAt: -1 });
DriverVendorMembershipSchema.index({ vendorUserId: 1, status: 1, updatedAt: -1 });

export const DriverVendorMembershipModel = model<IDriverVendorMembership>(
  'DriverVendorMembership',
  DriverVendorMembershipSchema,
);
