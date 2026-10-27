import { create } from 'zustand';

import * as authService from '../services/authService';
import type { SendOtpPayload, VerifyOtpPayload } from '../services/authService';
import { getApiErrorMessage } from '../services/api';
import { clearSessionStores } from './authSession';
import { bindSetOnboardingRequired } from './authState';
import {
  clearCustomerOnboardingComplete,
  getCustomerOnboardingStep,
  setCustomerOnboardingStep as persistCustomerOnboardingStep,
  type CustomerOnboardingStep,
} from './customerOnboarding';
import { useVehicleStore } from './vehicleStore';
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
  partnerAuthEntry: 'PartnerSplash' | 'PartnerRoleSelection' | 'PartnerLogin';
  /** Bumps on logout so navigation remounts reliably. */
  authSessionVersion: number;
  customerOnboardingStep: CustomerOnboardingStep;
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
  setCustomerOnboardingStep: (step: CustomerOnboardingStep) => void;
  setLoading: (value: boolean) => void;
  clearPartnerAuthEntry: () => void;
}

function onboardingRequiredForStep(step: CustomerOnboardingStep): boolean {
  return step !== 'done';
}

async function resolveCustomerOnboardingStep(
  result: Awaited<ReturnType<typeof authService.verifyOtp>>,
): Promise<CustomerOnboardingStep> {
  const { useProfileStore } = await import('./profileStore');
  const profile = useProfileStore.getState().profile;

  if (result.onboardingRequired) {
    await clearCustomerOnboardingComplete();
    if (profile?.isProfileCompleted) {
      const vehicles = useVehicleStore.getState().vehicles;
      return vehicles.length === 0 ? 'vehicle' : 'pin';
    }
    return 'profile';
  }

  const storedStep = await getCustomerOnboardingStep();
  if (storedStep !== 'profile') {
    return storedStep;
  }

  if (!profile?.isProfileCompleted) {
    return 'profile';
  }

  const vehicles = useVehicleStore.getState().vehicles;
  if (vehicles.length === 0) {
    return 'vehicle';
  }

  return 'pin';
}

async function completeAuthSession(
  result: Awaited<ReturnType<typeof authService.verifyOtp>>,
): Promise<CustomerOnboardingStep> {
  try {
    const { useProfileStore } = await import('./profileStore');
    await useProfileStore.getState().fetchProfile();
    await useVehicleStore.getState().fetchVehicles();
  } catch {
    // Keep session even if profile/vehicles fail to load.
  }

  const step = await resolveCustomerOnboardingStep(result);
  await persistCustomerOnboardingStep(step);
  return step;
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
  customerOnboardingStep: 'profile',
  partnerAuthEntry: 'PartnerSplash',
  authSessionVersion: 0,

  setAuth: payload => {
    const customerOnboardingStep: CustomerOnboardingStep = payload.onboardingRequired
      ? 'profile'
      : 'done';
    set({
      user: payload.user,
      isAuthenticated: true,
      onboardingRequired: payload.onboardingRequired,
      customerOnboardingStep,
      isLoading: false,
      error: null,
    });
    if (customerOnboardingStep === 'done') {
      void persistCustomerOnboardingStep('done');
    }
  },

  patchAuth: patch =>
    set(state => {
      const onboardingRequired =
        patch.onboardingRequired ?? state.onboardingRequired;

      return {
        user: patch.user ?? state.user,
        isAuthenticated: true,
        onboardingRequired,
        customerOnboardingStep:
          onboardingRequired === false ? 'done' : state.customerOnboardingStep,
      };
    }),

  clearAuth: () =>
    set(state => ({
      user: null,
      isAuthenticated: false,
      onboardingRequired: false,
      customerOnboardingStep: 'profile',
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
      const customerOnboardingStep = await completeAuthSession(result);
      const onboardingRequired = onboardingRequiredForStep(customerOnboardingStep);

      set({
        user: result.user,
        isAuthenticated: true,
        onboardingRequired,
        customerOnboardingStep,
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
    const nextSessionVersion = get().authSessionVersion + 1;
    set({
      partnerAuthEntry: 'PartnerRoleSelection',
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
      partnerAuthEntry: 'PartnerRoleSelection',
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

  setOnboardingRequired: value => {
    set(state => ({
      onboardingRequired: value,
      customerOnboardingStep: value ? state.customerOnboardingStep : 'done',
    }));
    if (!value) {
      void persistCustomerOnboardingStep('done');
    }
  },

  setCustomerOnboardingStep: step => {
    set({
      customerOnboardingStep: step,
      onboardingRequired: onboardingRequiredForStep(step),
    });
    void persistCustomerOnboardingStep(step);
  },

  setLoading: value => set({ isLoading: value }),
}));

bindSetOnboardingRequired(value => {
  useAuthStore.getState().setOnboardingRequired(value);
});
