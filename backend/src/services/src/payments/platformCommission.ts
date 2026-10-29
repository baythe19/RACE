/**
 * Single source of truth for the platform's partner revenue share (D-13,
 * audit 2026-10-28). Previously the default 15% commission appeared as a bare
 * number in escrowSettlement.ts while driver-fare estimates used the static
 * DRIVER_PACKAGES payout table — two drifted "85/15 vs 83/17" realities.
 *
 * Rules:
 *  - Escrow settlement reads `PlatformSettings.commissionRate` and falls back
 *    to DEFAULT_PLATFORM_COMMISSION_RATE when settings are missing.
 *  - Fare **estimates** in booking.ts still derive driver payout from
 *    DRIVER_PACKAGES (that is a partner-pay table with extra-hour/extra-km
 *    rates), but any new code that needs the platform cut must import this
 *    constant instead of re-inventing another magic number.
 */
export const DEFAULT_PLATFORM_COMMISSION_RATE = 15;

export function platformCommissionShare(amount: number, rate = DEFAULT_PLATFORM_COMMISSION_RATE): {
  commission: number;
  partnerShare: number;
} {
  const commission = Math.round(amount * (rate / 100));
  return { commission, partnerShare: amount - commission };
}
