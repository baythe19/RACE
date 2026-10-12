import type { DriverJobBooking } from '../services/driver/driverApi';

/**
 * Shared status vocabulary for the driver surface.
 *
 * The dashboard, the jobs list and the job cycle all need the same answers about
 * a booking. Keeping the rules in one place stops the three screens from slowly
 * disagreeing about what "active" or "earnings" means.
 */

const COMPLETED_STATUSES = ['COMPLETED', 'RATED', 'PAID'];
const CANCELLED_STATUSES = ['CANCELLED', 'CANCELLED_BY_CUSTOMER'];
const ACTIVE_STATUSES = [
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'IN_PROGRESS',
];

export function isCompletedBookingStatus(status: string): boolean {
  return COMPLETED_STATUSES.includes(status);
}

export function isCancelledBookingStatus(status: string): boolean {
  return CANCELLED_STATUSES.includes(status);
}

/** Finished one way or another — the "Done" segment of the jobs list. */
export function isClosedBookingStatus(status: string): boolean {
  return isCompletedBookingStatus(status) || isCancelledBookingStatus(status);
}

export function isActiveBookingStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Earnings for a job.
 *
 * `finalFare` is written by the backend when the job is completed, so it always
 * wins over the customer-facing estimate. Cancelled jobs earn nothing.
 */
export function jobEarnings(job: DriverJobBooking): number | undefined {
  if (isCancelledBookingStatus(job.status)) return undefined;
  return job.finalFare ?? job.estimatedFare;
}
