import { Types } from 'mongoose';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/src/errors';
import { hasUserCapability } from '../../auth/src/roles';
import { DriverVendorMembershipModel } from '../../models/src/driverVendorMembership';
import { UserModel } from '../../models/src/user';
import { normalizeMobileNumber } from '../../utils/src/otp';
import { userRepository } from './userRepository';
import { createNotification } from './admin/notificationService';

const GENERIC_INVITE_RESULT = {
  accepted: true,
  message: 'If a verified Driver account matches that number, an invitation has been sent.',
};

/** P1 (v6 audit): pending invitations expire after 7 days (configurable). */
const INVITATION_TTL_MS =
  Math.max(1, Number(process.env.VENDOR_INVITATION_TTL_DAYS ?? 7)) * 24 * 60 * 60 * 1000;

export class DriverVendorMembershipService {
  private async approvedVendor(userId: string) {
    const vendor = await UserModel.findById(userId).exec();
    if (!vendor || !hasUserCapability(vendor, 'vendor')) {
      throw new ForbiddenError('Towing Vendor access only');
    }
    if (vendor.vendorProfile?.status !== 'approved') {
      throw new ForbiddenError('Your Towing Vendor account must be approved before managing Drivers.');
    }
    return vendor;
  }

  async invite(vendorUserId: string, rawPhone: string) {
    const vendor = await this.approvedVendor(vendorUserId);
    const phone = normalizeMobileNumber(rawPhone);
    const driver = await userRepository.findByMobile(phone);

    // Do not reveal whether a phone has an account, is verified, or is driver-ready.
    if (!driver || !driver.isVerified || !driver.driverProfile ||
        !hasUserCapability(driver, 'driver') || driver.driverProfile.status !== 'APPROVED' ||
        driver.activeBookingId || driver.accountStatus === 'SUSPENDED' ||
        driver.accountStatus === 'INACTIVE' ||
        driver.driverProfile.driverType === 'Part-Time') {
      return GENERIC_INVITE_RESULT;
    }

    // A legacy embedded link can only be converted by its current vendor.
    // This keeps phone search from stealing a Driver from another fleet.
    const legacyVendorId = driver.driverProfile.vendorUserId?.toString();
    if (legacyVendorId && legacyVendorId !== vendor._id.toString()) {
      return GENERIC_INVITE_RESULT;
    }

    const driverId = driver.id;

    // A driver already connected to a fleet cannot receive invitations.
    const activeExisting = await DriverVendorMembershipModel.exists({
      driverUserId: driver._id,
      status: 'ACTIVE',
    });
    if (activeExisting) {
      return GENERIC_INVITE_RESULT;
    }

    // P1: an expired stale invite must not block a fresh invitation.
    await DriverVendorMembershipModel.updateMany(
      {
        driverLockKey: driverId,
        status: 'PENDING',
        expiresAt: { $ne: null, $lte: new Date() },
      },
      {
        $set: { status: 'EXPIRED' },
        $unset: { driverLockKey: 1 },
      },
    ).exec();
    if (await DriverVendorMembershipModel.exists({ driverLockKey: driverId })) {
      return GENERIC_INVITE_RESULT;
    }

    try {
      const invitation = await DriverVendorMembershipModel.create({
        vendorUserId: vendor._id,
        driverUserId: driver._id,
        status: 'PENDING',
        invitedBy: vendor._id,
        invitedAt: new Date(),
        // P1 (v6 audit): pending invitations must not hold the one-vendor
        // driver lock forever.
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        driverLockKey: driverId,
      });
      try {
        await createNotification({
          audience: 'driver',
          userId: driver._id,
          category: 'driver',
          type: 'info',
          title: 'Towing Vendor invitation',
          message: (vendor.vendorProfile?.businessName ?? vendor.fullName ?? 'A Towing Vendor') +
            ' invited you to join their fleet. Review the request in My Vendor.',
          entityType: 'driver_vendor_membership',
          entityId: invitation.id,
        });
      } catch {
        // The invitation remains available through the canonical Driver API.
      }
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error &&
            (error as { code?: number }).code === 11000)) {
        throw error;
      }
    }
    return GENERIC_INVITE_RESULT;
  }

  async listVendor(vendorUserId: string) {
    await this.approvedVendor(vendorUserId);
    const memberships = await DriverVendorMembershipModel.find({
      vendorUserId: new Types.ObjectId(vendorUserId),
      status: { $in: ['PENDING', 'ACTIVE'] },
    }).sort({ updatedAt: -1 }).lean().exec();
    const drivers = await UserModel.find({
      _id: { $in: memberships.filter((m) => m.status === 'ACTIVE').map((m) => m.driverUserId) },
    }).select('fullName mobileNumber email isAvailable activeBookingId driverProfile.driverCode driverProfile.status driverProfile.driverType driverProfile.city driverProfile.rating reviewStatus operationalStatus accountStatus').lean().exec();
    const byId = new Map(drivers.map((d) => [d._id.toString(), d]));

    return memberships.map((membership) => {
      const driver = byId.get(membership.driverUserId.toString());
      const isOperational = driver && driver.operationalStatus !== 'SUSPENDED' && driver.reviewStatus !== 'REJECTED' && driver.accountStatus !== 'SUSPENDED';
      return {
        id: membership._id.toString(),
        status: membership.status,
        invitedAt: membership.invitedAt.toISOString(),
        acceptedAt: membership.status === 'ACTIVE' ? membership.decidedAt?.toISOString() : undefined,
        driver: membership.status === 'ACTIVE' && driver ? {
          id: driver._id.toString(),
          name: driver.fullName ?? 'Driver',
          phone: driver.mobileNumber,
          email: driver.email,
          driverCode: driver.driverProfile?.driverCode,
          driverStatus: driver.driverProfile?.status ?? driver.reviewStatus ?? 'PENDING',
          reviewStatus: driver.reviewStatus ?? driver.driverProfile?.status ?? 'PENDING',
          operationalStatus: driver.operationalStatus ?? 'ENABLED',
          driverType: driver.driverProfile?.driverType,
          city: driver.driverProfile?.city,
          rating: driver.driverProfile?.rating ?? 0,
          isAvailable: Boolean(isOperational && driver.isAvailable === true && !driver.activeBookingId),
          isBusy: Boolean(driver.activeBookingId),
        } : undefined,
      };
    });
  }

  async listDriverInvitations(driverUserId: string) {
    const hasActiveMembership = await DriverVendorMembershipModel.exists({
      driverUserId: new Types.ObjectId(driverUserId),
      status: 'ACTIVE',
    });
    if (hasActiveMembership) {
      return [];
    }

    // P1: hide + lazily expire invitations past their TTL.
    await DriverVendorMembershipModel.updateMany(
      {
        driverUserId: new Types.ObjectId(driverUserId),
        status: 'PENDING',
        expiresAt: { $ne: null, $lte: new Date() },
      },
      {
        $set: { status: 'EXPIRED' },
        $unset: { driverLockKey: 1 },
      },
    ).exec();
    const memberships = await DriverVendorMembershipModel.find({
      driverUserId: new Types.ObjectId(driverUserId),
      status: 'PENDING',
    }).sort({ invitedAt: -1 }).lean().exec();
    const vendors = await UserModel.find({
      _id: { $in: memberships.map((m) => m.vendorUserId) },
    }).select('fullName vendorProfile.businessName vendorProfile.ownerName vendorProfile.address').lean().exec();
    const byId = new Map(vendors.map((v) => [v._id.toString(), v]));

    return memberships.flatMap((membership) => {
      const vendor = byId.get(membership.vendorUserId.toString());
      if (!vendor) return [];
      return [{
        id: membership._id.toString(),
        invitedAt: membership.invitedAt.toISOString(),
        vendor: {
          id: vendor._id.toString(),
          name: vendor.vendorProfile?.businessName ?? vendor.fullName ?? 'Towing Vendor',
          ownerName: vendor.vendorProfile?.ownerName ?? vendor.fullName,
          address: vendor.vendorProfile?.address,
        },
      }];
    });
  }

  async getDriverMembership(driverUserId: string) {
    const membership = await DriverVendorMembershipModel.findOne({
      driverUserId: new Types.ObjectId(driverUserId),
      status: 'ACTIVE',
    }).sort({ decidedAt: -1 }).lean().exec();
    if (!membership) return null;
    const vendor = await UserModel.findById(membership.vendorUserId)
      .select('fullName vendorProfile.businessName vendorProfile.ownerName vendorProfile.address vendorProfile.status')
      .lean().exec();
    if (!vendor || vendor.vendorProfile?.status !== 'approved') return null;
    return {
      id: membership._id.toString(),
      acceptedAt: membership.decidedAt?.toISOString(),
      vendor: {
        id: vendor._id.toString(),
        name: vendor.vendorProfile.businessName ?? vendor.fullName ?? 'Towing Vendor',
        ownerName: vendor.vendorProfile.ownerName ?? vendor.fullName,
        address: vendor.vendorProfile.address,
      },
    };
  }

  async respond(driverUserId: string, membershipId: string, decision: 'accept' | 'decline') {
    // P1 (v6 audit): lazily expire stale pending invitations so a dead invite
    // cannot keep holding the one-vendor driver lock.
    await DriverVendorMembershipModel.updateMany(
      {
        status: 'PENDING',
        expiresAt: { $ne: null, $lte: new Date() },
      },
      {
        $set: { status: 'EXPIRED' },
        $unset: { driverLockKey: 1 },
      },
    ).exec();

    const membership = await DriverVendorMembershipModel.findOne({
      _id: membershipId,
      driverUserId: new Types.ObjectId(driverUserId),
      status: 'PENDING',
    }).exec();
    if (!membership) throw new NotFoundError('Invitation not found or already answered');

    const driver = await UserModel.findById(driverUserId).exec();
    if (!driver || !driver.driverProfile || !hasUserCapability(driver, 'driver')) {
      throw new ForbiddenError('Driver account required');
    }
    if (driver.activeBookingId) throw new ConflictError('Finish your active job before joining a vendor fleet');

    const vendor = await UserModel.findById(membership.vendorUserId).exec();
    if (!vendor || vendor.vendorProfile?.status !== 'approved') {
      throw new ConflictError('This Towing Vendor is no longer eligible for fleet invitations');
    }

    const legacyVendorId = driver.driverProfile.vendorUserId?.toString();
    if (legacyVendorId && legacyVendorId !== vendor._id.toString()) {
      throw new ConflictError('This Driver is already connected to another Towing Vendor');
    }

    if (decision === 'accept') {
      const activeExisting = await DriverVendorMembershipModel.findOne({
        driverUserId: driver._id,
        status: 'ACTIVE',
      }).exec();
      if (activeExisting && activeExisting._id.toString() !== membership._id.toString()) {
        throw new ConflictError('You are already connected to another Towing Vendor fleet');
      }
    }

    // Retire vendor-issued credentials when the Driver explicitly answers.
    // If the state update races, the invitation remains pending and can be retried.
    if (legacyVendorId === vendor._id.toString()) {
      const unlinked = await UserModel.updateOne(
        { _id: driver._id, 'driverProfile.vendorUserId': vendor._id },
        {
          $unset: {
            'driverProfile.vendorUserId': '',
            'driverProfile.fleetSource': '',
            'driverProfile.loginId': '',
            'driverProfile.passwordHash': '',
            'driverProfile.vehicleRegistration': '',
          },
        },
      ).exec();
      if (!unlinked.matchedCount) {
        throw new ConflictError('Driver fleet connection changed; refresh and try again');
      }
    }

    const decidedAt = new Date();
    const status = decision === 'accept' ? 'ACTIVE' : 'DECLINED';
    const updated = await DriverVendorMembershipModel.findOneAndUpdate(
      { _id: membership._id, driverUserId: driver._id, status: 'PENDING' },
      {
        $set: { status, decidedBy: driver._id, decidedAt },
        ...(decision === 'decline' ? { $unset: { driverLockKey: 1 } } : {}),
      },
      { new: true, runValidators: true },
    ).exec();
    if (!updated) throw new ConflictError('Invitation state changed; refresh and try again');

    if (decision === 'accept') {
      // Invalidate and expire all other pending invitations for this driver
      await DriverVendorMembershipModel.updateMany(
        {
          driverUserId: driver._id,
          _id: { $ne: membership._id },
          status: 'PENDING',
        },
        {
          $set: { status: 'EXPIRED' },
          $unset: { driverLockKey: 1 },
        },
      ).exec();
    }

    try {
      await createNotification({
        audience: 'vendor',
        userId: vendor._id,
        category: 'driver',
        type: decision === 'accept' ? 'success' : 'info',
        title: decision === 'accept' ? 'Driver joined your fleet' : 'Driver declined invitation',
        message: (driver.fullName ?? 'A Driver') + (decision === 'accept' ? ' accepted' : ' declined') + ' your fleet invitation.',
        entityType: 'driver_vendor_membership',
        entityId: updated.id,
      });
    } catch {
      // Clients refetch membership state after reconnect.
    }
    return { id: updated.id, status: updated.status, decidedAt: updated.decidedAt?.toISOString() };
  }

  async revoke(vendorUserId: string, membershipId: string, reason?: string) {
    const vendor = await this.approvedVendor(vendorUserId);
    const membership = await DriverVendorMembershipModel.findOne({
      _id: membershipId,
      vendorUserId: vendor._id,
      status: { $in: ['PENDING', 'ACTIVE'] },
    }).exec();
    if (!membership) throw new NotFoundError('Membership not found');

    const driver = await UserModel.findById(membership.driverUserId).exec();
    if (driver?.activeBookingId) {
      throw new BadRequestError('A Driver on an active job cannot be removed from the fleet');
    }
    if (driver?.driverProfile?.vendorUserId?.toString() === vendor._id.toString()) {
      await UserModel.updateOne(
        { _id: driver._id, 'driverProfile.vendorUserId': vendor._id },
        {
          $unset: {
            'driverProfile.vendorUserId': '',
            'driverProfile.fleetSource': '',
            'driverProfile.loginId': '',
            'driverProfile.passwordHash': '',
            'driverProfile.vehicleRegistration': '',
          },
        },
      ).exec();
    }

    const revokedAt = new Date();
    const updated = await DriverVendorMembershipModel.findOneAndUpdate(
      { _id: membership._id, vendorUserId: vendor._id, status: membership.status },
      {
        $set: {
          status: 'REVOKED',
          revokedBy: vendor._id,
          revokedAt,
          revocationReason: reason?.trim().slice(0, 500),
        },
        $unset: { driverLockKey: 1 },
      },
      { new: true, runValidators: true },
    ).exec();
    if (!updated) throw new ConflictError('Membership state changed; refresh and try again');

    if (driver) {
      try {
        await createNotification({
          audience: 'driver',
          userId: driver._id,
          category: 'driver',
          type: 'warning',
          title: 'Towing Vendor connection ended',
          message: (vendor.vendorProfile?.businessName ?? 'Your Towing Vendor') + ' removed your fleet connection.',
          entityType: 'driver_vendor_membership',
          entityId: updated.id,
        });
      } catch {
        // The canonical membership state is available on the next Driver refresh.
      }
    }
    return { id: updated.id, status: updated.status, revokedAt: updated.revokedAt?.toISOString() };
  }

  /**
   * Search registered Full-Time drivers by name, phone, or driver code.
   * Invariant: Part-Time drivers are strictly excluded from vendor search.
   */
  async searchDrivers(vendorUserId: string, rawQuery: string) {
    const vendor = await this.approvedVendor(vendorUserId);
    const query = rawQuery?.trim() ?? '';
    if (query.length < 2) return [];

    const digits = query.replace(/\D/g, '');
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchOr: Array<Record<string, unknown>> = [
      { fullName: { $regex: escaped, $options: 'i' } },
      { 'driverProfile.driverCode': { $regex: escaped, $options: 'i' } },
    ];
    if (digits.length >= 3) {
      searchOr.push({ mobileNumber: { $regex: digits } });
    }

    const drivers = await UserModel.find({
      role: 'driver',
      isVerified: true,
      'driverProfile.status': 'APPROVED',
      'driverProfile.driverType': { $in: ['Full-Time', 'Tow Driver'] },
      accountStatus: { $nin: ['SUSPENDED', 'INACTIVE'] },
      $or: searchOr,
    })
      .select('fullName mobileNumber email driverProfile.driverCode driverProfile.driverType driverProfile.experienceYears driverProfile.city driverProfile.rating isAvailable activeBookingId')
      .limit(20)
      .lean()
      .exec();

    if (drivers.length === 0) return [];

    const driverIds = drivers.map((d) => d._id);
    const memberships = await DriverVendorMembershipModel.find({
      driverUserId: { $in: driverIds },
      status: { $in: ['PENDING', 'ACTIVE'] },
    }).lean().exec();

    const vendorIdStr = vendor._id.toString();

    return drivers.map((d) => {
      const driverIdStr = d._id.toString();
      const relevant = memberships.filter((m) => m.driverUserId.toString() === driverIdStr);
      const activeForVendor = relevant.find((m) => m.vendorUserId.toString() === vendorIdStr && m.status === 'ACTIVE');
      const pendingForVendor = relevant.find((m) => m.vendorUserId.toString() === vendorIdStr && m.status === 'PENDING');
      const activeForOther = relevant.find((m) => m.vendorUserId.toString() !== vendorIdStr && m.status === 'ACTIVE');
      const pendingForOther = relevant.find((m) => m.vendorUserId.toString() !== vendorIdStr && m.status === 'PENDING');

      let membershipStatus: 'AVAILABLE_FOR_INVITE' | 'INVITED_PENDING' | 'ALREADY_IN_FLEET' | 'IN_ANOTHER_FLEET' = 'AVAILABLE_FOR_INVITE';
      let invitationId: string | undefined;

      if (activeForVendor) {
        membershipStatus = 'ALREADY_IN_FLEET';
        invitationId = activeForVendor._id.toString();
      } else if (pendingForVendor) {
        membershipStatus = 'INVITED_PENDING';
        invitationId = pendingForVendor._id.toString();
      } else if (activeForOther || pendingForOther) {
        membershipStatus = 'IN_ANOTHER_FLEET';
      }

      const rawPhone = d.mobileNumber || '';
      const maskedPhone = rawPhone.length >= 10
        ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}`
        : rawPhone;

      return {
        id: driverIdStr,
        name: d.fullName ?? 'Driver',
        maskedPhone,
        phone: rawPhone,
        driverCode: d.driverProfile?.driverCode ?? 'DRV',
        driverType: d.driverProfile?.driverType ?? 'Full-Time',
        experienceYears: d.driverProfile?.experienceYears,
        city: d.driverProfile?.city,
        rating: d.driverProfile?.rating ?? 0,
        isAvailable: d.isAvailable === true,
        isBusy: Boolean(d.activeBookingId),
        membershipStatus,
        invitationId,
      };
    });
  }
}

export const driverVendorMembershipService = new DriverVendorMembershipService();
