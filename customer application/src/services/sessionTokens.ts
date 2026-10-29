import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEYS } from '../config/env';
import { saveTokens } from './api';

/**
 * Single write path after login or token refresh.
 * SecureStore = runtime API auth; Redux persist = cold-start rehydrate.
 * Backend rotates refresh tokens — both stores must stay in sync.
 */
export async function persistSessionTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await saveTokens(accessToken, refreshToken);
  const { store } = await import('../redux/store');
  const { updateTokens } = await import('../redux/auth/authSlice');
  store.dispatch(updateTokens({ accessToken, refreshToken }));
}

export async function readStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
}

export async function readStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
}
