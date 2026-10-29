import { isCustomerMockDataEnabled } from './customerQa';

/**
 * Front-end walkthrough: Continue buttons advance without forms or API.
 * Boot default comes from EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW; the UI QA
 * panel flips mock data at runtime via `setCustomerMockDataEnabled`.
 */
export function isUiPreviewAuthFlow(): boolean {
  return isCustomerMockDataEnabled();
}

/** @deprecated Use `isUiPreviewAuthFlow()` — live runtime mock flag. */
export function getUiPreviewAuthFlow(): boolean {
  return isCustomerMockDataEnabled();
}

export const UI_PREVIEW_MOBILE = '9876543210';
