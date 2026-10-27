import { haversineKm, haversineMeters, type LatLng } from './tripNavigation';
import { getGoogleMapsApiKey } from '../../utils/googleMaps';

export type ManeuverType =
  | 'depart'
  | 'straight'
  | 'turn_left'
  | 'turn_right'
  | 'slight_left'
  | 'slight_right'
  | 'sharp_left'
  | 'sharp_right'
  | 'u_turn'
  | 'roundabout'
  | 'merge'
  | 'ramp'
  | 'arrive';

export interface RouteManeuverStep {
  id: string;
  instruction: string;
  shortInstruction: string;
  streetName: string;
  /** Distance the driver still has to cover before this manoeuvre starts. */
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: ManeuverType;
  coordinate: LatLng;
  /** Where the turn actually happens (start of the *next* leg); fallback = coordinate. */
  endCoordinate?: LatLng;
}

export interface RoadRouteResult {
  coordinates: LatLng[];
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  etaTimeFormatted: string;
  steps: RouteManeuverStep[];
  source: 'google_routes' | 'osrm' | 'straight_fallback';
  approximate: boolean;
}

/**
 * Provider steps are sanitised before the UI sees them:
 * - the final "arrive" step always exists and sits on the destination;
 * - absurd step distances fall back to the whole leg;
 * - instruction text never shows raw provider codes.
 */
