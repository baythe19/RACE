import { create } from 'zustand';

import * as authService from '../services/authService';
import type { SendOtpPayload, VerifyOtpPayload } from '../services/authService';
import { getApiErrorMessage } from '../services/api';
import { clearSessionStores } from './authSession';
import { bindSetOnboardingRequired } from './authState';
import type { User } from '../types/auth';

export interface SetAuthPayload {
  user: User;
  onboardingRequired: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  onboardingRequired: boolean;
  /** After logout, partner app opens this auth screen instead of splash. */
  partnerAuthEntry: 'PartnerSplash' | 'PartnerLogin' | 'PartnerRoleSelection';
  /** Bumps on logout so navigation remounts reliably. */
  authSessionVersion: number;
  sendOtp: (payload: SendOtpPayload) => Promise<authService.SendOtpResult>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setAuth: (payload: SetAuthPayload) => void;
  patchAuth: (patch: Partial<SetAuthPayload>) => void;
  clearAuth: () => void;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setOnboardingRequired: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  clearPartnerAuthEntry: () => void;
}

function partnerOnboardingRequired(user: User): boolean {
  if (user.role === 'driver' || user.role === 'vendor') {
    return !user.isProfileCompleted;
  }
  return true;
}

async function completeAuthSession(
  result: Awaited<ReturnType<typeof authService.verifyOtp>>,
): Promise<boolean> {
  try {
    const { useProfileStore } = require('./profileStore') as typeof import('./profileStore');
    await useProfileStore.getState().fetchProfile();
  } catch {
    // Keep session even if profile fails to load.
  }

  /**
   * Presence is session-scoped: every fresh login starts OFFLINE unless the
   * driver flips the toggle again. If the driver still has an active trip,
   * the backend rejects the availability change and they stay online until
   * the trip completes (product rule 2026-10-30).
   */
  if (result.user?.role === 'driver') {
    try {
      const { setDriverAvailability } = await import('../services/driver/driverApi');
      await setDriverAvailability(false).catch(() => undefined);
      const { useProfileStore: profileStore } = await import('./profileStore');
      await profileStore.getState().fetchProfile().catch(() => undefined);
    } catch {
      // Availability reset is best-effort; never block login.
    }
    const { useDriverPresenceStore } = await import('./driverPresenceStore');
    useDriverPresenceStore.getState().setOnline(false);
  }

  return result.onboardingRequired ?? partnerOnboardingRequired(result.user);
}

async function syncReduxCredentials(
  payload: SetAuthPayload & { accessToken: string; refreshToken: string },
): Promise<void> {
  const { store } = await import('../redux/store');
  const { setCredentials } = await import('../redux/auth/authSlice');
  store.dispatch(
    setCredentials({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      onboardingRequired: payload.onboardingRequired,
    }),
  );
}

async function syncReduxLogout(): Promise<void> {
  const { store } = await import('../redux/store');
  const { logout: logoutAction } = await import('../redux/auth/authSlice');
  store.dispatch(logoutAction());
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  onboardingRequired: false,
  partnerAuthEntry: 'PartnerSplash',
  authSessionVersion: 0,

  setAuth: payload =>
    set({
      user: payload.user,
      isAuthenticated: true,
      onboardingRequired: payload.onboardingRequired,
      isLoading: false,
      error: null,
    }),

  patchAuth: patch =>
    set(state => ({
      user: patch.user ?? state.user,
      isAuthenticated: true,
      onboardingRequired: patch.onboardingRequired ?? state.onboardingRequired,
    })),

  clearAuth: () =>
    set(state => ({
      user: null,
      isAuthenticated: false,
      onboardingRequired: false,
      error: null,
      partnerAuthEntry: state.partnerAuthEntry,
      authSessionVersion: state.authSessionVersion,
    })),

  clearPartnerAuthEntry: () => set({ partnerAuthEntry: 'PartnerSplash' }),

  sendOtp: async payload => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.sendOtp(payload);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to send OTP'),
      });
      throw error;
    }
  },

  verifyOtp: async payload => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.verifyOtp(payload);
      const onboardingRequired = await completeAuthSession(result);

      set({
        user: result.user,
        isAuthenticated: true,
        onboardingRequired,
        isLoading: false,
        error: null,
      });

      await syncReduxCredentials({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        onboardingRequired,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to verify OTP'),
      });
      throw error;
    }
  },

  logout: async () => {
    // Session ended → driver presence goes offline (best-effort backend call).
    // Next login starts offline unless the driver flips the toggle again.
    // Active trip: backend blocks availability changes, so an in-progress trip
    // keeps the driver reachable until it completes (per product rule).
    try {
      const { useDriverPresenceStore } = await import('./driverPresenceStore');
      if (useDriverPresenceStore.getState().isOnline) {
        const { setDriverAvailability } = await import('../services/driver/driverApi');
        await setDriverAvailability(false).catch(() => undefined);
      }
      useDriverPresenceStore.getState().setOnline(false);
    } catch {
      // Presence cleanup is best-effort; logout must always proceed.
    }

    const nextSessionVersion = get().authSessionVersion + 1;
    set({
      partnerAuthEntry: 'PartnerLogin',
      authSessionVersion: nextSessionVersion,
    });

    get().clearAuth();
    clearSessionStores();

    try {
      const { queryClient } = await import('../services/queryClient');
      queryClient.clear();
    } catch {
      // Non-fatal if query cache clear fails.
    }

    await syncReduxLogout();

    set({
      partnerAuthEntry: 'PartnerLogin',
      authSessionVersion: nextSessionVersion,
      user: null,
      isAuthenticated: false,
      onboardingRequired: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  setUser: user => set({ user }),

  setAuthenticated: value => set({ isAuthenticated: value }),

  setOnboardingRequired: value => set({ onboardingRequired: value }),

  setLoading: value => set({ isLoading: value }),
}));

bindSetOnboardingRequired(value => {
  useAuthStore.getState().setOnboardingRequired(value);
});
