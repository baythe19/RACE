import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../utils/src/errors';
import { emitBookingStatusUpdate } from '../socket';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { vehicleRepository } from '../vehicleRepository';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import {
  assertValidStatusTransition,
  calculateDriverFare,
  createInitialStatusHistory,
  generatePrefixedBookingNumber,
  getVehicleCategory,
  resolvePackageHours,
} from './booking';
import { assertActorMayTransition, canTransition, type UnifiedBookingStatus } from '../bookingStatusConstants';
import { driverBookingRepository } from '../driverBookingRepository';
import type { IDriverBooking } from '../../../models/src/driverBooking';
import type {
  CreateDriverBookingDto,
  DriverBookingResponseDto,
  DriverTrackingResponseDto,
} from '../driverBookingValidator';
import type { SubmitServiceBookingRatingDto } from '../bookingRatingValidator';
import { buildServiceBookingRatingUpdate } from './bookingRating';
import { getCancellationPolicy, type CancellationResult } from './cancellation';
import { releaseDriver } from './driverAssignment';
import { resolveAssignedDriver } from './assignedDriver';
import {
  applyCustomerBookingView,
  isDriverVisibleToCustomer,
  isAwaitingPartnerAccept,
  mapPublicBookingStatus,
} from '../bookingDisplayStatus';
import { customerTripOtp, customerCompletionOtp } from './tripOtp';
import { resolveCustomerTrackingExtras } from './customerTrackingLocation';
import { ensureBookingServiceable } from './serviceability';
import {
  notifyAdminCustomerBookingCreated,
  notifyCustomerBookingCreated,
  notifyCustomerBookingCancelled,
  notifyDriversOpenHireJob,
} from '../bookingNotifications';
import { bookingServiceLabel } from './driverAssignment';

