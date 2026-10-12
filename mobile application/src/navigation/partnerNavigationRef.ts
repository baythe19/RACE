import { createNavigationContainerRef } from '@react-navigation/native';

import type { PartnerRootStackParamList } from '../types/partnerNavigation';

/**
 * Container-level navigation handle.
 *
 * The incoming-request alert is rendered as an overlay *around* the tab
 * navigator (so it can pop over any tab), which means it is not a screen and
 * cannot use `useNavigation`. Every route helper lives here to keep the nested
 * tab → stack → screen params in one place.
 */
export const partnerNavigationRef = createNavigationContainerRef<PartnerRootStackParamList>();

/** Opens the focused job-cycle screen for a booking. */
export function openDriverActiveJob(
  bookingId?: string,
  bookingType?: 'towing' | 'driver',
): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate(
    'PartnerMain',
    {
      screen: 'PartnerJobs',
      params: { screen: 'PartnerActiveJob', params: { bookingId, bookingType } },
    } as never,
  );
}

/** Opens the Jobs tab (request list). */
export function openDriverJobs(): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate('PartnerMain', { screen: 'PartnerJobs' } as never);
}

/** Opens the canonical Notifications screen in the Account stack. */
export function openPartnerNotifications(): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate(
    'PartnerMain',
    {
      screen: 'PartnerAccount',
      params: { screen: 'PartnerNotifications' },
    } as never,
  );
}
