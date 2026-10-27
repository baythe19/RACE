import { configureStore, type Middleware } from '@reduxjs/toolkit';

import authReducer, {
  completeOnboarding,
  completeProfileSuccess,
  logout,
  rehydrateAuth,
  setCredentials,
  updateTokens,
  type AuthState,
} from './auth/authSlice';
import bookingsReducer from './bookings/bookingsSlice';
import onboardingReducer from './onboarding/onboardingSlice';
import profileReducer from './profile/profileSlice';
import subscriptionsReducer from './subscriptions/subscriptionsSlice';
import vendorOnboardingReducer from './vendor/vendorOnboardingSlice';
import {
  clearPersistedAuthState,
  loadPersistedAuthState,
  savePersistedAuthState,
} from './secureAuthStorage';
import { clearTokens, saveTokens } from '../services/api';
import {
  getCustomerOnboardingStep,
  setCustomerOnboardingStep,
} from '../store/customerOnboarding';

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
    completeProfileSuccess.match(action) ||
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
    bookings: bookingsReducer,
    onboarding: onboardingReducer,
    profile: profileReducer,
    subscriptions: subscriptionsReducer,
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
  if (!persisted?.accessToken) return;

  const storedStep = await getCustomerOnboardingStep();
  const completed = storedStep === 'done' || persisted.onboardingRequired === false;
  if (completed && storedStep !== 'done') {
    await setCustomerOnboardingStep('done');
  }

  store.dispatch(
    rehydrateAuth({
      ...persisted,
      onboardingRequired: !completed,
    }),
  );

  if (persisted.accessToken && persisted.refreshToken) {
    await saveTokens(persisted.accessToken, persisted.refreshToken);
  }
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
