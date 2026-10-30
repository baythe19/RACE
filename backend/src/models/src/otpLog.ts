import { Schema, model, type Document } from 'mongoose';

export interface IOtpLog extends Document {
  mobileNumber: string;
  email?: string;
  fullName?: string;
  mobileOtp?: string;          // Development/mock only; production OTPs are stored as hashes
  emailOtp?: string;
  mobileOtpExpiry?: Date;
  emailOtpExpiry?: Date;
  mobileVerified: boolean;
  emailVerified: boolean;
  mobileAttempts: number;
  emailAttempts: number;
  provider?: 'hanu' | 'local'; // exclusively HanuSMS (or local dev)
  otpHash?: string;            // sha256(otp + pepper) for production/dev provider OTPs; digits never stored
  createdAt: Date;
}

const OtpLogSchema = new Schema<IOtpLog>(
  {
    mobileNumber: { type: String, required: true, index: true },
    email: { type: String, index: true, sparse: true },
    fullName: { type: String, trim: true },
    mobileOtp: { type: String },
    emailOtp: { type: String },
    mobileOtpExpiry: { type: Date },
    emailOtpExpiry: { type: Date },
    mobileVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    mobileAttempts: { type: Number, default: 0 },
    emailAttempts: { type: Number, default: 0 },
    provider: { type: String, enum: ['hanu', 'local'] },
    otpHash: { type: String },
    // D-05: TTL index below replaces a plain createdAt index — DO NOT add
    // `index: true` here again (each key gets exactly one index in Mongo).
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

// TTL (D-05, audit 2026-10-28): OTP logs are only needed for the 5-minute
// verification window + short-lived replay/audit look-backs. 14 days keeps
// support data while bounding the fastest-growing collection. syncIndexes()
// drops the legacy non-TTL createdAt_1 and re-creates it with the TTL option.
OtpLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 });

export const OtpLogModel = model<IOtpLog>('OtpLog', OtpLogSchema);
