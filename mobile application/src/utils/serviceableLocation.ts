import { findServiceableCity } from '../config/serviceableAreas';

const OUT_OF_AREA_TITLE = 'Not available here';
const OUT_OF_AREA_MESSAGE =
  'RACE towing & driver services are currently available only in Bhubaneswar, Odisha. Please select a location in Bhubaneswar.';

export const OUT_OF_AREA_DIALOG = {
  tone: 'warning' as const,
  title: OUT_OF_AREA_TITLE,
  message: OUT_OF_AREA_MESSAGE,
};

/**
 * Returns true if coordinates are inside a live (non–coming-soon) serviceable city.
 * Callers render the designed dialog via `showAlert(OUT_OF_AREA_DIALOG)` (usePartnerDialog)
 * instead of a system alert — this module stays UI-free so it can be used anywhere.
 */
export function isServiceableBookingLocation(
  latitude: number,
  longitude: number,
): boolean {
  const city = findServiceableCity(latitude, longitude);
  return Boolean(city && !city.comingSoon);
}
