/**
 * OTP Service — MessageCentral VerifyNow integration.
 *
 * Two modes:
 *
 * A) PRODUCTION (MC configured):
 *    sendOtp   → calls mcSendOtp()  → stores mcVerificationId in OtpLog
 *    verifyOtp → calls mcValidateOtp(verificationId, code) → MC verifies OTP digit server-side
 *    No OTP digit is stored in our database.
 *
 * B) DEVELOPMENT (MC not configured OR MOCK_DATA_MODE=true + non-prod):
 *    sendOtp   → generates 6-digit OTP locally, prints to console
 *    verifyOtp → checks against stored digit or MOCK_UNIVERSAL_OTP (123456)
 */

import { env } from '../../config/env';
import { AppError, TooManyRequestsError } from '../../utils/src/errors';
import { generateOtp } from '../../utils/src/otp';
import { createHash } from 'crypto';
import {
  OTP_EXPIRED_USER_MESSAGE,
  isMcConfigured,
  logDevOtp,
  mcSendOtp,
  mcValidateOtp,
} from '../../utils/src/sms';
import { hanuSendOtp, isHanuConfigured, hanuRoles } from '../../utils/src/hanuSms';
import { authRepository } from './authRepository';

/** sha256(otp + pepper) — raw OTP digits are never stored for the hanu route. */
function hashOtp(otp: string): string {
  const pepper = env.OTP_PEPPER ?? `race-otp::${env.MC_AUTH_TOKEN ?? 'local-dev'}`;
  return createHash('sha256').update(`${otp}:${pepper}`).digest('hex');
}