function mapDriverBooking(
  booking: IDriverBooking,
  driver?: DriverBookingResponseDto['driver'],
): DriverBookingResponseDto {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    customerId: booking.customerId.toString(),
    vehicleId: booking.vehicleId?.toString(),
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    driverServiceType: booking.driverServiceType,
    estimatedDurationHours: booking.estimatedDurationHours,
    packageHours: booking.packageHours,
    vehicleCategory: booking.vehicleCategory,
    includedKm: booking.includedKm,
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
    tripStartOtp: customerTripOtp(booking),
    completionOtp: customerCompletionOtp(booking),
    arrivedAtDropoffAt: booking.arrivedAtDropoffAt?.toISOString(),
    paymentCollectionMode: booking.paymentCollectionMode,
    paymentConfirmedByCustomer: booking.paymentConfirmedByCustomer,
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

async function mapDriverBookingWithDriver(
  booking: IDriverBooking,
): Promise<DriverBookingResponseDto> {
  const driver = await resolveAssignedDriver(booking.driverId?.toString());
  return mapDriverBooking(booking, driver);
}

export class DriverBookingService {
  async createBooking(
    customerId: string,
    dto: CreateDriverBookingDto,
  ): Promise<DriverBookingResponseDto> {
    const vehicle = await vehicleRepository.findByIdForCustomer(dto.vehicleId, customerId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    ensureBookingServiceable(dto.pickup);

    const vehicleCategory = getVehicleCategory(vehicle.vehicleType, vehicle.vehicleSubtype);
    const packageHours = resolvePackageHours(dto.packageHours, dto.estimatedDurationHours);
    const { fare, breakdown } = calculateDriverFare(packageHours, vehicleCategory);
    const bookingNumber = await generatePrefixedBookingNumber('DRV', () =>
      driverBookingRepository.countAll(),
    );

    const booking = await driverBookingRepository.create({
      customerId: customerId as unknown as IDriverBooking['customerId'],
      bookingNumber,
      vehicleId: vehicle.id as unknown as IDriverBooking['vehicleId'],
      pickup: dto.pickup,
      dropoff: dto.dropoff,
      driverServiceType: dto.driverServiceType ?? 'part_time',
      estimatedDurationHours: dto.estimatedDurationHours ?? packageHours,
      packageHours,
      vehicleCategory,
      includedKm: breakdown.includedKm,
      estimatedFare: fare,
      fareBreakdown: breakdown,
      advanceAmount: breakdown.advanceAmount,
      remainingAmount: breakdown.remainingAmount,
      paymentStatus: 'PENDING_ADVANCE',
      status: 'PENDING',
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      statusHistory: createInitialStatusHistory('PENDING'),
    });

    void notifyAdminCustomerBookingCreated({
      bookingNumber: booking.bookingNumber,
      bookingType: 'driver',
      bookingId: booking.id,
    }).catch(() => undefined);
    void notifyCustomerBookingCreated({
      customerId,
      bookingNumber: booking.bookingNumber,
      bookingType: 'driver',
      bookingId: booking.id,
      advanceAmount: breakdown.advanceAmount,
    }).catch(() => undefined);

    return mapDriverBookingWithDriver(booking);
  }

  async listBookings(
    customerId: string,
    status?: UnifiedBookingStatus,
  ): Promise<DriverBookingResponseDto[]> {
    const bookings = await driverBookingRepository.findByCustomerWithOtp(customerId, { status });
    return Promise.all(
      bookings.map(async (booking) => {
        const mapped = applyCustomerBookingView(
          await mapDriverBookingWithDriver(booking),
          booking.status,
        );
        mapped.tripStartOtp = customerTripOtp(booking);
        return mapped;
      }),
    );
  }

  async getBookingById(
    bookingId: string,
    requestingUser: { id: string; role: string },
  ): Promise<DriverBookingResponseDto> {
    const booking = await driverBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Driver booking not found');
    }

    if (booking.customerId.toString() !== requestingUser.id && requestingUser.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this booking');
    }

    let mapped = await mapDriverBookingWithDriver(booking);
    if (requestingUser.role === 'customer') {
      mapped = applyCustomerBookingView(mapped, booking.status);
      mapped.tripStartOtp = customerTripOtp(booking);
      mapped.completionOtp = customerCompletionOtp(booking);
    } else {
      mapped.tripStartOtp = undefined;
      mapped.completionOtp = undefined;
    }
    return mapped;
  }

  async updateStatus(
    bookingId: string,
    newStatus: UnifiedBookingStatus,
    actor: { id: string; role: string },
  ): Promise<DriverBookingResponseDto> {
    const booking = await driverBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Driver booking not found');
    }

    if (booking.customerId.toString() !== actor.id && actor.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this booking');
    }

    if (newStatus === 'CANCELLED' && actor.role !== 'admin') {
      throw new BadRequestError(
        'Use the cancellation endpoint so the cancellation policy and refund state are applied',
      );
    }

    // VOC P0.9: forbid customers from confirming/starting/completing jobs —
    // only cancellation is theirs (via the dedicated cancel endpoint too).
    assertActorMayTransition(actor.role, booking.status, newStatus);
    assertValidStatusTransition(booking.status, newStatus);

    const updated = await driverBookingRepository.updateStatus(
      bookingId,
      booking.status,
      newStatus,
    );

    if (!updated) {
      throw new ConflictError('Booking changed before the status update was saved');
    }

    if (
      (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') &&
      booking.driverId
    ) {
      await releaseDriver(booking.driverId.toString(), bookingId);
    }

    emitBookingStatusUpdate(bookingId, newStatus, {
      statusHistory: updated.statusHistory.map((entry) => ({
        status: entry.status,
        timestamp: entry.timestamp.toISOString(),
      })),
    });

    return mapDriverBookingWithDriver(updated);
  }

  async getTracking(
    bookingId: string,
    requestingUser: { id: string; role: string },
  ): Promise<DriverTrackingResponseDto> {
    const booking = await driverBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Driver booking not found');
    }

    if (booking.customerId.toString() !== requestingUser.id && requestingUser.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this booking');
    }

    const driverVisible = isDriverVisibleToCustomer(booking.status);
    const driver = driverVisible
      ? await resolveAssignedDriver(booking.driverId?.toString())
      : undefined;

    // P-TRACK-01: prefer the fresh booking-scoped fix written by the active
    // trip reporter; fall back to User.currentLocation for older flows.
    // P-UPI-01: also surface the driver's saved UPI VPA for dropoff settlement.
    const { driverLocation, driverUpiId } = await resolveCustomerTrackingExtras(booking);

    return {
      bookingId: booking.id,
      status: mapPublicBookingStatus(booking.status),
      awaitingPartnerAccept: isAwaitingPartnerAccept(booking.status),
      statusHistory: booking.statusHistory.map((entry) => ({
        status: mapPublicBookingStatus(entry.status),
        timestamp: entry.timestamp.toISOString(),
      })),
      driver,
      driverLocation,
      driverUpiId,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
      tripStartOtp:
        requestingUser.role === 'customer' ? customerTripOtp(booking) : undefined,
      completionOtp:
        requestingUser.role === 'customer' ? customerCompletionOtp(booking) : undefined,
      arrivedAtDropoffAt: booking.arrivedAtDropoffAt?.toISOString(),
      paymentCollectionMode: booking.paymentCollectionMode,
      paymentConfirmedByCustomer: booking.paymentConfirmedByCustomer,
      fare: booking.finalFare ?? booking.estimatedFare,
    };
  }

  async getCancellationPreview(
    bookingId: string,
    customerId: string,
  ): Promise<CancellationResult> {
    const booking = await driverBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Driver booking not found');
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
    booking: DriverBookingResponseDto;
    refundAmount: number;
    refundStatus: string;
    policy: CancellationResult;
  }> {
    let booking = await driverBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Driver booking not found');
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

    const cancelledAt = new Date();
    const cancelledBooking = await DriverBookingModel.findOneAndUpdate(
      {
        _id: booking._id,
        status: booking.status,
        advancePaid: booking.advancePaid,
        advanceAmount: booking.advanceAmount,
      },
      {
        $set: {
          status: 'CANCELLED',
          cancelledAt,
          cancelledBy: 'customer',
          cancellationReason: reason?.trim() || 'Customer requested',
          refundAmount: policy.refundAmount,
          refundStatus: policy.refundAmount > 0 ? 'PENDING' : 'NOT_APPLICABLE',
        },
        $push: {
          statusHistory: {
            status: 'CANCELLED',
            timestamp: cancelledAt,
            note: policy.reason,
          },
        },
      },
      { new: true, runValidators: true },
    ).exec();
    if (!cancelledBooking) {
      throw new ConflictError('Booking changed while cancellation was being processed');
    }
    booking = cancelledBooking;

    if (booking.driverId) {
      await releaseDriver(booking.driverId.toString(), booking._id.toString());
    }

    if (policy.refundAmount > 0) {
      await PaymentTransactionModel.create({
        bookingId: booking._id,
        bookingType: 'driver',
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

    void notifyCustomerBookingCancelled({
      customerId,
      bookingNumber: booking.bookingNumber,
      bookingType: 'driver',
      bookingId: booking.id,
      refundAmount: policy.refundAmount,
    }).catch(() => undefined);

    const mapped = await mapDriverBookingWithDriver(booking);
    return {
      booking: mapped,
      refundAmount: policy.refundAmount,
      refundStatus: booking.refundStatus,
      policy,
    };
  }

  async applyPaymentUpdate(
    bookingId: string,
    update: Partial<IDriverBooking>,
  ): Promise<DriverBookingResponseDto> {
    const booking = await driverBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Driver booking not found');
    }

    const expectedFields: Record<string, unknown> = {};
    if (update.advancePaid === true) expectedFields.advancePaid = { $ne: true };
    if (update.remainingPaid === true) expectedFields.remainingPaid = { $ne: true };
    if (update.remainingPaid === true && booking.status !== 'COMPLETED') {
      throw new ConflictError('Booking is no longer eligible for final payment');
    }

    const updateFields = { ...update };
    delete updateFields.statusHistory;
    delete updateFields.status;

    const updateOperation: Record<string, unknown> = { $set: updateFields };
    if (update.status) updateFields.status = update.status;
    if (update.status && update.status !== booking.status) {
      updateOperation.$push = {
        statusHistory: { status: update.status, timestamp: new Date() },
      };
    }

    const updated = await DriverBookingModel.findOneAndUpdate(
      { _id: bookingId, status: booking.status, ...expectedFields },
      updateOperation,
      { new: true, runValidators: true },
    ).exec();

    if (!updated) {
      throw new ConflictError('Booking payment state changed before the payment was applied');
    }

    emitBookingStatusUpdate(bookingId, updated.status, {
      paymentStatus: updated.paymentStatus,
      statusHistory: updated.statusHistory.map((entry) => ({
        status: entry.status,
        timestamp: entry.timestamp.toISOString(),
        note: entry.note,
      })),
    });

    if (update.status === 'CONFIRMED' && booking.status !== 'CONFIRMED') {
      void notifyDriversOpenHireJob({
        bookingNumber: updated.bookingNumber,
        bookingId: updated.id,
        serviceLabel: bookingServiceLabel('driver', {
          driverServiceType: updated.driverServiceType,
        }),
        driverServiceType: updated.driverServiceType,
        pickupAddress: updated.pickup?.address,
      }).catch(() => undefined);
    }

    return mapDriverBookingWithDriver(updated);
  }

  async submitRating(
    bookingId: string,
    requestingUser: { id: string; role: string },
    dto: SubmitServiceBookingRatingDto,
  ): Promise<DriverBookingResponseDto> {
    const booking = await driverBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Driver booking not found');
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

    const updated = await driverBookingRepository.updateById(bookingId, update);
    if (!updated) {
      throw new NotFoundError('Driver booking not found');
    }

    return mapDriverBookingWithDriver(updated);
  }
}

export const driverBookingService = new DriverBookingService();
