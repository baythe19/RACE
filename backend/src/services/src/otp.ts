/**
 * OTP Service — Powered exclusively by HanuSMS (https://api.hanuotp.in).
 * All non-Hanu SMS providers (MessageCentral, Twilio) have been completely removed.
 *
 * Flow:
 * 1. sendOtp   → Generates CSPRNG OTP (generateOtp) → Dispatches via hanuSendOtp() → Stores peppered SHA-256 hash in OtpLog
 * 2. verifyOtp → Hashes user input with OTP_PEPPER → Compares against peppered SHA-256 hash
 *
 * Dev/mock fallback:
 * When HANU_API_KEY is not configured in development, prints OTP to console via logDevOtp()
 * and accepts universal test code if MOCK_DATA_MODE is enabled.
 */

import { env } from '../../config/env';
import { AppError, TooManyRequestsError } from '../../utils/src/errors';
import { generateOtp } from '../../utils/src/otp';
import { createHash } from 'crypto';
import { logDevOtp } from '../../utils/src/sms';
import { hanuSendOtp, isHanuConfigured } from '../../utils/src/hanuSms';
import { authRepository } from './authRepository';

/** sha256(otp + pepper) — raw OTP digits are never stored for the hanu route. */
function hashOtp(otp: string): string {
  const pepper = env.OTP_PEPPER ?? 'race-otp::hanu-sms-production-pepper';
  return createHash('sha256').update(`${otp}:${pepper}`).digest('hex');
}

export class OtpService {
  private getExpiryDate(): Date {
    return new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);
  }

  /** Which SMS route handles this role? hanu → local-dev. */
  private pickProvider(_role?: string): 'hanu' | 'local' {
    if (process.env.FORCE_MOCK_OTP !== 'true' && isHanuConfigured()) {
      return 'hanu';
    }
    return 'local';
  }

  /**
   * TEST-ACCOUNT OTP WHITELIST (user request 2026-10-27):
   * Fake 900xxx test numbers can't receive real SMS, so these predefined
   * testing accounts always verify against the universal test code instead
   * of the HanuSMS route. Real customers/vendors keep getting real SMS OTP.
   * Active only when TEST_OTP_WHITELIST env is set (comma-separated 10-digit
   * numbers); production guard ignores it because whitelisted numbers are
   * seeded QA accounts, never real users.
   */
  private isTestWhitelistedNumber(mobileNumber: string): boolean {
    if (process.env.FORCE_MOCK_OTP === 'true') {
      return true;
    }
    const tenDigit = mobileNumber.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    // Local/APK QA: 900000xxxx fake numbers never receive SMS.
    if (env.NODE_ENV !== 'production' && /^9000000\d{3}$/.test(tenDigit)) {
      return true;
    }
    const whitelist = (process.env.TEST_OTP_WHITELIST ?? '')
      .split(',')
      .map((n) => n.replace(/\D/g, '').slice(-10))
      .filter(Boolean);
    if (!whitelist.length) {
      return false;
    }
    return whitelist.includes(tenDigit);
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

    // P-TEST: whitelisted fake numbers skip real SMS entirely — deterministic
    // universal code so APK QA can log in without a SIM.
    if (this.isTestWhitelistedNumber(mobileNumber) && env.NODE_ENV !== 'production') {
      const testOtp = env.MOCK_UNIVERSAL_OTP;
      await authRepository.createOtpLog({
        mobileNumber,
        mobileOtp: testOtp,
        mobileOtpExpiry: this.getExpiryDate(),
        mobileVerified: false,
        emailVerified: false,
        mobileAttempts: 0,
        emailAttempts: 0,
        provider: 'local',
      });
      return {
        message: 'OTP sent to your mobile number',
        expiresIn: env.OTP_EXPIRY_SECONDS,
        devOtp: testOtp,
      };
    }

    const provider = this.pickProvider(role);

    if (provider === 'hanu') {
      // ─── HanuOTP route (we generate the code; Hanu delivers it) ───────────
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
      provider: 'local',
    });

    logDevOtp(mobileNumber, mobileOtp);

    return {
      message: 'OTP sent to your mobile number',
      expiresIn: env.OTP_EXPIRY_SECONDS,
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
        hashOtp(otp),
        env.OTP_EXPIRY_SECONDS * 1000,
      );
      if (alreadyUsed) {
        return;
      }
      // QA numbers: tap "fill & verify" again after a successful verify (no fresh send).
      if (
        env.NODE_ENV !== 'production' &&
        this.isTestWhitelistedNumber(mobileNumber) &&
        otp === env.MOCK_UNIVERSAL_OTP
      ) {
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

    // ─── HanuOTP route: OTP digits verified against peppered hash ──────────
    if (log.provider === 'hanu') {
      const qaUniversalOk =
        env.NODE_ENV !== 'production' &&
        this.isTestWhitelistedNumber(mobileNumber) &&
        otp === env.MOCK_UNIVERSAL_OTP;

      if (!qaUniversalOk && (!log.otpHash || hashOtp(otp) !== log.otpHash)) {
        log.mobileAttempts += 1;
        await log.save();
        throw new AppError('Incorrect code. Check the SMS and try again.', 400);
      }

      log.mobileVerified = true;
      if (!log.mobileOtp) {
        log.mobileOtp = otp;
      }
      await log.save();
      return;
    }

    // ─── Dev / mock verification fallback ─────────────────────────────────
    const isMockOtpMatch = Boolean(
      (env.MOCK_DATA_MODE || env.NODE_ENV !== 'production') &&
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
