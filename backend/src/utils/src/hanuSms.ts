/**
 * SMS OTP delivery via HanuOTP (api.hanuotp.in) — non-DLT route.
 *
 * Unlike MessageCentral, HanuOTP does NOT generate or verify the code.
 * We generate the OTP ourselves (utils/src/otp.ts), hand it to Hanu for
 * delivery, and verify it against our own OtpLog (digit/ The hash comparison
 * lives in services/src/otp.ts — this module is delivery-only).
 *
 * API (GET):
 *   https://api.hanuotp.in/sms-otp.php?number=<10digit>&OTP=<otp>&apikey=<key>&templatesid=<id|default>
 *
 * Balance errors come back as non-success payloads; any failure here is
 * surfaced as the shared OTP_SEND_FAILED_USER_MESSAGE (502) by the caller.
 */

import { logger } from './logger';
import { AppError } from './errors';

const OTP_SEND_FAILED_USER_MESSAGE =
  'We could not send a code right now. Please try again in a moment.';

const OTP_SERVICE_UNAVAILABLE_MESSAGE =
  'Sign-in is temporarily unavailable. Please try again shortly.';

function getHanuConfig() {
  const apiKey = process.env.HANU_API_KEY;
  const baseUrl = process.env.HANU_BASE_URL ?? 'https://api.hanuotp.in';
  const templateId = process.env.HANU_TEMPLATE_ID ?? 'default';
  return { apiKey, baseUrl, templateId };
}

/** Extract the 10-digit local part (Hanu expects the bare Indian mobile number). */
function extractTenDigit(mobile: string): string {
  const digits = mobile.replace(/\D/g, '').replace(/^91/, '');
  return digits.slice(-10);
}

export interface HanuSendResult {
  accepted: boolean;
  raw: string;
}

/**
 * Deliver a self-generated OTP via HanuOTP.
 * Never logs the OTP itself — the raw provider response is logged instead.
 */
export async function hanuSendOtp(to: string, otp: string): Promise<HanuSendResult> {
  const { apiKey, baseUrl, templateId } = getHanuConfig();
  if (!apiKey) {
    throw new AppError(OTP_SERVICE_UNAVAILABLE_MESSAGE, 503);
  }

  const mobile = extractTenDigit(to);
  const url = new URL(`${baseUrl}/sms-otp.php`);
  url.searchParams.set('number', mobile);
  url.searchParams.set('OTP', otp);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('templatesid', templateId);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    logger.error('HanuOTP send-OTP network failure', {
      mobile,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(OTP_SEND_FAILED_USER_MESSAGE, 502);
  }

  const raw = await res.text();
  logger.info('HanuOTP send response', {
    mobile,
    httpStatus: res.status,
    body: raw.slice(0, 300),
  });

  if (!res.ok) {
    throw new AppError(OTP_SEND_FAILED_USER_MESSAGE, 502);
  }

  return { accepted: true, raw };
}

export function isHanuConfigured(): boolean {
  return Boolean(getHanuConfig().apiKey);
}

/** Roles (comma-separated env) that route OTPs through HanuOTP. */
export function hanuRoles(): Set<string> {
  return new Set(
    (process.env.HANU_OTP_ROLES ?? 'customer,vendor,driver,admin')
      .split(',')
      .map(role => role.trim().toLowerCase())
      .filter(Boolean),
  );
}
