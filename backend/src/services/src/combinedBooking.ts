import { driverBookingService } from './bookings/driverBooking';
import type { CombinedBookingListItemDto, CombinedBookingListQuery } from './combinedBookingValidator';
import { towingBookingService } from './bookings/towingBooking';
import { towingBookingRepository } from './towingBookingRepository';
import { driverBookingRepository } from './driverBookingRepository';
import { userRepository } from './userRepository';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/src/errors';
import { encryptTripOtpForStorage, generateCompletionOtp, getTripOtpValue, hashTripOtpForStorage } from './bookings/tripOtp';
import { emitBookingStatusUpdate, emitToDriver } from './socket';
import { hanuSendOtp, isHanuConfigured } from '../../utils/src/hanuSms';
import { logger } from '../../utils/src/logger';
import { bookingServiceLabel } from './bookings/driverAssignment';

function mapTowingItem(
  booking: Awaited<ReturnType<typeof towingBookingService.listBookings>>[number],
): CombinedBookingListItemDto {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    bookingType: 'towing',
    serviceLabel: bookingServiceLabel('towing', {
      assistLabel: booking.assistLabel,
      towingMode: booking.towingMode,
    }),
    status: booking.status,
    awaitingPartnerAccept: booking.awaitingPartnerAccept,
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
    arrivedAtDropoffAt: booking.arrivedAtDropoffAt,
    completionOtp: booking.completionOtp,
    paymentCollectionMode: booking.paymentCollectionMode,
    paymentConfirmedByCustomer: booking.paymentConfirmedByCustomer,
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
    serviceLabel: bookingServiceLabel('driver', {
      driverServiceType: booking.driverServiceType,
    }),
    status: booking.status,
    awaitingPartnerAccept: booking.awaitingPartnerAccept,
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
    arrivedAtDropoffAt: booking.arrivedAtDropoffAt,
    completionOtp: booking.completionOtp,
    paymentCollectionMode: booking.paymentCollectionMode,
    paymentConfirmedByCustomer: booking.paymentConfirmedByCustomer,
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
      booking = await driverBookingRepository.findByIdWithOtp(bookingId);
      repo = driverBookingRepository;
    } else if (bookingType === 'towing') {
      booking = await towingBookingRepository.findByIdWithOtp(bookingId);
      repo = towingBookingRepository;
    } else {
      booking = await towingBookingRepository.findByIdWithOtp(bookingId);
      if (!booking) {
        booking = await driverBookingRepository.findByIdWithOtp(bookingId);
        type = 'driver';
        repo = driverBookingRepository;
      }
      if (!booking) {
        booking = await towingBookingRepository.findById(bookingId);
        if (booking) {
          type = 'towing';
          repo = towingBookingRepository;
        }
      }
      if (!booking) {
        booking = await driverBookingRepository.findById(bookingId);
        if (booking) {
          type = 'driver';
          repo = driverBookingRepository;
        }
      }
    }

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId.toString() !== customerId) {
      throw new ForbiddenError('You do not have access to this booking');
    }
    if (!booking.arrivedAtDropoffAt) {
      throw new BadRequestError('The driver has not confirmed arrival at the drop yet');
    }
    if (booking.status === 'COMPLETED' || booking.status === 'RATED' || booking.status === 'CANCELLED') {
      throw new BadRequestError('This trip is no longer waiting for payment');
    }

    const fare =
      booking.fareBreakdown && 'totalFare' in booking.fareBreakdown
        ? (booking.fareBreakdown as { totalFare?: number }).totalFare
        : booking.estimatedFare;

    if (booking.paymentConfirmedByCustomer && booking.completionOtp) {
      const existingOtp = getTripOtpValue(
        booking.completionOtp,
        booking.completionOtpEncrypted,
      );
      return {
        success: true,
        bookingId,
        bookingNumber: booking.bookingNumber,
        bookingType: type,
        paymentMode: booking.paymentCollectionMode ?? paymentMode,
        amount: fare,
        completionOtp: existingOtp,
      };
    }

    const completionOtp = generateCompletionOtp();
    const paymentCollectedAt = new Date();

    const updatedBooking = await repo.updateById(bookingId, {
      paymentCollectionMode: paymentMode,
      paymentConfirmedByCustomer: true,
      paymentCollectedAt,
      completionOtp: hashTripOtpForStorage(completionOtp),
      completionOtpEncrypted: encryptTripOtpForStorage(completionOtp),
    });

    if (!updatedBooking) {
      throw new NotFoundError('Booking not found');
    }

    const refetched = await repo.findByIdWithOtp(bookingId);
    if (!refetched) {
      throw new NotFoundError('Booking not found');
    }

    // SMS goes out only after the customer confirms cash, UPI, or in-app payment.
    const customer = await userRepository.findById(customerId);
    if (customer?.mobileNumber) {
      if (isHanuConfigured()) {
        try {
          await hanuSendOtp(customer.mobileNumber, completionOtp);
        } catch (smsErr) {
          logger.warn("Failed to send completion OTP via HanuSMS", { error: smsErr });
        }
      }
    }

    // Emit socket event to Driver
    if (updatedBooking.driverId) {
      emitToDriver(updatedBooking.driverId.toString(), 'booking:payment_confirmed', {
        bookingId,
        bookingNumber: updatedBooking.bookingNumber,
        paymentMode,
        amount: fare,
        paymentStatus: 'CONFIRMED',
      });
    }

    // Emit socket event to Booking Room
    emitBookingStatusUpdate(bookingId, updatedBooking.status, {
      paymentMode,
      paymentConfirmed: true,
      amount: fare,
    });

    return {
      success: true,
      bookingId,
      bookingNumber: updatedBooking.bookingNumber,
      bookingType: type,
      paymentMode,
      amount: fare,
      completionOtp: getTripOtpValue(
        refetched.completionOtp,
        refetched.completionOtpEncrypted,
      ),
    };
  }
}

export const combinedBookingService = new CombinedBookingService();
