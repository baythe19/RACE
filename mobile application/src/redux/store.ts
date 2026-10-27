import { configureStore, type Middleware } from '@reduxjs/toolkit';

import authReducer, {
  completeOnboarding,
  logout,
  rehydrateAuth,
  setCredentials,
  updateTokens,
  type AuthState,
} from './auth/authSlice';
import onboardingReducer from './onboarding/onboardingSlice';
import vendorOnboardingReducer from './vendor/vendorOnboardingSlice';
import {
  clearPersistedAuthState,
  loadPersistedAuthState,
  savePersistedAuthState,
} from './secureAuthStorage';
import { clearTokens, saveTokens } from '../services/api';

function pickPersistedAuth(state: AuthState) {
  return {
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
    onboardingRequired: state.onboardingRequired,
  };
}

const persistAuthMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);

  if (
    setCredentials.match(action) ||
    completeOnboarding.match(action) ||
    updateTokens.match(action)
  ) {
    const auth = storeApi.getState().auth as AuthState;
    void savePersistedAuthState(pickPersistedAuth(auth));
    if (auth.accessToken && auth.refreshToken) {
      void saveTokens(auth.accessToken, auth.refreshToken);
    }
  }

  if (logout.match(action)) {
    void clearPersistedAuthState();
    void clearTokens();
  }

  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
    vendorOnboarding: vendorOnboardingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(persistAuthMiddleware),
});

export async function hydrateAuthStore(): Promise<void> {
  const persisted = await loadPersistedAuthState();
  if (!persisted) return;

  store.dispatch(rehydrateAuth(persisted));

  if (persisted.accessToken && persisted.refreshToken) {
    await saveTokens(persisted.accessToken, persisted.refreshToken);
  }
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
