import * as Location from 'expo-location';

/**
 * Foreground location for a feature that needs GPS right now.
 *
 * Product rule: never treat a prior denial as "do not ask again" inside the app.
 * Call this whenever a screen or action needs location; if the user denied earlier,
 * the next need should request again (OS may still gate repeated prompts).
 */
export async function ensureForegroundLocationPermission(): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.status === 'granted') {
    return true;
  }
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === 'granted';
}

export async function getCurrentPositionWhenAllowed(
  accuracy: Location.Accuracy = Location.Accuracy.Balanced,
): Promise<Location.LocationObject | null> {
  const granted = await ensureForegroundLocationPermission();
  if (!granted) {
    return null;
  }
  try {
    return await Location.getCurrentPositionAsync({ accuracy });
  } catch {
    return null;
  }
}
