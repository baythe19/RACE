import { BadRequestError, ForbiddenError, NotFoundError } from '../../../utils/src/errors';
import { getDistanceAndDuration } from '../googleMaps';
import { emitBookingStatusUpdate } from '../socket';
import { vehicleRepository } from '../vehicleRepository';
import { UserModel } from '../../../models/src/user';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import {
  appendStatusHistory,
  assertValidStatusTransition,
  calculateTowingFare,
  createInitialStatusHistory,
  generatePrefixedBookingNumber,
} from './booking';
import { assertActorMayTransition, canTransition, type UnifiedBookingStatus } from '../bookingStatusConstants';
import { towingBookingRepository } from '../towingBookingRepository';
import type { ITowingBooking } from '../../../models/src/towingBooking';
import type {
  CreateTowingBookingDto,
  TowingBookingResponseDto,
  TowingTrackingResponseDto,
} from '../towingBookingValidator';
import type { SubmitServiceBookingRatingDto } from '../bookingRatingValidator';
import { buildServiceBookingRatingUpdate } from './bookingRating';
import { getCancellationPolicy, type CancellationResult } from './cancellation';
import { releaseDriver } from './driverAssignment';
import { resolveAssignedDriver } from './assignedDriver';
import {
  isDriverVisibleToCustomer,
  mapPublicBookingStatus,
} from '../bookingDisplayStatus';
import { customerTripOtp } from './tripOtp';

