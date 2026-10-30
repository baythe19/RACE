import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { MapPin } from 'lucide-react-native';

import type { Region } from 'react-native-maps';

const TILE = 256;
const ZOOM = 16;

export type TileMapHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
};

export type TileMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
};

type Props = {
  initialRegion: Region;
  /** Drag and long-press. Turn off for preview / live-route maps. */
  interactive?: boolean;
  markers?: TileMapMarker[];
  onRegionChange?: (region: Region, details: { isGesture?: boolean }) => void;
  onRegionChangeComplete?: (region: Region, details: { isGesture?: boolean }) => void;
  onLongPress?: (latitude: number, longitude: number) => void;
};

function latLngToWorld(lat: number, lng: number) {
  const clamped = Math.max(-85, Math.min(85, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
}

function worldToLatLng(x: number, y: number) {
  const lng = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude: lat, longitude: lng };
}

function toRegion(lat: number, lng: number, template: Region): Region {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: template.latitudeDelta,
    longitudeDelta: template.longitudeDelta,
  };
}

const TileMapSurface = forwardRef<TileMapHandle, Props>(function TileMapSurface(
  { initialRegion, interactive = true, markers = [], onRegionChange, onRegionChangeComplete, onLongPress },
  ref,
) {
  const [center, setCenter] = useState({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude,
  });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hiddenTiles, setHiddenTiles] = useState<Record<string, true>>({});
  const centerRef = useRef(center);
  const templateRef = useRef(initialRegion);
  const callbacks = useRef({ onRegionChange, onRegionChangeComplete, onLongPress });
  callbacks.current = { onRegionChange, onRegionChangeComplete, onLongPress };

  const commit = (lat: number, lng: number, isGesture: boolean, complete: boolean) => {
    centerRef.current = { latitude: lat, longitude: lng };
    setCenter(centerRef.current);
    const region = toRegion(lat, lng, templateRef.current);
    callbacks.current.onRegionChange?.(region, { isGesture });
    if (complete) callbacks.current.onRegionChangeComplete?.(region, { isGesture });
  };

  useImperativeHandle(ref, () => ({
    animateToRegion(region: Region) {
      templateRef.current = region;
      commit(region.latitude, region.longitude, false, true);
    },
  }));

  const dragRef = useRef<{
    lat: number;
    lng: number;
    moved: boolean;
    longFired: boolean;
    longTimer: ReturnType<typeof setTimeout> | null;
    locationX: number;
    locationY: number;
  } | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const pointToLatLng = (locationX: number, locationY: number) => {
    const world = latLngToWorld(centerRef.current.latitude, centerRef.current.longitude);
    const scale = 2 ** ZOOM;
    const box = sizeRef.current;
    const px = world.x * scale + (locationX - box.w / 2);
    const py = world.y * scale + (locationY - box.h / 2);
    return worldToLatLng(px / scale, py / scale);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        const ne = event.nativeEvent as typeof event.nativeEvent & {
          locationX?: number;
          locationY?: number;
        };
        dragRef.current = {
          lat: centerRef.current.latitude,
          lng: centerRef.current.longitude,
          moved: false,
          longFired: false,
          locationX: ne.locationX ?? sizeRef.current.w / 2,
          locationY: ne.locationY ?? sizeRef.current.h / 2,
          longTimer: setTimeout(() => {
            const drag = dragRef.current;
            if (!drag || drag.moved) return;
            drag.longFired = true;
            const hit = pointToLatLng(drag.locationX, drag.locationY);
            callbacks.current.onLongPress?.(hit.latitude, hit.longitude);
          }, 480),
        };
      },
      onPanResponderMove: (_event, gesture) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (!drag.moved && Math.hypot(gesture.dx, gesture.dy) < 8) return;
        drag.moved = true;
        if (drag.longTimer) {
          clearTimeout(drag.longTimer);
          drag.longTimer = null;
        }
        const start = latLngToWorld(drag.lat, drag.lng);
        const scale = 2 ** ZOOM;
        const next = worldToLatLng(start.x - gesture.dx / scale, start.y - gesture.dy / scale);
        commit(next.latitude, next.longitude, true, false);
      },
      onPanResponderRelease: () => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag) return;
        if (drag.longTimer) clearTimeout(drag.longTimer);
        if (drag.moved && !drag.longFired) {
          const region = toRegion(
            centerRef.current.latitude,
            centerRef.current.longitude,
            templateRef.current,
          );
          callbacks.current.onRegionChangeComplete?.(region, { isGesture: true });
        }
      },
      onPanResponderTerminate: () => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag?.longTimer) clearTimeout(drag.longTimer);
      },
    }),
  ).current;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const world = latLngToWorld(center.latitude, center.longitude);
  const scale = 2 ** ZOOM;
  const cx = world.x * scale;
  const cy = world.y * scale;
  const tiles: { key: string; left: number; top: number; uri: string }[] = [];
  if (size.w > 0 && size.h > 0) {
    const colSpan = Math.ceil(size.w / TILE) + 2;
    const rowSpan = Math.ceil(size.h / TILE) + 2;
    const originCol = Math.floor(cx / TILE) - Math.floor(colSpan / 2);
    const originRow = Math.floor(cy / TILE) - Math.floor(rowSpan / 2);
    const left0 = size.w / 2 - (cx - originCol * TILE);
    const top0 = size.h / 2 - (cy - originRow * TILE);
    const n = 2 ** ZOOM;
    for (let row = 0; row < rowSpan; row += 1) {
      for (let col = 0; col < colSpan; col += 1) {
        const tileX = (((originCol + col) % n) + n) % n;
        const tileY = originRow + row;
        if (tileY < 0 || tileY >= n) continue;
        tiles.push({
          key: `${tileX}-${tileY}-${col}-${row}`,
          left: left0 + col * TILE,
          top: top0 + row * TILE,
          uri: `https://basemaps.cartocdn.com/rastertiles/voyager/${ZOOM}/${tileX}/${tileY}.png`,
        });
      }
    }
  }

  const markerNodes = markers.map(marker => {
    const point = latLngToWorld(marker.latitude, marker.longitude);
    const left = size.w / 2 + (point.x * scale - cx) - 16;
    const top = size.h / 2 + (point.y * scale - cy) - 34;
    return (
      <View key={marker.id} pointerEvents="none" style={[styles.marker, { left, top }]}>
        <MapPin size={32} color={marker.color} fill={marker.color} strokeWidth={1.6} />
      </View>
    );
  });

  return (
    <View
      style={styles.fill}
      pointerEvents={interactive ? 'box-only' : 'none'}
      onLayout={onLayout}
      {...(interactive ? pan.panHandlers : null)}>
      {tiles.map(tile =>
        hiddenTiles[tile.key] ? null : (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            onError={() => setHiddenTiles(prev => ({ ...prev, [tile.key]: true }))}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
          />
        ),
      )}
      {markerNodes}
    </View>
  );
});

export default TileMapSurface;

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
  tile: {
    position: 'absolute',
    width: TILE,
    height: TILE,
  },
  marker: {
    position: 'absolute',
    width: 32,
    height: 36,
  },
});
