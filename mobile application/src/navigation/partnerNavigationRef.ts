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

/** Opens any tab in PartnerMain. */
export function jumpToPartnerMainTab(
  tab: 'PartnerHome' | 'PartnerJobs' | 'PartnerAccount',
): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate('PartnerMain', { screen: tab } as never);
}

/** Opens any subpage in the PartnerAccount stack. */
export function jumpToPartnerAccountScreen(
  screen: string,
  params?: Record<string, unknown>,
): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate(
    'PartnerMain',
    {
      screen: 'PartnerAccount',
      params: { screen, params },
    } as never,
  );
}

/** Opens the Registration stack directly at any step. */
export function jumpToPartnerRegistration(
  role: 'driver' | 'vendor',
  screenName?: string,
  mobileNumber = '9876543210',
): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate(
    'PartnerRegistration',
    {
      role,
      mobileNumber,
      screen: screenName,
    } as never,
  );
}

/** Opens any screen in the Bootstrap / Auth flow. */
export function jumpToPartnerAuth(
  screenName: string,
  params?: Record<string, unknown>,
): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate(
    'PartnerBootstrap',
    {
      screen: screenName,
      params,
    } as never,
  );
}

/** Opens the driver verification gate. */
export function jumpToDriverVerificationGate(): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate('PartnerDriverVerification' as never);
}
