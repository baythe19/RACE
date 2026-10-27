/**
 * Web shim for expo-secure-store (web builds only).
 * Expo's own web build exports an empty object, which crashes
 * `SecureStore.getItemAsync` callers on web. This shim stores values in
 * localStorage (dev/QA parity; not truly secure — web builds are QA-only).
 * Native platforms keep the real module — see metro.config.js.
 */

const PREFIX = 'race_secure_';

const available = () =>
  typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';

const der = (v) => (v == null ? null : decodeURIComponent(v));
const ser = (v) => (v == null ? null : encodeURIComponent(v));

async function setItemAsync(key, value) {
  if (!available()) return;
  try {
    globalThis.localStorage.setItem(PREFIX + key, ser(String(value)));
  } catch {
    // storage full / disabled — mirror native soft-fail
  }
}

async function getItemAsync(key) {
  if (!available()) return null;
  try {
    return der(globalThis.localStorage.getItem(PREFIX + key));
  } catch {
    return null;
  }
}

async function deleteItemAsync(key) {
  if (!available()) return;
  try {
    globalThis.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Legacy key-based API used by some code paths. */
const getValueWithKeyAsync = getItemAsync;
const setValueWithKeyAsync = setItemAsync;

module.exports = {
  __esModule: true,
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  getValueWithKeyAsync,
  setValueWithKeyAsync,
  WHEN_UNLOCKED: 'whenUnlocked',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  ALWAYS: 'always',
  ALWAYS_THIS_DEVICE_ONLY: 'alwaysThisDeviceOnly',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'whenPasscodeSetThisDeviceOnly',
  canUseBiometricAuthentication: async () => false,
};
