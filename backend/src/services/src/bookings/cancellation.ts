export type CancellationResult = {
  canCancel: boolean;
  refundAmount: number;
  refundPercent: number;
  reason: string;
  cancellationFee: number;
};

/**
 * MVP demo cancellation — keep rules simple until product signs off on tiered fees.
 * Stub payments only; refund amounts are bookkeeping, not real bank transfers.
 */
export function getCancellationPolicy(
  status: string,
  advancePaid: boolean,
  advanceAmount: number,
  _scheduledAt?: Date,
): CancellationResult {
  if (['IN_PROGRESS', 'COMPLETED', 'RATED', 'CANCELLED'].includes(status)) {
    return {
      canCancel: false,
      refundAmount: 0,
      refundPercent: 0,
      cancellationFee: 0,
      reason: 'Cannot cancel at this stage',
    };
  }

  if (status === 'DRIVER_EN_ROUTE' || status === 'DRIVER_ARRIVED') {
    return {
      canCancel: false,
      refundAmount: 0,
      refundPercent: 0,
      cancellationFee: 0,
      reason: 'Partner is already on the way. Use Help & support if you need assistance.',
    };
  }

  if (!advancePaid) {
    return {
      canCancel: true,
      refundAmount: 0,
      refundPercent: 0,
      cancellationFee: 0,
      reason: 'Free cancellation — advance not paid yet',
    };
  }

  return {
    canCancel: true,
    refundAmount: advanceAmount,
    refundPercent: 100,
    cancellationFee: 0,
    reason:
      'Demo: full advance marked refunded in the app (stub payment — not a real bank payout)',
  };
}
