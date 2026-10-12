import { Schema, model, type Document, Types } from 'mongoose';

import {
  BOOKING_PAYMENT_STATUSES,
  UNIFIED_BOOKING_STATUSES,
  type BookingPaymentStatus,
  type UnifiedBookingStatus,
} from '../../services/src/bookingStatusConstants';
import { ServiceBookingRatingSchema } from './bookingRatingSchema';
import type { TowingFareBreakdown } from '../../services/src/bookings/booking';

export interface ITowingBookingLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface ITowingStatusHistoryEntry {
  status: UnifiedBookingStatus;
  timestamp: Date;
  note?: string;
}

export interface ITowingBooking extends Document {
  customerId: Types.ObjectId;
  bookingNumber: string;
  vehicleId: Types.ObjectId;
  towingMode?: 'instant' | 'scheduled' | 'emergency';
  pickup: ITowingBookingLocation;
  dropoff?: ITowingBookingLocation;
  distanceKm?: number;
  estimatedFare: number;
  fareBreakdown?: TowingFareBreakdown;
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
  paymentStatus: BookingPaymentStatus;
  status: UnifiedBookingStatus;
  vendorId?: Types.ObjectId;
  driverId?: Types.ObjectId;
  /** Vendor fleet vehicle assigned to fulfill this job */
  assignedFleetVehicleId?: Types.ObjectId;
  assignedFleetVehicleLabel?: string;
  /** 4-digit code customer shares with partner to start trip */
  tripStartOtp?: string;
  tripStartOtpVerified?: boolean;
  scheduledAt?: Date;
  statusHistory: ITowingStatusHistoryEntry[];
  cancelledAt?: Date;
  cancelledBy?: 'customer' | 'driver' | 'admin';
  cancellationReason?: string;
  refundAmount: number;
  refundStatus: 'NOT_APPLICABLE' | 'PENDING' | 'PROCESSED';
  driverLatitude?: number;
  driverLongitude?: number;
  rating?: {
    score: number;
    review?: string;
    tags?: string[];
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ITowingBookingLocation>(
  {
    address: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
);

const StatusHistorySchema = new Schema<ITowingStatusHistoryEntry>(
  {
    status: { type: String, enum: UNIFIED_BOOKING_STATUSES, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false },
);

const TowingBookingSchema = new Schema<ITowingBooking>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingNumber: { type: String, required: true, unique: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    pickup: { type: LocationSchema, required: true },
    dropoff: { type: LocationSchema },
    distanceKm: { type: Number },
    estimatedFare: { type: Number, required: true },
    fareBreakdown: { type: Schema.Types.Mixed },
    finalFare: { type: Number },
    finalFareConfirmedAt: { type: Date },
    advanceAmount: { type: Number, required: true },
    advancePaid: { type: Boolean, default: false },
    advancePaymentId: { type: String },
    remainingAmount: { type: Number, required: true },
    remainingPaid: { type: Boolean, default: false },
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
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', index: true },
    assignedFleetVehicleId: { type: Schema.Types.ObjectId, ref: 'VendorVehicle' },
    assignedFleetVehicleLabel: { type: String, trim: true },
    tripStartOtp: { type: String, trim: true },
    tripStartOtpVerified: { type: Boolean, default: false },
    towingMode: {
      type: String,
      enum: ['instant', 'scheduled', 'emergency'],
      default: 'instant',
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
    rating: { type: ServiceBookingRatingSchema },
  },
  { timestamps: true },
);

TowingBookingSchema.index({ customerId: 1, createdAt: -1 });
TowingBookingSchema.index({ status: 1, createdAt: -1 });

export const TowingBookingModel = model<ITowingBooking>('TowingBooking', TowingBookingSchema);
