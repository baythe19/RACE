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
        driver.accountStatus === 'INACTIVE') {
      return GENERIC_INVITE_RESULT;
    }

    // A legacy embedded link can only be converted by its current vendor.
    // This keeps phone search from stealing a Driver from another fleet.
    const legacyVendorId = driver.driverProfile.vendorUserId?.toString();
    if (legacyVendorId && legacyVendorId !== vendor._id.toString()) {
      return GENERIC_INVITE_RESULT;
    }

    const driverId = driver.id;
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
    }).select('fullName mobileNumber email isAvailable activeBookingId driverProfile.driverCode driverProfile.status driverProfile.driverType driverProfile.city driverProfile.rating').lean().exec();
    const byId = new Map(drivers.map((d) => [d._id.toString(), d]));

    return memberships.map((membership) => {
      const driver = byId.get(membership.driverUserId.toString());
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
          driverStatus: driver.driverProfile?.status,
          driverType: driver.driverProfile?.driverType,
          city: driver.driverProfile?.city,
          rating: driver.driverProfile?.rating ?? 0,
          isAvailable: driver.isAvailable === true,
          isBusy: Boolean(driver.activeBookingId),
        } : undefined,
      };
    });
  }

  async listDriverInvitations(driverUserId: string) {
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
}

export const driverVendorMembershipService = new DriverVendorMembershipService();
