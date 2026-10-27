import { env } from '../config/env';
import { logger } from '../utils/src/logger';

/**
 * VOC P0.2 / P0.6 production boot guard (audit 2026-10-16):
 * In production the process must refuse to start with unsafe configuration
 * instead of silently running with OTP bypasses, mock data, or a default
 * admin password. Fails closed — lists every offender, never prints secrets.
 *
 * Software-invariant checklist (all failures are fatal in NODE_ENV=production):
 *  - FORCE_MOCK_OTP must not be "true" (would disable real SMS OTP)
 *  - MOCK_DATA_MODE must be false (no fabricated/universal OTP live traffic)
 *  - ADMIN_PASSWORD default ('Admin@123') must have been overridden
 *  - MC or Hanu OTP credentials must exist (someone can actually receive an OTP)
 *  - OTP_PEPPER (≥32 chars) required when Hanu OTP is configured
 */
export function assertProductionConfig(): void {
  if (env.NODE_ENV !== 'production') {
    return; // dev/staging keeps its conveniences
  }

  const problems: string[] = [];

  if (process.env.FORCE_MOCK_OTP === 'true') {
    problems.push('FORCE_MOCK_OTP=true — real SMS OTP would be disabled');
  }
  if (env.MOCK_DATA_MODE) {
    problems.push('MOCK_DATA_MODE=true — mock/universal OTP behaviour would be live');
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'Admin@123') {
    problems.push("ADMIN_PASSWORD is unset or the default ('Admin@123')");
  }
  if (!process.env.HANU_API_KEY) {
    problems.push('HANU_API_KEY is unset — HanuSMS credentials are required for production SMS delivery');
  }
  if (process.env.HANU_API_KEY) {
    const pepper = process.env.OTP_PEPPER?.trim() ?? '';
    if (pepper.length < 32) {
      problems.push('OTP_PEPPER must be set to at least 32 characters when HANU_API_KEY is configured');
    }
  }

  if (problems.length) {
    for (const problem of problems) {
      logger.error(`[BOOT-GUARD] ${problem}`);
    }
    throw new Error(
      `Refusing to start in production with unsafe configuration: ${problems.length} issue(s) — see [BOOT-GUARD] logs`,
    );
  }

  logger.info('[BOOT-GUARD] production configuration checks passed');
}
