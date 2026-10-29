import type { TowingBookingState } from '../types/towingBooking';
import { towingDateIdToScheduledAt } from './bookingLocation';

/** Query params shared by fare estimate API and create-booking payload rules. */
export function towingFareModeParams(booking: Pick<
  TowingBookingState,
  'serviceMode' | 'dateId' | 'timeId'
>): {
  towingMode: TowingBookingState['serviceMode'];
  scheduledAt?: string;
} {
  if (booking.serviceMode === 'scheduled') {
    return {
      towingMode: 'scheduled',
      scheduledAt: towingDateIdToScheduledAt(booking.dateId, booking.timeId),
    };
  }
  if (booking.serviceMode === 'emergency') {
    return { towingMode: 'emergency' };
  }
  return { towingMode: 'instant' };
}
