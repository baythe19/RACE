import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import { BHUBANESWAR_DEFAULT } from '../../utils/googleMaps';
import { colors } from '../../theme';

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

export type MapPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

type Props = {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  showsUserLocation?: boolean;
  routeColor?: string;
  pickupColor?: string;
  dropoffColor?: string;
  recenterTrigger?: number;
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

export default function LiveTripMap({
  pickup,
  dropoff,
  style,
  borderRadius = 16,
  showsUserLocation = true,
  routeColor = colors.primary,
  pickupColor = '#16A34A',
  dropoffColor = colors.error,
  recenterTrigger,
}: Props) {
  const mapRef = useRef<MapView>(null);

  const points = useMemo(() => {
    const list: MapPoint[] = [];
    if (isValidPoint(pickup)) list.push(pickup);
    if (isValidPoint(dropoff)) list.push(dropoff);
    return list;
  }, [pickup, dropoff]);

  const region = useMemo(() => regionForPoints(points), [points]);

  const routeCoords = useMemo(() => {
    const coords: Array<{ latitude: number; longitude: number }> = [];
    if (isValidPoint(pickup)) {
      coords.push({ latitude: pickup.latitude, longitude: pickup.longitude });
    }
    if (isValidPoint(dropoff)) {
      coords.push({ latitude: dropoff.latitude, longitude: dropoff.longitude });
    }
    return coords.length >= 2 ? coords : [];
  }, [pickup, dropoff]);

  useEffect(() => {
    if (points.length === 0) return;
    mapRef.current?.animateToRegion(regionForPoints(points), 450);
  }, [points]);

  useEffect(() => {
    if (recenterTrigger == null || points.length === 0) return;
    mapRef.current?.animateToRegion(region, 350);
  }, [points.length, recenterTrigger, region]);

  return (
    <View style={[styles.wrap, { borderRadius }, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={region}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}>
        {routeCoords.length >= 2 ? (
          <Polyline coordinates={routeCoords} strokeColor={routeColor} strokeWidth={4} />
        ) : null}

        {isValidPoint(pickup) ? (
          <Marker
            coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
            title={pickup.label || 'Pickup'}
            pinColor={pickupColor}
          />
        ) : null}

        {isValidPoint(dropoff) ? (
          <Marker
            coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
            title={dropoff.label || 'Drop-off'}
            pinColor={dropoffColor}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.lightGrey,
    minHeight: 200,
  },
});
