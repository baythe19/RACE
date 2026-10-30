import { create } from 'zustand';

import * as profileService from '../services/profileService';
import { getApiErrorMessage, readAccessToken } from '../services/api';
import { syncOnboardingRequiredFromProfile } from './authState';
import type { Profile } from '../types/models';
import type { UpdateProfileRequest } from '../utils/profilePayload';

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (
    data: UpdateProfileRequest,
    options?: { syncOnboarding?: boolean },
  ) => Promise<Profile>;
  clearProfile: () => void;
}

/** Shared in-flight promise so remount / focus cannot stack duplicate GETs. */
let profileFetchInFlight: Promise<void> | null = null;
let profileUpdateInFlight = false;

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    if (profileFetchInFlight) return profileFetchInFlight;
    profileFetchInFlight = (async () => {
      set({ isLoading: true, error: null });
      try {
        const token = await readAccessToken();
        if (!token) {
          set({ isLoading: false, error: null });
          return;
        }
        const profile = await profileService.getProfile();
        set({ profile, isLoading: false });
      } catch (error) {
        set({
          isLoading: false,
          error: getApiErrorMessage(error, 'Unable to load profile'),
        });
      } finally {
        profileFetchInFlight = null;
      }
    })();
    return profileFetchInFlight;
  },

  updateProfile: async (data, options) => {
    if (profileUpdateInFlight) {
      throw new Error('Profile update already in progress');
    }
    profileUpdateInFlight = true;
    set({ isLoading: true, error: null });
    try {
      const profile = await profileService.updateProfile(data);
      set({ profile, isLoading: false });
      if (options?.syncOnboarding !== false) {
        syncOnboardingRequiredFromProfile(profile.isProfileCompleted);
      }
      return profile;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to update profile'),
      });
      throw error;
    } finally {
      profileUpdateInFlight = false;
    }
  },

  clearProfile: () => set({ profile: null, error: null }),
}));
