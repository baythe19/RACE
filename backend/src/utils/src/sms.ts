/**
 * SMS / OTP delivery service — Powered exclusively by HanuSMS (api.hanuotp.in).
 * All legacy SMS providers (MessageCentral, Twilio) have been permanently removed.
 */

import { logger } from './logger';

export { hanuSendOtp, isHanuConfigured, hanuRoles } from './hanuSms';

/** Shown to mobile/admin clients when an OTP session or SMS code is no longer valid. */
export const OTP_EXPIRED_USER_MESSAGE =
  'This code has expired. Tap Resend OTP for a new code.';

/**
 * Prints OTP to console for local dev when HanuSMS is not configured.
 */
export function logDevOtp(to: string, otp: string): void {
  const banner = `══════ DEV OTP (HanuSMS Dev Mode) ══════  ${to}  →  ${otp}  ══════════════════`;
  // eslint-disable-next-line no-console
  console.log(`\n${banner}\n`);
  logger.info('DEV OTP (use in app — HanuSMS credentials not set in local dev)', { to, otp });
}
