import { unwrapApi, api } from './api';
import type { Profile } from '../types/models';
import {
  sanitizeUpdateProfileRequest,
  type UpdateProfileRequest,
} from '../utils/profilePayload';
import { store } from '../redux/store';
import { UI_PREVIEW_MODE } from '../config/uiPreviewMode';
import { MOCK_DRIVER_PROFILE, MOCK_VENDOR_PROFILE } from '../data/mockPartnerData';

export async function getProfile(): Promise<Profile> {
  try {
    return await unwrapApi(api.get('/api/v1/profile'));
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const user = store.getState().auth.user;
      return user?.role === 'vendor' ? MOCK_VENDOR_PROFILE : MOCK_DRIVER_PROFILE;
    }
    throw error;
  }
}

export async function updateProfile(data: UpdateProfileRequest): Promise<Profile> {
  try {
    const body = sanitizeUpdateProfileRequest(data);
    return await unwrapApi(api.put('/api/v1/profile', body));
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const user = store.getState().auth.user;
      const base = user?.role === 'vendor' ? MOCK_VENDOR_PROFILE : MOCK_DRIVER_PROFILE;
      return {
        ...base,
        fullName: data.fullName ?? base.fullName,
        email: data.email ?? base.email,
      };
    }
    throw error;
  }
}
