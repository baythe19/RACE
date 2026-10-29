/**
 * Customer app UI QA / mock-data controls.
 * Runtime toggles so the floating UI QA panel can switch mock ↔ real
 * without rebuilding. Env flags set the defaults at boot.
 */

const allowMockReleaseApk =
  process.env.EXPO_PUBLIC_UI_PREVIEW_RELEASE === 'true' &&
  process.env.EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW === 'true';
const isReleaseBuild = __DEV__ === false && !allowMockReleaseApk;

/**
 * Floating screen-jump harness — opt-in only (MVP local uses real navigation).
 * Set EXPO_PUBLIC_UI_QA_NAVIGATOR=true when you need the FAB.
 */
export const UI_QA_NAVIGATOR_ENABLED =
  process.env.EXPO_PUBLIC_UI_QA_NAVIGATOR === 'true';

/** Default mock/preview auth from env (Continue can skip real OTP). */
const envMockDefault =
  !isReleaseBuild && process.env.EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW === 'true';

let runtimeMockDataEnabled = envMockDefault;

type MockListener = (enabled: boolean) => void;
const listeners = new Set<MockListener>();

export function isCustomerMockDataEnabled(): boolean {
  return runtimeMockDataEnabled;
}

export function setCustomerMockDataEnabled(enabled: boolean): void {
  runtimeMockDataEnabled = !isReleaseBuild && enabled;
  listeners.forEach(fn => {
    try {
      fn(runtimeMockDataEnabled);
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeCustomerMockData(listener: MockListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** QA whitelist mobile used across preview helpers. */
export const CUSTOMER_QA_MOBILE = '9876543210';
/** Also valid locally: any 9000000xxx → backend universal OTP 123456 */
export const CUSTOMER_QA_MOBILE_ALT = '9000000000';
export const CUSTOMER_QA_OTP = '123456';
