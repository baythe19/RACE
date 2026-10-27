import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchRoadRoute,
  type RoadRouteResult,
  type RouteManeuverStep,
} from '../services/driver/roadRoutingService';
import {
  haversineMeters,
  OFF_ROUTE_HARD_METERS,
  OFF_ROUTE_METERS,
  progressAlongPath,
  resolveUpcomingManeuver,
  shouldRefreshRoute,
  type LatLng,
  type PathProgress,
} from '../services/driver/tripNavigation';

/** Within this distance of the route start the origin-to-road gap is forgiven. */
const JOIN_ROAD_METERS = 40;
const MAX_START_GAP_METERS = 400;

type Options = {
  origin: LatLng | null;
  destination: LatLng | null;
  destinationName?: string;
  /** Route is only requested while true (active leg of a live job). */
  enabled: boolean;
};

export type DriverRouteState = {
  route: RoadRouteResult | null;
  loading: boolean;
  /** Driver has left the route and a new one is being (or about to be) requested. */
  offRoute: boolean;
  /** A reroute request is in flight. */
  rerouting: boolean;
  progress: PathProgress | null;
  /** Route geometry still ahead of the driver (traveled part is trimmed away). */
  remainingPath: LatLng[];
  maneuver: {
    step: RouteManeuverStep;
    next: RouteManeuverStep | null;
    index: number;
    distanceMeters: number;
  } | null;
  remainingMeters: number | null;
  remainingSeconds: number | null;
  /** Force a fresh route from the current position. */
  refresh: () => void;
};

/**
 * Owns the road route for the active leg.
 *
 * - Fetches once per destination (not per GPS tick — the Routes API is billed).
 * - Snaps the live fix to the route for remaining distance / ETA / next manoeuvre.
 * - Detects off-route with hysteresis and reroutes from the current position,
 *   rate limited by `shouldRefreshRoute` so a noisy fix cannot spam requests.
 */
