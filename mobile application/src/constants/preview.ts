/**
 * UI Preview & Permissive Test Mode Configuration
 *
 * Standalone constants module with no Redux or service dependencies
 * to prevent circular require cycles.
 */

/**
 * PA-1 hardening (audit 21 / BUG-01 / VOC P0.1):
 * Preview mock-data fallback stays ON for dev/demo convenience, BUT a
 * production-shaped bundle (`__DEV__ === false`) must never silently
 * fabricate data. In release builds preview is disabled unless someone
 * explicitly opts in via EXPO_PUBLIC_UI_PREVIEW_MODE=true — and even then
 * the app logs a loud warning at startup.
 */
const isReleaseBuild = __DEV__ === false;

export const UI_PREVIEW_MODE = isReleaseBuild
  ? process.env.EXPO_PUBLIC_UI_PREVIEW_MODE === 'true'
  : process.env.EXPO_PUBLIC_UI_PREVIEW_MODE !== 'false';

if (isReleaseBuild && UI_PREVIEW_MODE) {
  console.warn(
    '[RACE] ⚠️ Production build running with UI_PREVIEW_MODE — mock data fallbacks are ACTIVE. ' +
      'Set EXPO_PUBLIC_UI_PREVIEW_MODE=false for any client-facing release build.',
  );
}

/**
 * The supplied driver boards show an approved/active partner. Keep that as the
 * default mock journey, while retaining an explicit pending fixture for gate
 * and registration QA (`EXPO_PUBLIC_UI_PREVIEW_DRIVER_STATUS=PENDING`).
 * Real API responses always win and remain approval-gated by the backend.
 */
export const UI_PREVIEW_DRIVER_STATUS: 'APPROVED' | 'PENDING' =
  process.env.EXPO_PUBLIC_UI_PREVIEW_DRIVER_STATUS?.toUpperCase() === 'PENDING'
    ? 'PENDING'
    : 'APPROVED';

/** Keep the screen-jump harness opt-in so preview data does not alter the UI boards. */
export const UI_QA_NAVIGATOR_ENABLED =
  process.env.EXPO_PUBLIC_UI_QA_NAVIGATOR === 'true';

/** Keep the supplied dashboard boards free of the global offer overlay. */
export const UI_PREVIEW_DRIVER_ALERT_ENABLED =
  process.env.EXPO_PUBLIC_UI_PREVIEW_DRIVER_ALERT === 'true';

let runtimePermissiveMode: boolean =
  process.env.EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE !== 'false';

type PermissiveModeListener = (enabled: boolean) => void;
const listeners: Set<PermissiveModeListener> = new Set();

export const UI_TEST_PERMISSIVE_MODE = runtimePermissiveMode;

export function isUiTestPermissiveMode(): boolean {
  return runtimePermissiveMode;
}

export function setUiTestPermissiveMode(enabled: boolean): void {
  runtimePermissiveMode = enabled;
  listeners.forEach(fn => {
    try {
      fn(enabled);
    } catch {
      // ignore listener error
    }
  });
}

export function subscribeUiTestPermissiveMode(
  listener: PermissiveModeListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
