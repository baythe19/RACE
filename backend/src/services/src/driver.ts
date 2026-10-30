import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/src/errors';
import { emitBookingStatusUpdate, emitDriverLocation, emitToBooking, emitToDriver, emitToUser } from './socket';
import { notifyCustomerTripStatus } from './bookingNotifications';
import { userRepository } from './userRepository';
import { towingBookingRepository } from './towingBookingRepository';
import { driverBookingRepository } from './driverBookingRepository';
import { assertValidStatusTransition } from './bookings/booking';
import { releaseDriver, unassignDriverFromBooking, claimOpenBookingOffer, listOpenBookingOffers } from './bookings/driverAssignment';
import {
  assertTripStartOtp,
  assertCompletionOtp,
  encryptTripOtpForStorage,
  generateTripStartOtp,
  getTripOtpValue,
  hashTripOtpForStorage,
} from './bookings/tripOtp';
import { processBookingCompletionEscrowSettlement } from './payments/escrowSettlement';
import { logger } from '../../utils/src/logger';
import { UserModel } from '../../models/src/user';
import { TowingBookingModel } from '../../models/src/towingBooking';
import { DriverBookingModel } from '../../models/src/driverBooking';
import type { UnifiedBookingStatus } from './bookingStatusConstants';
import type {
  DriverBookingsQueryDto,
  UpdateDriverAvailabilityDto,
  UpdateDriverLocationDto,
  UpdateDriverBookingStatusDto,
} from './driverValidator';

const DRIVER_PROGRESS_STATUSES: UnifiedBookingStatus[] = [
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
];

function assertDriverRole(role: string): void {
  if (role !== 'driver') {
    throw new ForbiddenError('Driver access only');
  }
}

/**
 * Status timeline is exposed read-only so the app can show real trip timings
 * (e.g. total time on the completion summary) instead of inventing them.
 */
function mapStatusHistory(
  history?: Array<{ status: string; timestamp: Date }>,
): Array<{ status: string; timestamp: string }> {
  return (history ?? []).map((entry) => ({
    status: entry.status,
    timestamp: entry.timestamp.toISOString(),
  }));
}

async function assertDriverApproved(driverId: string): Promise<void> {
  const driver = await userRepository.findById(driverId);
  if (!driver?.driverProfile) {
    throw new NotFoundError('Driver not found');
  }
  if (
    driver.operationalStatus === 'SUSPENDED' ||
    driver.driverProfile.status === 'SUSPENDED'
  ) {
    throw new ForbiddenError('Driver account has been suspended');
  }
  if (driver.operationalStatus === 'DISABLED') {
    throw new ForbiddenError('Driver account has been disabled');
  }
  if (driver.reviewStatus === 'REJECTED' || driver.driverProfile.status === 'REJECTED') {
    throw new ForbiddenError('Driver account documents were rejected');
  }
}

export class DriverService {
  async updateAvailability(
    driverId: string,
    role: string,
    dto: UpdateDriverAvailabilityDto,
  ): Promise<{ isAvailable: boolean; message: string }> {
    assertDriverRole(role);

    const driver = await userRepository.findById(driverId);
    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    if (driver.activeBookingId) {
      throw new BadRequestError('Availability cannot change while you have an active booking');
    }
    if (driver.operationalStatus === 'SUSPENDED') {
      throw new ForbiddenError('Driver account has been suspended');
    }
    if (driver.reviewStatus === 'REJECTED' || driver.driverProfile?.status === 'REJECTED') {
      throw new ForbiddenError('Driver account documents were rejected');
    }

    const availabilityFilter = {
      _id: driverId,
      role: 'driver',
      activeBookingId: null,
      operationalStatus: { $ne: 'SUSPENDED' },
      reviewStatus: { $ne: 'REJECTED' },
      'driverProfile.status': { $ne: 'REJECTED' },
    };
    const updated = await UserModel.findOneAndUpdate(
      availabilityFilter,
      { $set: { isAvailable: dto.isAvailable } },
      { new: true },
    ).exec();

    if (!updated) {
      const current = await userRepository.findById(driverId);
      if (!current) {
        throw new NotFoundError('Driver not found');
      }
      if (current.activeBookingId) {
        throw new BadRequestError('Availability cannot change while you have an active booking');
      }
      throw new BadRequestError('Availability changed; refresh and try again');
    }

    const isAvailable = updated.isAvailable === true;
    return {
      isAvailable,
      message: isAvailable ? 'You are now available' : 'You are now offline',
    };
  }

