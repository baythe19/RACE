export const UNIFIED_BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'RATED',
  'CANCELLED',
] as const;

import { ForbiddenError } from '../../utils/src/errors';

export type UnifiedBookingStatus = (typeof UNIFIED_BOOKING_STATUSES)[number];

export const BOOKING_STATUS_FLOW: UnifiedBookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'RATED',
];

export const TERMINAL_BOOKING_STATUSES: UnifiedBookingStatus[] = ['RATED', 'CANCELLED'];

export const BOOKING_PAYMENT_STATUSES = [
  'PENDING_ADVANCE',
  'ADVANCE_PAID',
  'PENDING_FINAL',
  'FULLY_PAID',
] as const;

export type BookingPaymentStatus = (typeof BOOKING_PAYMENT_STATUSES)[number];

export function canTransition(
  currentStatus: UnifiedBookingStatus,
  nextStatus: UnifiedBookingStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return false;
  }

  if (TERMINAL_BOOKING_STATUSES.includes(currentStatus)) {
    return false;
  }

  if (nextStatus === 'CANCELLED') {
    return !['COMPLETED', 'RATED', 'CANCELLED'].includes(currentStatus);
  }

  // Driver tapped "arrived" by mistake — revert to en route before OTP starts the trip.
  if (currentStatus === 'DRIVER_ARRIVED' && nextStatus === 'DRIVER_EN_ROUTE') {
    return true;
  }

  const currentIndex = BOOKING_STATUS_FLOW.indexOf(currentStatus);
  const nextIndex = BOOKING_STATUS_FLOW.indexOf(nextStatus);

  if (currentIndex === -1 || nextIndex === -1) {
    return false;
  }

  return nextIndex === currentIndex + 1;
}

/**
 * VOC P0.9 fix — actor-based status mutation policy.
 *
 * The generic PATCH /bookings/:id/status endpoint used to let any booking
 * owner (customer) push a booking to CONFIRMED / IN_PROGRESS / COMPLETED with
 * no payment proof, driver assignment or trip-OTP check. Now:
 *  - admins may perform any transition (audited elsewhere);
 *  - drivers may perform only the operational progression their trip flow
 *    drives (EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED) plus rejection via
 *    CANCELLED before pickup;
 *  - customers may ONLY cancel (their dedicated cancel endpoints apply their
 *    own fee/refund policy) — never confirm, start or complete a job;
 *  - vendors may cancel fleet-routed jobs, nothing else (approve/assign flow
 *    uses its own endpoints).
 */
export function assertActorMayTransition(
  actorRole: string,
  currentStatus: UnifiedBookingStatus,
  nextStatus: UnifiedBookingStatus,
): void {
  const fail = (): never => {
    throw new ForbiddenError(
      'This status change is not allowed for your role. Cancellation and rating use their own endpoints.',
    );
  };

  if (actorRole === 'admin') return;

  if (nextStatus === 'CANCELLED') {
    const cancellableRoles = ['customer', 'vendor', 'driver'];
    if (!cancellableRoleGuard(actorRole, currentStatus, cancellableRoles)) {
      fail();
    }
    return;
  }

  if (actorRole === 'driver') {
    const DRIVER_OPERATIONAL: UnifiedBookingStatus[] = [
      'DRIVER_EN_ROUTE',
      'DRIVER_ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
    ];
    if (!DRIVER_OPERATIONAL.includes(nextStatus)) {
      fail();
    }
    return;
  }

  // customer / vendor / anything else — no operational transitions.
  fail();
}

function cancellableRoleGuard(
  actorRole: string,
  currentStatus: UnifiedBookingStatus,
  allowedRoles: string[],
): boolean {
  const notCancellable = ['COMPLETED', 'RATED', 'CANCELLED'].includes(currentStatus);
  return allowedRoles.includes(actorRole) && !notCancellable;
}
