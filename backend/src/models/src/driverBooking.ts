import { Schema, model, type Document, Types } from 'mongoose';

import {
  BOOKING_PAYMENT_STATUSES,
  UNIFIED_BOOKING_STATUSES,
  type BookingPaymentStatus,
  type UnifiedBookingStatus,
} from '../../services/src/bookingStatusConstants';
import { ServiceBookingRatingSchema } from './bookingRatingSchema';
import type { DriverFareBreakdown } from '../../services/src/bookings/booking';

export interface IDriverBookingLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface IDriverStatusHistoryEntry {
  status: UnifiedBookingStatus;
  timestamp: Date;
  note?: string;
}

export interface IDriverBooking extends Document {
  customerId: Types.ObjectId;
  bookingNumber: string;
  vehicleId?: Types.ObjectId;
  driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  pickup: IDriverBookingLocation;
  dropoff?: IDriverBookingLocation;
  estimatedDurationHours?: number;
  packageHours: number;
  vehicleCategory?: 'hatchback' | 'sedan' | 'suv';
  includedKm?: number;
  estimatedFare: number;
  fareBreakdown?: DriverFareBreakdown;
  /**
   * Amount the backend confirms at completion. Written once, when the driver
   * marks the job COMPLETED, so partner/earnings screens never have to trust a
   * client-side estimate.
   */
  finalFare?: number;
  finalFareConfirmedAt?: Date;
  advanceAmount: number;
  advancePaid: boolean;
  advancePaymentId?: string;
  remainingAmount: number;
  remainingPaid: boolean;
  finalPaymentId?: string;
  paymentStatus: BookingPaymentStatus;
  status: UnifiedBookingStatus;
  vendorId?: Types.ObjectId;
  driverId?: Types.ObjectId;
  assignedFleetVehicleId?: Types.ObjectId;
  assignedFleetVehicleLabel?: string;
  /** One-way SHA-256 verifier; raw OTP is never persisted here. */
  tripStartOtp?: string;
  /** AES-GCM encrypted OTP for authorized response/delivery paths. */
  tripStartOtpEncrypted?: string;
  tripStartOtpVerified?: boolean;
  tripStartOtpAttempts?: number;
  /** Timestamp when partner marks arrival at dropoff */
  arrivedAtDropoffAt?: Date;
  /** 4-digit code customer shares with partner to complete trip after payment confirmation */
  /** One-way SHA-256 verifier; raw OTP is never persisted here. */
  completionOtp?: string;
  /** AES-GCM encrypted OTP for authorized response/delivery paths. */
  completionOtpEncrypted?: string;
  completionOtpVerified?: boolean;
  completionOtpAttempts?: number;
  /** Mode selected by customer: CASH, UPI, or ONLINE */
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE';
  paymentConfirmedByCustomer?: boolean;
  paymentCollectedAt?: Date;
  scheduledAt?: Date;
  statusHistory: IDriverStatusHistoryEntry[];
  cancelledAt?: Date;
  cancelledBy?: 'customer' | 'driver' | 'admin';
  cancellationReason?: string;
  refundAmount: number;
  refundStatus: 'NOT_APPLICABLE' | 'PENDING' | 'PROCESSED';
  driverLatitude?: number;
  driverLongitude?: number;
  driverLocationUpdatedAt?: Date;
  rating?: {
    score: number;
    review?: string;
    tags?: string[];
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<IDriverBookingLocation>(
  {
    address: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
);

const StatusHistorySchema = new Schema<IDriverStatusHistoryEntry>(
  {
    status: { type: String, enum: UNIFIED_BOOKING_STATUSES, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false },
);

const DriverBookingSchema = new Schema<IDriverBooking>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingNumber: { type: String, required: true, unique: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    pickup: { type: LocationSchema, required: true },
    dropoff: { type: LocationSchema },
    estimatedDurationHours: { type: Number },
    packageHours: { type: Number, enum: [2, 4, 8, 12, 24], required: true },
    vehicleCategory: { type: String, enum: ['hatchback', 'sedan', 'suv'] },
    includedKm: { type: Number },
    estimatedFare: { type: Number, required: true },
    fareBreakdown: { type: Schema.Types.Mixed },
    finalFare: { type: Number },
    finalFareConfirmedAt: { type: Date },
    advanceAmount: { type: Number, required: true },
    advancePaid: { type: Boolean, default: false },
    advancePaymentId: { type: String },
    remainingAmount: { type: Number, required: true },
    remainingPaid: { type: Boolean, default: false },
    finalPaymentId: { type: String },
    paymentStatus: {
      type: String,
      enum: BOOKING_PAYMENT_STATUSES,
      default: 'PENDING_ADVANCE',
      index: true,
    },
    status: {
      type: String,
      enum: UNIFIED_BOOKING_STATUSES,
      default: 'PENDING',
      index: true,
    },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', index: true },
    assignedFleetVehicleId: { type: Schema.Types.ObjectId, ref: 'VendorVehicle' },
    assignedFleetVehicleLabel: { type: String, trim: true },
    tripStartOtp: { type: String, trim: true, select: false },
    tripStartOtpEncrypted: { type: String, select: false },
    tripStartOtpVerified: { type: Boolean, default: false },
    tripStartOtpAttempts: { type: Number, default: 0 },
    arrivedAtDropoffAt: { type: Date },
    completionOtp: { type: String, trim: true, select: false },
    completionOtpEncrypted: { type: String, select: false },
    completionOtpVerified: { type: Boolean, default: false },
    completionOtpAttempts: { type: Number, default: 0 },
    paymentCollectionMode: { type: String, enum: ['CASH', 'UPI', 'ONLINE'] },
    paymentConfirmedByCustomer: { type: Boolean, default: false },
    paymentCollectedAt: { type: Date },
    driverServiceType: {
      type: String,
      enum: ['part_time', 'full_time', 'outstation', 'night'],
      default: 'part_time',
      index: true,
    },
    scheduledAt: { type: Date },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['customer', 'driver', 'admin'] },
    cancellationReason: { type: String },
    refundAmount: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'PENDING', 'PROCESSED'],
      default: 'NOT_APPLICABLE',
    },
    driverLatitude: { type: Number },
    driverLongitude: { type: Number },
    driverLocationUpdatedAt: { type: Date },
    rating: { type: ServiceBookingRatingSchema },
  },
  { timestamps: true },
);

DriverBookingSchema.index({ customerId: 1, createdAt: -1 });
DriverBookingSchema.index({ status: 1, createdAt: -1 });
DriverBookingSchema.index({ driverId: 1, status: 1 });
DriverBookingSchema.index({ vendorId: 1, status: 1 });

export const DriverBookingModel = model<IDriverBooking>('DriverBooking', DriverBookingSchema);
