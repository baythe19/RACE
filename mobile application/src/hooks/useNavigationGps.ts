import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { ensureForegroundLocationPermission } from '../utils/locationPermission';
import { useDriverPresenceStore, type DriverCoordinates } from '../store/driverPresenceStore';
import { bearingDegrees, haversineMeters } from '../services/driver/tripNavigation';

/**
 * High-rate foreground GPS for in-app turn-by-turn.
 *
 * The 12 s reporter in `useDriverLocationReporting` is right for dispatch but far
 * too coarse for a moving map. While the driver is on an active trip this watches
 * the device at ~1 Hz (navigation accuracy) and writes into the shared presence
 * store, which the route / camera / banner logic reads.
 *
 * Skipped entirely while the preview simulator owns the position.
 */
export function useNavigationGps(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    void (async () => {
      const granted = await ensureForegroundLocationPermission();
      if (!granted || cancelled) return;
      try {
        const next = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 4,
          },
          position => {
            const store = useDriverPresenceStore.getState();
            if (store.simulationActive) return;
            store.setDriverLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              updatedAt: Date.now(),
              heading:
                position.coords.heading != null && position.coords.heading >= 0
                  ? position.coords.heading
                  : null,
              accuracy: position.coords.accuracy,
            });
          },
        );
        if (cancelled) next.remove();
        else subscription = next;
      } catch {
        // Permission / services problems surface through the reporter health card.
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);
}

/**
 * Direction of travel in degrees. Uses the GPS heading when the device gives one,
 * otherwise the bearing between two fixes at least 6 m apart (so a stationary,
 * jittering fix never spins the map).
 */
export function useTravelHeading(location: DriverCoordinates | null): number {
  const [heading, setHeading] = useState(0);
  const anchor = useRef<DriverCoordinates | null>(null);

  useEffect(() => {
    if (!location) return;
    if (location.heading != null && Number.isFinite(location.heading)) {
      setHeading(location.heading);
      anchor.current = location;
      return;
    }
    const last = anchor.current;
    if (!last) {
      anchor.current = location;
      return;
    }
    if (haversineMeters(last, location) >= 6) {
      setHeading(bearingDegrees(last, location));
      anchor.current = location;
    }
  }, [location]);

  return heading;
}
