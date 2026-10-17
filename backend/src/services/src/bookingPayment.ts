import { v4 as uuidv4 } from 'uuid';

import { AppError, BadRequestError, ForbiddenError, NotFoundError } from '../../utils/src/errors';
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

interface BookingPaymentSnapshot {
  id: string;
  customerId: string;
  status: string;
  advancePaid: boolean;
  remainingPaid: boolean;
  paymentStatus: string;
  advanceAmount: number;
  remainingAmount: number;
}

/**
 * This service currently simulates gateway sessions. Never let that simulation
 * mark real production bookings as paid; replace this guard when a gateway is wired.
 */
function assertStubPaymentsEnabled(): void {
  if (env.NODE_ENV === 'production') {
    throw new AppError(
      'Online booking payments are not configured. No payment was processed.',
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
      remainingPaid: booking.remainingPaid,
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
    remainingPaid: booking.remainingPaid,
    paymentStatus: booking.paymentStatus,
    advanceAmount: booking.advanceAmount,
    remainingAmount: booking.remainingAmount,
  };
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

    transaction.status = dto.status;
    await transaction.save();

    if (dto.status !== 'success') {
      return mapTransaction(transaction);
    }

    const booking = await loadBookingSnapshot(
      transaction.bookingId.toString(),
      transaction.bookingType,
    );
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.advancePaid) {
      throw new BadRequestError('Advance payment already completed');
    }

    assertValidStatusTransition(booking.status as UnifiedBookingStatus, 'CONFIRMED');

    if (transaction.bookingType === 'towing') {
      await towingBookingService.applyPaymentUpdate(transaction.bookingId.toString(), {
        advancePaid: true,
        advancePaymentId: transaction.id,
        paymentStatus: 'ADVANCE_PAID',
        status: 'CONFIRMED',
      });

      // Leave as CONFIRMED open offer — nearby drivers/vendors race to accept (Uber-style).
      logger.info(
        `Towing booking ${transaction.bookingId} confirmed — open for nearby partner accept`,
      );
    } else {
      await driverBookingService.applyPaymentUpdate(transaction.bookingId.toString(), {
        advancePaid: true,
        advancePaymentId: transaction.id,
        paymentStatus: 'ADVANCE_PAID',
        status: 'CONFIRMED',
      });

      logger.info(
        `Driver booking ${transaction.bookingId} confirmed — open for nearby partner accept`,
      );
    }

    return mapTransaction(transaction);
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

    transaction.status = dto.status;
    await transaction.save();

    if (dto.status !== 'success') {
      return mapTransaction(transaction);
    }

    const booking = await loadBookingSnapshot(
      transaction.bookingId.toString(),
      transaction.bookingType,
    );
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.remainingPaid) {
      throw new BadRequestError('Final payment already completed');
    }

    if (transaction.bookingType === 'towing') {
      await towingBookingService.applyPaymentUpdate(transaction.bookingId.toString(), {
        remainingPaid: true,
        paymentStatus: 'FULLY_PAID',
      });
    } else {
      await driverBookingService.applyPaymentUpdate(transaction.bookingId.toString(), {
        remainingPaid: true,
        paymentStatus: 'FULLY_PAID',
      });
    }

    return mapTransaction(transaction);
  }
}

export const bookingPaymentService = new BookingPaymentService();
