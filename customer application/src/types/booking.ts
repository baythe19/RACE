export type BookingStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'SERVICE_STARTED'
  | 'SERVICE_COMPLETED'
  | 'PAYMENT_PENDING'
  | 'PAID';

export interface BookingDriver {
  id: string;
  name: string;
  rating: number;
  phone: string;
  avatarUrl?: string;
  experience?: string;
  verified?: boolean;
}

export interface BookingLocation {
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface BookingTimelineEvent {
  status: BookingStatus;
  label: string;
  timestamp: string;
  completed: boolean;
}

export interface BookingInvoice {
  baseFare: number;
  distanceCharge?: number;
  platformFee?: number;
  discount?: number;
  total: number;
  currency: string;
  paymentMethod?: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  bookingType?: 'towing' | 'driver';
  unifiedStatus?: string;
  categoryId: string;
  serviceId: string;
  serviceLabel: string;
  serviceDescription?: string;
  status: BookingStatus;
  vehicleId: string;
  vehicleNumber: string;
  vehicleLabel?: string;
  pickup: BookingLocation;
  dropoff?: BookingLocation;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  driver?: BookingDriver;
  vendorId?: string;
  assignedFleetVehicleLabel?: string;
  tripStartOtp?: string;
  etaMinutes?: number;
  distanceKm?: number;
  durationMinutes?: number;
  invoice?: BookingInvoice;
  timeline: BookingTimelineEvent[];
  rating?: number;
  review?: string;
  advanceAmount?: number;
  remainingAmount?: number;
  advancePaid?: boolean;
  remainingPaid?: boolean;
  paymentStatus?: string;
  arrivedAtDropoffAt?: string;
  completionOtp?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE' | null;
  paymentConfirmedByCustomer?: boolean;
  /** P-UPI-01: driver's saved UPI VPA surfaced on tracking/list payloads. */
  driverUpiId?: string | null;
  estimatedFare?: number;
  fareBreakdown?: {
    totalFare?: number;
    baseFare?: number;
  };
}

export interface CreateBookingRequest {
  categoryId: string;
  serviceId: string;
  serviceLabel: string;
  serviceDescription?: string;
  vehicleId: string;
  pickup: BookingLocation;
  dropoff?: BookingLocation;
  scheduledAt?: string;
  estimatedTotal?: number;
}

export interface SubmitRatingRequest {
  rating: number;
  review?: string;
  tipAmount?: number;
  tags?: string[];
}

export interface BookingDraft {
  categoryId: string;
  serviceId: string;
  serviceLabel: string;
  serviceDescription?: string;
  vehicleId?: string;
  pickup?: BookingLocation;
  dropoff?: BookingLocation;
  scheduledAt?: string;
  estimatedTotal?: number;
}
