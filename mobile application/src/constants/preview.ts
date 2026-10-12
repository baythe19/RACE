/**
 * UI Preview & Permissive Test Mode Configuration
 *
 * Standalone constants module with no Redux or service dependencies
 * to prevent circular require cycles.
 */

export const UI_PREVIEW_MODE =
  process.env.EXPO_PUBLIC_UI_PREVIEW_MODE !== 'false';

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
