import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/src/errors';
import { UserModel } from '../../models/src/user';
import { VendorVehicleModel } from '../../models/src/vendorVehicle';
import { TowingBookingModel } from '../../models/src/towingBooking';
import { DriverBookingModel } from '../../models/src/driverBooking';
import { DriverVendorMembershipModel } from '../../models/src/driverVendorMembership';
import {
  claimOpenBookingOffer,
  isDriverEligibleForBooking,
  isOnSiteAssistBooking,
  listOpenBookingOffers,
  bookingServiceLabel,
  type OpenBookingOffer,
} from './bookings/driverAssignment';
import { resolveAssignedDriver } from './bookings/assignedDriver';
import type {
  VendorApproveBookingDto,
  VendorAssignBookingDto,
  VendorVerifyTripOtpDto,
} from './vendorBookingsValidator';
import { assertTripStartOtp } from './bookings/tripOtp';
import { emitBookingStatusUpdate } from './socket';

/** One booking row for the vendor portal list. */
export type VendorBookingListItem = {
  bookingType: 'towing' | 'driver';
  id: string;
  bookingNumber: string;
  status: string;
  pickup?: { label?: string; address?: string; latitude?: number; longitude?: number };
  dropoff?: { label?: string; address?: string; latitude?: number; longitude?: number } | null;
  estimatedFare?: number;
  finalFare?: number;
  distanceKm?: number;
  createdAt: string;
  scheduledAt?: string;
  serviceLabel: string;
  onSiteAssist?: boolean;
  assignedFleetVehicleLabel?: string;
  driver?: { id: string; name: string; phone: string; rating: number };
};

export class VendorBookingsService {
  /** Max bookings returned for the vendor portal list. */
  private static LIST_LIMIT = 100;

  private async assertVendor(userId: string) {
    const user = await UserModel.findById(userId).exec();
    if (!user || user.role !== 'vendor') {
      throw new ForbiddenError('Vendor access only');
    }
    return user;
  }

  private async assertVendorApproved(vendorUserId: string) {
    const user = await UserModel.findById(vendorUserId).exec();
    if (!user || user.role !== 'vendor') {
      throw new ForbiddenError('Vendor access only');
    }
    if (user.operationalStatus === 'SUSPENDED' || user.reviewStatus === 'REJECTED') {
      throw new ForbiddenError('Vendor account is suspended or rejected');
    }
    const legacyStatus = user.vendorProfile?.status;
    if (legacyStatus === 'rejected') {
      throw new ForbiddenError('Vendor registration has been rejected');
    }
    return user;
  }

  async listOffers(vendorUserId: string): Promise<OpenBookingOffer[]> {
    await this.assertVendorApproved(vendorUserId);
    return listOpenBookingOffers({ forVendorId: vendorUserId });
  }

  /** Assign a connected Driver and, for towing, one active fleet vehicle. */
  async approveBooking(
    vendorUserId: string,
    bookingId: string,
    dto: VendorApproveBookingDto,
  ) {
    return this.assignBooking(vendorUserId, bookingId, dto);
  }

