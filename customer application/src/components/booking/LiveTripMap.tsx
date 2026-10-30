import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';

import TileMapSurface, { type TileMapHandle, type TileMapMarker } from '../common/TileMapSurface';
import { BHUBANESWAR_DEFAULT } from '../../utils/googleMaps';
import { LOCATION_ACCENT } from '../../utils/googlePlaces';
import {
  customerMapRouteEndpoints,
  customerMapRouteMode,
  type CustomerMapRouteMode,
} from '../../utils/liveTripMapLeg';
import { getNativeMapProvider, isGoogleMapsConfigured } from '../../utils/mapProvider';
import { fetchRoadRoute, type RoadRouteResult } from '../../utils/roadRouting';
import { colors, typography } from '../../theme';

const MAP_PROVIDER = getNativeMapProvider();

const PIN_PICKUP = '#10B981';
const PIN_DROP = colors.error;
const PIN_PARTNER = LOCATION_ACCENT;
const ROUTE_COLOR = '#2563EB';

const FIT_PADDING = { top: 52, right: 28, bottom: 128, left: 28 };

export type MapPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

type Props = {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  driver?: MapPoint | null;
  tripStatus?: string;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  showsUserLocation?: boolean;
  onPress?: () => void;
  onRouteCalculated?: (route: RoadRouteResult | null) => void;
};

function isValidPoint(point?: MapPoint | null): point is MapPoint {
  return (
    !!point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    !(point.latitude === 0 && point.longitude === 0)
  );
}

function regionForPoints(points: MapPoint[]): Region {
  if (points.length === 0) {
    return { ...BHUBANESWAR_DEFAULT };
  }
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }

  const lats = points.map(point => point.latitude);
  const lngs = points.map(point => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max((maxLat - minLat) * 0.35, 0.012);
  const lngPad = Math.max((maxLng - minLng) * 0.35, 0.012);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + latPad,
    longitudeDelta: maxLng - minLng + lngPad,
  };
}

function DestinationPin({
  title,
  subtitle,
  color,
}: {
  title: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <View style={styles.pinWrap} pointerEvents="none">
      <View style={[styles.pinLabel, { backgroundColor: color }]}>
        <Text style={styles.pinTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.pinSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.pinStem, { backgroundColor: color }]} />
      <View style={[styles.pinPoint, { borderTopColor: color }]} />
    </View>
  );
}