function mapTowingBooking(
  booking: ITowingBooking,
  driver?: TowingBookingResponseDto['driver'],
): TowingBookingResponseDto {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    customerId: booking.customerId.toString(),
    vehicleId: booking.vehicleId.toString(),
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    towingMode: booking.towingMode,
    distanceKm: booking.distanceKm,
    estimatedFare: booking.estimatedFare,
    fareBreakdown: booking.fareBreakdown,
    advanceAmount: booking.advanceAmount,
    advancePaid: booking.advancePaid,
    advancePaymentId: booking.advancePaymentId,
    remainingAmount: booking.remainingAmount,
    remainingPaid: booking.remainingPaid,
    paymentStatus: booking.paymentStatus,
    status: booking.status,
    vendorId: booking.vendorId?.toString(),
    driverId: booking.driverId?.toString(),
    driver,
    assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
    scheduledAt: booking.scheduledAt?.toISOString(),
    statusHistory: booking.statusHistory.map((entry) => ({
      status: entry.status,
      timestamp: entry.timestamp.toISOString(),
      note: entry.note,
    })),
    cancelledAt: booking.cancelledAt?.toISOString(),
    cancelledBy: booking.cancelledBy,
    cancellationReason: booking.cancellationReason,
    refundAmount: booking.refundAmount,
    refundStatus: booking.refundStatus,
    rating: booking.rating
      ? {
          score: booking.rating.score,
          review: booking.rating.review,
          tags: booking.rating.tags,
          createdAt: booking.rating.createdAt.toISOString(),
        }
      : undefined,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

async function mapTowingBookingWithDriver(booking: ITowingBooking): Promise<TowingBookingResponseDto> {
  const driver = await resolveAssignedDriver(booking.driverId?.toString());
  return mapTowingBooking(booking, driver);
}

export class TowingBookingService {
  async createBooking(
    customerId: string,
    dto: CreateTowingBookingDto,
  ): Promise<TowingBookingResponseDto> {
    const vehicle = await vehicleRepository.findByIdForCustomer(dto.vehicleId, customerId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    const matrix = await getDistanceAndDuration(dto.pickup, dto.dropoff);
    const distanceKm = matrix?.distanceKm;
    const fareResult = calculateTowingFare(matrix?.distanceKm ?? 0, scheduledAt);
    const { fare, breakdown } = fareResult;
    const bookingNumber = await generatePrefixedBookingNumber('TOW', () =>
      towingBookingRepository.countAll(),
    );

    const booking = await towingBookingRepository.create({
      customerId: customerId as unknown as ITowingBooking['customerId'],
      bookingNumber,
      vehicleId: vehicle.id as unknown as ITowingBooking['vehicleId'],
      pickup: dto.pickup,
      dropoff: dto.dropoff,
      towingMode: dto.towingMode ?? (scheduledAt ? 'scheduled' : 'instant'),
      distanceKm,
      estimatedFare: fare,
      fareBreakdown: breakdown,
      advanceAmount: breakdown.advanceAmount,
      remainingAmount: breakdown.remainingAmount,
      paymentStatus: 'PENDING_ADVANCE',
      status: 'PENDING',
      scheduledAt,
      statusHistory: createInitialStatusHistory('PENDING'),
    });

    return mapTowingBookingWithDriver(booking);
  }

  async listBookings(
    customerId: string,
    status?: UnifiedBookingStatus,
  ): Promise<TowingBookingResponseDto[]> {
    const bookings = await towingBookingRepository.findByCustomer(customerId, { status });
    return Promise.all(
      bookings.map(async (booking) => {
        const mapped = await mapTowingBookingWithDriver(booking);
        mapped.tripStartOtp = customerTripOtp(booking);
        return mapped;
      }),
    );
  }

  async getBookingById(
    bookingId: string,
    requestingUser: { id: string; role: string },
  ): Promise<TowingBookingResponseDto> {
    const booking = await towingBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
    }

    if (booking.customerId.toString() !== requestingUser.id && requestingUser.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this booking');
    }

    const mapped = await mapTowingBookingWithDriver(booking);
    if (requestingUser.role === 'customer') {
      mapped.tripStartOtp = customerTripOtp(booking);
    }
    return mapped;
  }

  async updateStatus(
    bookingId: string,
    newStatus: UnifiedBookingStatus,
    actor: { id: string; role: string },
  ): Promise<TowingBookingResponseDto> {
    const booking = await towingBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
    }

    if (booking.customerId.toString() !== actor.id && actor.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this booking');
    }

    // VOC P0.9: forbid customers from confirming/starting/completing jobs —
    // only cancellation is theirs (via the dedicated cancel endpoint too).
    assertActorMayTransition(actor.role, booking.status, newStatus);
    assertValidStatusTransition(booking.status, newStatus);

    const updated = await towingBookingRepository.updateStatus(
      bookingId,
      newStatus,
      appendStatusHistory(booking.statusHistory, newStatus),
    );

    if (!updated) {
      throw new NotFoundError('Towing booking not found');
    }

    if (
      (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') &&
      booking.driverId
    ) {
      await releaseDriver(booking.driverId.toString());
    }

    emitBookingStatusUpdate(bookingId, newStatus, {
      statusHistory: updated.statusHistory.map((entry) => ({
        status: entry.status,
        timestamp: entry.timestamp.toISOString(),
      })),
    });

    return mapTowingBookingWithDriver(updated);
  }

  async getTracking(
    bookingId: string,
    requestingUser: { id: string; role: string },
  ): Promise<TowingTrackingResponseDto> {
    const booking = await towingBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
    }

    if (booking.customerId.toString() !== requestingUser.id && requestingUser.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this booking');
    }

    const driverVisible = isDriverVisibleToCustomer(booking.status);
    const driver = driverVisible
      ? await resolveAssignedDriver(booking.driverId?.toString())
      : undefined;

    let driverLocation: TowingTrackingResponseDto['driverLocation'];
    if (driverVisible && booking.driverId) {
      const driverUser = await UserModel.findById(booking.driverId)
        .select('currentLocation fullName mobileNumber')
        .exec();
      if (
        driverUser?.currentLocation?.latitude !== undefined &&
        driverUser.currentLocation.longitude !== undefined
      ) {
        driverLocation = {
          latitude: driverUser.currentLocation.latitude,
          longitude: driverUser.currentLocation.longitude,
          updatedAt: driverUser.currentLocation.updatedAt?.toISOString(),
          driverName: driverUser.fullName ?? driver?.name,
          driverPhone: driverUser.mobileNumber ?? driver?.phone,
        };
      }
    }

    return {
      bookingId: booking.id,
      status: mapPublicBookingStatus(booking.status),
      statusHistory: booking.statusHistory.map((entry) => ({
        status: mapPublicBookingStatus(entry.status),
        timestamp: entry.timestamp.toISOString(),
      })),
      driver,
      driverLocation,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
      tripStartOtp:
        requestingUser.role === 'customer' ? customerTripOtp(booking) : undefined,
    };
  }

  async getCancellationPreview(
    bookingId: string,
    customerId: string,
  ): Promise<CancellationResult> {
    const booking = await towingBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
    }
    if (booking.customerId.toString() !== customerId) {
      throw new ForbiddenError('You do not have access to this booking');
    }
    return getCancellationPolicy(
      booking.status,
      booking.advancePaid,
      booking.advanceAmount,
      booking.scheduledAt,
    );
  }

  async cancelBooking(
    bookingId: string,
    customerId: string,
    reason?: string,
  ): Promise<{
    booking: TowingBookingResponseDto;
    refundAmount: number;
    refundStatus: string;
    policy: CancellationResult;
  }> {
    const booking = await towingBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
    }

    if (booking.customerId.toString() !== customerId) {
      throw new ForbiddenError('You do not have access to this booking');
    }

    if (!canTransition(booking.status, 'CANCELLED')) {
      throw new BadRequestError('Cannot cancel at this stage');
    }

    const policy = getCancellationPolicy(
      booking.status,
      booking.advancePaid,
      booking.advanceAmount,
      booking.scheduledAt,
    );

    if (!policy.canCancel) {
      throw new BadRequestError(policy.reason);
    }

    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'customer';
    booking.cancellationReason = reason?.trim() || 'Customer requested';
    booking.refundAmount = policy.refundAmount;
    booking.refundStatus = policy.refundAmount > 0 ? 'PENDING' : 'NOT_APPLICABLE';
    booking.statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      note: policy.reason,
    });
    await booking.save();

    if (booking.driverId) {
      await releaseDriver(booking.driverId.toString());
    }

    if (policy.refundAmount > 0) {
      await PaymentTransactionModel.create({
        bookingId: booking._id,
        bookingType: 'towing',
        customerId: booking.customerId,
        paymentType: 'refund',
        amount: policy.refundAmount,
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

    const mapped = await mapTowingBookingWithDriver(booking);
    return {
      booking: mapped,
      refundAmount: policy.refundAmount,
      refundStatus: booking.refundStatus,
      policy,
    };
  }

  /** Used by payment module to apply advance/final payment updates. */
  async applyPaymentUpdate(
    bookingId: string,
    update: Partial<ITowingBooking>,
  ): Promise<TowingBookingResponseDto> {
    const booking = await towingBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
    }

    let statusHistory = booking.statusHistory;
    if (update.status && update.status !== booking.status) {
      statusHistory = appendStatusHistory(statusHistory, update.status);
    }

    const updated = await towingBookingRepository.updateById(bookingId, {
      ...update,
      statusHistory,
    });

    if (!updated) {
      throw new NotFoundError('Towing booking not found');
    }

    return mapTowingBookingWithDriver(updated);
  }

  async submitRating(
    bookingId: string,
    requestingUser: { id: string; role: string },
    dto: SubmitServiceBookingRatingDto,
  ): Promise<TowingBookingResponseDto> {
    const booking = await towingBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
    }

    if (booking.customerId.toString() !== requestingUser.id && requestingUser.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this booking');
    }

    const update = buildServiceBookingRatingUpdate(
      booking.status,
      booking.statusHistory,
      dto,
      Boolean(booking.rating),
    );

    const updated = await towingBookingRepository.updateById(bookingId, update);
    if (!updated) {
      throw new NotFoundError('Towing booking not found');
    }

    return mapTowingBookingWithDriver(updated);
  }
}

export const towingBookingService = new TowingBookingService();
