/** App user roles (unified User collection). */
export const USER_ROLES = ['customer', 'vendor', 'driver'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserCapabilitySource {
  role: string;
  capabilities?: readonly string[];
}

/** Old rows have only role; treat that role as their existing capability. */
export function getUserCapabilities(user: UserCapabilitySource): UserRole[] {
  const values = new Set<string>([user.role, ...(user.capabilities ?? [])]);
  return USER_ROLES.filter((role) => values.has(role));
}

export function hasUserCapability(user: UserCapabilitySource, role: string): boolean {
  return USER_ROLES.includes(role as UserRole) && getUserCapabilities(user).includes(role as UserRole);
}

/** Customer and Driver are capabilities of one person; Vendor remains a separate account mode. */
export function canAddUserCapability(user: UserCapabilitySource, requestedRole: string): boolean {
  const roles = getUserCapabilities(user);
  return (
    !roles.includes('vendor') &&
    (requestedRole === 'customer' || requestedRole === 'driver') &&
    roles.some((role) => role === 'customer' || role === 'driver')
  );
}

/** Admin panel roles (Admin collection + platform admin). */
export const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'OPERATIONS_ADMIN',
  'FINANCE_ADMIN',
  'VERIFICATION_ADMIN',
  'SUPPORT_ADMIN',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
