import type { DriverFareBreakdown, TowingFareBreakdown } from './fare';

export type ServiceBookingType = 'towing' | 'driver';

export interface BookingLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface ServiceBooking {
  id: string;
  bookingNumber: string;
  customerId: string;
  vehicleId: string;
  pickup: BookingLocation;
  dropoff?: BookingLocation;
  towingMode?: 'instant' | 'scheduled' | 'emergency';
  /** On-site roadside assist label from towing booking row. */
  assistLabel?: string;
  driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  distanceKm?: number;
  estimatedDurationHours?: number;
  packageHours?: number;
  vehicleCategory?: string;
  includedKm?: number;
  estimatedFare: number;
  fareBreakdown?: TowingFareBreakdown | DriverFareBreakdown;
  advanceAmount: number;
  advancePaid: boolean;
  advancePaymentId?: string;
  remainingAmount: number;
  remainingPaid: boolean;
  paymentStatus: string;
  status: string;
  /** Partner allotted; accept pending — no driver contact yet. */
  awaitingPartnerAccept?: boolean;
  scheduledAt?: string;
  statusHistory: Array<{ status: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
  rating?: {
    score: number;
    review?: string;
    tags?: string[];
    createdAt: string;
  };
  driverId?: string;
  vendorId?: string;
  assignedFleetVehicleLabel?: string;
  tripStartOtp?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    experience?: string;
  };
  arrivedAtDropoffAt?: string;
  completionOtp?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE';
  paymentConfirmedByCustomer?: boolean;
  fare?: number;
}

export interface CreateTowingBookingRequest {
  vehicleId: string;
  pickup: BookingLocation;
  dropoff: BookingLocation;
  towingMode?: 'instant' | 'scheduled' | 'emergency';
  scheduledAt?: string;
}

export interface CreateDriverBookingRequest {
  vehicleId: string;
  pickup: BookingLocation;
  dropoff?: BookingLocation;
  packageHours?: 2 | 4 | 8 | 12 | 24;
  estimatedDurationHours?: number;
  driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  scheduledAt?: string;
}

export interface CreateRoadsideBookingRequest {
  serviceType: string;
  vehicleId: string;
  pickup: BookingLocation;
  dropoff?: BookingLocation;
  scheduledAt?: string;
}

export interface RoadsideAvailabilityItem {
  serviceType: string;
  label: string;
  available: boolean;
}

export interface RoadsideAvailabilityResponse {
  bookableCount: number;
  items: RoadsideAvailabilityItem[];
}

export interface RoadsideBookingResponse {
  available: boolean;
  message?: string;
  redirectedTo?: 'towing';
  serviceType: string;
  booking?: ServiceBooking;
}

export interface PaymentSession {
  transactionId: string;
  bookingId: string;
  bookingType: string;
  paymentType: 'advance' | 'final';
  amount: number;
  status: string;
  gatewayReferenceId: string;
  message: string;
}

export interface InitiatePaymentRequest {
  bookingId: string;
  bookingType: ServiceBookingType;
}

export interface VerifyPaymentRequest {
  transactionId: string;
  status: 'success' | 'failed';
}

export interface ServiceBookingTracking {
  bookingId: string;
  status: string;
  awaitingPartnerAccept?: boolean;
  statusHistory: Array<{ status: string; timestamp: string }>;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    updatedAt?: string;
    driverName?: string;
    driverPhone?: string;
  };
  /** P-UPI-01: assigned driver's saved UPI VPA for dropoff settlement deep-link. */
  driverUpiId?: string;
  pickup: BookingLocation;
  dropoff?: BookingLocation;
  assignedFleetVehicleLabel?: string;
  tripStartOtp?: string;
  arrivedAtDropoffAt?: string;
  completionOtp?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE';
  paymentConfirmedByCustomer?: boolean;
  fare?: number;
}

export interface CancellationPolicy {
  canCancel: boolean;
  refundAmount: number;
  refundPercent: number;
  reason: string;
  cancellationFee: number;
}

export interface CancelBookingResult {
  message: string;
  refundAmount: number;
  refundStatus: string;
  policy: CancellationPolicy;
  booking: ServiceBooking;
}

export interface CombinedBookingListItem extends ServiceBooking {
  bookingType: 'towing' | 'driver';
  serviceLabel: string;
}
