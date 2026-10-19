import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { BHUBANESWAR_DEFAULT, getGoogleMapsApiKey } from '../../utils/googleMaps';
import { colors } from '../../theme';
import { haversineKm, shouldRefreshRoute, type LatLng } from '../../services/driver/tripNavigation';

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

export type MapPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type RouteMeta = {
  distanceKm: number;
  durationMinutes?: number;
  /** True when the figure is straight-line, not a road route. */
  approximate?: boolean;
};

type Props = {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  /** Active-trip mode: route from the driver's latest device fix to this destination. */
  driverLocation?: MapPoint | null;
  activeDestination?: MapPoint | null;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  showsUserLocation?: boolean;
  routeColor?: string;
  pickupColor?: string;
  dropoffColor?: string;
  recenterTrigger?: number;
  /** Render the deterministic board-style map used by the driver preview. */
  previewMap?: boolean;
  /** Fetch a road-following route when both coordinates and a Maps key exist. */
  routeApiEnabled?: boolean;
  /** Draw a labeled straight line when the road route is unavailable. */
  straightFallback?: boolean;
  /**
   * Fraction of the map covered by a sheet at the bottom. The camera shifts so
   * driver, pickup, and drop stay in the visible strip above that sheet.
   */
  bottomCoverRatio?: number;
  onRouteMetaChange?: (meta: RouteMeta | null) => void;
};

function isValidPoint(point?: MapPoint | null): point is MapPoint {
  return (
    !!point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    !(point.latitude === 0 && point.longitude === 0)
  );
}

function regionForPoints(points: MapPoint[], bottomCover = 0): Region {
  const cover = Math.min(Math.max(bottomCover, 0), 0.75);
  const visible = Math.max(0.22, 1 - cover);
  if (points.length === 0) {
    return { ...BHUBANESWAR_DEFAULT };
  }
  if (points.length === 1) {
    const span = 0.02;
    const latitudeDelta = span / visible;
    return {
      latitude: points[0].latitude - (latitudeDelta - span) / 2,
      longitude: points[0].longitude,
      latitudeDelta,
      longitudeDelta: span,
    };
  }

  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.008);
  const lngSpan = Math.max(maxLng - minLng, 0.008);
  const latPad = Math.max(latSpan * 0.22, 0.003);
  const lngPad = Math.max(lngSpan * 0.22, 0.003);
  const latitudeDelta = (latSpan + latPad * 2) / visible;
  // Push the camera south so the pins sit above a bottom sheet.
  const extraSouth = latitudeDelta * cover;

  return {
    latitude: (minLat + maxLat) / 2 - extraSouth / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta: lngSpan + lngPad * 2,
  };
}

/** Points the map can place itself. A native polyline is not drawn in Peach. */
function routeSamples(coords: MapPoint[], maxPoints = 16): MapPoint[] {
  if (coords.length < 2) return [];
  if (coords.length === 2) {
    const [start, end] = coords;
    const samples: MapPoint[] = [];
    for (let index = 0; index < maxPoints; index += 1) {
      const t = index / (maxPoints - 1);
      samples.push({
        latitude: start.latitude + (end.latitude - start.latitude) * t,
        longitude: start.longitude + (end.longitude - start.longitude) * t,
      });
    }
    return samples;
  }
  if (coords.length <= maxPoints) return coords;
  const samples: MapPoint[] = [];
  const step = (coords.length - 1) / (maxPoints - 1);
  for (let index = 0; index < maxPoints; index += 1) {
    samples.push(coords[Math.round(index * step)]);
  }
  return samples;
}

