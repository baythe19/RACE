import { useEffect } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { updateDriverLocation } from '../services/driver/driverApi';
import { ensureForegroundLocationPermission } from '../utils/locationPermission';
import { useDriverPresenceStore, type DriverLocationHealth } from '../store/driverPresenceStore';

export const BACKGROUND_DRIVER_LOCATION_TASK = 'RACE_BACKGROUND_DRIVER_LOCATION_TASK';

// Define the background location task globally at top-level.
TaskManager.defineTask(BACKGROUND_DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations?.[locations.length - 1];
  if (!latest?.coords) return;

  const { latitude, longitude, heading, accuracy } = latest.coords;
  if (!useDriverPresenceStore.getState().simulationActive) {
    useDriverPresenceStore.getState().setDriverLocation({
      latitude,
      longitude,
      updatedAt: Date.now(),
      heading,
      accuracy,
    });
  }

  try {
    await updateDriverLocation(latitude, longitude);
    useDriverPresenceStore.getState().setLocationHealth('ok', {
      lastLocationAt: Date.now(),
      isReporting: false,
    });
  } catch {
    // Non-fatal, retried on next background tick
  }
});

async function startBackgroundTracking(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_DRIVER_LOCATION_TASK);
    if (!isRegistered) {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') return;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_DRIVER_LOCATION_TASK);
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(BACKGROUND_DRIVER_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: REPORT_INTERVAL_MS,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'RACE Partner Active Service',
          notificationBody: 'Transmitting live GPS coordinates to customer and dispatch',
          notificationColor: '#F5A623',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });
    }
  } catch {
    // Non-fatal: foreground polling timer serves as seamless fallback
  }
}

async function stopBackgroundTracking(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_DRIVER_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_DRIVER_LOCATION_TASK);
    }
  } catch {
    // ignore
  }
}

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

/**
 * Push the driver's chosen manual position to the backend and mark health OK.
 * Used when GPS is unusable but the driver pinned a spot on the map — backend
 * matching, customer tracking and ETAs keep working off that position.
 */
async function reportManualLocation(): Promise<boolean> {
  const presence = useDriverPresenceStore.getState();
  const manual = presence.manualLocation;
  if (!manual) return false;

  // Keep the manual point visible on maps even while GPS is broken.
  useDriverPresenceStore.getState().setDriverLocation(manual);
  try {
    await updateDriverLocation(manual.latitude, manual.longitude);
    lastSentAt = Date.now();
    setHealth('ok', { lastLocationAt: Date.now(), isReporting: false });
    return true;
  } catch {
    setHealth('error', { isReporting: false });
    return true; // consumed the tick — do not fall through to GPS spam
  }
}

async function runReport(): Promise<void> {
  if (inFlight) return;
  if (Date.now() - lastSentAt < MIN_GAP_MS) return;
  inFlight = true;
  useDriverPresenceStore.getState().setLocationHealth(
    useDriverPresenceStore.getState().locationHealth,
    { isReporting: true },
  );

  // A fresh manual pick is the source of truth — report it and skip GPS entirely.
  if (await reportManualLocation()) {
    inFlight = false;
    return;
  }

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

    // 3. Actual fix + upload; a manual pick made while GPS was down still wins.
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
  void startBackgroundTracking();
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
  void stopBackgroundTracking();
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

/** Re-report the driver's chosen position immediately (after a map pick). */
export function reportDriverManualLocationNow(): void {
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
