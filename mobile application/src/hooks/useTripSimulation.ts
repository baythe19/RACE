import { useCallback, useEffect, useRef, useState } from 'react';

import { useDriverPresenceStore } from '../store/driverPresenceStore';
import {
  haversineMeters,
  offsetPoint,
  pointAlongPath,
  progressAlongPath,
  type LatLng,
} from '../services/driver/tripNavigation';

const TICK_MS = 500;
/** Demo pace: a whole leg takes roughly 90 s at 1x, never slower than a bicycle. */
const MIN_SPEED_MPS = 12;
const MAX_SPEED_MPS = 60;
const STOP_BEFORE_END_METERS = 4;
/** Re-stamp a parked position this often so it never looks stale. */
const HEARTBEAT_MS = 10_000;

type Options = {
  /** Preview builds only. Real builds read the device GPS instead. */
  enabled: boolean;
  jobId?: string | null;
  status?: string | null;
  /** Where the preview driver starts (a random Bhopal locality). */
  start: LatLng | null;
  pickup: LatLng | null;
  /** Geometry of the active leg (full route, not the trimmed remainder). */
  path: LatLng[] | null;
  pathDistanceMeters?: number;
  /** Driver pressed "Start navigation" and is not stopped at a sheet. */
  moving: boolean;
  /** Hold position while an off-route reroute is being resolved. */
  hold: boolean;
};

/**
 * Preview-only vehicle simulator.
 *
 * It behaves like the real GPS feed: it writes a position + heading into the
 * shared presence store about twice a second, moving along the same road polyline
 * the navigation UI draws. Everything downstream (camera follow, remaining
 * distance, next manoeuvre, off-route, vendor tracking) therefore runs the exact
 * same code path as production — only the source of the fixes differs.
 */
export function useTripSimulation({
  enabled,
  jobId,
  status,
  start,
  pickup,
  path,
  pathDistanceMeters,
  moving,
  hold,
}: Options) {
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const live = useRef({ path, pathDistanceMeters, moving, hold, speedMultiplier });
  live.current = { path, pathDistanceMeters, moving, hold, speedMultiplier };
  const seededFor = useRef<string | null>(null);
  const heading = useRef(0);

  const write = useCallback((point: LatLng, bearing: number) => {
    heading.current = bearing;
    useDriverPresenceStore.getState().setDriverLocation({
      latitude: point.latitude,
      longitude: point.longitude,
      updatedAt: Date.now(),
      heading: bearing,
      accuracy: 5,
    });
  }, []);

  // Own the position source while the preview job is live.
  useEffect(() => {
    if (!enabled) return undefined;
    useDriverPresenceStore.getState().setSimulationActive(true);
    return () => {
      useDriverPresenceStore.getState().setSimulationActive(false);
    };
  }, [enabled]);

  // Seed / re-sync the starting point when the job or its stage changes.
  useEffect(() => {
    if (!enabled || !jobId || !status) return;
    const current = useDriverPresenceStore.getState().driverLocation;
    const atPickupStage = status === 'DRIVER_ARRIVED' || status === 'IN_PROGRESS';
    const seedKey = `${jobId}:${atPickupStage ? 'pickup' : 'start'}`;
    if (seededFor.current === seedKey && current) return;

    if (atPickupStage && pickup) {
      // Anything that jumps straight to arrival (QA, reopened app) starts here.
      if (!current || haversineMeters(current, pickup) > 250) {
        write(pickup, heading.current);
      }
    } else if (start && (!current || seededFor.current?.split(':')[0] !== jobId)) {
      write(start, heading.current);
    }
    seededFor.current = seedKey;
  }, [enabled, jobId, pickup, start, status, write]);

  // The movement loop.
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => {
      const { path: route, pathDistanceMeters: total, moving: go, hold: paused, speedMultiplier: mult } =
        live.current;
      const here = useDriverPresenceStore.getState().driverLocation;
      if (!here) return;
      /** A parked car still reports: keeps the fix "fresh" like a real GPS heartbeat. */
      const heartbeat = () => {
        if (Date.now() - here.updatedAt >= HEARTBEAT_MS) write(here, heading.current);
      };
      if (!go || paused || !route || route.length < 2) {
        heartbeat();
        return;
      }
      const progress = progressAlongPath(here, route);
      if (!progress) {
        heartbeat();
        return;
      }
      const length = total && total > 0 ? total : progress.totalMeters;
      const speed = Math.min(MAX_SPEED_MPS, Math.max(MIN_SPEED_MPS, length / 90)) * mult;
      const nextAlong = Math.min(
        progress.totalMeters - STOP_BEFORE_END_METERS,
        progress.alongMeters + speed * (TICK_MS / 1000),
      );
      if (nextAlong <= progress.alongMeters) {
        heartbeat();
        return;
      }
      const next = pointAlongPath(route, nextAlong);
      if (next) write(next.point, next.heading);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [enabled, write]);

  /** QA helper: a wrong turn that is clearly off the road. */
  const deviate = useCallback(() => {
    const here = useDriverPresenceStore.getState().driverLocation;
    if (!here) return;
    write(offsetPoint(here, heading.current + 90, 260), heading.current);
  }, [write]);

  /** QA helper: jump to just before the end of the active leg. */
  const skipToArrival = useCallback(() => {
    const route = live.current.path;
    if (!route || route.length < 2) return;
    const progress = progressAlongPath(route[0], route);
    const end = progress?.totalMeters ?? 0;
    const spot = pointAlongPath(route, Math.max(0, end - 25));
    if (spot) write(spot.point, spot.heading);
  }, [write]);

  return { speedMultiplier, setSpeedMultiplier, deviate, skipToArrival };
}
