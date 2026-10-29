import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import TileMapSurface, { type TileMapHandle, type TileMapMarker } from '../common/TileMapSurface';
import { BHUBANESWAR_DEFAULT } from '../../utils/googleMaps';
import { LOCATION_ACCENT } from '../../utils/googlePlaces';
import { colors, typography } from '../../theme';

const MAP_PROVIDER: typeof PROVIDER_GOOGLE | typeof PROVIDER_DEFAULT =
  Platform.OS === 'android' || Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY)
    ? PROVIDER_GOOGLE
    : PROVIDER_DEFAULT;

/** Same pin colors as the pickup/drop map picker. */
const PIN_PICKUP = '#10B981';
const PIN_DROP = colors.error;
const PIN_PARTNER = LOCATION_ACCENT;

export type MapPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

type Props = {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  driver?: MapPoint | null;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  showsUserLocation?: boolean;
  onPress?: () => void;
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

export default function LiveTripMap({
  pickup,
  dropoff,
  driver,
  style,
  borderRadius = 16,
  showsUserLocation = false,
  onPress,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const tileRef = useRef<TileMapHandle>(null);
  const [nativeMapReady, setNativeMapReady] = useState(false);

  const points = useMemo(() => {
    const list: MapPoint[] = [];
    if (isValidPoint(pickup)) list.push(pickup);
    if (isValidPoint(dropoff)) list.push(dropoff);
    if (isValidPoint(driver)) list.push(driver);
    return list;
  }, [pickup, dropoff, driver]);

  const region = useMemo(() => regionForPoints(points), [points]);

  const routeCoords = useMemo(() => {
    const coords: Array<{ latitude: number; longitude: number }> = [];
    if (isValidPoint(driver)) coords.push(driver);
    if (isValidPoint(pickup)) coords.push(pickup);
    if (isValidPoint(dropoff)) coords.push(dropoff);
    return coords.length >= 2 ? coords : [];
  }, [pickup, dropoff, driver]);

  const tileMarkers = useMemo(() => {
    const markers: TileMapMarker[] = [];
    if (isValidPoint(pickup)) {
      markers.push({ id: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, color: PIN_PICKUP });
    }
    if (isValidPoint(dropoff)) {
      markers.push({ id: 'drop', latitude: dropoff.latitude, longitude: dropoff.longitude, color: PIN_DROP });
    }
    if (isValidPoint(driver)) {
      markers.push({ id: 'driver', latitude: driver.latitude, longitude: driver.longitude, color: PIN_PARTNER });
    }
    return markers;
  }, [pickup, dropoff, driver]);

  useEffect(() => {
    if (points.length === 0) return;
    const next = regionForPoints(points);
    mapRef.current?.animateToRegion(next, 450);
    tileRef.current?.animateToRegion(next, 0);
  }, [points]);

  return (
    <View style={[styles.wrap, { borderRadius }, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={region}
        onMapReady={() => setNativeMapReady(true)}
        onPress={onPress ? () => onPress() : undefined}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}>
        {routeCoords.length >= 2 ? (
          <Polyline coordinates={routeCoords} strokeColor={PIN_PARTNER} strokeWidth={4} />
        ) : null}
        {isValidPoint(pickup) ? (
          <Marker
            coordinate={pickup}
            title={pickup.label || 'Pickup'}
            pinColor={PIN_PICKUP}
          />
        ) : null}
        {isValidPoint(dropoff) ? (
          <Marker
            coordinate={dropoff}
            title={dropoff.label || 'Drop-off'}
            pinColor={PIN_DROP}
          />
        ) : null}
        {isValidPoint(driver) ? (
          <Marker
            coordinate={driver}
            title={driver.label || 'Partner'}
            pinColor={PIN_PARTNER}
          />
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
});
