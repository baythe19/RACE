import { Types } from 'mongoose';
import { TransactionModel } from '../../../models/src/transaction';
import { PlatformSettingsModel } from '../../../models/src/platformSettings';
import { logger } from '../../../utils/src/logger';
import {
  DEFAULT_PLATFORM_COMMISSION_RATE,
  platformCommissionShare,
} from './platformCommission';

export interface EscrowSettlementResult {
  settled: boolean;
  vendorShare: number;
  commission: number;
  grossFare: number;
  payoutTransactionId?: string;
  commissionTransactionId?: string;
  message?: string;
}

/**
 * Disburses automated escrow settlements (85% vendor payout / 15% platform commission)
 * upon verified trip completion.
 *
 * Guaranteed idempotent: looks up existing VENDOR_PAYOUT transaction by bookingId
 * so repeated status transitions or retried events never double-credit the partner.
 */
export async function processBookingCompletionEscrowSettlement(params: {
  bookingId: string;
  bookingNumber: string;
  finalFare: number;
  vendorId?: string | Types.ObjectId;
  driverId?: string | Types.ObjectId;
  customerId?: string | Types.ObjectId;
}): Promise<EscrowSettlementResult> {
  const { bookingId, bookingNumber, finalFare, vendorId, driverId, customerId } = params;

  if (finalFare <= 0) {
    return {
      settled: false,
      vendorShare: 0,
      commission: 0,
      grossFare: 0,
      message: 'Fare is zero; no settlement needed',
    };
  }

  // Idempotency check: don't disburse twice for the same booking
  const existingPayout = await TransactionModel.findOne({
    bookingId: new Types.ObjectId(bookingId),
    type: 'VENDOR_PAYOUT',
  });

  if (existingPayout) {
    return {
      settled: false,
      vendorShare: existingPayout.amount,
      commission: 0,
      grossFare: finalFare,
      payoutTransactionId: existingPayout._id.toString(),
      message: 'Settlement already disbursed for this booking',
    };
  }

  // Fetch commission rate from platform settings (fallback = shared constant, D-13)
  const settings = await PlatformSettingsModel.findOne().lean();
  const commissionRate = settings?.commissionRate ?? DEFAULT_PLATFORM_COMMISSION_RATE;

  const shares = platformCommissionShare(finalFare, commissionRate);
  const commission = shares.commission;
  const vendorShare = shares.partnerShare;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();

  // Create VENDOR_PAYOUT transaction
  const payoutTx = await TransactionModel.create({
    transactionCode: `PAYOUT-${dateStr}-${entropy}`,
    type: 'VENDOR_PAYOUT',
    status: 'COMPLETED',
    amount: vendorShare,
    currency: 'INR',
    customerId: customerId ? new Types.ObjectId(customerId) : undefined,
    vendorId: vendorId ? new Types.ObjectId(vendorId) : undefined,
    driverId: driverId ? new Types.ObjectId(driverId) : undefined,
    bookingId: new Types.ObjectId(bookingId),
    description: `Automated partner settlement (${100 - commissionRate}%) for booking #${bookingNumber}`,
    completedAt: now,
    metadata: {
      bookingNumber,
      grossFare: finalFare,
      commissionRate,
      commissionAmount: commission,
      payoutPercentage: 100 - commissionRate,
    },
  });

  // Create COMMISSION transaction
  const commissionTx = await TransactionModel.create({
    transactionCode: `COMM-${dateStr}-${entropy}`,
    type: 'COMMISSION',
    status: 'COMPLETED',
    amount: commission,
    currency: 'INR',
    vendorId: vendorId ? new Types.ObjectId(vendorId) : undefined,
    bookingId: new Types.ObjectId(bookingId),
    description: `Platform commission (${commissionRate}%) for booking #${bookingNumber}`,
    completedAt: now,
    metadata: {
      bookingNumber,
      grossFare: finalFare,
      commissionRate,
      payoutTransactionId: payoutTx._id.toString(),
    },
  });

  logger.info('Automated escrow settlement disbursed', {
    bookingId,
    bookingNumber,
    finalFare,
    vendorShare,
    commission,
    payoutId: payoutTx._id.toString(),
  });

  return {
    settled: true,
    vendorShare,
    commission,
    grossFare: finalFare,
    payoutTransactionId: payoutTx._id.toString(),
    commissionTransactionId: commissionTx._id.toString(),
  };
}
