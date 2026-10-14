import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

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
  /** Render the deterministic board-style map used by the driver preview. */
  previewMap?: boolean;
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
  previewMap = false,
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

  const preview = previewMap ? (
    <PreviewMap
      hasPickup={isValidPoint(pickup)}
      hasDropoff={isValidPoint(dropoff)}
      routeColor={routeColor}
      pickupColor={pickupColor}
      dropoffColor={dropoffColor}
    />
  ) : null;

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
      {preview ? (
        preview
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={MAP_PROVIDER}
          initialRegion={region}
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
      )}
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
});