function PartnerPin({ label }: { label: string }) {
  return (
    <View style={styles.partnerWrap} pointerEvents="none">
      <View style={styles.partnerDot} />
      <View style={styles.partnerPill}>
        <Text style={styles.partnerPillText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function LiveTripMap({
  pickup,
  dropoff,
  driver,
  tripStatus = 'PENDING',
  style,
  borderRadius = 16,
  showsUserLocation = false,
  onPress,
  onRouteCalculated,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const tileRef = useRef<TileMapHandle>(null);
  const routeMetaCb = useRef(onRouteCalculated);
  routeMetaCb.current = onRouteCalculated;

  const [nativeMapReady, setNativeMapReady] = useState(false);
  const [routeCoords, setRouteCoords] = useState<MapPoint[]>([]);
  const [routeMeta, setRouteMeta] = useState<RoadRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const hasDrop = isValidPoint(dropoff);
  const hasDriver = isValidPoint(driver);
  const routeMode: CustomerMapRouteMode | null = useMemo(
    () => customerMapRouteMode(tripStatus, hasDriver, hasDrop),
    [tripStatus, hasDriver, hasDrop],
  );

  const routeEndpoints = useMemo(
    () =>
      routeMode ? customerMapRouteEndpoints(routeMode, pickup, dropoff, driver) : null,
    [routeMode, pickup, dropoff, driver],
  );

  const points = useMemo(() => {
    const list: MapPoint[] = [];
    if (isValidPoint(pickup)) list.push(pickup);
    if (isValidPoint(dropoff)) list.push(dropoff);
    if (hasDriver) list.push(driver!);
    return list;
  }, [pickup, dropoff, driver, hasDriver]);

  const region = useMemo(() => regionForPoints(points), [points]);

  const driverMoveKey =
    hasDriver &&
    (routeMode === 'to_pickup' || routeMode === 'driver_to_drop') &&
    driver
      ? `${driver.latitude.toFixed(3)},${driver.longitude.toFixed(3)}`
      : '';

  const routeRequestKey = routeEndpoints
    ? `${routeEndpoints.origin.latitude},${routeEndpoints.origin.longitude}->${routeEndpoints.destination.latitude},${routeEndpoints.destination.longitude}|${driverMoveKey}`
    : '';

  const showTraffic =
    isGoogleMapsConfigured() &&
    (tripStatus === 'DRIVER_EN_ROUTE' || tripStatus === 'IN_PROGRESS');

  useEffect(() => {
    if (!routeEndpoints) {
      setRouteCoords([]);
      setRouteMeta(null);
      routeMetaCb.current?.(null);
      return undefined;
    }

    let cancelled = false;
    setRouteLoading(true);

    const load = async () => {
      try {
        const result = await fetchRoadRoute(routeEndpoints.origin, routeEndpoints.destination);
        if (cancelled) return;
        setRouteCoords(result.coordinates);
        setRouteMeta(result);
        routeMetaCb.current?.(result);
      } catch {
        if (!cancelled) {
          const fallback = {
            coordinates: [routeEndpoints.origin, routeEndpoints.destination],
            distanceKm: 0,
            durationMinutes: 0,
            approximate: true,
            source: 'straight_fallback' as const,
          };
          setRouteCoords(fallback.coordinates);
          setRouteMeta(fallback);
          routeMetaCb.current?.(fallback);
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [routeRequestKey, routeEndpoints]);

  const tileMarkers = useMemo(() => {
    const markers: TileMapMarker[] = [];
    if (isValidPoint(pickup)) {
      markers.push({
        id: 'pickup',
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        color: PIN_PICKUP,
      });
    }
    if (isValidPoint(dropoff)) {
      markers.push({
        id: 'drop',
        latitude: dropoff.latitude,
        longitude: dropoff.longitude,
        color: PIN_DROP,
      });
    }
    if (hasDriver) {
      markers.push({
        id: 'driver',
        latitude: driver!.latitude,
        longitude: driver!.longitude,
        color: PIN_PARTNER,
      });
    }
    return markers;
  }, [pickup, dropoff, driver, hasDriver]);

  useEffect(() => {
    if (points.length === 0) return;
    const next = regionForPoints(points);
    mapRef.current?.animateToRegion(next, 450);
    tileRef.current?.animateToRegion(next, 0);
  }, [points]);

  useEffect(() => {
    if (!nativeMapReady || !mapRef.current) return;
    const fitPoints: MapPoint[] = [...points];
    if (routeCoords.length >= 2) {
      fitPoints.push(routeCoords[0], routeCoords[routeCoords.length - 1]);
    }
    if (fitPoints.length === 0) return;
    mapRef.current.fitToCoordinates(fitPoints, {
      edgePadding: FIT_PADDING,
      animated: true,
    });
  }, [nativeMapReady, points, routeCoords, routeRequestKey]);

  const partnerPinLabel =
    tripStatus === 'IN_PROGRESS' ? 'Partner · to drop-off' : 'Partner · to pickup';

  const routeBadgeText = routeMeta
    ? routeMeta.approximate
      ? isGoogleMapsConfigured()
        ? 'Direct line · checking road route…'
        : 'Add Google Maps key for road routes'
      : `${routeMeta.distanceKm} km · ~${routeMeta.durationMinutes} min`
    : null;

  return (
    <View style={[styles.wrap, { borderRadius }, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={region}
        mapType="standard"
        loadingEnabled
        loadingBackgroundColor="#E8EEF0"
        loadingIndicatorColor={ROUTE_COLOR}
        onMapReady={() => setNativeMapReady(true)}
        onPress={onPress ? () => onPress() : undefined}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        showsTraffic={showTraffic}
        pitchEnabled={false}
        rotateEnabled={false}>
        {routeCoords.length >= 2 ? (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor="#FFFFFF"
              strokeWidth={7}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={routeMeta?.approximate ? '#64748B' : ROUTE_COLOR}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              lineDashPattern={routeMeta?.approximate ? [10, 8] : undefined}
            />
          </>
        ) : null}

        {isValidPoint(pickup) ? (
          <Marker coordinate={pickup} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <DestinationPin
              title="Pickup"
              subtitle={pickup.label?.split(',')[0]?.trim()}
              color={PIN_PICKUP}
            />
          </Marker>
        ) : null}

        {isValidPoint(dropoff) ? (
          <Marker coordinate={dropoff} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <DestinationPin
              title="Drop-off"
              subtitle={dropoff.label?.split(',')[0]?.trim()}
              color={PIN_DROP}
            />
          </Marker>
        ) : null}

        {hasDriver ? (
          <Marker coordinate={driver!} anchor={{ x: 0.5, y: 0.85 }} tracksViewChanges={false}>
            <PartnerPin label={partnerPinLabel} />
          </Marker>
        ) : null}
      </MapView>

      {!nativeMapReady ? (
        <TileMapSurface
          ref={tileRef}
          interactive={false}
          initialRegion={region}
          markers={tileMarkers}
        />
      ) : null}

      {onPress && !nativeMapReady ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
      ) : null}

      {routeLoading ? (
        <View style={styles.routeLoading} pointerEvents="none">
          <ActivityIndicator size="small" color={ROUTE_COLOR} />
        </View>
      ) : null}

      {routeBadgeText ? (
        <View style={styles.routeBadge} pointerEvents="none">
          <Text style={styles.routeBadgeText} numberOfLines={1}>
            {routeBadgeText}
          </Text>
        </View>
      ) : null}

      {points.length === 0 ? (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyOverlayText}>Waiting for live locations…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    minHeight: 180,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229,231,235,0.72)',
  },
  emptyOverlayText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  routeLoading: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  routeBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    maxWidth: '92%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    textAlign: 'center',
  },
  pinWrap: {
    alignItems: 'center',
    maxWidth: 140,
  },
  pinLabel: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: 140,
  },
  pinTitle: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  pinSubtitle: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: typography.weights.semibold,
    color: 'rgba(255,255,255,0.92)',
  },
  pinStem: {
    width: 3,
    height: 8,
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  partnerWrap: {
    alignItems: 'center',
  },
  partnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PIN_PARTNER,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  partnerPill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    maxWidth: 120,
  },
  partnerPillText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
});
