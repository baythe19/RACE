/**
 * UI Preview / Mock Mode Flag
 * Kept in a standalone constants module with no Redux or service dependencies
 * to prevent circular require cycles.
 */
export const UI_PREVIEW_MODE =
  process.env.EXPO_PUBLIC_UI_PREVIEW_MODE !== 'false';
