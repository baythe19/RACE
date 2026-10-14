/**
 * UI Preview & Permissive Test Mode Configuration
 *
 * Standalone constants module with no Redux or service dependencies
 * to prevent circular require cycles.
 */

export const UI_PREVIEW_MODE =
  process.env.EXPO_PUBLIC_UI_PREVIEW_MODE !== 'false';

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