function decodeGooglePolyline(encoded: string): MapPoint[] {
  const points: MapPoint[] = [];
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

type GoogleDirectionsResponse = {
  routes?: Array<{
    overview_polyline?: { points?: string };
    legs?: Array<{
      distance?: { value?: number };
      duration?: { value?: number };
    }>;
  }>;
};

export default function LiveTripMap({
  pickup,
  dropoff,
  driverLocation,
  activeDestination,
  style,
  borderRadius = 16,
  showsUserLocation = true,
  routeColor = colors.primary,
  pickupColor = '#16A34A',
  dropoffColor = colors.error,
  recenterTrigger,
  previewMap = false,
  routeApiEnabled = false,
  straightFallback = false,
  bottomCoverRatio = 0,
  onRouteMetaChange,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [roadRoute, setRoadRoute] = useState<MapPoint[]>([]);
  const [routeApproximate, setRouteApproximate] = useState(false);
  const metaCb = useRef(onRouteMetaChange);
  metaCb.current = onRouteMetaChange;
  const routeMemory = useRef<{ at: number; origin: LatLng; destinationKey: string; path: LatLng[] } | null>(null);

  const routeOrigin = useMemo(
    () =>
      isValidPoint(driverLocation)
        ? driverLocation
        : isValidPoint(pickup)
          ? pickup
          : null,
    [driverLocation, pickup],
  );
  const routeDestination = useMemo(
    () =>
      isValidPoint(activeDestination)
        ? activeDestination
        : isValidPoint(dropoff)
          ? dropoff
          : null,
    [activeDestination, dropoff],
  );

  const pointKey = [
    isValidPoint(driverLocation) ? `${driverLocation.latitude},${driverLocation.longitude}` : '',
    isValidPoint(pickup) ? `${pickup.latitude},${pickup.longitude}` : '',
    isValidPoint(dropoff) ? `${dropoff.latitude},${dropoff.longitude}` : '',
    isValidPoint(routeOrigin) ? `${routeOrigin.latitude},${routeOrigin.longitude}` : '',
    isValidPoint(routeDestination) ? `${routeDestination.latitude},${routeDestination.longitude}` : '',
    bottomCoverRatio,
  ].join('|');

  const points = useMemo(() => {
    const list: MapPoint[] = [];
    if (isValidPoint(driverLocation)) list.push(driverLocation);
    if (isValidPoint(pickup)) list.push(pickup);
    if (isValidPoint(dropoff)) list.push(dropoff);
    if (list.length === 0) {
      if (routeOrigin) list.push(routeOrigin);
      if (routeDestination) list.push(routeDestination);
    }
    return list;
    // pointKey is the coordinate identity. Object props are new every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointKey]);

  const region = useMemo(
    () => regionForPoints(points, bottomCoverRatio),
    [bottomCoverRatio, points],
  );
  const [holdFrame, setHoldFrame] = useState(true);
  const frameKey = `${region.latitude.toFixed(5)}:${region.longitude.toFixed(5)}:${region.latitudeDelta.toFixed(5)}:${region.longitudeDelta.toFixed(5)}:${recenterTrigger ?? 0}`;

  useEffect(() => {
    setHoldFrame(true);
  }, [frameKey]);

  const originKey = routeOrigin
    ? `${routeOrigin.latitude.toFixed(4)},${routeOrigin.longitude.toFixed(4)}`
    : '';
  const destinationKey = routeDestination
    ? `${routeDestination.latitude.toFixed(5)},${routeDestination.longitude.toFixed(5)}`
    : '';

  useEffect(() => {
    const origin = routeOrigin;
    const destination = routeDestination;
    if (previewMap || !origin || !destination) {
      setRoadRoute([]);
      setRouteApproximate(false);
      metaCb.current?.(null);
      return undefined;
    }

    const publishStraightLine = () => {
      if (!straightFallback) {
        setRoadRoute([]);
        setRouteApproximate(false);
        metaCb.current?.(null);
        return;
      }
      setRoadRoute([origin, destination]);
      setRouteApproximate(true);
      metaCb.current?.({
        distanceKm: haversineKm(origin, destination),
        approximate: true,
      });
    };

    if (!routeApiEnabled) {
      publishStraightLine();
      return undefined;
    }

    const key = getGoogleMapsApiKey();
    if (!key) {
      publishStraightLine();
      return undefined;
    }

    const memory = routeMemory.current;
    const refresh = shouldRefreshRoute({
      now: Date.now(),
      lastFetchedAt: memory?.at ?? null,
      lastOrigin: memory?.origin ?? null,
      origin,
      path: memory?.path ?? [],
      destinationChanged: memory?.destinationKey !== destinationKey,
    });
    if (!refresh && memory && memory.path.length >= 2) {
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadRoadRoute = async () => {
      try {
        const params = new URLSearchParams({
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          mode: 'driving',
          region: 'in',
          language: 'en',
          key,
        });
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Directions request failed: ${response.status}`);
        const payload = (await response.json()) as GoogleDirectionsResponse;
        const route = payload.routes?.[0];
        const encoded = route?.overview_polyline?.points;
        const decoded = encoded ? decodeGooglePolyline(encoded) : [];
        if (cancelled) return;

        if (decoded.length < 2) {
          publishStraightLine();
          return;
        }

        setRoadRoute(decoded);
        setRouteApproximate(false);
        routeMemory.current = {
          at: Date.now(),
          origin,
          destinationKey,
          path: decoded,
        };
        const distanceMeters = (route?.legs ?? []).reduce(
          (total, leg) => total + (leg.distance?.value ?? 0),
          0,
        );
        const durationSeconds = (route?.legs ?? []).reduce(
          (total, leg) => total + (leg.duration?.value ?? 0),
          0,
        );
        metaCb.current?.(
          distanceMeters > 0
            ? {
                distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
                durationMinutes:
                  durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / 60)) : undefined,
                approximate: false,
              }
            : null,
        );
      } catch (error) {
        if (!cancelled && (error as { name?: string })?.name !== 'AbortError') {
          publishStraightLine();
        }
      }
    };

    void loadRoadRoute();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [destinationKey, originKey, previewMap, routeApiEnabled, straightFallback]);

  // Native polylines do not paint in Peach, so the active leg is also dotted markers.
  const displayRouteCoords = roadRoute.length >= 2 ? roadRoute : [];

  const preview = previewMap ? (
    <PreviewMap
      hasPickup={isValidPoint(pickup)}
      hasDropoff={isValidPoint(dropoff)}
      routeColor={routeColor}
      pickupColor={pickupColor}
      dropoffColor={dropoffColor}
    />
  ) : null;

  const routeDots = routeSamples(displayRouteCoords).filter((_, index, all) => index > 0 && index < all.length - 1);

  return (
    <View style={[styles.wrap, { borderRadius }, style]}>
      {preview ? (
        preview
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={MAP_PROVIDER}
          initialRegion={region}
          region={holdFrame ? region : undefined}
          onRegionChangeComplete={(_next, details) => {
            if (details?.isGesture) setHoldFrame(false);
          }}
          mapType="standard"
          loadingEnabled
          loadingBackgroundColor="#E8EEF0"
          loadingIndicatorColor="#64748B"
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}>
          {displayRouteCoords.length >= 2 ? (
            <Polyline
              coordinates={displayRouteCoords}
              strokeColor={routeApproximate ? '#64748B' : routeColor}
              strokeWidth={routeApproximate ? 3 : 5}
              lineDashPattern={routeApproximate ? [8, 6] : undefined}
            />
          ) : null}

          {isValidPoint(driverLocation) ? (
            <Marker
              coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
              title={driverLocation.label || 'You'}
              anchor={{ x: 0.5, y: 1 }}
              pinColor="#2563EB">
              <MapPin color="#2563EB" label={driverLocation.label || 'You'} />
            </Marker>
          ) : null}

          {isValidPoint(pickup) ? (
            <Marker
              coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
              title={pickup.label || 'Pickup'}
              anchor={{ x: 0.5, y: 1 }}
              pinColor={pickupColor}>
              <MapPin color={pickupColor} label={pickup.label || 'Pickup'} />
            </Marker>
          ) : null}

          {isValidPoint(dropoff) ? (
            <Marker
              coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
              title={dropoff.label || 'Drop'}
              anchor={{ x: 0.5, y: 1 }}
              pinColor={dropoffColor}>
              <MapPin color={dropoffColor} label={dropoff.label || 'Drop'} />
            </Marker>
          ) : null}
          {routeDots.map((point, index) => (
            <Marker
              key={`route-${index}-${point.latitude.toFixed(5)}`}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}>
              <View
                style={[
                  styles.routeDot,
                  { backgroundColor: routeApproximate ? '#64748B' : routeColor },
                ]}
              />
            </Marker>
          ))}
        </MapView>
      )}
    </View>
  );
}

function MapPin({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.pin} pointerEvents="none">
      <View style={[styles.pinLabel, { backgroundColor: color }]}>
        <Text style={styles.pinText}>{label}</Text>
      </View>
      <View style={[styles.pinStem, { backgroundColor: color }]} />
    </View>
  );
}

/**
 * The reference boards use a light, stylised route map. Expo Go/Android can
 * show a black Google tile surface when the native maps key is unavailable, so
 * preview mode uses this deterministic visual while production keeps the real
 * MapView above. It is deliberately a visual fallback, not a source of route
 * or distance data.
 */
function PreviewMap({
  hasPickup,
  hasDropoff,
  routeColor,
  pickupColor,
  dropoffColor,
}: {
  hasPickup: boolean;
  hasDropoff: boolean;
  routeColor: string;
  pickupColor: string;
  dropoffColor: string;
}) {
  const pickup = hasDropoff ? { x: 74, y: 126 } : { x: 316, y: 62 };
  const dropoff = { x: 312, y: 112 };
  const current = { x: 66, y: 196 };
  const route = hasDropoff
    ? 'M 74 126 C 132 150, 168 168, 214 140 S 270 116, 312 112'
    : 'M 66 196 C 112 180, 164 150, 206 128 S 268 80, 316 62';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 390 260" preserveAspectRatio="xMidYMid slice">
        <Rect width="390" height="260" fill="#E8EEF0" />
        <Path
          d="M0 18C44 34 46 80 30 111C14 142 20 195 0 220V18Z"
          fill="#D7EAE4"
        />
        <Path
          d="M267 0C236 36 250 62 279 78C312 96 302 139 337 161C355 172 376 170 390 162V0H267Z"
          fill="#E0EEDB"
        />
        <Path d="M0 70L390 216" stroke="#D1DADF" strokeWidth="18" fill="none" />
        <Path d="M0 70L390 216" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        <Path d="M40 260L175 0" stroke="#D1DADF" strokeWidth="15" fill="none" />
        <Path d="M40 260L175 0" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        <Path d="M0 172C86 140 140 166 192 88C231 30 289 48 390 30" stroke="#D2D9DD" strokeWidth="12" fill="none" />
        <Path d="M0 172C86 140 140 166 192 88C231 30 289 48 390 30" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        <Path d={route} stroke="#FFFFFF" strokeWidth="10" fill="none" strokeLinecap="round" />
        <Path d={route} stroke={routeColor} strokeWidth="5" fill="none" strokeLinecap="round" />
        <SvgText x="236" y="44" fill="#45515B" fontSize="11" fontWeight="600">
          Saheed Nagar
        </SvgText>
        <SvgText x="200" y="184" fill="#45515B" fontSize="11" fontWeight="600">
          Bhubaneswar
        </SvgText>
        <SvgText x="285" y="86" fill="#68747D" fontSize="8">
          Kalinga Stadium
        </SvgText>
        <SvgText x="252" y="148" fill="#68747D" fontSize="8">
          Mancheswar
        </SvgText>
        {hasPickup ? (
          <G>
            <Circle cx={pickup.x} cy={pickup.y} r="16" fill={pickupColor} opacity="0.18" />
            <Path
              d={`M ${pickup.x} ${pickup.y - 19} C ${pickup.x - 8} ${pickup.y - 19}, ${pickup.x - 12} ${pickup.y - 13}, ${pickup.x - 12} ${pickup.y - 6} C ${pickup.x - 12} ${pickup.y + 2}, ${pickup.x} ${pickup.y + 13}, ${pickup.x} ${pickup.y + 13} C ${pickup.x} ${pickup.y + 13}, ${pickup.x + 12} ${pickup.y + 2}, ${pickup.x + 12} ${pickup.y - 6} C ${pickup.x + 12} ${pickup.y - 13}, ${pickup.x + 8} ${pickup.y - 19}, ${pickup.x} ${pickup.y - 19}Z`}
              fill={pickupColor}
            />
            <Circle cx={pickup.x} cy={pickup.y - 7} r="4" fill="#FFFFFF" />
          </G>
        ) : null}
        {hasDropoff ? (
          <G>
            <Circle cx={dropoff.x} cy={dropoff.y} r="16" fill={dropoffColor} opacity="0.18" />
            <Path
              d={`M ${dropoff.x} ${dropoff.y - 19} C ${dropoff.x - 8} ${dropoff.y - 19}, ${dropoff.x - 12} ${dropoff.y - 13}, ${dropoff.x - 12} ${dropoff.y - 6} C ${dropoff.x - 12} ${dropoff.y + 2}, ${dropoff.x} ${dropoff.y + 13}, ${dropoff.x} ${dropoff.y + 13} C ${dropoff.x} ${dropoff.y + 13}, ${dropoff.x + 12} ${dropoff.y + 2}, ${dropoff.x + 12} ${dropoff.y - 6} C ${dropoff.x + 12} ${dropoff.y - 13}, ${dropoff.x + 8} ${dropoff.y - 19}, ${dropoff.x} ${dropoff.y - 19}Z`}
              fill={dropoffColor}
            />
            <Circle cx={dropoff.x} cy={dropoff.y - 7} r="4" fill="#FFFFFF" />
            <G transform="translate(202 132) rotate(-18 12 8)">
              <Rect x="2" y="3" width="18" height="10" rx="2" fill="#FEA701" stroke="#111827" strokeWidth="1.5" />
              <Path d="M20 6H24L27 10V13H20Z" fill="#FEA701" stroke="#111827" strokeWidth="1.5" />
              <Path d="M22 7H24L25.5 10H22Z" fill="#E0F2FE" />
              <Circle cx="7" cy="15" r="2.5" fill="#111827" />
              <Circle cx="22" cy="15" r="2.5" fill="#111827" />
            </G>
          </G>
        ) : (
          <G>
            <Circle cx={current.x} cy={current.y} r="17" fill="#FFFFFF" opacity="0.9" />
            <Circle cx={current.x} cy={current.y} r="10" fill={routeColor} />
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.lightGrey,
    minHeight: 200,
  },
  pin: {
    alignItems: 'center',
  },
  pinLabel: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pinStem: {
    width: 2,
    height: 8,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
