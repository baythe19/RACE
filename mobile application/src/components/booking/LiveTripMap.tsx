import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

import { BHUBANESWAR_DEFAULT } from '../../utils/googleMaps';
import { colors } from '../../theme';
import { haversineKm, type LatLng } from '../../services/driver/tripNavigation';
import {
  fetchRoadRoute,
  type RoadRouteResult,
} from '../../services/driver/roadRoutingService';

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
  /** Navigation mode tilts and follows the vehicle in 3D heading-up view */
  navigationMode?: boolean;
  vehicleHeading?: number;
  vehicleType?: 'tow_truck' | 'car';
  isOffRoute?: boolean;
  onRouteCalculated?: (route: RoadRouteResult) => void;
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
    const span = 0.015;
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
  const extraSouth = latitudeDelta * cover;

  return {
    latitude: (minLat + maxLat) / 2 - extraSouth / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta: lngSpan + lngPad * 2,
  };
}

export default function LiveTripMap({
  pickup,
  dropoff,
  driverLocation,
  activeDestination,
  style,
  borderRadius = 16,
  showsUserLocation = false,
  routeColor = '#2563EB',
  pickupColor = '#16A34A',
  dropoffColor = colors.error,
  recenterTrigger,
  previewMap = false,
  routeApiEnabled = true,
  straightFallback = false,
  bottomCoverRatio = 0,
  navigationMode = false,
  vehicleHeading = 0,
  vehicleType = 'tow_truck',
  isOffRoute = false,
  onRouteCalculated,
  onRouteMetaChange,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [roadRoute, setRoadRoute] = useState<MapPoint[]>([]);
  const [routeApproximate, setRouteApproximate] = useState(false);
  const metaCb = useRef(onRouteMetaChange);
  metaCb.current = onRouteMetaChange;
  const calculatedCb = useRef(onRouteCalculated);
  calculatedCb.current = onRouteCalculated;

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
    navigationMode,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointKey]);

  const region = useMemo(
    () => regionForPoints(points, bottomCoverRatio),
    [bottomCoverRatio, points],
  );
  const [holdFrame, setHoldFrame] = useState(true);
  const frameKey = `${region.latitude.toFixed(5)}:${region.longitude.toFixed(5)}:${region.latitudeDelta.toFixed(5)}:${region.longitudeDelta.toFixed(5)}:${recenterTrigger ?? 0}:${navigationMode}`;

  useEffect(() => {
    setHoldFrame(true);
  }, [frameKey]);

  const originKey = routeOrigin
    ? `${routeOrigin.latitude.toFixed(4)},${routeOrigin.longitude.toFixed(4)}`
    : '';
  const destinationKey = routeDestination
    ? `${routeDestination.latitude.toFixed(5)},${routeDestination.longitude.toFixed(5)}`
    : '';

  // Fetch authentic road route (Google Routes API v2 / OSRM / High-precision road curve)
  useEffect(() => {
    const origin = routeOrigin;
    const destination = routeDestination;
    if (previewMap || !origin || !destination) {
      setRoadRoute([]);
      setRouteApproximate(false);
      metaCb.current?.(null);
      return undefined;
    }

    let cancelled = false;

    const loadRoute = async () => {
      try {
        const routeResult = await fetchRoadRoute(
          origin,
          destination,
          destination.label || 'Destination',
        );
        if (cancelled) return;

        setRoadRoute(routeResult.coordinates);
        setRouteApproximate(routeResult.approximate);
        metaCb.current?.({
          distanceKm: routeResult.distanceKm,
          durationMinutes: routeResult.durationMinutes,
          approximate: routeResult.approximate,
        });
        calculatedCb.current?.(routeResult);
      } catch {
        if (!cancelled) {
          if (straightFallback) {
            setRoadRoute([origin, destination]);
            setRouteApproximate(true);
            metaCb.current?.({
              distanceKm: haversineKm(origin, destination),
              approximate: true,
            });
          }
        }
      }
    };

    void loadRoute();
    return () => {
      cancelled = true;
    };
  }, [destinationKey, originKey, previewMap, routeApiEnabled, straightFallback]);

  // Turn-by-turn navigation camera tracking
  useEffect(() => {
    if (navigationMode && isValidPoint(driverLocation) && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          pitch: 42,
          heading: vehicleHeading || 0,
          altitude: 400,
          zoom: 17,
        },
        { duration: 600 },
      );
    }
  }, [driverLocation, navigationMode, vehicleHeading]);

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
          region={holdFrame && !navigationMode ? region : undefined}
          onRegionChangeComplete={(_next, details) => {
            if (details?.isGesture) setHoldFrame(false);
          }}
          mapType="standard"
          loadingEnabled
          loadingBackgroundColor="#E8EEF0"
          loadingIndicatorColor="#2563EB"
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          pitchEnabled={navigationMode}
          rotateEnabled={navigationMode}>
          {/* Outer white casing border for high-contrast road visibility */}
          {displayRouteCoords.length >= 2 ? (
            <Polyline
              coordinates={displayRouteCoords}
              strokeColor="#FFFFFF"
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}

          {/* Active Navigation Polyline with Traffic / Status Coloring */}
          {displayRouteCoords.length >= 2 ? (
            <Polyline
              coordinates={displayRouteCoords}
              strokeColor={isOffRoute ? '#DC2626' : routeApproximate ? '#64748B' : routeColor}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              lineDashPattern={isOffRoute ? [8, 6] : routeApproximate ? [8, 6] : undefined}
            />
          ) : null}

          {/* Real Driver Vehicle Marker with Heading & Pulse Ring */}
          {isValidPoint(driverLocation) ? (
            <Marker
              coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
              title={driverLocation.label || 'You'}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={navigationMode}
              rotation={vehicleHeading || 0}>
              <VehicleMarker
                label={driverLocation.label || 'Your location'}
                heading={vehicleHeading}
                vehicleType={vehicleType}
              />
            </Marker>
          ) : null}

          {/* Pickup Pin */}
          {isValidPoint(pickup) ? (
            <Marker
              coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
              title={pickup.label || 'Pickup'}
              anchor={{ x: 0.5, y: 1 }}>
              <DestinationPin color={pickupColor} label={pickup.label || 'Pickup'} type="pickup" />
            </Marker>
          ) : null}

          {/* Dropoff Pin */}
          {isValidPoint(dropoff) ? (
            <Marker
              coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
              title={dropoff.label || 'Drop'}
              anchor={{ x: 0.5, y: 1 }}>
              <DestinationPin color={dropoffColor} label={dropoff.label || 'Drop'} type="drop" />
            </Marker>
          ) : null}
        </MapView>
      )}
    </View>
  );
}

