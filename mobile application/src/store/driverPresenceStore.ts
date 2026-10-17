import { create } from 'zustand';

/**
 * Driver presence — shared by every driver surface.
 *
 * The dashboard, the location reporter and the incoming-request alert all need
 * the same answer to "am I actually reachable right now?". Keeping it here stops
 * each screen from guessing, and lets the UI explain *why* requests are not
 * arriving instead of showing a misleading "Online" badge.
 */
export type DriverLocationHealth =
  /** Nothing checked yet (app just opened). */
  | 'unknown'
  /** GPS fix obtained and pushed to the backend. */
  | 'ok'
  /** The driver refused the location permission — requests cannot be matched. */
  | 'permission_denied'
  /** Permission granted but the device location switch (GPS) is off. */
  | 'services_disabled'
  /** Permission granted, GPS on, but the fix or the API call failed. */
  | 'error';

export interface DriverCoordinates {
  latitude: number;
  longitude: number;
  updatedAt: number;
}

interface DriverPresenceState {
  /** Backend-reported availability. */
  isOnline: boolean;
  locationHealth: DriverLocationHealth;
  /** Epoch ms of the last successful report to the backend. */
  lastLocationAt: number | null;
  /** Most recent device fix, used to center the active-trip map. */
  driverLocation: DriverCoordinates | null;
  /** True while a location report is in flight. */
  isReporting: boolean;
  setOnline: (isOnline: boolean) => void;
  setLocationHealth: (
    health: DriverLocationHealth,
    options?: { lastLocationAt?: number | null; isReporting?: boolean },
  ) => void;
  setDriverLocation: (location: DriverCoordinates) => void;
}

export const useDriverPresenceStore = create<DriverPresenceState>((set) => ({
  isOnline: false,
  locationHealth: 'unknown',
  lastLocationAt: null,
  driverLocation: null,
  isReporting: false,
  setOnline: (isOnline) => set({ isOnline }),
  setLocationHealth: (locationHealth, options) =>
    set((state) => ({
      locationHealth,
      lastLocationAt:
        options?.lastLocationAt !== undefined ? options.lastLocationAt : state.lastLocationAt,
      isReporting: options?.isReporting !== undefined ? options.isReporting : state.isReporting,
    })),
  setDriverLocation: (driverLocation) => set({ driverLocation }),
}));

/** Human copy for a location problem — used by the dashboard health card. */
export function locationHealthCopy(health: DriverLocationHealth): {
  title: string;
  message: string;
  action: 'settings' | 'enable' | 'retry' | null;
  actionLabel: string;
} | null {
  switch (health) {
    case 'permission_denied':
      return {
        title: 'Location permission needed',
        message:
          'RACE matches requests near you. Allow location access so new jobs can reach you.',
        action: 'settings',
        actionLabel: 'Open settings',
      };
    case 'services_disabled':
      return {
        title: 'Turn on device location',
        message: 'Your phone location (GPS) is off, so nearby requests cannot be matched to you.',
        action: 'enable',
        actionLabel: 'Turn on location',
      };
    case 'error':
      return {
        title: 'Location not updating',
        message:
          'We could not send your location to RACE. Check your connection and try again.',
        action: 'retry',
        actionLabel: 'Try again',
      };
    default:
      return null;
  }
}
