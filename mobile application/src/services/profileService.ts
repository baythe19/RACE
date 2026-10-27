import { unwrapApi, api } from './api';
import type { Profile } from '../types/models';
import {
  sanitizeUpdateProfileRequest,
  type UpdateProfileRequest,
} from '../utils/profilePayload';
import { UI_PREVIEW_MODE, UI_PREVIEW_MUTATIONS_ENABLED } from '../constants/preview';
import { MOCK_DRIVER_PROFILE, MOCK_VENDOR_PROFILE } from '../data/mockPartnerData';

function getMockProfileForActiveUser(): Profile {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { store } = require('../redux/store');
    const user = store?.getState()?.auth?.user;
    return user?.role === 'vendor' ? MOCK_VENDOR_PROFILE : MOCK_DRIVER_PROFILE;
  } catch {
    return MOCK_DRIVER_PROFILE;
  }
}

export async function getProfile(): Promise<Profile> {
  if (UI_PREVIEW_MODE) return getMockProfileForActiveUser();
  try {
    return await unwrapApi(api.get('/api/v1/profile'));
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return getMockProfileForActiveUser();
    }
    throw error;
  }
}

export async function updateProfile(data: UpdateProfileRequest): Promise<Profile> {
  try {
    const body = sanitizeUpdateProfileRequest(data);
    return await unwrapApi(api.put('/api/v1/profile', body));
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const base = getMockProfileForActiveUser();
      return {
        ...base,
        fullName: data.fullName ?? base.fullName,
        email: data.email ?? base.email,
      };
    }
    throw error;
  }
}
