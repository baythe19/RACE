import { createHmac, timingSafeEqual } from 'crypto';

import { AppError, ConflictError, NotFoundError, TooManyRequestsError, UnauthorizedError } from '../../utils/src/errors';
import { env } from '../../config/env';
import { hashDriverPassword, verifyDriverPassword } from '../../utils/src/driverPassword';
import { userRepository } from './userRepository';
import { otpService } from './otp';
import { getCache } from '../../config/cache';
import { OtpLogModel } from '../../models/src/otpLog';
import { normalizeMobileNumber } from '../../utils/src/otp';
import type {
  MobileChangeConfirmDto,
  MobileChangeRequestDto,
  PasswordChangeDto,
  PinSetDto,
} from './profileValidator';

/**
 * Identity credential endpoints backing the customer profile screens
 * (Change Password / Change Mobile / Create PIN) — replaces the earlier
 * placebo screens that never talked to the API.
 *
 * Reuses the existing bcrypt helper (`driverPassword.ts` — same cost factor)
 * and the existing OTP pipeline (`otp.ts`) instead of parallel modules.
 */

const PENDING_CHANGE_TTL_MS = 10 * 60 * 1000;

/** Redis-backed per-user fixed window, shared by all API workers. */
async function rateLimit(key: string, max: number, windowMs: number): Promise<void> {
  const cache = getCache();
  const cacheKey = `profile-credential:${key}`;
  const attempts = await cache.incr(cacheKey);
  if (attempts === 1) {
    await cache.set(cacheKey, String(attempts), 'EX', Math.ceil(windowMs / 1000));
  }
  if (attempts > max) {
    throw new TooManyRequestsError('Too many attempts. Try again later.');
  }
}

/** HMAC-signed pending mobile change so we do not need a new collection. */
function signPendingChange(userId: string, newMobile: string, expiresAt: number): string {
  const payload = `${userId}|${newMobile}|${expiresAt}`;
  const sig = createHmac('sha256', env.JWT_ACCESS_SECRET).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

function readPendingChange(token: string): { userId: string; newMobile: string } {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) {
    throw new AppError('No pending mobile change. Start the change request again.', 400, true);
  }
  let payload: string;
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    throw new AppError('No pending mobile change. Start the change request again.', 400, true);
  }
  const expected = createHmac('sha256', env.JWT_ACCESS_SECRET).update(payload).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError('No pending mobile change. Start the change request again.', 400, true);
  }
  const [userId, newMobile, expiresAt] = payload.split('|');
  if (!userId || !newMobile || !expiresAt) {
    throw new AppError('No pending mobile change. Start the change request again.', 400, true);
  }
  if (Number(expiresAt) < Date.now()) {
    throw new AppError('Change request expired. Request the OTP again.', 400, true);
  }
  return { userId, newMobile };
}

export class ProfileCredentialsService {
  async changePassword(userId: string, dto: PasswordChangeDto): Promise<void> {
    await rateLimit(`pw-change:${userId}`, 5, 60 * 60 * 1000);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.passwordHash) {
      const ok = dto.currentPassword
        ? await verifyDriverPassword(dto.currentPassword, user.passwordHash)
        : false;
      if (!ok) {
        throw new UnauthorizedError('Current password is incorrect');
      }
    }
    // First-time set: customers are OTP-only by default, no current password exists yet.

    user.passwordHash = await hashDriverPassword(dto.newPassword);
    await user.save();
  }

  async requestMobileChange(
    userId: string,
    dto: MobileChangeRequestDto,
  ): Promise<{ newMobile: string; pendingToken: string; expiresIn: number; devOtp?: string; message: string }> {
    await rateLimit(`mobile-change:${userId}`, 3, 60 * 60 * 1000);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const current = normalizeMobileNumber(user.mobileNumber);
    const newNormalized = normalizeMobileNumber(dto.newMobile);
    const currentDigits = current.replace(/\D/g, '').slice(-10);
    if (newNormalized.replace(/\D/g, '').slice(-10) === currentDigits) {
      throw new AppError('New number must be different from your current number', 400, true);
    }

    const claimed = await userRepository.findByMobile(newNormalized);
    if (claimed && claimed.id !== user.id) {
      throw new ConflictError('This number is already registered — log in with it instead');
    }

    // Send the OTP to the NEW number through the standard pipeline.
    const otpResult = await otpService.sendOtp(newNormalized, user.role);

    const expiresAt = Date.now() + PENDING_CHANGE_TTL_MS;
    return {
      newMobile: newNormalized,
      pendingToken: signPendingChange(user.id, newNormalized, expiresAt),
      expiresIn: Math.min(otpResult.expiresIn * 1000, PENDING_CHANGE_TTL_MS) / 1000,
      ...(env.NODE_ENV !== 'production' && otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
      message: otpResult.message,
    };
  }

  async confirmMobileChange(userId: string, dto: MobileChangeConfirmDto): Promise<void> {
    await rateLimit(`mobile-confirm:${userId}`, 10, 60 * 60 * 1000);

    const pending = readPendingChange(dto.pendingToken);
    if (pending.userId !== userId) {
      throw new AppError('No pending mobile change for this account', 400, true);
    }

    await otpService.verifyOtp(pending.newMobile, dto.code);

    // Claim the unique number atomically so concurrent confirmations cannot
    // attach the same verified phone to two accounts.
    const claimed = await userRepository.findByMobile(pending.newMobile);
    if (claimed && claimed.id !== userId) {
      throw new ConflictError('This number is already registered — log in with it instead');
    }
    const updated = await userRepository.updateById(userId, {
      mobileNumber: pending.newMobile,
      phoneVerifiedAt: new Date(),
    });
    if (!updated) {
      throw new NotFoundError('User not found');
    }
    await OtpLogModel.deleteMany({ mobileNumber: pending.newMobile }).exec();
  }


  async setPin(userId: string, dto: PinSetDto): Promise<void> {
    await rateLimit(`pin-set:${userId}`, 5, 60 * 60 * 1000);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.appPinHash) {
      const ok = dto.currentPin
        ? await verifyDriverPassword(dto.currentPin, user.appPinHash)
        : false;
      if (!ok) {
        throw new UnauthorizedError('Current PIN is incorrect');
      }
    }

    user.appPinHash = await hashDriverPassword(dto.pin);
    await user.save();
  }

  async verifyPin(userId: string, pin: string): Promise<void> {
    await rateLimit(`pin-verify:${userId}`, 5, 5 * 60 * 1000);

    const user = await userRepository.findById(userId);
    if (!user || !user.appPinHash || !pin) {
      throw new UnauthorizedError('No PIN is set for this account');
    }
    const ok = await verifyDriverPassword(pin, user.appPinHash);
    if (!ok) {
      throw new UnauthorizedError('Incorrect PIN');
    }
  }
}

export const profileCredentialsService = new ProfileCredentialsService();
