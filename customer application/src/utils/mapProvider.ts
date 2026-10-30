import { Platform } from 'react-native';

import { getGoogleMapsApiKey } from './googleMaps';

/**
 * MapView `provider` values (see react-native-maps `ProviderConstants`).
 * Import only from this module — do not reference PROVIDER_GOOGLE / PROVIDER_DEFAULT in screens.
 */
export type NativeMapProvider = 'google' | undefined;

/** Native map tiles: Google when a real API key is configured (iOS + Android). */
export function getNativeMapProvider(): NativeMapProvider {
  if (Platform.OS === 'web') {
    return undefined;
  }
  return getGoogleMapsApiKey() ? 'google' : undefined;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey());
}
