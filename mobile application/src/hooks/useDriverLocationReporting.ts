import { useEffect } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

import { updateDriverLocation } from '../services/driver/driverApi';
import { ensureForegroundLocationPermission } from '../utils/locationPermission';
import { useDriverPresenceStore, type DriverLocationHealth } from '../store/driverPresenceStore';

const REPORT_INTERVAL_MS = 12_000;
/** Guards against two mounted screens pushing the same fix twice. */
const MIN_GAP_MS = 4_000;

/**
 * Shared singleton reporter.
 *
 * Both the dashboard and the active-job screen want live location, and a tab
 * navigator keeps both mounted — so a per-hook interval used to double-write to
 * the backend. This module owns exactly one timer while at least one screen
 * subscribes, and it reports *why* it failed instead of swallowing the error.
 */
let subscribers = 0;
let interval: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let inFlight = false;
let lastSentAt = 0;

function setHealth(
  health: DriverLocationHealth,
  options?: { lastLocationAt?: number | null; isReporting?: boolean },
) {
  useDriverPresenceStore.getState().setLocationHealth(health, options);
}

async function runReport(): Promise<void> {
  if (inFlight) return;
  if (Date.now() - lastSentAt < MIN_GAP_MS) return;
  inFlight = true;
  useDriverPresenceStore.getState().setLocationHealth(
    useDriverPresenceStore.getState().locationHealth,
    { isReporting: true },
  );

  try {
    const granted = await ensureForegroundLocationPermission();
    if (!granted) {
      setHealth('permission_denied', { isReporting: false });
      return;
    }

    // 2. Device location switch (GPS) — a granted permission is not enough.
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      setHealth('services_disabled', { isReporting: false });
      return;
    }

    // 3. Actual fix + upload.
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    if (!useDriverPresenceStore.getState().simulationActive) {
      useDriverPresenceStore.getState().setDriverLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        updatedAt: Date.now(),
        heading: position.coords.heading,
        accuracy: position.coords.accuracy,
      });
    }
    await updateDriverLocation(position.coords.latitude, position.coords.longitude);
    const sentAt = Date.now();
    lastSentAt = sentAt;
    setHealth('ok', { lastLocationAt: sentAt, isReporting: false });
  } catch {
    setHealth('error', { isReporting: false });
  } finally {
    inFlight = false;
  }
}

function startReporter() {
  if (interval) return;
  void runReport();
  interval = setInterval(() => {
    void runReport();
  }, REPORT_INTERVAL_MS);
  // Coming back from the background is the most common moment a fix is stale.
  appStateSub = AppState.addEventListener('change', next => {
    if (next === 'active') void runReport();
  });
}

function stopReporter() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  appStateSub?.remove();
  appStateSub = null;
  useDriverPresenceStore
    .getState()
    .setLocationHealth(useDriverPresenceStore.getState().locationHealth, { isReporting: false });
}

/**
 * Reports the driver's GPS to the backend while online or on an active job.
 * Subscribe by calling this from any screen; the shared timer starts on the
 * first subscriber and stops with the last one.
 */
export function useDriverLocationReporting(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    subscribers += 1;
    if (subscribers === 1) startReporter();
    return () => {
      subscribers = Math.max(0, subscribers - 1);
      if (subscribers === 0) stopReporter();
    };
  }, [enabled]);
}

/** Manual retry for the dashboard's location-health card. */
export function retryDriverLocationReport(): void {
  lastSentAt = 0;
  void runReport();
}

/** Opens the OS location permission page (Android) or app settings (iOS). */
export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openURL('app-settings:').catch(() => Linking.openSettings());
    return;
  }
  await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(async () => {
    await Linking.openSettings();
  });
}
