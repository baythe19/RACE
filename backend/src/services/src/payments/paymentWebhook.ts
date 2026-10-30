import crypto from 'node:crypto';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import { towingBookingService } from '../bookings/towingBooking';
import { driverBookingService } from '../bookings/driverBooking';
import { towingBookingRepository } from '../towingBookingRepository';
import { driverBookingRepository } from '../driverBookingRepository';
import { processBookingCompletionEscrowSettlement } from './escrowSettlement';
import { emitBookingStatusUpdate } from '../socket';
import { logger } from '../../../utils/src/logger';
import { BadRequestError, NotFoundError } from '../../../utils/src/errors';
import { env } from '../../../config/env';

export interface PaymentWebhookPayload {
  gateway: 'razorpay' | 'cashfree' | 'stub';
  event?: string;
  orderId?: string;
  paymentId?: string;
  referenceId?: string;
  status: 'success' | 'failed';
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validates HMAC SHA256 webhook signatures from payment gateways.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  try {
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const signatureBuffer = Buffer.from(signature);
    const computedBuffer = Buffer.from(computed);
    if (signatureBuffer.length !== computedBuffer.length) {
      crypto.timingSafeEqual(computedBuffer, computedBuffer);
      return false;
    }
    return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
  } catch {
    return false;
  }
}

