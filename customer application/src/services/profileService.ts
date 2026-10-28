import { unwrapApi, api } from './api';
import type { Profile } from '../types/models';
import {
  sanitizeUpdateProfileRequest,
  type UpdateProfileRequest,
} from '../utils/profilePayload';

export async function getProfile(): Promise<Profile> {
  return unwrapApi(api.get('/api/v1/profile'));
}

export async function updateProfile(data: UpdateProfileRequest): Promise<Profile> {
  const body = sanitizeUpdateProfileRequest(data);
  return unwrapApi(api.put('/api/v1/profile', body));
}

/** ─── Identity credentials (change password / mobile / set PIN) ─── */

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await unwrapApi(api.post('/api/v1/profile/password/change', { currentPassword, newPassword }));
}

export interface MobileChangeRequestResult {
  newMobile: string;
  pendingToken: string;
  expiresIn: number;
  message: string;
  /** Only present from the backend in non-production for whitelisted/dev numbers. */
  devOtp?: string;
}

export async function requestMobileChange(newMobile: string): Promise<MobileChangeRequestResult> {
  return unwrapApi(api.post('/api/v1/profile/mobile/change-request', { newMobile }));
}

export async function confirmMobileChange(pendingToken: string, code: string): Promise<void> {
  await unwrapApi(api.post('/api/v1/profile/mobile/change-confirm', { pendingToken, code }));
}

export async function setPin(currentPin: string | undefined, pin: string): Promise<void> {
  await unwrapApi(api.post('/api/v1/profile/pin/set', { pin, currentPin }));
}