export class OtpService {
  private getExpiryDate(): Date {
    return new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);
  }


  private get useMc(): boolean {
    if (process.env.FORCE_MOCK_OTP === 'true') {
      return false;
    }
    return isMcConfigured();
  }

  /** Which SMS route handles this role? hanu → messagecentral → local-dev. */
  private pickProvider(role?: string): 'hanu' | 'messagecentral' | 'local' {
    if (process.env.FORCE_MOCK_OTP !== 'true' && isHanuConfigured() && role && hanuRoles().has(role)) {
      return 'hanu';
    }
    if (this.useMc) {
      return 'messagecentral';
    }
    return 'local';
  }

  private async assertResendAllowed(mobileNumber: string): Promise<void> {
    if (env.NODE_ENV !== 'production') {
      return;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const resendCount = await authRepository.countRecentOtpSends(mobileNumber, oneHourAgo);

    if (resendCount >= env.OTP_MAX_RESEND_ATTEMPTS) {
      throw new TooManyRequestsError('Maximum OTP resend attempts exceeded');
    }
  }

  async sendOtp(
    mobileNumber: string,
    role?: string,
  ): Promise<{ message: string; expiresIn: number; devOtp?: string }> {
    await this.assertResendAllowed(mobileNumber);
    await authRepository.invalidatePendingOtps(mobileNumber);

    const provider = this.pickProvider(role);

    if (provider === 'hanu') {
      // ─── HanuOTP route (we generate the code; Hanu only delivers it) ─────
      const mobileOtp = generateOtp();
      await hanuSendOtp(mobileNumber, mobileOtp);

      await authRepository.createOtpLog({
        mobileNumber,
        otpHash: hashOtp(mobileOtp),
        mobileOtpExpiry: this.getExpiryDate(),
        mobileVerified: false,
        emailVerified: false,
        mobileAttempts: 0,
        emailAttempts: 0,
        provider: 'hanu',
      });

      return {
        message: 'OTP sent to your mobile number',
        expiresIn: env.OTP_EXPIRY_SECONDS,
        // No devOtp on the hanu route — production semantics.
      };
    }

    if (provider === 'messagecentral') {
      // ─── MessageCentral production path ────────────────────────────────
      const { verificationId } = await mcSendOtp(mobileNumber);

      const expiry = this.getExpiryDate();
      await authRepository.createOtpLog({
        mobileNumber,
        mobileOtpExpiry: expiry,
        mobileVerified: false,
        emailVerified: false,
        mobileAttempts: 0,
        emailAttempts: 0,
        mcVerificationId: verificationId,
        provider: 'messagecentral',
      });

      return {
        message: 'OTP sent to your mobile number',
        expiresIn: env.OTP_EXPIRY_SECONDS,
      };
    }

    // ─── Dev / mock fallback path ─────────────────────────────────────────
    const mobileOtp = generateOtp();
    const expiry = this.getExpiryDate();

    await authRepository.createOtpLog({
      mobileNumber,
      mobileOtp,
      mobileOtpExpiry: expiry,
      mobileVerified: false,
      emailVerified: false,
      mobileAttempts: 0,
      emailAttempts: 0,
    });

    logDevOtp(mobileNumber, mobileOtp);

    return {
      message: 'OTP sent to your mobile number',
      expiresIn: env.OTP_EXPIRY_SECONDS,
      // Surface OTP in response in dev so the mobile UI can show it as a toast
      devOtp: mobileOtp,
    };
  }

  async verifyOtp(mobileNumber: string, otp: string): Promise<void> {
    const log = await authRepository.findLatestValidOtpLog(mobileNumber);

    if (!log) {
      // Allow re-use within expiry window (idempotent verify)
      const alreadyUsed = await authRepository.findRecentlyVerifiedOtpLog(
        mobileNumber,
        otp,
        env.OTP_EXPIRY_SECONDS * 1000,
      );
      if (alreadyUsed) {
        return;
      }
      throw new AppError('OTP expired or already used. Tap Resend OTP for a new code.', 400);
    }

    if (!log.mobileOtpExpiry || log.mobileOtpExpiry <= new Date()) {
      throw new AppError('OTP expired. Tap Resend OTP for a new code.', 400);
    }

    if (env.NODE_ENV === 'production' && log.mobileAttempts >= env.OTP_MAX_VERIFY_ATTEMPTS) {
      throw new TooManyRequestsError('Maximum OTP verification attempts exceeded');
    }

    // ─── MessageCentral server-side verification ──────────────────────────
    // Legacy logs (created before provider field existed) carry mcVerificationId
    // without provider — treat any log with an mcVerificationId as MC-routed.
    if (log.mcVerificationId) {
      try {
        const correct = await mcValidateOtp(mobileNumber, log.mcVerificationId, otp);

        if (!correct) {
          log.mobileAttempts += 1;
          await log.save();
          throw new AppError('Incorrect code. Check the SMS and try again.', 400);
        }

        log.mobileVerified = true;
        await log.save();
        return;
      } catch (error) {
        if (
          error instanceof AppError &&
          error.message === OTP_EXPIRED_USER_MESSAGE
        ) {
          await authRepository.invalidatePendingOtps(mobileNumber);
        }
        throw error;
      }
    }

    // ─── HanuOTP route: OTP digits live only as a peppered hash ───────────
    if (log.provider === 'hanu') {
      if (!log.otpHash || hashOtp(otp) !== log.otpHash) {
        log.mobileAttempts += 1;
        await log.save();
        throw new AppError('Incorrect code. Check the SMS and try again.', 400);
      }

      log.mobileVerified = true;
      await log.save();
      return;
    }

    // ─── Dev / mock verification ──────────────────────────────────────────
    const isMockOtpMatch = Boolean(
      env.MOCK_DATA_MODE &&
      env.NODE_ENV !== 'production' &&
      otp === env.MOCK_UNIVERSAL_OTP,
    );

    if (!log.mobileOtp || (log.mobileOtp !== otp && !isMockOtpMatch)) {
      log.mobileAttempts += 1;
      await log.save();
      throw new AppError('Invalid OTP', 400);
    }

    log.mobileVerified = true;
    await log.save();
  }
}

export const otpService = new OtpService();
