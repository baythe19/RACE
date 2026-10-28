import React, { useEffect, useMemo, useRef } from 'react';
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
import { MapPin, Navigation } from 'lucide-react-native';

import { BHUBANESWAR_DEFAULT } from '../../utils/googleMaps';
import { LOCATION_ACCENT } from '../../utils/googlePlaces';
import { colors, typography } from '../../theme';

const MAP_PROVIDER =
  Platform.OS === 'android' || Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY)
    ? PROVIDER_GOOGLE
    : PROVIDER_DEFAULT;

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
  /** Fires when the user taps the map (native). Web fallback uses Pressable. */
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

  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
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

function RouteFallback({
  pickup,
  dropoff,
  driver,
}: {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  driver?: MapPoint | null;
}) {
  const rows = [
    driver
      ? { key: 'driver', color: LOCATION_ACCENT, label: driver.label || 'Partner', hint: 'Live position' }
      : null,
    pickup
      ? { key: 'pickup', color: '#16A34A', label: pickup.label || 'Pickup', hint: 'Pickup' }
      : null,
    dropoff
      ? { key: 'drop', color: colors.error, label: dropoff.label || 'Drop-off', hint: 'Drop-off' }
      : null,
  ].filter(Boolean) as Array<{ key: string; color: string; label: string; hint: string }>;

  return (
    <View style={styles.fallback}>
      <View style={styles.fallbackHero}>
        <Navigation size={28} color={LOCATION_ACCENT} strokeWidth={2.2} />
        <Text style={styles.fallbackTitle}>
          {rows.length ? 'Trip route' : 'Waiting for map points'}
        </Text>
        <Text style={styles.fallbackSubtitle}>
          {rows.length
            ? 'Live map tiles may be limited on this preview — route details below.'
            : 'Pickup / partner coordinates will appear here once available.'}
        </Text>
      </View>
      {rows.map(row => (
        <View key={row.key} style={styles.fallbackRow}>
          <View style={[styles.fallbackDot, { backgroundColor: row.color }]} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.fallbackHint}>{row.hint}</Text>
            <Text style={styles.fallbackLabel} numberOfLines={2}>
              {row.label}
            </Text>
          </View>
          <MapPin size={16} color={row.color} strokeWidth={2.2} />
        </View>
      ))}
    </View>
  );
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
    if (isValidPoint(driver)) {
      coords.push({ latitude: driver.latitude, longitude: driver.longitude });
    }
    if (isValidPoint(pickup)) {
      coords.push({ latitude: pickup.latitude, longitude: pickup.longitude });
    }
    if (isValidPoint(dropoff)) {
      coords.push({ latitude: dropoff.latitude, longitude: dropoff.longitude });
    }
    return coords.length >= 2 ? coords : [];
  }, [pickup, dropoff, driver]);

  useEffect(() => {
    if (points.length === 0) return;
    mapRef.current?.animateToRegion(regionForPoints(points), 450);
  }, [points]);

  // Peach / RN-web often cannot paint Google Maps — show a clear route card instead of a blank white box.
  if (Platform.OS === 'web') {
    return (
      <Pressable
        style={[styles.wrap, { borderRadius }, style]}
        onPress={onPress}
        disabled={!onPress}>
        <RouteFallback pickup={pickup} dropoff={dropoff} driver={driver} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.wrap, { borderRadius }, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={region}
        onPress={onPress ? () => onPress() : undefined}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}>
        {routeCoords.length >= 2 ? (
          <Polyline
            coordinates={routeCoords}
            strokeColor={LOCATION_ACCENT}
            strokeWidth={4}
          />
        ) : null}

        {isValidPoint(pickup) ? (
          <Marker
            coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
            title={pickup.label || 'Pickup'}
            pinColor="#16A34A"
          />
        ) : null}

        {isValidPoint(dropoff) ? (
          <Marker
            coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
            title={dropoff.label || 'Drop-off'}
            pinColor={colors.error}
          />
        ) : null}

        {isValidPoint(driver) ? (
          <Marker
            coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
            title={driver.label || 'Partner'}
            pinColor={LOCATION_ACCENT}
          />
        ) : null}
      </MapView>

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
    backgroundColor: '#E8ECF0',
    minHeight: 180,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,236,240,0.72)',
  },
  emptyOverlayText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  fallback: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
  },
  fallbackHero: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  fallbackSubtitle: {
    fontSize: 12,
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
  },
  fallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fallbackDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fallbackHint: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fallbackLabel: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  },
});
