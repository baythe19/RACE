import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';

import { env } from '../../../config/env';
import { BadRequestError } from '../../../utils/src/errors';

export const MAX_TRIP_OTP_ATTEMPTS = 5;

function hashTripOtp(code: string): string {
  const pepper = env.OTP_PEPPER ?? env.JWT_ACCESS_SECRET;
  return createHash('sha256').update(`${code}:${pepper}`).digest('hex');
}

/** Persist a non-reversible verifier in the existing OTP field. */
export function hashTripOtpForStorage(code: string): string {
  return `sha256:v1:${hashTripOtp(code)}`;
}

/** Keep delivery possible without storing the raw code: AES-GCM ciphertext + auth tag. */
export function encryptTripOtpForStorage(code: string): string {
  const key = createHash('sha256').update(env.OTP_PEPPER ?? env.JWT_ACCESS_SECRET).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ciphertext.toString('hex')}`;
}

/** Decrypt only for authorized server-side OTP delivery/response paths. */
export function getTripOtpValue(
  stored: string | null | undefined,
  encrypted?: string | null,
): string | undefined {
  if (!stored) return undefined;
  if (/^\d{4}$/.test(stored)) return stored; // legacy plaintext migration path
  if (!encrypted?.startsWith('enc:v1:')) return undefined;

  const [, , ivHex, tagHex, ciphertextHex] = encrypted.split(':');
  try {
    const key = createHash('sha256').update(env.OTP_PEPPER ?? env.JWT_ACCESS_SECRET).digest();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return undefined;
  }
}

function matchesOtp(stored: string, input: string): boolean {
  // Legacy bookings created before migration keep the original 4-digit code.
  if (/^\d{4}$/.test(stored)) return stored === input;
  if (!stored.startsWith('sha256:v1:')) return false;
  const expected = Buffer.from(stored.slice('sha256:v1:'.length), 'hex');
  const actual = Buffer.from(hashTripOtp(input), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function generateTripStartOtp(): string {
  return String(randomInt(1000, 10000));
}

export function generateCompletionOtp(): string {
  return String(randomInt(1000, 10000));
}

export function assertTripStartOtp(
  booking: {
    tripStartOtp?: string | null;
    tripStartOtpEncrypted?: string | null;
    tripStartOtpVerified?: boolean | null;
    tripStartOtpAttempts?: number | null;
  },
  input: string | undefined,
): void {
  assertOtp(
    booking.tripStartOtp,
    booking.tripStartOtpEncrypted,
    booking.tripStartOtpVerified,
    booking.tripStartOtpAttempts,
    input,
    'Trip OTP is not ready yet. Wait for partner assignment.',
    'Trip OTP was already verified',
    'Too many failed OTP attempts. Please contact support or request assistance.',
    'Enter the 4-digit trip OTP from the customer',
    'Invalid trip OTP. Ask the customer to share their code.',
  );
}

function assertOtp(
  stored: string | null | undefined,
  encrypted: string | null | undefined,
  verified: boolean | null | undefined,
  attempts: number | null | undefined,
  input: string | undefined,
  missingMessage: string,
  verifiedMessage: string,
  attemptsMessage: string,
  formatMessage: string,
  mismatchMessage: string,
): void {
  if (!stored) throw new BadRequestError(missingMessage);
  if (verified) throw new BadRequestError(verifiedMessage);
  if ((attempts ?? 0) >= MAX_TRIP_OTP_ATTEMPTS) throw new BadRequestError(attemptsMessage);
  const code = (input ?? '').trim();
  if (!/^\d{4}$/.test(code)) throw new BadRequestError(formatMessage);
  if (!matchesOtp(stored, code) && getTripOtpValue(stored, encrypted) !== code) {
    throw new BadRequestError(mismatchMessage);
  }
}

export function customerTripOtp(
  booking: {
    tripStartOtp?: string | null;
    tripStartOtpEncrypted?: string | null;
    tripStartOtpVerified?: boolean | null;
    status?: string;
  },
): string | undefined {
  if (booking.tripStartOtpVerified || !booking.tripStartOtp) return undefined;
  const active = ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(booking.status ?? '');
  return active ? getTripOtpValue(booking.tripStartOtp, booking.tripStartOtpEncrypted) : undefined;
}

export function assertCompletionOtp(
  booking: {
    completionOtp?: string | null;
    completionOtpEncrypted?: string | null;
    completionOtpVerified?: boolean | null;
    completionOtpAttempts?: number | null;
  },
  input: string | undefined,
): void {
  assertOtp(
    booking.completionOtp,
    booking.completionOtpEncrypted,
    booking.completionOtpVerified,
    booking.completionOtpAttempts,
    input,
    'Completion OTP is not ready yet. Ask customer to confirm payment.',
    'Completion OTP was already verified',
    'Too many failed completion OTP attempts. Please contact support.',
    'Enter the 4-digit completion OTP from the customer',
    'Invalid completion OTP. Ask the customer to share their code.',
  );
}

export function customerCompletionOtp(
  booking: {
    completionOtp?: string | null;
    completionOtpEncrypted?: string | null;
    completionOtpVerified?: boolean | null;
    status?: string;
    arrivedAtDropoffAt?: Date | null;
    paymentConfirmedByCustomer?: boolean | null;
  },
): string | undefined {
  if (booking.completionOtpVerified || !booking.completionOtp) return undefined;
  if (['COMPLETED', 'RATED', 'CANCELLED'].includes(booking.status ?? '')) return undefined;
  if (!booking.arrivedAtDropoffAt || !booking.paymentConfirmedByCustomer) return undefined;
  return getTripOtpValue(booking.completionOtp, booking.completionOtpEncrypted);
}