export const paymentWebhookService = {
  /**
   * Idempotent server-to-server payment gateway webhook processor.
   * Eliminates client-asserted payment vulnerabilities by confirming
   * funds directly via signed gateway webhooks.
   */
  async processWebhook(
    payload: PaymentWebhookPayload,
    options?: { signature?: string; rawBody?: string | Buffer },
  ) {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET?.trim() ?? '';

    if (env.NODE_ENV === 'production') {
      if (webhookSecret.length < 32) {
        logger.error('Payment webhook rejected: PAYMENT_WEBHOOK_SECRET is not configured');
        throw new BadRequestError('Payment webhooks are not configured');
      }
      if (!options?.signature || !options?.rawBody) {
        logger.warn('Payment webhook rejected: missing signature or raw body');
        throw new BadRequestError('Missing webhook signature');
      }
      const isValid = verifyWebhookSignature(options.rawBody, options.signature, webhookSecret);
      if (!isValid) {
        logger.warn('Payment webhook rejected: invalid HMAC signature', { gateway: payload.gateway });
        throw new BadRequestError('Invalid webhook signature');
      }
    } else if (webhookSecret.length >= 32 && options?.signature && options?.rawBody) {
      const isValid = verifyWebhookSignature(options.rawBody, options.signature, webhookSecret);
      if (!isValid) {
        logger.warn('Payment webhook rejected: invalid HMAC signature (dev)', { gateway: payload.gateway });
        throw new BadRequestError('Invalid webhook signature');
      }
    }

    const ref = payload.referenceId || payload.orderId || payload.paymentId;
    if (!ref) {
      throw new BadRequestError('Missing transaction or order reference');
    }

    // Lookup transaction by gatewayReferenceId or _id
    let transaction = await PaymentTransactionModel.findOne({
      $or: [
        { gatewayReferenceId: ref },
        { _id: ref.match(/^[0-9a-fA-F]{24}$/) ? ref : undefined },
      ].filter(Boolean),
    });

    if (!transaction) {
      logger.warn('Webhook received for unknown transaction reference', { ref });
      throw new NotFoundError(`Payment transaction not found for reference: ${ref}`);
    }

    // Idempotency: if already processed as success, return cleanly
    if (transaction.status === 'success') {
      return {
        success: true,
        alreadyProcessed: true,
        transactionId: transaction.id,
        bookingId: transaction.bookingId.toString(),
        message: 'Transaction was already confirmed',
      };
    }

    if (payload.status === 'failed') {
      transaction.status = 'failed';
      await transaction.save();
      return {
        success: false,
        transactionId: transaction.id,
        bookingId: transaction.bookingId.toString(),
        message: 'Payment recorded as failed',
      };
    }

    // Mark transaction successful
    transaction.status = 'success';
    await transaction.save();

    const bookingIdStr = transaction.bookingId.toString();

    // Advance payment flow -> Transition booking to CONFIRMED
    if (transaction.paymentType === 'advance') {
      if (transaction.bookingType === 'towing') {
        await towingBookingService.applyPaymentUpdate(bookingIdStr, {
          advancePaid: true,
          advancePaymentId: transaction.id,
          paymentStatus: 'ADVANCE_PAID',
          status: 'CONFIRMED',
        });
      } else {
        await driverBookingService.applyPaymentUpdate(bookingIdStr, {
          advancePaid: true,
          advancePaymentId: transaction.id,
          paymentStatus: 'ADVANCE_PAID',
          status: 'CONFIRMED',
        });
      }

      emitBookingStatusUpdate(bookingIdStr, 'CONFIRMED', {
        paymentConfirmed: true,
        paymentType: 'advance',
      });

      logger.info('Advance payment confirmed via gateway webhook', {
        bookingId: bookingIdStr,
        transactionId: transaction.id,
      });

      return {
        success: true,
        transactionId: transaction.id,
        bookingId: bookingIdStr,
        paymentType: 'advance',
        message: 'Advance payment confirmed; booking status transitioned to CONFIRMED',
      };
    }

    // Final payment flow -> Transition booking payment to FULLY_PAID and disburse escrow
    if (transaction.paymentType === 'final') {
      let finalFare = transaction.amount;
      let bookingNumber = '';
      let vendorId = undefined;
      let driverId = undefined;
      let customerId = transaction.customerId;

      if (transaction.bookingType === 'towing') {
        await towingBookingService.applyPaymentUpdate(bookingIdStr, {
          remainingPaid: true,
          finalPaymentId: transaction.id,
          paymentStatus: 'FULLY_PAID',
        });
        const booking = await towingBookingRepository.findById(bookingIdStr);
        if (booking) {
          bookingNumber = booking.bookingNumber;
          finalFare = booking.finalFare ?? booking.estimatedFare ?? transaction.amount;
          vendorId = booking.vendorId;
          driverId = booking.driverId;
        }
      } else {
        await driverBookingService.applyPaymentUpdate(bookingIdStr, {
          remainingPaid: true,
          finalPaymentId: transaction.id,
          paymentStatus: 'FULLY_PAID',
        });
        const booking = await driverBookingRepository.findById(bookingIdStr);
        if (booking) {
          bookingNumber = booking.bookingNumber;
          finalFare = booking.finalFare ?? booking.estimatedFare ?? transaction.amount;
          vendorId = booking.vendorId;
          driverId = booking.driverId;
        }
      }

      emitBookingStatusUpdate(bookingIdStr, 'IN_PROGRESS', {
        paymentConfirmed: true,
        paymentType: 'final',
        paymentStatus: 'FULLY_PAID',
      });

      // Disburse automated 85/15 escrow settlement
      if (bookingNumber && finalFare > 0) {
        void processBookingCompletionEscrowSettlement({
          bookingId: bookingIdStr,
          bookingNumber,
          finalFare,
          vendorId,
          driverId,
          customerId,
        }).catch((err) => {
          logger.error('Failed to disburse escrow settlement from webhook final payment', {
            bookingId: bookingIdStr,
            error: err,
          });
        });
      }

      logger.info('Final payment confirmed via gateway webhook', {
        bookingId: bookingIdStr,
        transactionId: transaction.id,
      });

      return {
        success: true,
        transactionId: transaction.id,
        bookingId: bookingIdStr,
        paymentType: 'final',
        message: 'Final payment confirmed; escrow settlement triggered',
      };
    }

    return {
      success: true,
      transactionId: transaction.id,
      bookingId: bookingIdStr,
      message: 'Payment confirmed via webhook',
    };
  },
};