  /** Read live Driver progress only for a booking owned by this Towing Vendor. */
  async getBookingTracking(
    vendorUserId: string,
    bookingId: string,
    bookingType: 'towing' | 'driver',
  ) {
    await this.assertVendorApproved(vendorUserId);
    const booking = bookingType === 'towing'
      ? await TowingBookingModel.findOne({ _id: bookingId, vendorId: vendorUserId }).exec()
      : await DriverBookingModel.findOne({ _id: bookingId, vendorId: vendorUserId }).exec();
    if (!booking) throw new NotFoundError('Vendor booking not found');

    const towingMode = (booking as { towingMode?: 'instant' | 'scheduled' | 'emergency' }).towingMode;
    const assistLabel = (booking as { assistLabel?: string }).assistLabel;
    const driverServiceType = (booking as { driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night' }).driverServiceType;
    const driver = booking.driverId
      ? await UserModel.findById(booking.driverId).select('fullName mobileNumber').lean().exec()
      : null;
    // P0-1 (v6 audit): live driver location is a post-accept signal only. A
    // vendor-dispatched booking waiting at DRIVER_ASSIGNED has not been
    // acknowledged, so it must not expose driver location yet.
    const activeStatuses = ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'];
    const updatedAt = booking.driverLocationUpdatedAt;
    const ageMs = updatedAt ? Date.now() - updatedAt.getTime() : undefined;
    const isLocationFresh = activeStatuses.includes(booking.status) &&
      typeof ageMs === 'number' && ageMs >= -30_000 && ageMs <= 90_000 &&
      typeof booking.driverLatitude === 'number' &&
      typeof booking.driverLongitude === 'number';

    return {
      bookingType,
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      serviceLabel: bookingServiceLabel(bookingType, {
        towingMode,
        assistLabel,
        driverServiceType,
      }),
      pickup: booking.pickup,
      dropoff: booking.dropoff ?? null,
      assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel ?? undefined,
      driver: driver ? {
        id: driver._id.toString(),
        name: driver.fullName ?? 'Driver',
        phone: driver.mobileNumber,
      } : undefined,
      driverLocation: isLocationFresh ? {
        latitude: booking.driverLatitude,
        longitude: booking.driverLongitude,
        updatedAt: updatedAt?.toISOString(),
      } : null,
      isLocationFresh,
      statusHistory: (booking.statusHistory ?? []).map((entry) => ({
        status: entry.status,
        timestamp: entry.timestamp.toISOString(),
        note: entry.note,
      })),
    };
  }

  /**
   * Vendor portal bookings list: every booking routed to this vendor
   * (vendorId) or claimed by one of this vendor's fleet drivers. Covers
   * awaiting-driver, assigned, in-progress and completed states so the
   * Jobs tabs reflect real fleet activity after assignment.
   */
  async listBookings(vendorUserId: string): Promise<VendorBookingListItem[]> {
    const user = await this.assertVendor(vendorUserId);

    const [legacyDriverUsers, activeMemberships] = await Promise.all([
      UserModel.find({
        role: 'driver',
        'driverProfile.vendorUserId': user._id,
      }).select('_id').lean().exec(),
      DriverVendorMembershipModel.find({
        vendorUserId: user._id,
        status: 'ACTIVE',
      }).select('driverUserId').lean().exec(),
    ]);
    const driverIds = Array.from(new Set([
      ...legacyDriverUsers.map((driver) => driver._id.toString()),
      ...activeMemberships.map((membership) => membership.driverUserId.toString()),
    ]));
    const driverIdSet = new Set(driverIds);

    const query =
      driverIds.length > 0
        ? {
            $or: [
              { vendorId: user._id },
              { driverId: { $in: driverIds } },
            ],
          }
        : { vendorId: user._id };

    const [towing, driverHire] = await Promise.all([
      TowingBookingModel.find(query)
        .sort({ createdAt: -1 })
        .limit(VendorBookingsService.LIST_LIMIT)
        .exec(),
      DriverBookingModel.find(query)
        .sort({ createdAt: -1 })
        .limit(VendorBookingsService.LIST_LIMIT)
        .exec(),
    ]);

    const items: VendorBookingListItem[] = [];
    for (const booking of towing) {
      items.push(await this.mapVendorBooking(booking.toObject(), 'towing', driverIdSet));
    }
    for (const booking of driverHire) {
      items.push(await this.mapVendorBooking(booking.toObject(), 'driver', driverIdSet));
    }

    items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return items.slice(0, VendorBookingsService.LIST_LIMIT);
  }

  private async mapVendorBooking(
    booking: {
      _id: { toString(): string };
      bookingNumber: string;
      status: string;
      pickup?: { address?: string; label?: string; latitude?: number; longitude?: number };
      dropoff?: { address?: string; label?: string; latitude?: number; longitude?: number } | null;
      estimatedFare?: number;
      finalFare?: number;
      distanceKm?: number;
      createdAt: Date;
      scheduledAt?: Date | null;
      towingMode?: 'instant' | 'scheduled' | 'emergency';
      assistLabel?: string;
      driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
      driverId?: { toString(): string } | null;
      assignedFleetVehicleLabel?: string | null;
    },
    bookingType: 'towing' | 'driver',
    driverIdSet: Set<string>,
  ): Promise<VendorBookingListItem> {
    const bookingDriverId = booking.driverId?.toString();
    const driver =
      driverIdSet.has(bookingDriverId ?? '') ? await resolveAssignedDriver(bookingDriverId) : undefined;
    return {
      bookingType,
      id: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      pickup: booking.pickup,
      dropoff: booking.dropoff ?? null,
      estimatedFare: booking.estimatedFare,
      finalFare: booking.finalFare,
      distanceKm: booking.distanceKm,
      onSiteAssist:
        bookingType === 'towing'
          ? isOnSiteAssistBooking({
              assistLabel: booking.assistLabel,
              distanceKm: booking.distanceKm,
              pickup: booking.pickup,
              dropoff: booking.dropoff ?? null,
            }) || undefined
          : undefined,
      createdAt: booking.createdAt.toISOString(),
      scheduledAt: booking.scheduledAt?.toISOString(),
      serviceLabel: bookingServiceLabel(bookingType, {
        towingMode: booking.towingMode,
        assistLabel: booking.assistLabel,
        driverServiceType: booking.driverServiceType,
      }),
      assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel ?? undefined,
      driver,
    };
  }

  /**
   * @deprecated Use approveBooking — vendor assigns vehicle only; drivers self-claim.
   * Kept for backward compatibility with older clients.
   */
  async assignBooking(
    vendorUserId: string,
    bookingId: string,
    dto: VendorAssignBookingDto,
  ) {
    await this.assertVendorApproved(vendorUserId);
    if (dto.bookingType !== 'towing') {
      throw new BadRequestError('Vendors can only assign vehicle towing jobs');
    }

    const towingBooking = await TowingBookingModel.findById(bookingId).exec();
    if (!towingBooking) {
      throw new NotFoundError('Booking not found');
    }
    const onSiteAssist = isOnSiteAssistBooking(towingBooking);

    if (!onSiteAssist) {
      const activeVehicles = await VendorVehicleModel.countDocuments({
        vendorId: vendorUserId,
        status: 'ACTIVE',
      }).exec();
      if (activeVehicles === 0) {
        throw new BadRequestError('Add an active towing vehicle before assigning this job');
      }
      if (!dto.vehicleId) {
        throw new BadRequestError('Select an active fleet vehicle for towing jobs');
      }
    }

    const driver = await UserModel.findOne({ _id: dto.driverId, role: 'driver' }).exec();
    if (!driver?.driverProfile) {
      throw new NotFoundError('Driver not found');
    }
    // P0-3 (v6 audit): membership-only dispatch. The legacy embedded vendor
    // pointer no longer authorizes NEW vendor dispatch.
    const membership = await DriverVendorMembershipModel.exists({
      vendorUserId: vendorUserId,
      driverUserId: driver._id,
      status: 'ACTIVE',
    }).exec();
    if (!membership) {
      throw new ForbiddenError('Driver is not an active member of your fleet');
    }
    if (driver.operationalStatus === 'SUSPENDED') {
      throw new BadRequestError('Driver account has been suspended');
    }
    if (driver.reviewStatus === 'REJECTED' || driver.driverProfile.status === 'REJECTED') {
      throw new BadRequestError('Driver account documents were rejected');
    }
    if (!isDriverEligibleForBooking(driver, dto.bookingType)) {
      throw new BadRequestError(
        dto.bookingType === 'towing'
          ? 'Select an eligible driver (Tow Driver or Full-Time) for towing requests'
          : 'Select a Full-Time or Part-Time driver for driver-hire requests',
      );
    }

    let fleetVehicleLabel: string | undefined;
    let fleetVehicleId: string | undefined;

    if (dto.vehicleId) {
      const vehicle = await VendorVehicleModel.findById(dto.vehicleId).exec();
      if (!vehicle) throw new NotFoundError('Fleet vehicle not found');
      if (vehicle.vendorId.toString() !== vendorUserId) {
        throw new ForbiddenError('Vehicle is not in your fleet');
      }
      if (vehicle.status !== 'ACTIVE') {
        throw new BadRequestError('Only ACTIVE fleet vehicles can be assigned');
      }
      fleetVehicleId = vehicle.id;
      fleetVehicleLabel = `${vehicle.registrationNo} · ${vehicle.type} · ${vehicle.vehicleModel}`;
    }

    const result = await claimOpenBookingOffer(bookingId, dto.bookingType, dto.driverId, {
      vendorId: vendorUserId,
      fleetVehicleId,
      fleetVehicleLabel,
    });

    const assignedDriver = await resolveAssignedDriver(dto.driverId);

    return {
      ...result,
      driver: assignedDriver,
      assignedFleetVehicleLabel: fleetVehicleLabel,
      message: onSiteAssist
        ? 'Mechanic assigned — waiting for them to accept the job'
        : dto.bookingType === 'towing'
          ? 'Driver and fleet vehicle assigned — waiting for the driver to accept'
          : 'Driver assigned — waiting for the driver to accept',
    };
  }

  /**
   * Vendor verifies customer's trip OTP and starts the service (DRIVER_ARRIVED → IN_PROGRESS).
   */
  async verifyTripOtp(
    vendorUserId: string,
    bookingId: string,
    dto: VendorVerifyTripOtpDto,
  ) {
    await this.assertVendorApproved(vendorUserId);

    const booking =
      dto.bookingType === 'towing'
        ? await TowingBookingModel.findById(bookingId).exec()
        : await DriverBookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.vendorId?.toString() !== vendorUserId) {
      throw new ForbiddenError('This booking is not assigned to your fleet');
    }
    if (booking.status !== 'DRIVER_ARRIVED') {
      throw new BadRequestError('Mark driver as arrived before verifying trip OTP');
    }

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

    const expected = {
      _id: bookingId,
      vendorId: vendorUserId,
      status: 'DRIVER_ARRIVED',
      driverId: booking.driverId,
      tripStartOtp: booking.tripStartOtp,
      tripStartOtpVerified: { $ne: true },
    };
    const verifiedAt = new Date();
    const update = {
      $set: {
        status: 'IN_PROGRESS',
        tripStartOtpVerified: true,
        tripStartOtpAttempts: 0,
      },
      $push: {
        statusHistory: {
          status: 'IN_PROGRESS',
          timestamp: verifiedAt,
        },
      },
    };
    const updated =
      dto.bookingType === 'towing'
        ? await TowingBookingModel.findOneAndUpdate(expected, update, {
            new: true,
            runValidators: true,
          }).exec()
        : await DriverBookingModel.findOneAndUpdate(expected, update, {
            new: true,
            runValidators: true,
          }).exec();

    if (!updated) throw new ConflictError('Booking changed before trip OTP verification was saved');

    emitBookingStatusUpdate(bookingId, 'IN_PROGRESS', {
      message: 'Trip started — OTP verified',
    });

    const driver = await resolveAssignedDriver(updated.driverId?.toString());
    return {
      id: updated.id,
      status: updated.status,
      bookingNumber: updated.bookingNumber,
      driver,
      assignedFleetVehicleLabel:
        'assignedFleetVehicleLabel' in updated ? updated.assignedFleetVehicleLabel : undefined,
      message: 'Trip OTP verified — service started',
    };
  }

  async getAssignedSummary(bookingId: string, bookingType: 'towing' | 'driver') {
    const booking =
      bookingType === 'towing'
        ? await TowingBookingModel.findById(bookingId).exec()
        : await DriverBookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundError('Booking not found');

    const driver = await resolveAssignedDriver(booking.driverId?.toString());
    return {
      id: booking.id,
      status: booking.status,
      bookingNumber: booking.bookingNumber,
      vendorId: 'vendorId' in booking ? booking.vendorId?.toString() : undefined,
      driver,
      assignedFleetVehicleLabel:
        'assignedFleetVehicleLabel' in booking
          ? booking.assignedFleetVehicleLabel
          : undefined,
    };
  }
}

export const vendorBookingsService = new VendorBookingsService();
