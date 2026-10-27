/**
 * UI Preview & Permissive Test Mode Configuration
 *
 * Standalone constants module with no Redux or service dependencies
 * to prevent circular require cycles.
 */

/**
 * Preview fixtures stay off in real release APKs.
 * A dedicated mock/SIP APK may keep them on only when
 * EXPO_PUBLIC_UI_PREVIEW_RELEASE=true is baked into that EAS profile.
 */
const allowMockReleaseApk =
  process.env.EXPO_PUBLIC_UI_PREVIEW_RELEASE === 'true' &&
  process.env.EXPO_PUBLIC_UI_PREVIEW_MODE === 'true';
const isReleaseBuild = __DEV__ === false && !allowMockReleaseApk;

export const UI_PREVIEW_MODE =
  !isReleaseBuild && process.env.EXPO_PUBLIC_UI_PREVIEW_MODE === 'true';

/** Mock mutation success must be explicitly enabled for local UI walkthroughs. */
export const UI_PREVIEW_MUTATIONS_ENABLED =
  !isReleaseBuild &&
  UI_PREVIEW_MODE &&
  process.env.EXPO_PUBLIC_UI_PREVIEW_MUTATIONS === 'true';

if (__DEV__ === false && process.env.EXPO_PUBLIC_UI_PREVIEW_MODE === 'true' && !allowMockReleaseApk) {
  console.warn(
    '[RACE] UI preview was requested in a release build; mock data fallbacks are disabled.',
  );
} else if (UI_PREVIEW_MODE) {
  console.warn(
    '[RACE] UI preview is enabled; screens load demo fixtures immediately so each page can be tested.',
  );
}

if (UI_PREVIEW_MUTATIONS_ENABLED) {
  console.warn(
    '[RACE] Mock auth and mutation responses are enabled for a local walkthrough; they are not saved on the server.',
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
  !isReleaseBuild && process.env.EXPO_PUBLIC_UI_TEST_PERMISSIVE_MODE === 'true';

type PermissiveModeListener = (enabled: boolean) => void;
const listeners: Set<PermissiveModeListener> = new Set();

export const UI_TEST_PERMISSIVE_MODE = runtimePermissiveMode;

export function isUiTestPermissiveMode(): boolean {
  return runtimePermissiveMode;
}

export function setUiTestPermissiveMode(enabled: boolean): void {
  runtimePermissiveMode = !isReleaseBuild && enabled;
  listeners.forEach(fn => {
    try {
      fn(runtimePermissiveMode);
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