export function useDriverRoute({
  origin,
  destination,
  destinationName,
  enabled,
}: Options): DriverRouteState {
  const [route, setRoute] = useState<RoadRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [offRoute, setOffRoute] = useState(false);

  const originRef = useRef(origin);
  originRef.current = origin;
  const routeRef = useRef<RoadRouteResult | null>(null);
  routeRef.current = route;
  const lastFetchAt = useRef<number | null>(null);
  const lastOrigin = useRef<LatLng | null>(null);
  const offCount = useRef(0);
  const requestId = useRef(0);
  const failedKey = useRef('');
  const lastCounted = useRef<PathProgress | null>(null);
  /** How far the requested origin was from the first road point the router returned. */
  const startGap = useRef(0);

  const destinationKey = destination
    ? `${destination.latitude.toFixed(5)},${destination.longitude.toFixed(5)}`
    : '';
  const hasOrigin = origin != null;

  const load = useCallback(
    async (isReroute: boolean) => {
      const from = originRef.current;
      if (!from || !destination) return;
      const id = (requestId.current += 1);
      lastFetchAt.current = Date.now();
      lastOrigin.current = from;
      if (isReroute) setRerouting(true);
      else setLoading(true);
      try {
        const next = await fetchRoadRoute(from, destination, destinationName);
        if (id !== requestId.current) return;
        startGap.current =
          !next.approximate && next.coordinates.length > 1
            ? Math.min(haversineMeters(from, next.coordinates[0]), MAX_START_GAP_METERS)
            : 0;
        setRoute(next);
        offCount.current = 0;
        setOffRoute(false);
      } catch {
        // fetchRoadRoute degrades to a labelled straight guide; this is a last
        // resort so a thrown error can never turn into a request loop.
        failedKey.current = destinationKey;
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRerouting(false);
        }
      }
    },
    // destination identity is tracked through destinationKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destinationKey, destinationName],
  );

  // New destination (leg change) → drop the old route, fetch a new one.
  useEffect(() => {
    requestId.current += 1;
    setRoute(null);
    setOffRoute(false);
    setRerouting(false);
    offCount.current = 0;
    failedKey.current = '';
    lastFetchAt.current = null;
    lastOrigin.current = null;
    setLoading(false);
  }, [destinationKey, enabled]);

  // First route as soon as we know where the driver is.
  useEffect(() => {
    if (!enabled || !destination || !hasOrigin || route || loading) return;
    if (failedKey.current === destinationKey) return;
    void load(false);
  }, [destinationKey, enabled, hasOrigin, load, loading, route, destination]);

  const progress = useMemo(() => {
    const raw = origin && route ? progressAlongPath(origin, route.coordinates) : null;
    if (!raw) return null;
    // A pickup/start point is rarely on the road itself (car park, forecourt).
    // Until the driver has joined the road, the walk to it is not "off route".
    const grace = raw.alongMeters < JOIN_ROAD_METERS ? startGap.current : 0;
    return grace > 0 ? { ...raw, offMeters: Math.max(0, raw.offMeters - grace) } : raw;
  }, [origin, route]);

  // Off-route detection + reroute.
  useEffect(() => {
    const current = routeRef.current;
    if (!enabled || !origin || !current || !progress || !destination) return undefined;
    // A two-point straight guide has no road to leave.
    if (current.approximate) return undefined;

    if (progress.offMeters > OFF_ROUTE_METERS) {
      if (lastCounted.current !== progress) {
        lastCounted.current = progress;
        offCount.current += 1;
      }
    } else {
      lastCounted.current = progress;
      offCount.current = 0;
      if (offRoute && !rerouting) setOffRoute(false);
      return undefined;
    }

    const confirmed = progress.offMeters > OFF_ROUTE_HARD_METERS || offCount.current >= 2;
    if (!confirmed) return undefined;
    setOffRoute(true);
    if (rerouting) return undefined;

    const fetchedAt = lastFetchAt.current;
    const ready = shouldRefreshRoute({
      now: Date.now(),
      lastFetchedAt: fetchedAt,
      lastOrigin: lastOrigin.current,
      origin,
      path: current.coordinates,
      destinationChanged: false,
    });
    if (ready) {
      void load(true);
      return undefined;
    }
    // Throttled: try again shortly even if no further GPS fix arrives.
    const wait = fetchedAt == null ? 0 : Math.max(500, 8_000 - (Date.now() - fetchedAt));
    const timer = setTimeout(() => void load(true), wait);
    return () => clearTimeout(timer);
  }, [destination, enabled, load, offRoute, origin, progress, rerouting]);

  const remainingPath = useMemo(() => {
    if (!route) return [];
    if (!progress || progress.offMeters > OFF_ROUTE_METERS) return route.coordinates;
    return [progress.snapped, ...route.coordinates.slice(progress.index + 1)];
  }, [progress, route]);

  const maneuver = useMemo(
    () =>
      route && progress && !route.approximate
        ? resolveUpcomingManeuver(route.steps, route.coordinates, progress.alongMeters)
        : route
          ? resolveUpcomingManeuver(route.steps, route.coordinates, 0)
          : null,
    [progress, route],
  );

  const remainingMeters = route
    ? progress && progress.offMeters <= OFF_ROUTE_HARD_METERS * 2
      ? progress.remainingMeters
      : route.distanceMeters
    : null;
  const remainingSeconds =
    route && remainingMeters != null && route.distanceMeters > 0
      ? Math.max(0, Math.round(route.durationSeconds * (remainingMeters / route.distanceMeters)))
      : null;

  const refresh = useCallback(() => {
    void load(true);
  }, [load]);

  return {
    route,
    loading,
    offRoute,
    rerouting,
    progress,
    remainingPath,
    maneuver,
    remainingMeters,
    remainingSeconds,
    refresh,
  };
}
