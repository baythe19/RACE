import type { Booking } from '../types/booking';
import type { ActiveBooking, BookingHistoryItem } from '../types/models';
import type { ServiceBookingType } from '../types/serviceBooking';
import {
  bookingHasNamedPartner,
  formatCustomerBookingStatus,
  inferCustomerBookingKind,
  type CustomerBookingKind,
} from './bookingFlowCopy';
import { formatLocationCard, formatLocationDisplay } from './readableAddress';
import { colors } from '../theme';

export const ONGOING_UNIFIED_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'IN_PROGRESS',
] as const;

export const COMPLETED_UNIFIED_STATUSES = ['COMPLETED', 'RATED', 'CANCELLED'] as const;

export function customerStatusChipTone(statusPill: string): {
  bg: string;
  fg: string;
  dot?: string;
} {
  if (statusPill === 'Cancelled') {
    return { bg: '#F3F4F6', fg: colors.grey, dot: colors.grey };
  }
  if (/finding|awaiting|confirmed ·/i.test(statusPill)) {
    return { bg: '#FFF7ED', fg: '#C2410C', dot: '#F97316' };
  }
  if (statusPill === 'Completed') {
    return { bg: '#E8F8EE', fg: colors.success, dot: colors.success };
  }
  return { bg: '#E8F8EE', fg: colors.success, dot: colors.success };
}

/** Legacy raw unified label — prefer `formatCustomerBookingStatus` for customer UI. */
export function formatUnifiedStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Finding Partner';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'DRIVER_ASSIGNED':
      return 'Partner accepting';
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

/**
 * Live Tracking bottom sheet — service-specific copy; avoid bare "Confirmed"
 * before any partner has accepted (backend CONFIRMED = advance paid, matching).
 */
export function formatLiveTrackingSummary(input: {
  kind: CustomerBookingKind;
  status: string;
  partnerPending: boolean;
  etaDisplay: string;
}): { cardLabel: string; cardValue: string; chipLabel: string } {
  const { kind, status, partnerPending, etaDisplay } = input;
  const copy = formatCustomerBookingStatus(kind, status, !partnerPending);
  const awaitingPartner =
    partnerPending &&
    (status === 'PENDING' || status === 'CONFIRMED' || status === 'DRIVER_ASSIGNED');

  if (awaitingPartner) {
    return {
      cardLabel: 'Status',
      cardValue: copy.dispatchHint,
      chipLabel: copy.statusPill,
    };
  }

  if (status === 'DRIVER_EN_ROUTE' || status === 'DRIVER_ARRIVED' || status === 'IN_PROGRESS') {
    return {
      cardLabel: 'Estimated arrival',
      cardValue: etaDisplay,
      chipLabel: copy.statusPill,
    };
  }

  if (status === 'COMPLETED' || status === 'RATED') {
    return {
      cardLabel: 'Trip',
      cardValue: etaDisplay,
      chipLabel: 'Completed',
    };
  }

  return {
    cardLabel: 'Status',
    cardValue: etaDisplay,
    chipLabel: copy.statusPill,
  };
}

export function getCustomerBookingPresentation(booking: Booking) {
  const kind = inferCustomerBookingKind(booking);
  const hasNamedPartner = bookingHasNamedPartner(booking.driver);
  const unified = booking.unifiedStatus ?? booking.status;
  const copy = formatCustomerBookingStatus(kind, unified, hasNamedPartner);
  return { kind, unified, hasNamedPartner, ...copy };
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
  const kind = inferCustomerBookingKind(booking);
  const pickup = formatLocationCard(booking.pickup);
  const dropLine = booking.dropoff ? formatLocationCard(booking.dropoff) : null;
  const pickupFlat = formatLocationDisplay(booking.pickup);
  const dropFlat = booking.dropoff ? formatLocationDisplay(booking.dropoff) : '—';
  const onSiteOnly =
    kind === 'roadside' ||
    dropFlat === '—' ||
    dropFlat === 'On-site help' ||
    (dropFlat === pickupFlat && kind !== 'towing');

  const hasNamedPartner = bookingHasNamedPartner(booking.driver);
  const unified = booking.unifiedStatus ?? booking.status;
  const copy = formatCustomerBookingStatus(kind, unified, hasNamedPartner);

  return {
    id: booking.id,
    displayId: formatBookingDisplayId(booking.bookingNumber),
    service: booking.serviceLabel,
    status: copy.statusPill,
    pickup,
    drop: onSiteOnly ? null : dropLine,
    eta: booking.etaMinutes != null ? `${booking.etaMinutes} min` : 'Updating',
    driver: hasNamedPartner
      ? {
          name: booking.driver!.name,
          photo: booking.driver!.avatarUrl ?? null,
          experience: booking.driver!.experience,
          phone: booking.driver!.phone,
        }
      : {
          name: copy.partnerLine,
          photo: null,
        },
    bookingType: booking.bookingType ?? 'towing',
    bookingKind: kind,
    dispatchHint: copy.dispatchHint,
    tripStartOtp: shouldShowTripStartOtp(booking.unifiedStatus)
      ? booking.tripStartOtp
      : undefined,
  };
}

export function mapBookingToHistoryRow(booking: Booking): BookingHistoryItem {
  const kind = inferCustomerBookingKind(booking);
  const hasNamedPartner = bookingHasNamedPartner(booking.driver);
  const unified = booking.unifiedStatus ?? booking.status;
  const copy = formatCustomerBookingStatus(kind, unified, hasNamedPartner);
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
    status: booking.unifiedStatus ? copy.statusPill : 'Completed',
    bookingType: booking.bookingType ?? 'towing',
  };
}

export function resolveBookingType(
  booking: Booking | null | undefined,
  fallback: ServiceBookingType = 'towing',
): ServiceBookingType {
  return booking?.bookingType ?? fallback;
}
