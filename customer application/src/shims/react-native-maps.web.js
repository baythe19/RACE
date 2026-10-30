/**
 * Web stand-in for react-native-maps.
 * Native iOS/Android keep the real module (metro.config.js).
 * This one is pannable: drag moves the center pin, long-press drops it,
 * and animateToRegion recenters — same callbacks the native MapView emits.
 */
const React = require('react');
const { Image, View } = require('react-native');

const TILE = 256;
const ZOOM = 16;

function latLngToWorld(lat, lng) {
  const clamped = Math.max(-85, Math.min(85, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
}

function worldToLatLng(x, y) {
  const lng = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude: lat, longitude: lng };
}

function regionFrom(lat, lng, template) {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: template?.latitudeDelta ?? 0.01,
    longitudeDelta: template?.longitudeDelta ?? 0.01,
  };
}

const MapView = React.forwardRef(function WebMapView(props, ref) {
  const initial = props.initialRegion || {
    latitude: 20.2961,
    longitude: 85.8245,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
  const [center, setCenter] = React.useState({
    latitude: initial.latitude,
    longitude: initial.longitude,
  });
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const centerRef = React.useRef(center);
  const templateRef = React.useRef(initial);
  const propsRef = React.useRef(props);
  propsRef.current = props;
  templateRef.current = props.initialRegion || templateRef.current;

  const commit = React.useCallback((lat, lng, isGesture, complete) => {
    const next = { latitude: lat, longitude: lng };
    centerRef.current = next;
    setCenter(next);
    const region = regionFrom(lat, lng, templateRef.current);
    propsRef.current.onRegionChange?.(region, { isGesture });
    if (complete) {
      propsRef.current.onRegionChangeComplete?.(region, { isGesture });
    }
  }, []);

  React.useImperativeHandle(ref, () => ({
    animateToRegion(region, _duration) {
      if (!region) return;
      templateRef.current = region;
      commit(region.latitude, region.longitude, false, true);
    },
  }));

  const dragRef = React.useRef(null);

  const pointToLatLng = (locationX, locationY) => {
    const world = latLngToWorld(centerRef.current.latitude, centerRef.current.longitude);
    const scale = 2 ** ZOOM;
    const px = world.x * scale + (locationX - size.w / 2);
    const py = world.y * scale + (locationY - size.h / 2);
    return worldToLatLng(px / scale, py / scale);
  };

  const onPointerDown = event => {
    const ne = event.nativeEvent;
    dragRef.current = {
      x: ne.pageX,
      y: ne.pageY,
      lat: centerRef.current.latitude,
      lng: centerRef.current.longitude,
      moved: false,
      longTimer: setTimeout(() => {
        const drag = dragRef.current;
        if (!drag || drag.moved) return;
        drag.longFired = true;
        const hit = pointToLatLng(ne.locationX ?? size.w / 2, ne.locationY ?? size.h / 2);
        propsRef.current.onLongPress?.({
          nativeEvent: { coordinate: { latitude: hit.latitude, longitude: hit.longitude } },
        });
      }, 480),
    };
  };

  const onPointerMove = event => {
    const drag = dragRef.current;
    if (!drag) return;
    const ne = event.nativeEvent;
    const dx = ne.pageX - drag.x;
    const dy = ne.pageY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    drag.moved = true;
    if (drag.longTimer) {
      clearTimeout(drag.longTimer);
      drag.longTimer = null;
    }
    const world = latLngToWorld(drag.lat, drag.lng);
    const scale = 2 ** ZOOM;
    const next = worldToLatLng(world.x - dx / scale, world.y - dy / scale);
    commit(next.latitude, next.longitude, true, false);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.longTimer) clearTimeout(drag.longTimer);
    if (drag.moved && !drag.longFired) {
      const { latitude, longitude } = centerRef.current;
      const region = regionFrom(latitude, longitude, templateRef.current);
      propsRef.current.onRegionChangeComplete?.(region, { isGesture: true });
    }
  };

  const world = latLngToWorld(center.latitude, center.longitude);
  const scale = 2 ** ZOOM;
  const cx = world.x * scale;
  const cy = world.y * scale;
  const tiles = [];
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
        const tileX = ((originCol + col) % n + n) % n;
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

  return React.createElement(
    View,
    {
      ref,
      style: [{ overflow: 'hidden', backgroundColor: '#E5E7EB' }, props.style],
      testID: props.testID,
      onLayout: event => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ w: width, h: height });
        props.onLayout?.(event);
      },
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    tiles.map(tile =>
      React.createElement(Image, {
        key: tile.key,
        source: { uri: tile.uri },
        style: {
          position: 'absolute',
          width: TILE,
          height: TILE,
          left: tile.left,
          top: tile.top,
        },
      }),
    ),
    props.children,
  );
});
MapView.displayName = 'MapView.web';

const makeStub = name => {
  const Stub = React.forwardRef((props, ref) =>
    React.createElement(View, { ref, style: props.style, testID: props.testID }, props.children),
  );
  Stub.displayName = `MapStub.${name}`;
  return Stub;
};

module.exports = {
  __esModule: true,
  default: MapView,
  MapView,
  Marker: makeStub('Marker'),
  Polyline: makeStub('Polyline'),
  Polygon: makeStub('Polygon'),
  Circle: makeStub('Circle'),
  Overlay: makeStub('Overlay'),
  Heatmap: makeStub('Heatmap'),
  Geojson: makeStub('Geojson'),
  UrlTile: makeStub('UrlTile'),
  Callout: makeStub('Callout'),
  PROVIDER_DEFAULT: undefined,
  PROVIDER_GOOGLE: 'google',
  Animated: MapView,
  enableMapsExperimentalRenderer: () => {},
};