  async updateLocation(
    driverId: string,
    role: string,
    dto: UpdateDriverLocationDto,
  ): Promise<{ location: { latitude: number; longitude: number }; updatedAt: string }> {
    assertDriverRole(role);

    await assertDriverApproved(driverId);
    const updatedAt = new Date();

    // P1 (v6 audit / GPS privacy): the booking-scoped write is resolved FIRST.
    // User.currentLocation (globally visible) is only written when the active
    // pointer did NOT match an owned, operationally-active booking — so stale
    // pointers, terminal jobs, or wrong type/owner never pre-expose location,
    // and a DRIVER_ASSIGNED (not yet accepted) booking never receives it.
    const activePointer = (
      await UserModel.findById(driverId).select('activeBookingId activeBookingType').exec()
    )?.toObject();
    const activeBookingId = activePointer?.activeBookingId?.toString();
    const activeBookingType = activePointer?.activeBookingType as 'towing' | 'driver' | undefined;

    let bookingScoped = false;
    if (activeBookingId && (activeBookingType === 'towing' || activeBookingType === 'driver')) {
      const filter = {
        _id: activeBookingId,
        driverId,
        status: { $in: ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
      };
      const update = {
        $set: {
          driverLatitude: dto.latitude,
          driverLongitude: dto.longitude,
          driverLocationUpdatedAt: updatedAt,
        },
      };
      const updatedBooking =
        activeBookingType === 'towing'
          ? await TowingBookingModel.findOneAndUpdate(filter, update, { new: false }).select('_id').lean().exec()
          : await DriverBookingModel.findOneAndUpdate(filter, update, { new: false }).select('_id').lean().exec();
      if (updatedBooking) {
        bookingScoped = true;
        emitDriverLocation(activeBookingId, driverId, dto.latitude, dto.longitude);
      }
    }

    if (!bookingScoped) {
      await UserModel.findOneAndUpdate(
        { _id: driverId, role: 'driver' },
        {
          $set: {
            currentLocation: {
              latitude: dto.latitude,
              longitude: dto.longitude,
              updatedAt,
            },
          },
        },
      ).exec();
    }

    return {
      location: { latitude: dto.latitude, longitude: dto.longitude },
      updatedAt: updatedAt.toISOString(),
    };
  }

  async listOpenOffers(driverId: string, role: string) {
    assertDriverRole(role);
    await assertDriverApproved(driverId);

    const driver = await UserModel.findById(driverId)
      .select('driverProfile currentLocation role driverContext selfDriverCategory')
      .exec();
    if (!driver) throw new NotFoundError('Driver not found');

    return listOpenBookingOffers({ forDriver: driver });
  }

  async listBookings(driverId: string, role: string, query: DriverBookingsQueryDto) {
    assertDriverRole(role);
    await assertDriverApproved(driverId);

    const status = query.status;
    const includeTowing = !query.type || query.type === 'towing';
    const includeDriver = !query.type || query.type === 'driver';

    const [towingBookings, driverBookings] = await Promise.all([
      includeTowing ? towingBookingRepository.findByDriver(driverId, { status }) : Promise.resolve([]),
      includeDriver ? driverBookingRepository.findByDriver(driverId, { status }) : Promise.resolve([]),
    ]);

    const combined = [
      ...towingBookings.map((booking) => ({
        bookingType: 'towing' as const,
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        estimatedFare: booking.estimatedFare,
        finalFare: booking.finalFare,
        distanceKm: booking.distanceKm,
        createdAt: booking.createdAt.toISOString(),
        statusHistory: mapStatusHistory(booking.statusHistory),
        vendorId: booking.vendorId?.toString(),
        assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
      })),
      ...driverBookings.map((booking) => ({
        bookingType: 'driver' as const,
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        estimatedFare: booking.estimatedFare,
        finalFare: booking.finalFare,
        createdAt: booking.createdAt.toISOString(),
        statusHistory: mapStatusHistory(booking.statusHistory),
        vendorId: booking.vendorId?.toString(),
        assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
      })),
    ];

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return combined;
  }

  async getActiveBooking(driverId: string, role: string) {
    assertDriverRole(role);
    await assertDriverApproved(driverId);

    const driver = await userRepository.findById(driverId);
    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    if (!driver.activeBookingId || !driver.activeBookingType) {
      return { active: false as const };
    }

    const bookingType = driver.activeBookingType;
    const bookingId = driver.activeBookingId.toString();

    const mapBooking = (
      type: 'towing' | 'driver',
      booking: {
        id?: string;
        bookingNumber: string;
        status: string;
        pickup?: unknown;
        dropoff?: unknown | null;
        estimatedFare?: number;
        finalFare?: number;
        distanceKm?: number;
        createdAt: Date;
        statusHistory?: Array<{ status: string; timestamp: Date }>;
        vendorId?: { toString(): string } | null;
        assignedFleetVehicleLabel?: string;
        arrivedAtDropoffAt?: Date | null;
        paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE' | null;
        paymentConfirmedByCustomer?: boolean | null;
      },
    ) => ({
      bookingType: type,
      id: booking.id ?? bookingId,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      estimatedFare: booking.estimatedFare,
      finalFare: booking.finalFare,
      distanceKm: booking.distanceKm,
      createdAt: booking.createdAt.toISOString(),
      statusHistory: mapStatusHistory(booking.statusHistory),
      vendorId: booking.vendorId?.toString(),
      assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
      arrivedAtDropoffAt: booking.arrivedAtDropoffAt
        ? new Date(booking.arrivedAtDropoffAt).toISOString()
        : undefined,
      paymentCollectionMode: booking.paymentCollectionMode ?? undefined,
      paymentConfirmedByCustomer: Boolean(booking.paymentConfirmedByCustomer),
    });

    if (bookingType === 'towing') {
      const booking = await towingBookingRepository.findByIdWithOtp(bookingId);
      if (!booking) {
        return { active: false as const };
      }
      return { active: true as const, booking: mapBooking('towing', booking) };
    }

    const booking = await driverBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      return { active: false as const };
    }
    return { active: true as const, booking: mapBooking('driver', booking) };
  }

