import { BadRequestError, ConflictError, NotFoundError } from '../../../utils/src/errors';
import { emitBookingStatusUpdate } from '../socket';
import { userRepository } from '../userRepository';
import { towingBookingRepository } from '../towingBookingRepository';
import { driverBookingRepository } from '../driverBookingRepository';
import { assignDriverToBooking } from '../bookings/driverAssignment';
import { releaseDriver } from '../bookings/driverAssignment';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import type {
  AssignServiceBookingDriverDto,
  CancelServiceBookingDto,
} from './adminServiceBookingsValidator';
import { canTransition } from '../bookingStatusConstants';
import { logActivity } from './activityLogger';

export class AdminServiceBookingsService {
  async assignDriver(
    bookingId: string,
    dto: AssignServiceBookingDriverDto,
    actor?: { id: string; name: string },
  ) {
    const driver = await userRepository.findById(dto.driverId);
    if (!driver || driver.role !== 'driver') {
      throw new NotFoundError('Driver not found');
    }

    if (!driver.isAvailable) {
      throw new BadRequestError('Driver is not available');
    }

    if (driver.activeBookingId) {
      throw new BadRequestError('Driver already has an active booking');
    }

    await assignDriverToBooking(bookingId, dto.bookingType, dto.driverId);

    const booking =
      dto.bookingType === 'towing'
        ? await towingBookingRepository.findById(bookingId)
        : await driverBookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    if (actor) {
      await logActivity({
        actorId: actor.id,
        actorName: actor.name,
        action: 'SERVICE_BOOKING_DRIVER_ASSIGNED',
        entityType: 'booking',
        entityId: bookingId,
        title: 'Driver assigned to ' + booking.bookingNumber,
      });
    }

    return {
      message: 'Driver assigned successfully',
      booking,
      driver: {
        name: driver.fullName,
        phone: driver.mobileNumber,
        currentLocation: driver.currentLocation,
      },
    };
  }

  async cancelBooking(
    bookingId: string,
    dto: CancelServiceBookingDto,
    actor?: { id: string; name: string },
  ) {
    let booking =
      dto.bookingType === 'towing'
        ? await towingBookingRepository.findById(bookingId)
        : await driverBookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (!canTransition(booking.status, 'CANCELLED')) {
      throw new BadRequestError('Cannot cancel at this stage');
    }

    const paidAmount =
      (booking.advancePaid ? booking.advanceAmount : 0) +
      (booking.remainingPaid ? booking.remainingAmount : 0);
    const refundAmount = dto.refundAmount ?? paidAmount;
    if (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > paidAmount) {
      throw new BadRequestError('Refund amount must be between 0 and the amount paid');
    }

    const cancelledAt = new Date();
    const cancelUpdate = {
      $set: {
        status: 'CANCELLED' as const,
        cancelledAt,
        cancelledBy: 'admin' as const,
        cancellationReason: dto.reason,
        refundAmount,
        refundStatus: refundAmount > 0 ? ('PENDING' as const) : ('NOT_APPLICABLE' as const),
      },
      $push: {
        statusHistory: {
          status: 'CANCELLED' as const,
          timestamp: cancelledAt,
          note: 'Admin cancelled: ' + dto.reason,
        },
      },
    };
    const cancelledBooking =
      dto.bookingType === 'towing'
        ? await TowingBookingModel.findOneAndUpdate(
            { _id: booking._id, status: booking.status },
            cancelUpdate,
            { new: true, runValidators: true },
          ).exec()
        : await DriverBookingModel.findOneAndUpdate(
            { _id: booking._id, status: booking.status },
            cancelUpdate,
            { new: true, runValidators: true },
          ).exec();
    if (!cancelledBooking) {
      throw new ConflictError('Booking changed while cancellation was being processed');
    }
    booking = cancelledBooking;

    if (booking.driverId) {
      await releaseDriver(booking.driverId.toString(), booking._id.toString());
    }

    if (refundAmount > 0) {
      await PaymentTransactionModel.create({
        bookingId: booking._id,
        bookingType: dto.bookingType,
        customerId: booking.customerId,
        paymentType: 'refund',
        amount: refundAmount,
        status: 'initiated',
        note: 'Stub refund - Razorpay integration pending',
      });
      // TODO: Trigger actual Razorpay refund when payment gateway is integrated
    }

    emitBookingStatusUpdate(booking.id, 'CANCELLED', {
      statusHistory: booking.statusHistory.map((entry) => ({
        status: entry.status,
        timestamp: entry.timestamp.toISOString(),
        note: entry.note,
      })),
    });
    if (actor) {
      await logActivity({
        actorId: actor.id,
        actorName: actor.name,
        action: 'SERVICE_BOOKING_CANCELLED',
        entityType: 'booking',
        entityId: booking._id.toString(),
        title: 'Service booking ' + booking.bookingNumber + ' cancelled',
        description: dto.reason,
      });
    }

    return {
      message: 'Booking cancelled by admin',
      booking,
      refundAmount,
      refundStatus: booking.refundStatus,
    };
  }
}

export const adminServiceBookingsService = new AdminServiceBookingsService();
