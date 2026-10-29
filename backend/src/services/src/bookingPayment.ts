import { v4 as uuidv4 } from 'uuid';

import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/src/errors';
import { env } from '../../config/env';
import { logger } from '../../utils/src/logger';
import { assertValidStatusTransition } from './bookings/booking';
import type { UnifiedBookingStatus } from './bookingStatusConstants';
import { driverBookingRepository } from './driverBookingRepository';
import { towingBookingRepository } from './towingBookingRepository';
import { driverBookingService } from './bookings/driverBooking';
import { towingBookingService } from './bookings/towingBooking';
import {
  PaymentTransactionModel,
  type BookingPaymentType,
  type IPaymentTransaction,
  type PaymentTransactionType,
} from '../../models/src/paymentTransaction';
import type {
  BookingPaymentSessionDto,
  InitiateBookingPaymentDto,
  VerifyBookingPaymentDto,
} from './bookingPaymentValidator';
import {
  notifyAdminAdvancePaid,
  notifyCustomerAdvancePaid,
} from './bookingNotifications';

interface BookingPaymentSnapshot {
  id: string;
  customerId: string;
  status: string;
  advancePaid: boolean;
  advancePaymentId?: string;
  remainingPaid: boolean;
  finalPaymentId?: string;
  paymentStatus: string;
  advanceAmount: number;
  remainingAmount: number;
}

/**
 * This service currently simulates gateway sessions. Never let that simulation
 * mark real production bookings as paid; replace this guard when a gateway is wired.
 */
function assertStubPaymentsEnabled(): void {
  if (env.NODE_ENV === 'production' && process.env.ALLOW_STUB_PAYMENTS !== 'true') {
    throw new AppError(
      'Online booking payments are not configured. Set ALLOW_STUB_PAYMENTS=true for sandbox testing.',
      503,
    );
  }
}

/**
 * STUB: Replace this with a real Razorpay/Stripe (or other gateway) SDK call.
 * Keep all gateway-specific logic isolated here for future swap-out.
 */
async function createGatewayPaymentSession(
  amount: number,
  paymentType: PaymentTransactionType,
): Promise<string> {
  return `stub_${paymentType}_${amount}_${uuidv4()}`;
}

function mapTransaction(transaction: IPaymentTransaction): BookingPaymentSessionDto {
  return {
    transactionId: transaction.id,
    bookingId: transaction.bookingId.toString(),
    bookingType: transaction.bookingType,
    paymentType: transaction.paymentType,
    amount: transaction.amount,
    status: transaction.status,
    gatewayReferenceId: transaction.gatewayReferenceId ?? '',
    message:
      transaction.status === 'initiated'
        ? 'Payment session created (stub gateway — verify to complete)'
        : `Payment ${transaction.status}`,
  };
}

async function loadBookingSnapshot(
  bookingId: string,
  bookingType: BookingPaymentType,
): Promise<BookingPaymentSnapshot | null> {
  if (bookingType === 'towing') {
    const booking = await towingBookingRepository.findById(bookingId);
    if (!booking) return null;
    return {
      id: booking.id,
      customerId: booking.customerId.toString(),
      status: booking.status,
      advancePaid: booking.advancePaid,
      advancePaymentId: booking.advancePaymentId,
      remainingPaid: booking.remainingPaid,
      finalPaymentId: booking.finalPaymentId,
      paymentStatus: booking.paymentStatus,
      advanceAmount: booking.advanceAmount,
      remainingAmount: booking.remainingAmount,
    };
  }

  const booking = await driverBookingRepository.findById(bookingId);
  if (!booking) return null;
  return {
    id: booking.id,
    customerId: booking.customerId.toString(),
    status: booking.status,
    advancePaid: booking.advancePaid,
    advancePaymentId: booking.advancePaymentId,
    remainingPaid: booking.remainingPaid,
    finalPaymentId: booking.finalPaymentId,
    paymentStatus: booking.paymentStatus,
    advanceAmount: booking.advanceAmount,
    remainingAmount: booking.remainingAmount,
  };
}


async function setPaymentTransactionStatus(
  transactionId: string,
  customerId: string,
  paymentType: PaymentTransactionType,
  status: 'success' | 'failed',
) {
  const updated = await PaymentTransactionModel.findOneAndUpdate(
    {
      _id: transactionId,
      customerId,
      paymentType,
      status: 'initiated',
    },
    { $set: { status } },
    { new: true, runValidators: true },
  ).exec();
  if (updated) return updated;

  const existing = await PaymentTransactionModel.findOne({
    _id: transactionId,
    customerId,
    paymentType,
  }).exec();
  if (!existing) throw new NotFoundError('Payment transaction not found');
  if (existing.status === status) return existing;
  throw new ConflictError('Payment transaction was already processed');
}