  async updateBookingStatus(
    driverId: string,
    role: string,
    bookingId: string,
    dto: UpdateDriverBookingStatusDto,
  ) {
    assertDriverRole(role);
    await assertDriverApproved(driverId);

    if (!DRIVER_PROGRESS_STATUSES.includes(dto.status)) {
      throw new BadRequestError('Status not allowed for driver updates');
    }

    const Model =
      dto.bookingType === 'towing'
        ? towingBookingRepository
        : driverBookingRepository;

    const booking = await Model.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (!booking.driverId || booking.driverId.toString() !== driverId) {
      throw new ForbiddenError('This booking is not assigned to you');
    }

    assertValidStatusTransition(booking.status, dto.status);

    if (dto.status === 'IN_PROGRESS' && booking.status === 'DRIVER_ARRIVED') {
      try {
        assertTripStartOtp(booking, dto.tripOtp);
      } catch (otpErr) {
        if (dto.bookingType === 'towing') {
          await TowingBookingModel.findByIdAndUpdate(bookingId, { $inc: { tripStartOtpAttempts: 1 } });
        } else {
          await DriverBookingModel.findByIdAndUpdate(bookingId, { $inc: { tripStartOtpAttempts: 1 } });
        }
        throw otpErr;
      }
    }

    if (dto.status === 'COMPLETED') {
      if (!booking.arrivedAtDropoffAt) {
        throw new BadRequestError('Mark arrival at the drop before completing the job');
      }
      if (!booking.paymentConfirmedByCustomer) {
        throw new BadRequestError('The customer must confirm payment before this job can be completed');
      }
      try {
        assertCompletionOtp(booking, dto.completionOtp);
      } catch (otpErr) {
        if (dto.bookingType === 'towing') {
          await TowingBookingModel.findByIdAndUpdate(bookingId, { $inc: { completionOtpAttempts: 1 } });
        } else {
          await DriverBookingModel.findByIdAndUpdate(bookingId, { $inc: { completionOtpAttempts: 1 } });
        }
        throw otpErr;
      }
    }

    // The backend — not the app — confirms the final trip fare. Payment and
    // payout settlement are separate flows and are not performed by this update.
    const breakdownTotal =
      booking.fareBreakdown && 'totalFare' in booking.fareBreakdown
        ? (booking.fareBreakdown as { totalFare?: number }).totalFare
        : undefined;
    const completionExtra =
      dto.status === 'COMPLETED'
        ? {
            finalFare:
              typeof breakdownTotal === 'number' ? breakdownTotal : booking.estimatedFare,
            finalFareConfirmedAt: new Date(),
          }
        : undefined;

    const startsTrip = dto.status === 'IN_PROGRESS' && booking.status === 'DRIVER_ARRIVED';
    const completesTrip = dto.status === 'COMPLETED';
    const transitionExtra = {
      ...(completionExtra ?? {}),
      ...(startsTrip ? { tripStartOtpVerified: true, tripStartOtpAttempts: 0 } : {}),
      ...(completesTrip ? { completionOtpVerified: true, completionOtpAttempts: 0 } : {}),
    };
    const updated = await Model.updateStatus(
      bookingId,
      booking.status,
      dto.status,
      Object.keys(transitionExtra).length > 0 ? transitionExtra : undefined,
      {
        driverId,
        ...(startsTrip
          ? {
              tripStartOtp: booking.tripStartOtp,
              tripStartOtpVerified: { $ne: true },
            }
          : {}),
      },
    );

    if (!updated) {
      throw new ConflictError('Booking changed before the status update was saved');
    }

    // P0-1 (v6 audit): a vendor-dispatched booking sits at DRIVER_ASSIGNED until
    // the driver accepts. Accepting (→ DRIVER_EN_ROUTE) is the trip-start gate,
    // so the driver-only trip OTP is delivered exactly here.
    if (dto.status === 'DRIVER_EN_ROUTE' && booking.status === 'DRIVER_ASSIGNED') {
      const tripStartOtp = booking.tripStartOtp
        ? getTripOtpValue(booking.tripStartOtp, booking.tripStartOtpEncrypted) ?? generateTripStartOtp()
        : generateTripStartOtp();
      if (!booking.tripStartOtp || !booking.tripStartOtpEncrypted) {
        await Model.updateById(bookingId, {
          tripStartOtp: hashTripOtpForStorage(tripStartOtp),
          tripStartOtpEncrypted: encryptTripOtpForStorage(tripStartOtp),
        });
      }
      emitToDriver(driverId, 'trip:otp', {
        bookingId,
        bookingType: dto.bookingType,
        tripStartOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    }

    if (dto.status === 'COMPLETED') {
      await releaseDriver(driverId, bookingId);
      // Automated escrow settlement disbursement (85% vendor payout / 15% platform commission)
      const finalFare = updated.finalFare ?? updated.estimatedFare ?? 0;
      void processBookingCompletionEscrowSettlement({
        bookingId: updated._id.toString(),
        bookingNumber: updated.bookingNumber,
        finalFare,
        vendorId: updated.vendorId,
        driverId: updated.driverId,
        customerId: updated.customerId,
      }).catch((err) => {
        logger.error('Failed to disburse automated escrow settlement', {
          bookingId: updated._id.toString(),
          error: err,
        });
      });
    }

    emitBookingStatusUpdate(bookingId, dto.status, {
      driverAccepted: dto.status === 'DRIVER_EN_ROUTE',
      statusHistory: updated.statusHistory.map((entry) => ({
        status: entry.status,
        timestamp: entry.timestamp.toISOString(),
      })),
    });

    void notifyCustomerTripStatus({
      customerId: updated.customerId.toString(),
      bookingNumber: updated.bookingNumber,
      bookingType: dto.bookingType,
      bookingId: updated.id,
      status: dto.status,
    }).catch(() => undefined);

    return updated;
  }

  /** Accept: open CONFIRMED offer (claim) or allotted DRIVER_ASSIGNED → DRIVER_EN_ROUTE. */
  async acceptBooking(driverId: string, role: string, bookingId: string, bookingType: 'towing' | 'driver') {
    assertDriverRole(role);
    await assertDriverApproved(driverId);

    const driver = await UserModel.findById(driverId).select('activeBookingId isAvailable driverProfile driverContext').exec();
    if (driver?.activeBookingId && driver.activeBookingId.toString() !== bookingId) {
      throw new BadRequestError('You already have an active booking in progress');
    }

    const Model = bookingType === 'towing' ? towingBookingRepository : driverBookingRepository;
    const booking = await Model.findByIdWithOtp(bookingId);
    if (!booking) throw new NotFoundError('Booking not found');

    if (booking.status === 'CONFIRMED' && !booking.driverId) {
      if (driver?.driverContext === 'VENDOR_MANAGED') {
        throw new ForbiddenError('Your vendor assigns your jobs. Open requests are not available.');
      }
      return claimOpenBookingOffer(bookingId, bookingType, driverId);
    }

    return this.updateBookingStatus(driverId, role, bookingId, {
      status: 'DRIVER_EN_ROUTE',
      bookingType,
    });
  }

  /** Reject allotted job: free driver and return booking to CONFIRMED for reassignment. */
  async rejectBooking(driverId: string, role: string, bookingId: string, bookingType: 'towing' | 'driver') {
    assertDriverRole(role);
    await assertDriverApproved(driverId);

    const Model = bookingType === 'towing' ? towingBookingRepository : driverBookingRepository;
    const booking = await Model.findByIdWithOtp(bookingId);
    if (!booking) throw new NotFoundError('Booking not found');
    if (!booking.driverId || booking.driverId.toString() !== driverId) {
      throw new ForbiddenError('This booking is not assigned to you');
    }
    if (booking.status !== 'DRIVER_ASSIGNED') {
      throw new BadRequestError('Only newly assigned jobs can be rejected');
    }

    await unassignDriverFromBooking(bookingId, bookingType, driverId);
    emitBookingStatusUpdate(bookingId, 'CONFIRMED', {
      reason: 'Driver rejected assignment',
    });

    return { rejected: true, bookingId, status: 'CONFIRMED' as const };
  }

    /** Driver confirms drop arrival. Customer is asked to pay. The SMS code is not sent yet. */
  async arrivedAtDropoff(driverId: string, role: string, bookingId: string, bookingType: 'towing' | 'driver') {
    assertDriverRole(role);
    await assertDriverApproved(driverId);

    const Model = bookingType === 'towing' ? towingBookingRepository : driverBookingRepository;
    const booking = await Model.findByIdWithOtp(bookingId);
    if (!booking) throw new NotFoundError('Booking not found');
    if (!booking.driverId || booking.driverId.toString() !== driverId) {
      throw new ForbiddenError('This booking is not assigned to you');
    }
    if (booking.status !== 'IN_PROGRESS') {
      throw new BadRequestError('Booking must be IN_PROGRESS to mark arrival at dropoff');
    }

    const arrivedAtDropoffAt = new Date();

    await Model.updateById(bookingId, {
      arrivedAtDropoffAt,
    });

    const fare =
      booking.fareBreakdown && 'totalFare' in booking.fareBreakdown
        ? (booking.fareBreakdown as { totalFare?: number }).totalFare
        : booking.estimatedFare;

    const arrivalNotice = {
      bookingId,
      bookingType,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      arrivedAtDropoff: true,
      arrivedAtDropoffAt: arrivedAtDropoffAt.toISOString(),
      fare,
      paymentOptions: ['CASH', 'UPI', 'ONLINE'],
      message: 'Driver has reached your location. Pay the driver to finish the trip.',
    };

    emitBookingStatusUpdate(bookingId, 'IN_PROGRESS', {
      arrivedAtDropoff: true,
      arrivedAtDropoffAt: arrivalNotice.arrivedAtDropoffAt,
      fare,
      paymentCollectionMode: booking.paymentCollectionMode,
      paymentConfirmedByCustomer: booking.paymentConfirmedByCustomer,
    });
    emitToBooking(bookingId, 'booking:driver_arrived_dropoff', arrivalNotice);
    if (booking.customerId) {
      emitToUser(booking.customerId.toString(), 'booking:driver_arrived_dropoff', arrivalNotice);
    }

    emitToDriver(driverId, 'booking:driver_arrived_dropoff', {
      bookingId,
      bookingNumber: booking.bookingNumber,
      fare,
      arrivedAtDropoffAt: arrivedAtDropoffAt.toISOString(),
    });

    return {
      success: true,
      bookingId,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      arrivedAtDropoffAt: arrivedAtDropoffAt.toISOString(),
      fare,
    };
  }

  /** Complete job with customer's completion OTP */
  async completeBooking(
    driverId: string,
    role: string,
    bookingId: string,
    bookingType: 'towing' | 'driver',
    completionOtp?: string,
  ) {
    return this.updateBookingStatus(driverId, role, bookingId, {
      status: 'COMPLETED',
      bookingType,
      completionOtp,
    });
  }
}

export const driverService = new DriverService();
