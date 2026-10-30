import { Schema, model, type Document, Types } from 'mongoose';

import { computeProfileCompleted } from '../../utils/src/user';
import {
  DriverProfileSchema,
  VendorProfileSchema,
  type IDriverProfile,
  type IVendorProfile,
} from './userProfileSchema';
import { USER_ROLES, type UserRole } from '../../auth/src/roles';

export type { UserRole };

export interface IEmergencyContact {
  name: string;
  mobileNumber: string;
  relationship?: string;
}

export interface IAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface IDriverCurrentLocation {
  latitude?: number;
  longitude?: number;
  updatedAt?: Date;
}

export type ActiveBookingType = 'towing' | 'driver';

export interface IUser extends Document {
  mobileNumber: string;
  fullName?: string;
  email?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: Date;
  emergencyContact?: IEmergencyContact;
  address?: IAddress;
  profilePhoto?: string;
  isVerified: boolean;
  isProfileCompleted: boolean;
  role: UserRole;
  /** bcrypt hash of an optional account password (customers default to OTP-only). */
  passwordHash?: string;
  /** bcrypt hash of the optional in-app security PIN (screen lock). */
  appPinHash?: string;
  /** Additive app capabilities. Legacy rows derive their initial capability from role. */
  capabilities?: UserRole[];
  customerCode?: string;
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  vendorProfile?: IVendorProfile;
  driverProfile?: IDriverProfile;
  /** Redesign v6: Explicit persona context and operational lifecycle */
  driverContext?: 'VENDOR_MANAGED' | 'INDEPENDENT';
  selfDriverCategory?: 'FULL_TIME' | 'PART_TIME';
  vendorUserId?: Types.ObjectId;
  phoneVerifiedAt?: Date;
  registrationStatus?: 'DRAFT' | 'SUBMITTED';
  reviewStatus?: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'CHANGES_REQUESTED' | 'REJECTED';
  operationalStatus?: 'ENABLED' | 'SUSPENDED' | 'DISABLED';
  /** Only relevant when role === 'driver' */
  isAvailable?: boolean;
  currentLocation?: IDriverCurrentLocation;
  activeBookingId?: Types.ObjectId | null;
  activeBookingType?: ActiveBookingType | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    relationship: { type: String },
  },
  { _id: false },
);

const AddressSchema = new Schema<IAddress>(
  {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: 'India' },
  },
  { _id: false },
);

const DriverCurrentLocationSchema = new Schema<IDriverCurrentLocation>(
  {
    latitude: { type: Number },
    longitude: { type: Number },
    updatedAt: { type: Date },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    mobileNumber: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    dateOfBirth: { type: Date },
    emergencyContact: { type: EmergencyContactSchema },
    address: { type: AddressSchema },
    profilePhoto: { type: String },
    isVerified: { type: Boolean, default: false },
    isProfileCompleted: { type: Boolean, default: false },
    passwordHash: { type: String },
    appPinHash: { type: String },
    role: { type: String, enum: USER_ROLES, default: 'customer', index: true },
    capabilities: { type: [{ type: String, enum: USER_ROLES }], default: undefined },
    customerCode: { type: String, unique: true, sparse: true, index: true },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    vendorProfile: { type: VendorProfileSchema },
    driverProfile: { type: DriverProfileSchema },
    driverContext: {
      type: String,
      enum: ['VENDOR_MANAGED', 'INDEPENDENT'],
      index: true,
    },
    selfDriverCategory: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME'],
      index: true,
    },
    vendorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    phoneVerifiedAt: { type: Date },
    registrationStatus: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED'],
      default: 'SUBMITTED',
      index: true,
    },
    reviewStatus: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'CHANGES_REQUESTED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    operationalStatus: {
      type: String,
      enum: ['ENABLED', 'SUSPENDED', 'DISABLED'],
      default: 'ENABLED',
      index: true,
    },
    isAvailable: { type: Boolean, default: true },
    currentLocation: { type: DriverCurrentLocationSchema },
    activeBookingId: { type: Schema.Types.ObjectId, default: null },
    activeBookingType: { type: String, enum: ['towing', 'driver'], default: null },
  },
  { timestamps: true },
);

UserSchema.index({ 'vendorProfile.status': 1, 'vendorProfile.submittedAt': -1 });
UserSchema.index({ 'vendorProfile.verificationStage': 1 });
UserSchema.index({ 'driverProfile.driverCode': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'driverProfile.licenseNo': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'driverProfile.loginId': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'driverProfile.status': 1 });
UserSchema.index({ 'driverProfile.vendorUserId': 1 });
UserSchema.index({ driverContext: 1, selfDriverCategory: 1 });
UserSchema.index({ fullName: 'text', mobileNumber: 'text', 'driverProfile.driverCode': 'text' });

UserSchema.pre('save', function (next) {
  this.isProfileCompleted = computeProfileCompleted(this);
  next();
});

export const UserModel = model<IUser>('User', UserSchema);
