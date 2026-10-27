import type { ChangePasswordPayload, ProfileDetail } from '@race/types';
import { Role } from '@race/types';

import { apiGet } from '../http';

export async function getProfile(): Promise<ProfileDetail> {
  const user = await apiGet<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  }>('/auth/me');

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatarUrl: user.avatarUrl,
    phone: '',
    department: 'Administration',
    joinedAt: new Date().toISOString(),
    loginActivity: [],
  };
}

/**
 * Platform admin identity is env-backed (hardcoded-admin). Profile fields other than
 * session display cannot be persisted via API yet — return current profile unchanged.
 */
export async function updateProfile(_input: Partial<ProfileDetail>) {
  throw new Error(
    'Platform admin profile is managed by server configuration. Name/email come from ADMIN_NAME / ADMIN_EMAIL.',
  );
}

export async function changePassword(_payload: ChangePasswordPayload) {
  throw new Error(
    'Change the platform admin password by updating ADMIN_PASSWORD in the backend environment, then restart the API.',
  );
}

export async function updateProfileImage(_file: File) {
  throw new Error('Admin profile image upload is not available for the env-backed platform admin.');
}
