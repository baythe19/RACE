import { driverBookingService } from './bookings/driverBooking';
import type { CombinedBookingListItemDto, CombinedBookingListQuery } from './combinedBookingValidator';
import { towingBookingService } from './bookings/towingBooking';
import { towingBookingRepository } from './towingBookingRepository';
import { driverBookingRepository } from './driverBookingRepository';
import { userRepository } from './userRepository';
import { NotFoundError, ForbiddenError } from '../../utils/src/errors';
import { generateCompletionOtp } from './bookings/tripOtp';
import { emitBookingStatusUpdate, emitToDriver } from './socket';
import { hanuSendOtp, isHanuConfigured } from '../../utils/src/hanuSms';
import { logger } from '../../utils/src/logger';

function mapTowingItem(
  booking: Awaited<ReturnType<typeof towingBookingService.listBookings>>[number],
): CombinedBookingListItemDto {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    bookingType: 'towing',
    serviceLabel: 'Towing',
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    vehicleId: booking.vehicleId ?? '',
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    distanceKm: booking.distanceKm,
    estimatedFare: booking.estimatedFare,
    fareBreakdown: booking.fareBreakdown,
    advanceAmount: booking.advanceAmount,
    advancePaid: booking.advancePaid,
    remainingAmount: booking.remainingAmount,
    remainingPaid: booking.remainingPaid,
    driverId: booking.driverId,
    driver: booking.driver,
    vendorId: booking.vendorId,
    assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
    tripStartOtp: booking.tripStartOtp,
    scheduledAt: booking.scheduledAt,
    statusHistory: booking.statusHistory,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function mapDriverItem(
  booking: Awaited<ReturnType<typeof driverBookingService.listBookings>>[number],
): CombinedBookingListItemDto {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    bookingType: 'driver',
    serviceLabel: 'Driver Hire',
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    vehicleId: booking.vehicleId ?? '',
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    packageHours: booking.packageHours,
    vehicleCategory: booking.vehicleCategory,
    includedKm: booking.includedKm,
    estimatedDurationHours: booking.estimatedDurationHours,
    estimatedFare: booking.estimatedFare,
    fareBreakdown: booking.fareBreakdown,
    advanceAmount: booking.advanceAmount,
    advancePaid: booking.advancePaid,
    remainingAmount: booking.remainingAmount,
    remainingPaid: booking.remainingPaid,
    driverId: booking.driverId,
    driver: booking.driver,
    vendorId: booking.vendorId,
    assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
    tripStartOtp: booking.tripStartOtp,
    scheduledAt: booking.scheduledAt,
    statusHistory: booking.statusHistory,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export class CombinedBookingService {
  async listBookings(
    customerId: string,
    query: CombinedBookingListQuery = {},
  ): Promise<CombinedBookingListItemDto[]> {
    const status = query.status;
    const includeTowing = !query.type || query.type === 'towing';
    const includeDriver = !query.type || query.type === 'driver';

    const [towingBookings, driverBookings] = await Promise.all([
      includeTowing ? towingBookingService.listBookings(customerId, status) : Promise.resolve([]),
      includeDriver ? driverBookingService.listBookings(customerId, status) : Promise.resolve([]),
    ]);

    return [...towingBookings.map(mapTowingItem), ...driverBookings.map(mapDriverItem)].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  async confirmPaymentMode(
    customerId: string,
    bookingId: string,
    paymentMode: 'CASH' | 'UPI' | 'ONLINE',
    bookingType?: 'towing' | 'driver',
  ) {
    let booking: any = null;
    let type: 'towing' | 'driver' = bookingType ?? 'towing';
    let repo: typeof towingBookingRepository | typeof driverBookingRepository = towingBookingRepository;

    if (bookingType === 'driver') {
      booking = await driverBookingRepository.findById(bookingId);
      repo = driverBookingRepository;
    } else if (bookingType === 'towing') {
      booking = await towingBookingRepository.findById(bookingId);
      repo = towingBookingRepository;
    } else {
      booking = await towingBookingRepository.findById(bookingId);
      if (booking) {
        type = 'towing';
        repo = towingBookingRepository;
      } else {
        booking = await driverBookingRepository.findById(bookingId);
        type = 'driver';
        repo = driverBookingRepository;
      }
    }

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId.toString() !== customerId) {
      throw new ForbiddenError('You do not have access to this booking');
    }

    const completionOtp = booking.completionOtp ?? generateCompletionOtp();
    const paymentCollectedAt = new Date();

    await repo.updateById(bookingId, {
      paymentCollectionMode: paymentMode,
      paymentConfirmedByCustomer: true,
      paymentCollectedAt,
      completionOtp,
    });

    const fare =
      booking.fareBreakdown && 'totalFare' in booking.fareBreakdown
        ? (booking.fareBreakdown as { totalFare?: number }).totalFare
        : booking.estimatedFare;

    // Send SMS with completion OTP to customer (as requested: "जैसे ही कन्फर्म करेगा तो SMS के थ्रू कस्टमर को एक OTP आएगा")
    const customer = await userRepository.findById(customerId);
    if (customer?.mobileNumber) {
      if (isHanuConfigured()) {
        try {
          await hanuSendOtp(customer.mobileNumber, completionOtp);
        } catch (smsErr) {
          logger.warn('Failed to send completion OTP via HanuSMS', { error: smsErr });
        }
      }
      logger.info(`[COMPLETION OTP SMS] Sent completion code for booking #${booking.bookingNumber}`);
    }

    // Emit socket event to Driver
    if (booking.driverId) {
      emitToDriver(booking.driverId.toString(), 'booking:payment_confirmed', {
        bookingId,
        bookingNumber: booking.bookingNumber,
        paymentMode,
        amount: fare,
        paymentStatus: 'CONFIRMED',
      });
    }

    // Emit socket event to Booking Room
    emitBookingStatusUpdate(bookingId, booking.status, {
      paymentMode,
      paymentConfirmed: true,
      amount: fare,
    });

    return {
      success: true,
      bookingId,
      bookingNumber: booking.bookingNumber,
      bookingType: type,
      paymentMode,
      amount: fare,
      completionOtp,
    };
  }
}

export const combinedBookingService = new CombinedBookingService();
