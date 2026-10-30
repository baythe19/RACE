export type CancellationResult = {
  canCancel: boolean;
  refundAmount: number;
  refundPercent: number;
  reason: string;
  cancellationFee: number;
};

/**
 * Customer cancellation policy (MVP: full advance refund when allowed; no fee tiers yet).
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
      reason: 'This booking can no longer be cancelled.',
    };
  }

  if (status === 'DRIVER_EN_ROUTE' || status === 'DRIVER_ARRIVED') {
    return {
      canCancel: false,
      refundAmount: 0,
      refundPercent: 0,
      cancellationFee: 0,
      reason: 'Your partner is already on the way. Contact support if you need help.',
    };
  }

  if (!advancePaid) {
    return {
      canCancel: true,
      refundAmount: 0,
      refundPercent: 0,
      cancellationFee: 0,
      reason: 'No advance was paid — you can cancel at no charge.',
    };
  }

  return {
    canCancel: true,
    refundAmount: advanceAmount,
    refundPercent: 100,
    cancellationFee: 0,
    reason: 'Your advance payment is eligible for a full refund under the current policy.',
  };
}
