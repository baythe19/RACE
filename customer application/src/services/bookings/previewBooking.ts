import type {
  CreateDriverBookingRequest,
  CreateTowingBookingRequest,
  ServiceBooking,
} from '../../types/serviceBooking';
import { isUiPreviewAuthFlow } from '../../config/uiPreviewMode';

/** Only allow local booking/payment previews in development builds. */
export function isPreviewBookingMode(): boolean {
  return __DEV__ && isUiPreviewAuthFlow();
}

function previewId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

export function previewTowingBooking(payload: CreateTowingBookingRequest): ServiceBooking {
  const now = new Date().toISOString();
  return {
    id: previewId('towing-mock'),
    bookingNumber: `TOW-${Math.floor(10000 + Math.random() * 89999)}`,
    customerId: 'preview-customer',
    vehicleId: payload.vehicleId,
    pickup: payload.pickup,
    dropoff: payload.dropoff,
    towingMode: payload.towingMode ?? 'instant',
    estimatedFare: 499,
    advanceAmount: 150,
    advancePaid: true,
    remainingAmount: 349,
    remainingPaid: false,
    paymentStatus: 'ADVANCE_PAID',
    status: 'CONFIRMED',
    statusHistory: [{ status: 'CONFIRMED', timestamp: now }],
    createdAt: now,
    updatedAt: now,
  };
}

export function previewDriverBooking(payload: CreateDriverBookingRequest): ServiceBooking {
  const now = new Date().toISOString();
  return {
    id: previewId('driver-mock'),
    bookingNumber: `DRV-${Math.floor(10000 + Math.random() * 89999)}`,
    customerId: 'preview-customer',
    vehicleId: payload.vehicleId,
    pickup: payload.pickup,
    dropoff: payload.dropoff,
    driverServiceType: payload.driverServiceType,
    estimatedFare: 650,
    advanceAmount: 200,
    advancePaid: true,
    remainingAmount: 450,
    remainingPaid: false,
    paymentStatus: 'ADVANCE_PAID',
    status: 'CONFIRMED',
    statusHistory: [{ status: 'CONFIRMED', timestamp: now }],
    createdAt: now,
    updatedAt: now,
  };
}

export function previewAdvancePayment(bookingId: string, bookingType: string) {
  return {
    transactionId: `stub_advance_${bookingType}_${Date.now()}`,
    bookingId,
    amount: bookingType === 'towing' ? 150 : 200,
    status: 'ADVANCE_PAID',
    createdAt: new Date().toISOString(),
  };
}
