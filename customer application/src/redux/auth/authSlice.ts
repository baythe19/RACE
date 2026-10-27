import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit';

import { useAuthStore } from '../../store/authStore';
import type { AuthUser } from '../../types/auth';

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  onboardingRequired: boolean;
  pendingMobileNumber: string | null;
  /** When true, an approved vendor sees the customer app instead of the partner app. */
  useCustomerExperience: boolean;
}

type PersistedAuthPayload = Pick<
  AuthState,
  'user' | 'accessToken' | 'refreshToken' | 'isAuthenticated' | 'onboardingRequired'
>;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  onboardingRequired: false,
  pendingMobileNumber: null,
  useCustomerExperience: false,
};

function syncZustandAuth(user: AuthUser, onboardingRequired: boolean): void {
  useAuthStore.getState().setAuth({ user, onboardingRequired });
}

function syncZustandPatch(user: AuthUser, onboardingRequired: boolean): void {
  useAuthStore.getState().patchAuth({ user, onboardingRequired });
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setPendingMobileNumber(state, action: PayloadAction<string | null>) {
      state.pendingMobileNumber = action.payload;
    },
    setCredentials(
      state,
      action: PayloadAction<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
        onboardingRequired: boolean;
      }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.onboardingRequired = action.payload.onboardingRequired;
      state.isAuthenticated = true;
      state.loading = false;
      state.pendingMobileNumber = null;

      syncZustandAuth(action.payload.user, action.payload.onboardingRequired);
    },
    completeProfileSuccess(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;

      syncZustandPatch(action.payload, state.onboardingRequired);
    },
    completeOnboarding(state, action: PayloadAction<AuthUser | undefined>) {
      if (action.payload) {
        state.user = action.payload;
      }
      state.isAuthenticated = true;
      state.onboardingRequired = false;
      state.loading = false;

      const user = action.payload ?? (state.user ? current(state.user) : null);
      if (user) {
        syncZustandPatch(user, false);
      }
      useAuthStore.getState().setOnboardingRequired(false);
      useAuthStore.getState().setCustomerOnboardingStep('done');
    },
    updateTokens(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    updateUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;

      syncZustandPatch(action.payload, state.onboardingRequired);
    },
    setUseCustomerExperience(state, action: PayloadAction<boolean>) {
      state.useCustomerExperience = action.payload;
    },
    logout(state) {
      const preservedEntry = useAuthStore.getState().partnerAuthEntry;
      const preservedVersion = useAuthStore.getState().authSessionVersion;

      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.onboardingRequired = false;
      state.pendingMobileNumber = null;
      state.useCustomerExperience = false;

      useAuthStore.getState().clearAuth();
      useAuthStore.setState({
        partnerAuthEntry: preservedEntry,
        authSessionVersion: preservedVersion,
      });
    },
    rehydrateAuth(state, action: PayloadAction<PersistedAuthPayload>) {
      const { user, accessToken, refreshToken, onboardingRequired } = action.payload;
      const authenticated = Boolean(accessToken);

      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = authenticated;
      state.onboardingRequired = onboardingRequired;
      state.loading = false;

      if (authenticated && user) {
        syncZustandAuth(user, onboardingRequired);
      } else {
        useAuthStore.getState().clearAuth();
      }
    },
  },
});

export const {
  setLoading,
  setPendingMobileNumber,
  setCredentials,
  completeProfileSuccess,
  completeOnboarding,
  updateUser,
  setUseCustomerExperience,
  updateTokens,
  logout,
  rehydrateAuth,
} = authSlice.actions;

export default authSlice.reducer;