async function markUnappliedStubPaymentFailed(transactionId: string): Promise<void> {
  // The stub cannot capture funds. If another payment session won the booking
  // compare-and-set, do not leave this simulated success in financial totals.
  await PaymentTransactionModel.findOneAndUpdate(
    { _id: transactionId, status: 'success' },
    { $set: { status: 'failed' } },
    { new: false },
  ).exec();
}

export class BookingPaymentService {
  async initiateAdvance(
    customerId: string,
    dto: InitiateBookingPaymentDto,
  ): Promise<BookingPaymentSessionDto> {
    assertStubPaymentsEnabled();
    const booking = await loadBookingSnapshot(dto.bookingId, dto.bookingType);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId !== customerId) {
      throw new ForbiddenError('You do not have access to this booking');
    }

    if (booking.advancePaid) {
      throw new BadRequestError('Advance payment already completed');
    }

    const existingTransaction = await PaymentTransactionModel.findOne({
      bookingId: dto.bookingId,
      bookingType: dto.bookingType,
      paymentType: 'advance',
      status: 'initiated',
    })
      .sort({ createdAt: -1 })
      .exec();
    if (existingTransaction) return mapTransaction(existingTransaction);

    const gatewayReferenceId = await createGatewayPaymentSession(
      booking.advanceAmount,
      'advance',
    );

    const transaction = await PaymentTransactionModel.create({
      bookingId: dto.bookingId,
      bookingType: dto.bookingType,
      customerId,
      paymentType: 'advance',
      amount: booking.advanceAmount,
      status: 'initiated',
      gatewayReferenceId,
    });

