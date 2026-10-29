import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

import type { RootStackParamList, RootTabParamList, AuthStackParamList } from '../types/navigation';

export const customerNavigationRef = createNavigationContainerRef<RootStackParamList>();

export function jumpToAuthScreen(screen: keyof AuthStackParamList, params?: object) {
  if (!customerNavigationRef.isReady()) return;
  customerNavigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'Auth',
          state: {
            index: 0,
            routes: [params ? { name: screen as string, params } : { name: screen as string }],
          },
        },
      ],
    }),
  );
}

export function jumpToMainTab(
  tab: keyof RootTabParamList,
  nested?: { screen: string; params?: object },
) {
  if (!customerNavigationRef.isReady()) return;

  const tabRoute = nested
    ? {
        name: tab as string,
        state: {
          index: 0,
          routes: [
            nested.params
              ? { name: nested.screen, params: nested.params }
              : { name: nested.screen },
          ],
        },
      }
    : { name: tab as string };

  customerNavigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          state: {
            index: 0,
            routes: [tabRoute],
          },
        },
      ],
    }),
  );
}

/**
 * Open a booking detail from anywhere (profile sub-screens, notifications).
 * Uses a full reset so the Bookings tab owns its stack cleanly — a plain
 * nested navigate leaves the previous tab's stack mounted and a later tap
 * on that tab lands on a stale screen (e.g. Notifications) instead of its
 * root.
 */
export function openBookingDetailFromAnywhere(bookingId: string, bookingType?: 'towing' | 'driver') {
  if (!customerNavigationRef.isReady()) return;
  customerNavigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          state: {
            index: 0,
            routes: [
              {
                name: 'Bookings',
                state: {
                  index: 1,
                  routes: [
                    { name: 'BookingsMain' },
                    { name: 'BookingDetail', params: { bookingId, bookingType } },
                  ],
                },
              },
            ],
          },
        },
      ],
    }),
  );
}
