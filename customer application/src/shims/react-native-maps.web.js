/**
 * Web stub for react-native-maps (web builds only).
 * Native platforms keep the real module — see metro.config.js resolveRequest.
 * Components render harmless placeholders so the web bundle compiles.
 */
const React = require('react');
const { View } = require('react-native');

const makeStub = (name) => {
  const Stub = React.forwardRef((props, ref) =>
    React.createElement(
      View,
      { ref, style: [{ display: 'flex' }, props.style], testID: props.testID },
      props.children
    )
  );
  Stub.displayName = `MapStub.${name}`;
  return Stub;
};

class MapViewUrlTileError extends Error {}

module.exports = {
  __esModule: true,
  default: makeStub('MapView'),
  MapView: makeStub('MapView'),
  Marker: makeStub('Marker'),
  Polyline: makeStub('Polyline'),
  Polygon: makeStub('Polygon'),
  Circle: makeStub('Circle'),
  Overlay: makeStub('Overlay'),
  Heatmap: makeStub('Heatmap'),
  Geojson: makeStub('Geojson'),
  UrlTile: makeStub('UrlTile'),
  Callout: makeStub('Callout'),
  PROVIDER_DEFAULT: 'default',
  PROVIDER_GOOGLE: 'google',
  Animated: makeStub('Animated'),
  enableMapsExperimentalRenderer: () => {},
};
