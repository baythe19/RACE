/**
 * Patches node_modules/expo-notifications so the barrel import of
 * 'expo-notifications' does not crash at startup on Android runtimes whose
 * native side predates `ExpoTopicSubscriptionModule` (redbox:
 * "Cannot find native module 'ExpoTopicSubscriptionModule'").
 *
 * The app never calls topic APIs; the module becomes a lazy, null-safe stub.
 * Idempotent — safe to run on every install.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'TopicSubscriptionModule.android.js',
);

const OLD = `import { requireNativeModule } from 'expo-modules-core';
export default requireNativeModule('ExpoTopicSubscriptionModule');`;

const NEW = `import { requireOptionalNativeModule } from 'expo-modules-core';

// Lazily resolved: the Android dev runtime may predate the native
// ExpoTopicSubscriptionModule. Returning a no-op stub keeps the barrel import
// of 'expo-notifications' safe (topic APIs are unused in this app).
const nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');

export default nativeModule ?? {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};`;

try {
  if (!fs.existsSync(target)) {
    // Package not installed yet or layout changed — nothing to do.
    process.exit(0);
  }
  let code = fs.readFileSync(target, 'utf8');
  if (code.includes("requireOptionalNativeModule('ExpoTopicSubscriptionModule')")) {
    process.exit(0); // already patched
  }
  if (!code.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
    process.exit(0); // upstream changed shape; don't guess
  }
  code = code.replace(
    `import { requireNativeModule } from 'expo-modules-core';
export default requireNativeModule('ExpoTopicSubscriptionModule');`,
    NEW,
  );
  fs.writeFileSync(target, code);
  console.log('[postinstall] patched expo-notifications TopicSubscriptionModule (null-safe)');
} catch (error) {
  console.warn('[postinstall] expo-notifications patch skipped:', error.message);
}
