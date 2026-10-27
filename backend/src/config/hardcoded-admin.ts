import crypto from 'node:crypto';
import { AdminPermission, AdminRole, getPermissionsForRole } from '../services/src/admin/rbac';
import { env } from './env';

/** Fixed platform admin identity — not stored in MongoDB. */
export const PLATFORM_ADMIN_ID = 'race-platform-admin';

export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  isActive: true;
}

export function getPlatformAdmin(): PlatformAdmin {
  return {
    id: PLATFORM_ADMIN_ID,
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL.toLowerCase(),
    role: AdminRole.SUPER_ADMIN,
    permissions: getPermissionsForRole(AdminRole.SUPER_ADMIN).map(String),
    isActive: true,
  };
}

export function verifyPlatformAdminCredentials(email: string, password: string): boolean {
  if (email.trim().toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
    return false;
  }
  const expectedBuffer = Buffer.from(env.ADMIN_PASSWORD);
  const actualBuffer = Buffer.from(password);
  if (expectedBuffer.length !== actualBuffer.length) {
    // Constant-time dummy comparison to prevent early-exit timing leaks
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function isPlatformAdminId(id: string): boolean {
  return id === PLATFORM_ADMIN_ID;
}

export function getAllAdminPermissions(): string[] {
  return Object.values(AdminPermission).map(String);
}