export function normalizeRouteSteps(
  steps: RouteManeuverStep[],
  region: { origin: LatLng; destination: LatLng; destinationName?: string; distanceMeters: number; durationSeconds: number },
): RouteManeuverStep[] {
  const cleaned = steps
    .filter(step => step && Number.isFinite(step.coordinate.latitude))
    .map(step => {
      const distance = Number.isFinite(step.distanceMeters) ? step.distanceMeters : 0;
      return {
        ...step,
        distanceMeters:
          distance > MAX_STEP_DISTANCE_METERS ? region.distanceMeters : Math.max(0, Math.round(distance)),
        durationSeconds:
          Number.isFinite(step.durationSeconds) && step.durationSeconds > 0
            ? step.durationSeconds
            : Math.max(20, Math.round(distance / 8)),
      };
    });

  const hasArrive = cleaned[cleaned.length - 1]?.maneuverType === 'arrive';
  const withArrive: RouteManeuverStep[] = hasArrive
    ? cleaned
    : [
        ...cleaned,
        {
          id: 'arrive-final',
          instruction: `You have arrived${region.destinationName ? ` at ${region.destinationName}` : ''}`,
          shortInstruction: 'Arrive',
          streetName: region.destinationName || 'Destination',
          distanceMeters: 0,
          durationSeconds: 0,
          maneuverType: 'arrive',
          coordinate: region.destination,
        },
      ];

  // Short "turn left" strings read better on the banner than full sentences.
  return withArrive.map((step, index) => {
    const next = withArrive[index + 1];
    return {
      ...step,
      // Google's *following* step starts where this manoeuvre happens.
      endCoordinate: step.endCoordinate ?? next?.coordinate ?? step.coordinate,
      shortInstruction: step.shortInstruction || step.instruction,
      instruction:
        step.instruction?.trim() ||
        (step.maneuverType === 'arrive'
          ? `You have arrived${region.destinationName ? ` at ${region.destinationName}` : ''}`
          : step.streetName
            ? `Continue on ${step.streetName}`
            : 'Continue straight'),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Offline / no-provider fallback.                                     *
 * There is no fabricated road geometry here: if the provider fails we  *
 * build a clearly-labelled straight guide (approximate: true) from the  *
 * real origin/destination — never a hard-coded city street.             *
 * ------------------------------------------------------------------ */
function buildStraightFallback(origin: LatLng, destination: LatLng): RoadRouteResult {
  const meters = haversineMeters(origin, destination);
  const seconds = Math.max(60, Math.round((meters / 1000) * 130));
  return {
    coordinates: [origin, destination],
    distanceMeters: Math.round(meters),
    distanceKm: Math.round((meters / 1000) * 10) / 10,
    durationSeconds: seconds,
    durationMinutes: Math.max(1, Math.round(seconds / 60)),
    etaTimeFormatted: formatEta(seconds),
    steps: [
      {
        id: 'fallback-depart',
        instruction: 'Head toward the destination',
        shortInstruction: 'Head',
        streetName: 'Straight line',
        distanceMeters: Math.round(meters),
        durationSeconds: seconds,
        maneuverType: 'depart',
        coordinate: origin,
        endCoordinate: destination,
      },
      {
        id: 'fallback-arrive',
        instruction: 'You have arrived',
        shortInstruction: 'Arrive',
        streetName: 'Destination',
        distanceMeters: 0,
        durationSeconds: 0,
        maneuverType: 'arrive',
        coordinate: destination,
      },
    ],
    source: 'straight_fallback',
    approximate: true,
  };
}

/** Longest manoeuvre leg that the navigation UI is allowed to trust. */
const MAX_STEP_DISTANCE_METERS = 20_000;

export function formatEta(durationSeconds: number): string {
  const arrival = new Date(Date.now() + durationSeconds * 1000);
  let hours = arrival.getHours();
  const minutes = arrival.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function decodeGooglePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: latitude / 100000, longitude: longitude / 100000 });
  }

  return points;
}

function mapOsrmManeuverType(type: string, modifier?: string): ManeuverType {
  const mod = (modifier || '').toLowerCase();
  const t = (type || '').toLowerCase();

  if (t === 'arrive') return 'arrive';
  if (t === 'depart') return 'depart';
  if (t === 'roundabout' || t === 'rotary') return 'roundabout';
  if (t === 'merge') return 'merge';
  if (t === 'on ramp' || t === 'off ramp' || t === 'fork') return 'ramp';

  if (mod.includes('slight left')) return 'slight_left';
  if (mod.includes('slight right')) return 'slight_right';
  if (mod.includes('sharp left')) return 'sharp_left';
  if (mod.includes('sharp right')) return 'sharp_right';
  if (mod.includes('left')) return 'turn_left';
  if (mod.includes('right')) return 'turn_right';
  if (mod.includes('u-turn') || mod.includes('uturn')) return 'u_turn';
  return 'straight';
}

function mapGoogleManeuverType(maneuver?: string): ManeuverType {
  const m = (maneuver || '').toUpperCase();
  if (m.includes('LEFT')) return m.includes('SLIGHT') ? 'slight_left' : m.includes('SHARP') ? 'sharp_left' : 'turn_left';
  if (m.includes('RIGHT')) return m.includes('SLIGHT') ? 'slight_right' : m.includes('SHARP') ? 'sharp_right' : 'turn_right';
  if (m.includes('UTURN')) return 'u_turn';
  if (m.includes('RAMP') || m.includes('FORK')) return 'ramp';
  if (m.includes('MERGE')) return 'merge';
  if (m.includes('ROUNDABOUT')) return 'roundabout';
  if (m.includes('DEPART')) return 'depart';
  if (m.includes('ARRIVE')) return 'arrive';
  return 'straight';
}


/** Turn OSRM's (type, modifier) pair into the sentence a driver expects to read. */
function osrmInstruction(
  type: string | undefined,
  modifier: string | undefined,
  road: string,
  isFirst: boolean,
  exit?: number,
): string {
  const mod = (modifier || '').toLowerCase();
  const onto = road ? ` onto ${road}` : '';
  const side = mod.replace('slight ', '').replace('sharp ', '');
  if (isFirst) {
    return road ? `Head ${side || 'ahead'} on ${road}` : `Head ${side || 'ahead'}`;
  }
  switch ((type || '').toLowerCase()) {
    case 'turn':
      if (mod.startsWith('slight')) return `Bear ${side}${onto}`;
      if (mod.startsWith('sharp')) return `Take a sharp ${side}${onto}`;
      if (mod === 'uturn' || mod === 'u-turn') return 'Make a U-turn';
      return `Turn ${side || 'ahead'}${onto}`;
    case 'end of road':
      return `Turn ${side || 'ahead'} at the end of the road${onto}`;
    case 'fork':
      return `Keep ${side || 'ahead'} at the fork${onto}`;
    case 'merge':
      return `Merge${onto}`;
    case 'on ramp':
    case 'off ramp':
      return `Take the ramp${onto}`;
    case 'roundabout':
    case 'rotary':
      return `At the roundabout, take ${exit ? `exit ${exit}` : 'the exit'}${onto}`;
    case 'new name':
    case 'continue':
    default:
      return road ? `Continue on ${road}` : 'Continue straight';
  }
}

/** Route memory cache so rapid re-renders do not refetch */
const routeCache = new Map<string, { timestamp: number; result: RoadRouteResult }>();
const CACHE_TTL_MS = 60_000;

export async function fetchRoadRoute(
  origin: LatLng,
  destination: LatLng,
  destinationName?: string,
): Promise<RoadRouteResult> {
  const cacheKey = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}->${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 1. Try Google Routes API if key exists
  const key = getGoogleMapsApiKey();
  if (key) {
    try {
      const gRes = await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask':
              'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps',
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
            destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            languageCode: 'en-IN',
            regionCode: 'IN',
            units: 'METRIC',
          }),
        },
      );
      if (gRes.ok) {
        const data = await gRes.json();
        const route = data.routes?.[0];
        if (route?.polyline?.encodedPolyline) {
          const coords = decodeGooglePolyline(route.polyline.encodedPolyline);
          const distanceMeters = Number(route.distanceMeters) || haversineMeters(origin, destination);
          const durationSeconds = parseInt(String(route.duration).replace('s', ''), 10) || Math.round((distanceMeters / 1000) * 120);
          const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
          // Google labels the *following* step with where this leg begins:
          // the step's own arrival point is the next step's start.
          const rawGSteps: any[] = route.legs?.[0]?.steps || [];
          const gSteps: RouteManeuverStep[] = rawGSteps.map((step, idx) => {
            const mType = mapGoogleManeuverType(step.navigationInstruction?.maneuver);
            const instruction = step.navigationInstruction?.instructions || (idx === 0 ? 'Depart' : 'Continue');
            const stepDist = Number(step.distanceMeters) || 0;
            const stepSec = parseInt(String(step.staticDuration || '').replace('s', ''), 10) || 30;
            return {
              id: `g-step-${idx}`,
              instruction,
              shortInstruction: instruction.split(' onto ')[0] || instruction,
              streetName: instruction.split(' onto ')[1] || 'Road',
              distanceMeters: stepDist,
              durationSeconds: stepSec,
              maneuverType: mType,
              coordinate: {
                latitude: step.startLocation?.latLng?.latitude || origin.latitude,
                longitude: step.startLocation?.latLng?.longitude || origin.longitude,
              },
            };
          });

          const result: RoadRouteResult = {
            coordinates: coords,
            distanceMeters,
            distanceKm,
            durationSeconds,
            durationMinutes,
            etaTimeFormatted: formatEta(durationSeconds),
            steps: normalizeRouteSteps(gSteps, {
              origin,
              destination,
              destinationName,
              distanceMeters,
              durationSeconds,
            }),
            source: 'google_routes',
            approximate: false,
          };
          routeCache.set(cacheKey, { timestamp: Date.now(), result });
          return result;
        }
      }
    } catch {
      // Graceful fallback to OSRM / high-precision engine
    }
  }

  // 2. High-performance road routing engine (OSRM) with real Indian road network
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline&steps=true`;
    const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];
        const coords = decodeGooglePolyline(route.geometry);
        const distanceMeters = Math.round(route.distance);
        const durationSeconds = Math.round(route.duration);
        const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

          const rawSteps: any[] = route.legs?.[0]?.steps || [];
          const steps: RouteManeuverStep[] = rawSteps.map((step, idx) => {
            const mType = mapOsrmManeuverType(step.maneuver?.type, step.maneuver?.modifier);
            const road = step.name || step.ref || '';
            const street =
              road ||
              (idx === rawSteps.length - 1 ? destinationName || 'Destination' : 'the road ahead');
            const instruction =
              idx === rawSteps.length - 1
                ? `You have arrived at ${destinationName || 'destination'}`
                : osrmInstruction(
                    step.maneuver?.type,
                    step.maneuver?.modifier,
                    road,
                    idx === 0,
                    step.maneuver?.exit,
                  );

            return {
              id: `osrm-step-${idx}`,
              instruction,
              shortInstruction: instruction.split(' onto ')[0].split(' on ')[0],
              streetName: street,
              distanceMeters: Math.round(step.distance),
              durationSeconds: Math.round(step.duration),
              maneuverType: mType,
              coordinate: {
                latitude: step.maneuver?.location?.[1] ?? origin.latitude,
                longitude: step.maneuver?.location?.[0] ?? origin.longitude,
              },
            };
          });

        const result: RoadRouteResult = {
          coordinates: coords.length >= 2 ? coords : [origin, destination],
          distanceMeters,
          distanceKm,
          durationSeconds,
          durationMinutes,
          etaTimeFormatted: formatEta(durationSeconds),
          steps: normalizeRouteSteps(steps, {
            origin,
            destination,
            destinationName,
            distanceMeters,
            durationSeconds,
          }),
          source: 'osrm',
          approximate: false,
        };
        routeCache.set(cacheKey, { timestamp: Date.now(), result });
        return result;
      }
    }
  } catch {
    // Offline / Network failover
  }

  // 3. No provider available: an honest straight guide, clearly labelled.
  const result = buildStraightFallback(origin, destination);
  routeCache.set(cacheKey, { timestamp: Date.now(), result });
  return result;
}
