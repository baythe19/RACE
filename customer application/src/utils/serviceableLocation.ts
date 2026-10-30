import { findServiceableCity } from '../config/serviceableAreas';
import { getAppDialog } from './alertBus';

const OUT_OF_AREA_TITLE = 'Not available here';
const OUT_OF_AREA_MESSAGE =
  'RACE towing & driver services are currently available only in Bhubaneswar, Odisha. Please select a location in Bhubaneswar.';

/**
 * Returns true if coordinates are inside a live (non–coming-soon) serviceable city.
 * Shows the branded dialog and returns false otherwise — no email/notify CTA.
 */
export function assertServiceableBookingLocation(
  latitude: number,
  longitude: number,
): boolean {
  const city = findServiceableCity(latitude, longitude);
  if (city && !city.comingSoon) {
    return true;
  }

  getAppDialog().showDialog({
    tone: 'warning',
    title: OUT_OF_AREA_TITLE,
    message: OUT_OF_AREA_MESSAGE,
    primaryLabel: 'Got it',
  });
  return false;
}
