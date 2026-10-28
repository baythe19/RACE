import type { Booking } from '../types/booking';
import type { ActiveBooking, BookingHistoryItem } from '../types/models';
import type { ServiceBookingType } from '../types/serviceBooking';
import { formatLocationDisplay } from './readableAddress';

export const ONGOING_UNIFIED_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'IN_PROGRESS',
] as const;

export const COMPLETED_UNIFIED_STATUSES = ['COMPLETED', 'RATED', 'CANCELLED'] as const;

export function formatUnifiedStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Finding Partner';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'DRIVER_ASSIGNED':
      return 'Driver Assigned';
    case 'DRIVER_EN_ROUTE':
      return 'On the Way';
    case 'DRIVER_ARRIVED':
      return 'Driver Arrived';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
    case 'RATED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
}

export function isOngoingUnifiedStatus(status?: string): boolean {
  if (!status) return false;
  return ONGOING_UNIFIED_STATUSES.includes(status as (typeof ONGOING_UNIFIED_STATUSES)[number]);
}

export function isCompletedUnifiedStatus(status?: string): boolean {
  if (!status) return false;
  return COMPLETED_UNIFIED_STATUSES.includes(
    status as (typeof COMPLETED_UNIFIED_STATUSES)[number],
  );
}

export function isBookingOngoing(booking: Booking): boolean {
  if (booking.unifiedStatus) {
    return isOngoingUnifiedStatus(booking.unifiedStatus);
  }
  return ['CREATED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'SERVICE_STARTED'].includes(
    booking.status,
  );
}

export function isBookingCompleted(booking: Booking): boolean {
  if (booking.unifiedStatus) {
    return isCompletedUnifiedStatus(booking.unifiedStatus);
  }
  return ['SERVICE_COMPLETED', 'PAYMENT_PENDING', 'PAID'].includes(booking.status);
}

/**
 * Trip-start OTP is only for pickup handover: driver has arrived, customer
 * shares the code so the trip can move to IN_PROGRESS.
 * Completion OTP (after dropoff payment) is a separate flow in DropoffPaymentModal.
 */
export function shouldShowTripStartOtp(status?: string): boolean {
  return status === 'DRIVER_ARRIVED';
}

export function formatBookingDisplayId(bookingNumber: string): string {
  return bookingNumber.startsWith('#') ? bookingNumber : `#${bookingNumber}`;
}

export function mapBookingToActiveCard(booking: Booking): ActiveBooking {
  return {
    id: booking.id,
    displayId: formatBookingDisplayId(booking.bookingNumber),
    service: booking.serviceLabel,
    status: booking.unifiedStatus
      ? formatUnifiedStatusLabel(booking.unifiedStatus)
      : formatUnifiedStatusLabel(booking.status),
    pickup: formatLocationDisplay(booking.pickup),
    drop:
      formatLocationDisplay(booking.dropoff) === '—'
        ? 'On-site service'
        : formatLocationDisplay(booking.dropoff),
    eta: booking.etaMinutes != null ? `${booking.etaMinutes} min` : 'Updating',
    driver: booking.driver
      ? {
          name: booking.driver.name,
          photo: booking.driver.avatarUrl ?? null,
          experience: booking.driver.experience,
          phone: booking.driver.phone,
        }
      : {
          name: 'Finding a driver',
          photo: null,
        },
    bookingType: booking.bookingType ?? 'towing',
    tripStartOtp: shouldShowTripStartOtp(booking.unifiedStatus)
      ? booking.tripStartOtp
      : undefined,
  };
}

export function mapBookingToHistoryRow(booking: Booking): BookingHistoryItem {
  return {
    id: booking.id,
    displayId: formatBookingDisplayId(booking.bookingNumber),
    service: booking.serviceLabel,
    date: new Date(booking.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    location: formatLocationDisplay(booking.pickup),
    amount: booking.invoice?.total ?? 0,
    status: booking.unifiedStatus
      ? formatUnifiedStatusLabel(booking.unifiedStatus)
      : 'Completed',
    bookingType: booking.bookingType ?? 'towing',
  };
}

export function resolveBookingType(
  booking: Booking | null | undefined,
  fallback: ServiceBookingType = 'towing',
): ServiceBookingType {
  return booking?.bookingType ?? fallback;
}