/** Vehicle Marker matching Rapido / Uber driver interface */
function VehicleMarker({
  label,
  heading = 0,
  vehicleType = 'tow_truck',
}: {
  label: string;
  heading?: number;
  vehicleType?: 'tow_truck' | 'car';
}) {
  return (
    <View style={styles.vehicleMarkerContainer} pointerEvents="none">
      {/* Blue radar pulse halo */}
      <View style={styles.pulseRing} />
      {/* Heading arrow / vehicle badge */}
      <View style={styles.vehicleBody}>
        {vehicleType === 'tow_truck' ? (
          <Svg width={28} height={28} viewBox="0 0 28 28">
            {/* Truck chassis */}
            <Rect x={8} y={4} width={12} height={20} rx={3} fill="#FEA701" stroke="#D97706" strokeWidth={1.5} />
            {/* Windshield */}
            <Rect x={10} y={6} width={8} height={4} rx={1} fill="#1E293B" />
            {/* Flatbed towing arm */}
            <Path d="M14 13 L14 20 M11 17 L17 17" stroke="#475569" strokeWidth={1.5} strokeLinecap="round" />
            {/* Emergency beacon */}
            <Circle cx={14} cy={3.5} r={1.5} fill="#EF4444" />
          </Svg>
        ) : (
          <Svg width={26} height={26} viewBox="0 0 26 26">
            {/* Sedan car body */}
            <Rect x={7} y={4} width={12} height={18} rx={4} fill="#FEA701" stroke="#D97706" strokeWidth={1.5} />
            {/* Windshield front */}
            <Rect x={9} y={7} width={8} height={3} rx={1} fill="#1E293B" />
            {/* Rear window */}
            <Rect x={9} y={16} width={8} height={2.5} rx={1} fill="#1E293B" />
          </Svg>
        )}
      </View>
      <View style={styles.vehiclePill}>
        <Text style={styles.vehiclePillText}>{label}</Text>
      </View>
    </View>
  );
}

/** Clean Location Pin with Drop Pin Shape & Label */
function DestinationPin({
  color,
  label,
  type,
}: {
  color: string;
  label: string;
  type: 'pickup' | 'drop';
}) {
  return (
    <View style={styles.pin} pointerEvents="none">
      <View style={[styles.pinLabel, { backgroundColor: color }]}>
        <View style={styles.pinDot} />
        <Text style={styles.pinText}>{label}</Text>
      </View>
      <View style={[styles.pinStem, { backgroundColor: color }]} />
      <View style={[styles.pinPoint, { borderTopColor: color }]} />
    </View>
  );
}

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
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 390 260" preserveAspectRatio="xMidYMid slice">
        <Rect width="390" height="260" fill="#E8EEF0" />
        <Path d="M0 18C44 34 46 80 30 111C14 142 20 195 0 220V18Z" fill="#D7EAE4" />
        <Path d="M267 0C236 36 250 62 279 78C312 96 302 139 337 161C355 172 376 170 390 162V0H267Z" fill="#E0EEDB" />
        {/* Road grid illustration */}
        <Path d="M-20 90 L410 110 M-20 170 L410 160 M120 -10 L140 280 M280 -10 L260 280" stroke="#FFFFFF" strokeWidth={6} />
        {/* Curving Road Route */}
        <Path
          d="M 66 196 C 112 180, 164 150, 206 128 S 268 80, 316 62"
          stroke={routeColor}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
        />
        {/* Driver location */}
        <Circle cx={66} cy={196} r={10} fill="#3B82F6" fillOpacity={0.25} />
        <Circle cx={66} cy={196} r={6} fill="#2563EB" stroke="#FFFFFF" strokeWidth={2} />
        {/* Destination pin */}
        <Circle cx={316} cy={62} r={7} fill={hasDropoff ? dropoffColor : pickupColor} stroke="#FFFFFF" strokeWidth={2} />
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
  vehicleMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    opacity: 0.22,
  },
  vehicleBody: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  vehiclePill: {
    position: 'absolute',
    bottom: -14,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  vehiclePillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  pin: {
    alignItems: 'center',
  },
  pinLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pinDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  pinStem: {
    width: 2.5,
    height: 6,
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
