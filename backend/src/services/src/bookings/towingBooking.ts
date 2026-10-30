import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../utils/src/errors';
import { getDistanceAndDuration } from '../googleMaps';
import { emitBookingStatusUpdate } from '../socket';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { vehicleRepository } from '../vehicleRepository';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import {
  assertValidStatusTransition,
  calculateTowingFare,
  calculateRoadsideFlatFare,
  createInitialStatusHistory,
  generatePrefixedBookingNumber,
  type TowingPricingMode,
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
import { releaseDriver, releaseFleetVehicleFromBooking } from './driverAssignment';
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
  notifyVendorsOpenTowingJob,
} from '../bookingNotifications';

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
    assistLabel: booking.assistLabel,
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

async function mapTowingBookingWithDriver(booking: ITowingBooking): Promise<TowingBookingResponseDto> {
  const driver = await resolveAssignedDriver(booking.driverId?.toString());
  return mapTowingBooking(booking, driver);
}

function resolveTowingMode(
  dto: CreateTowingBookingDto,
  scheduledAt?: Date,
): TowingPricingMode {
  if (dto.towingMode === 'emergency' || dto.towingMode === 'scheduled' || dto.towingMode === 'instant') {
    return dto.towingMode;
  }
  if (scheduledAt) {
    return 'scheduled';
  }
  return 'instant';
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

    ensureBookingServiceable(dto.pickup);

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    const towingMode = resolveTowingMode(dto, scheduledAt);
    const matrix = await getDistanceAndDuration(dto.pickup, dto.dropoff);
    const distanceKm = matrix?.distanceKm;
    const fareResult = calculateTowingFare(
      matrix?.distanceKm ?? 0,
      scheduledAt,
      towingMode,
    );
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
      towingMode,
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

    void notifyAdminCustomerBookingCreated({
      bookingNumber: booking.bookingNumber,
      bookingType: 'towing',
      bookingId: booking.id,
    }).catch(() => undefined);
    void notifyCustomerBookingCreated({
      customerId,
      bookingNumber: booking.bookingNumber,
      bookingType: 'towing',
      bookingId: booking.id,
      advanceAmount: breakdown.advanceAmount,
    }).catch(() => undefined);

    return mapTowingBookingWithDriver(booking);
  }

  /** On-spot roadside assist — flat fare, uses towing dispatch pipeline. */
  async createRoadsideOnSiteBooking(
    customerId: string,
    input: {
      vehicleId: string;
      pickup: CreateTowingBookingDto['pickup'];
      serviceType: string;
      serviceLabel: string;
      flatFare: number;
      scheduledAt?: string;
    },
  ): Promise<TowingBookingResponseDto> {
    const vehicle = await vehicleRepository.findByIdForCustomer(input.vehicleId, customerId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    ensureBookingServiceable(input.pickup);

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
    const { fare, breakdown } = calculateRoadsideFlatFare(input.flatFare);
    const bookingNumber = await generatePrefixedBookingNumber('RSV', () =>
      towingBookingRepository.countAll(),
    );

    const onSiteLocation = input.pickup;

    const booking = await towingBookingRepository.create({
      customerId: customerId as unknown as ITowingBooking['customerId'],
      bookingNumber,
      vehicleId: vehicle.id as unknown as ITowingBooking['vehicleId'],
      pickup: onSiteLocation,
      dropoff: onSiteLocation,
      towingMode: 'instant',
      assistLabel: input.serviceLabel,
      distanceKm: 0,
      estimatedFare: fare,
      fareBreakdown: breakdown,
      advanceAmount: breakdown.advanceAmount,
      remainingAmount: breakdown.remainingAmount,
      paymentStatus: 'PENDING_ADVANCE',
      status: 'PENDING',
      scheduledAt,
      statusHistory: createInitialStatusHistory('PENDING').map((entry, index) =>
        index === 0
          ? { ...entry, note: `${input.serviceLabel} · on-site assist` }
          : entry,
      ),
    });

    void notifyAdminCustomerBookingCreated({
      bookingNumber: booking.bookingNumber,
      bookingType: 'towing',
      bookingId: booking.id,
    }).catch(() => undefined);
    void notifyCustomerBookingCreated({
      customerId,
      bookingNumber: booking.bookingNumber,
      bookingType: 'towing',
      bookingId: booking.id,
      advanceAmount: breakdown.advanceAmount,
    }).catch(() => undefined);

    return mapTowingBookingWithDriver(booking);
  }

  async listBookings(
    customerId: string,
    status?: UnifiedBookingStatus,
  ): Promise<TowingBookingResponseDto[]> {
    const bookings = await towingBookingRepository.findByCustomerWithOtp(customerId, { status });
    return Promise.all(
      bookings.map(async (booking) => {
        const mapped = applyCustomerBookingView(
          await mapTowingBookingWithDriver(booking),
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
  ): Promise<TowingBookingResponseDto> {
    const booking = await towingBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
    }

    if (booking.customerId.toString() !== requestingUser.id && requestingUser.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this booking');
    }

    let mapped = await mapTowingBookingWithDriver(booking);
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
  ): Promise<TowingBookingResponseDto> {
    const booking = await towingBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
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

    const updated = await towingBookingRepository.updateStatus(
      bookingId,
      booking.status,
      newStatus,
    );

    if (!updated) {
      throw new ConflictError('Booking changed before the status update was saved');
    }

    if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
      if (booking.driverId) {
        await releaseDriver(booking.driverId.toString(), bookingId);
      }
      await releaseFleetVehicleFromBooking(bookingId);
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
    const booking = await towingBookingRepository.findByIdWithOtp(bookingId);
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
    const booking = await towingBookingRepository.findByIdWithOtp(bookingId);
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
    let booking = await towingBookingRepository.findByIdWithOtp(bookingId);
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

    const cancelledAt = new Date();
    const cancelledBooking = await TowingBookingModel.findOneAndUpdate(
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
    await releaseFleetVehicleFromBooking(booking._id.toString());

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

    void notifyCustomerBookingCancelled({
      customerId,
      bookingNumber: booking.bookingNumber,
      bookingType: 'towing',
      bookingId: booking.id,
      refundAmount: policy.refundAmount,
    }).catch(() => undefined);

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
    const booking = await towingBookingRepository.findByIdWithOtp(bookingId);
    if (!booking) {
      throw new NotFoundError('Towing booking not found');
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

    const updated = await TowingBookingModel.findOneAndUpdate(
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
      void notifyVendorsOpenTowingJob({
        bookingNumber: updated.bookingNumber,
        bookingId: updated.id,
        serviceLabel: updated.assistLabel?.trim() || 'Towing',
        pickupAddress: updated.pickup?.address,
      }).catch(() => undefined);
    }

    return mapTowingBookingWithDriver(updated);
  }

  async submitRating(
    bookingId: string,
    requestingUser: { id: string; role: string },
    dto: SubmitServiceBookingRatingDto,
  ): Promise<TowingBookingResponseDto> {
    const booking = await towingBookingRepository.findByIdWithOtp(bookingId);
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
