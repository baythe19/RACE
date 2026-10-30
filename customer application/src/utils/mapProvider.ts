import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import { getGoogleMapsApiKey } from './googleMaps';

/** Native map tiles: Google when a real API key is configured (iOS + Android). */
export function getNativeMapProvider(): typeof PROVIDER_GOOGLE | typeof PROVIDER_DEFAULT {
  if (Platform.OS === 'web') {
    return PROVIDER_DEFAULT;
  }
  return getGoogleMapsApiKey() ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey());
}
