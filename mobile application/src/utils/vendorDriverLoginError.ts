/**
 * Detection helper for the backend's vendor-driver login guard.
 *
 * Backend (auth.ts): a driver created by a vendor (driverProfile.loginId +
 * vendorUserId set) is blocked from mobile-OTP login with a 409:
 *   "This number belongs to a vendor driver. Sign in with the Login ID and
 *    password provided by your vendor."
 *
 * The partner app surfaces this as a CTA that jumps to the Login ID screen
 * instead of leaving the driver stuck on the OTP form.
 */
import { getApiErrorMessage } from '../services/auth/useAuthMutations';

const VENDOR_DRIVER_LOGIN_SIGNAL = 'vendor driver';

export const VENDOR_DRIVER_LOGIN_HINT =
  'This number belongs to a vendor driver. Sign in with the Login ID and password provided by your vendor.';

export function isVendorDriverLoginError(error: unknown): boolean {
  return getApiErrorMessage(error, '').toLowerCase().includes(VENDOR_DRIVER_LOGIN_SIGNAL);
}