    return mapTransaction(transaction);
  }

  async verifyAdvance(
    customerId: string,
    dto: VerifyBookingPaymentDto,
  ): Promise<BookingPaymentSessionDto> {
    assertStubPaymentsEnabled();
    const transaction = await PaymentTransactionModel.findById(dto.transactionId);
    if (!transaction || transaction.customerId.toString() !== customerId) {
      throw new NotFoundError('Payment transaction not found');
    }
    if (transaction.paymentType !== 'advance') {
      throw new BadRequestError('Transaction is not an advance payment');
    }

    const booking = await loadBookingSnapshot(
      transaction.bookingId.toString(),
      transaction.bookingType,
    );
    if (!booking) throw new NotFoundError('Booking not found');

    if (
      dto.status === 'success' &&
      transaction.status === 'success' &&
      booking.advancePaid &&
      booking.advancePaymentId === transaction.id
    ) {
      return mapTransaction(transaction);
    }
    if (transaction.status !== 'initiated' && transaction.status !== 'success') {
      throw new ConflictError('Payment transaction was already processed');
    }
    if (dto.status === 'failed') {
      return mapTransaction(
        await setPaymentTransactionStatus(transaction.id, customerId, 'advance', 'failed'),
      );
    }
    if (booking.advancePaid) {
      throw new ConflictError('Another payment session already paid this booking advance');
    }

    assertValidStatusTransition(booking.status as UnifiedBookingStatus, 'CONFIRMED');
    const successfulTransaction = await setPaymentTransactionStatus(
      transaction.id,
      customerId,
      'advance',
      'success',
    );

    try {
      if (transaction.bookingType === 'towing') {
        await towingBookingService.applyPaymentUpdate(transaction.bookingId.toString(), {
          advancePaid: true,
          advancePaymentId: transaction.id,
          paymentStatus: 'ADVANCE_PAID',
          status: 'CONFIRMED',
        });
      } else {
        await driverBookingService.applyPaymentUpdate(transaction.bookingId.toString(), {
          advancePaid: true,
          advancePaymentId: transaction.id,
          paymentStatus: 'ADVANCE_PAID',
          status: 'CONFIRMED',
        });
      }
    } catch (error) {
      const currentBooking = await loadBookingSnapshot(
        transaction.bookingId.toString(),
        transaction.bookingType,
      );
      if (
        currentBooking?.advancePaid &&
        currentBooking.advancePaymentId === transaction.id
      ) {
        return mapTransaction(successfulTransaction);
      }
      try {
        await markUnappliedStubPaymentFailed(transaction.id);
      } catch (rollbackError) {
        logger.error('Could not roll back an unapplied stub advance payment', {
          transactionId: transaction.id,
          rollbackError,
        });
      }
      throw error;
    }

    logger.info(
      `${transaction.bookingType === 'towing' ? 'Towing' : 'Driver'} booking ${transaction.bookingId} confirmed; open for nearby partner accept`,
    );

    const bookingNumber =
      transaction.bookingType === 'towing'
        ? (await towingBookingRepository.findById(transaction.bookingId.toString()))?.bookingNumber
        : (await driverBookingRepository.findById(transaction.bookingId.toString()))?.bookingNumber;

    if (bookingNumber) {
      void notifyCustomerAdvancePaid({
        customerId,
        bookingNumber,
        bookingType: transaction.bookingType,
        bookingId: transaction.bookingId.toString(),
        amount: transaction.amount,
      }).catch(() => undefined);
      void notifyAdminAdvancePaid({
        bookingNumber,
        bookingType: transaction.bookingType,
        bookingId: transaction.bookingId.toString(),
        amount: transaction.amount,
      }).catch(() => undefined);
    }

    return mapTransaction(successfulTransaction);
  }

  async initiateFinal(
    customerId: string,
    dto: InitiateBookingPaymentDto,
  ): Promise<BookingPaymentSessionDto> {
    assertStubPaymentsEnabled();
    const booking = await loadBookingSnapshot(dto.bookingId, dto.bookingType);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId !== customerId) {
      throw new ForbiddenError('You do not have access to this booking');
    }

    if (!booking.advancePaid) {
      throw new BadRequestError('Advance payment must be completed first');
    }

    if (booking.remainingPaid) {
      throw new BadRequestError('Final payment already completed');
    }

    const existingTransaction = await PaymentTransactionModel.findOne({
      bookingId: dto.bookingId,
      bookingType: dto.bookingType,
      paymentType: 'final',
      status: 'initiated',
    })
      .sort({ createdAt: -1 })
      .exec();
    if (existingTransaction) return mapTransaction(existingTransaction);

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestError('Final payment is only allowed after booking is completed');
    }

    const gatewayReferenceId = await createGatewayPaymentSession(
      booking.remainingAmount,
      'final',
    );

    const transaction = await PaymentTransactionModel.create({
      bookingId: dto.bookingId,
      bookingType: dto.bookingType,
      customerId,
      paymentType: 'final',
      amount: booking.remainingAmount,
      status: 'initiated',
      gatewayReferenceId,
    });

    return mapTransaction(transaction);
  }

  async verifyFinal(
    customerId: string,
    dto: VerifyBookingPaymentDto,
  ): Promise<BookingPaymentSessionDto> {
    assertStubPaymentsEnabled();
    const transaction = await PaymentTransactionModel.findById(dto.transactionId);
    if (!transaction || transaction.customerId.toString() !== customerId) {
      throw new NotFoundError('Payment transaction not found');
    }
    if (transaction.paymentType !== 'final') {
      throw new BadRequestError('Transaction is not a final payment');
    }

    const booking = await loadBookingSnapshot(
      transaction.bookingId.toString(),
      transaction.bookingType,
    );
    if (!booking) throw new NotFoundError('Booking not found');

    if (
      dto.status === 'success' &&
      transaction.status === 'success' &&
      booking.remainingPaid &&
      booking.finalPaymentId === transaction.id
    ) {
      return mapTransaction(transaction);
    }
    if (transaction.status !== 'initiated' && transaction.status !== 'success') {
      throw new ConflictError('Payment transaction was already processed');
    }
    if (dto.status === 'failed') {
      return mapTransaction(
        await setPaymentTransactionStatus(transaction.id, customerId, 'final', 'failed'),
      );
    }
    if (booking.remainingPaid) {
      throw new ConflictError('Another payment session already paid this booking balance');
    }
    if (booking.status !== 'COMPLETED') {
      throw new ConflictError('Booking is no longer eligible for final payment');
    }

    const successfulTransaction = await setPaymentTransactionStatus(
      transaction.id,
      customerId,
      'final',
      'success',
    );

    try {
      if (transaction.bookingType === 'towing') {
        await towingBookingService.applyPaymentUpdate(transaction.bookingId.toString(), {
          remainingPaid: true,
          finalPaymentId: transaction.id,
          paymentStatus: 'FULLY_PAID',
        });
      } else {
        await driverBookingService.applyPaymentUpdate(transaction.bookingId.toString(), {
          remainingPaid: true,
          finalPaymentId: transaction.id,
          paymentStatus: 'FULLY_PAID',
        });
      }
    } catch (error) {
      const currentBooking = await loadBookingSnapshot(
        transaction.bookingId.toString(),
        transaction.bookingType,
      );
      if (
        currentBooking?.remainingPaid &&
        currentBooking.finalPaymentId === transaction.id
      ) {
        return mapTransaction(successfulTransaction);
      }
      try {
        await markUnappliedStubPaymentFailed(transaction.id);
      } catch (rollbackError) {
        logger.error('Could not roll back an unapplied stub final payment', {
          transactionId: transaction.id,
          rollbackError,
        });
      }
      throw error;
    }

    return mapTransaction(successfulTransaction);
  }

}

export const bookingPaymentService = new BookingPaymentService();
