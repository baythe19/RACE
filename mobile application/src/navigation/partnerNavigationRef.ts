import { createNavigationContainerRef, type NavigatorScreenParams } from '@react-navigation/native';

import type { PartnerAccountStackParamList, PartnerJobsStackParamList, PartnerRootStackParamList } from '../types/partnerNavigation';

/**
 * Container-level navigation handle.
 *
 * The incoming-request alert is rendered as an overlay *around* the tab
 * navigator (so it can pop over any tab), which means it is not a screen and
 * cannot use `useNavigation`. Every route helper lives here to keep the nested
 * tab → stack → screen params in one place.
 */
export const partnerNavigationRef = createNavigationContainerRef<PartnerRootStackParamList>();

type StackScreenArgs<Params> = {
  [Screen in keyof Params]: undefined extends Params[Screen]
    ? [screen: Screen, params?: Params[Screen]]
    : [screen: Screen, params: Params[Screen]];
}[keyof Params];

function childStackState(root: string, screen: string, params?: object) {
  const routes = screen === root
    ? [{ name: root }]
    : [{ name: root }, { name: screen, params }];
  return { state: { index: routes.length - 1, routes } };
}

/** Cross-tab entry always has Account underneath its child, even on a warm stack. */
export function partnerAccountParams(
  ...[screen, params]: StackScreenArgs<PartnerAccountStackParamList>
): NavigatorScreenParams<PartnerAccountStackParamList> {
  return childStackState('PartnerAccountMain', screen, params);
}

export function partnerJobsParams(
  ...[screen, params]: StackScreenArgs<PartnerJobsStackParamList>
): NavigatorScreenParams<PartnerJobsStackParamList> {
  return childStackState('PartnerJobsList', screen, params);
}

/** Opens the focused job-cycle screen for a booking. */
export function openDriverActiveJob(
  bookingId?: string,
  bookingType?: 'towing' | 'driver',
): void {
  jumpToPartnerJobsScreen('PartnerActiveJob', { bookingId, bookingType });
}

/** Opens the Jobs tab (request list). */
export function openDriverJobs(): void {
  jumpToPartnerJobsScreen('PartnerJobsList');
}

/** Opens the canonical Notifications screen in the Account stack. */
export function openPartnerNotifications(): void {
  jumpToPartnerAccountScreen('PartnerNotifications');
}

/** Opens any tab in PartnerMain. */
export function jumpToPartnerMainTab(
  tab: 'PartnerHome' | 'PartnerJobs' | 'PartnerDrivers' | 'PartnerAccount',
): void {
  if (!partnerNavigationRef.isReady()) return;
  if (tab === 'PartnerAccount') {
    jumpToPartnerAccountScreen('PartnerAccountMain');
  } else {
    partnerNavigationRef.navigate('PartnerMain', { screen: tab });
  }
}

/** Opens any subpage in the PartnerAccount stack. */
export function jumpToPartnerAccountScreen(
  ...args: StackScreenArgs<PartnerAccountStackParamList>
): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate(
    'PartnerMain',
    {
      screen: 'PartnerAccount',
      params: partnerAccountParams(...args),
    },
  );
}

/** Opens Jobs-owned pages with the Jobs list underneath, without resetting other tabs. */
export function jumpToPartnerJobsScreen(
  ...args: StackScreenArgs<PartnerJobsStackParamList>
): void {
  if (!partnerNavigationRef.isReady()) return;
  partnerNavigationRef.navigate('PartnerMain', {
    screen: 'PartnerJobs',
    params: partnerJobsParams(...args),
  });
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
