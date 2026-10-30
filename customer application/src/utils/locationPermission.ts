import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

import { getAppDialog } from './alertBus';

/**
 * Ask for foreground location only when the system still allows it.
 * If the user already said no, don't re-prompt — offer Settings and keep map/search usable.
 */
export async function ensureForegroundLocation(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return true;

  if (current.canAskAgain) {
    const next = await Location.requestForegroundPermissionsAsync();
    if (next.status === 'granted') return true;
  }

  getAppDialog().showDialog({
    tone: 'warning',
    title: 'Location is off',
    message:
      'You can still search or drag the pin on the map. Turn on location in Settings if you want GPS.',
    primaryLabel: 'Not now',
    secondaryLabel: 'Open Settings',
    onSecondary: () => void Linking.openSettings(),
  });
  return false;
}
