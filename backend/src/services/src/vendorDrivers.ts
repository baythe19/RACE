import { Types } from 'mongoose';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/src/errors';
import { normalizeMobileNumber } from '../../utils/src/otp';
import {
  hashDriverPassword,
  normalizeDriverLoginId,
} from '../../utils/src/driverPassword';
import { storageService } from '../../storage/src/index';
import { UserModel, type IUser } from '../../models/src/user';
import { VendorVehicleModel } from '../../models/src/vendorVehicle';
import { DriverVendorMembershipModel } from '../../models/src/driverVendorMembership';
import { otpService } from './otp';
import { signDriverOnboardingProof, verifyDriverOnboardingProof } from '../../utils/src/jwt';
import { emitToDriver } from './socket';
import { driverRepository } from './driverRepository';
import type {
  AssignVendorDriverVehicleDto,
  CreateVendorDriverDto,
  ResetVendorDriverPasswordDto,
  VendorDriverOnboardingSendOtpDto,
  VendorDriverOnboardingVerifyOtpDto,
  CreateVendorStaffDriverDto,
} from './vendorDriversValidator';

function mapVendorDriver(user: IUser) {
  const profile = user.driverProfile;
  const isSuspended = user.accountStatus === 'SUSPENDED' || user.operationalStatus === 'SUSPENDED';
  const isRejected = profile?.status === 'REJECTED' || user.reviewStatus === 'REJECTED';
  const operational = !isSuspended && !isRejected;

  return {
    id: user.id,
    name: user.fullName ?? 'Driver',
    fullName: user.fullName ?? 'Driver',
    phone: user.mobileNumber,
    email: user.email,
    driverType: profile?.driverType ?? 'Tow Driver',
    licenseNo: profile?.licenseNo ?? '',
    city: profile?.city ?? '',
    vehicleRegistration: profile?.vehicleRegistration,
    status: profile?.status ?? user.reviewStatus ?? 'PENDING',
    reviewStatus: user.reviewStatus ?? profile?.status ?? 'PENDING',
    operationalStatus: user.operationalStatus ?? 'ENABLED',
    driverContext: user.driverContext ?? 'VENDOR_MANAGED',
    fleetSource: profile?.fleetSource ?? 'vendor',
    isAvailable: operational && Boolean(user.isAvailable) && !user.activeBookingId,
    isBusy: Boolean(user.activeBookingId),
    rating: profile?.rating ?? 5.0,
    vendorId: profile?.vendorUserId?.toString() ?? user.vendorUserId?.toString() ?? '',
    loginId: profile?.loginId,
    hasPasswordLogin: Boolean(profile?.loginId),
  };
}

async function assertLoginIdAvailable(loginId: string, excludeUserId?: string) {
  const existing = await UserModel.findOne({
    role: 'driver',
    'driverProfile.loginId': loginId,
  }).exec();
  if (existing && existing.id !== excludeUserId) {
    throw new ConflictError('This login ID is already taken. Choose another.');
  }
}

export class VendorDriversService {
  private async assertVendor(userId: string) {
    const user = await UserModel.findById(userId).exec();
    if (!user || user.role !== 'vendor') {
      throw new ForbiddenError('Vendor access only');
    }
    return user;
  }

  private async assertVendorApproved(userId: string) {
    const user = await this.assertVendor(userId);
    // Non-blocking review policy (R09): submitted vendors can manage fleet unless explicitly suspended or rejected
    if (user.accountStatus === 'SUSPENDED' || user.operationalStatus === 'SUSPENDED') {
      throw new ForbiddenError('Your vendor account is suspended.');
    }
    if (user.vendorProfile?.status === 'rejected') {
      throw new ForbiddenError('Your vendor account was rejected by administrator.');
    }
    return user;
  }

  async list(vendorUserId: string) {
    await this.assertVendor(vendorUserId);
    const drivers = await UserModel.find({
      role: 'driver',
      $or: [
        { 'driverProfile.vendorUserId': new Types.ObjectId(vendorUserId) },
        { vendorUserId: new Types.ObjectId(vendorUserId) },
      ],
    }).exec();
    return drivers.map(mapVendorDriver);
  }

  async sendOnboardingOtp(vendorUserId: string, dto: VendorDriverOnboardingSendOtpDto) {
    await this.assertVendorApproved(vendorUserId);
    const phone = normalizeMobileNumber(dto.phone);

    // Pre-check if driver is already locked in another fleet
    const existing = await UserModel.findOne({ mobileNumber: phone }).exec();
    if (existing) {
      if (existing.role === 'vendor') {
        throw new ConflictError('This mobile number is already registered as a vendor account');
      }
      const existingVendor = existing.vendorUserId?.toString() ?? existing.driverProfile?.vendorUserId?.toString();
      if (existingVendor && existingVendor !== vendorUserId) {
        throw new ConflictError('This driver is already part of another vendor fleet');
      }
    }

    const result = await otpService.sendOtp(phone, 'driver');
    return {
      phone,
      message: 'OTP sent successfully to driver mobile',
      expiresIn: result.expiresIn,
      devOtp: result.devOtp,
    };
  }

  async verifyOnboardingOtp(vendorUserId: string, dto: VendorDriverOnboardingVerifyOtpDto) {
    await this.assertVendorApproved(vendorUserId);
    const phone = normalizeMobileNumber(dto.phone);
    await otpService.verifyOtp(phone, dto.otp);
    const proofToken = signDriverOnboardingProof(phone, vendorUserId);
    return {
      verified: true,
      proofToken,
      onboardingProofToken: proofToken,
      phone,
    };
  }

  async createStaffDriver(vendorUserId: string, dto: CreateVendorStaffDriverDto) {
    await this.assertVendorApproved(vendorUserId);
    const phone = normalizeMobileNumber(dto.phone);
    const token = (dto.proofToken || dto.onboardingProofToken)!;

    let proofPayload;
    try {
      proofPayload = verifyDriverOnboardingProof(token);
    } catch {
      throw new BadRequestError('Invalid or expired phone verification proof. Please verify OTP again.');
    }

    if (
      proofPayload.vendorUserId !== vendorUserId ||
      normalizeMobileNumber(proofPayload.mobileNumber) !== phone
    ) {
      throw new ForbiddenError('Phone verification proof does not match this driver or vendor');
    }

    let driver = await UserModel.findOne({ mobileNumber: phone }).exec();
    if (driver) {
      if (driver.role !== 'driver' && driver.role !== 'customer') {
        throw new ConflictError('This mobile number is registered under an incompatible role');
      }
      const existingVendor = driver.vendorUserId?.toString() ?? driver.driverProfile?.vendorUserId?.toString();
      if (existingVendor && existingVendor !== vendorUserId) {
        throw new ConflictError('This driver already belongs to another vendor fleet');
      }
      if (driver.activeBookingId) {
        throw new BadRequestError('Driver currently has an active booking and cannot be reassigned');
      }

      driver.role = 'driver';
      driver.driverContext = 'VENDOR_MANAGED';
      driver.vendorUserId = new Types.ObjectId(vendorUserId);
      driver.phoneVerifiedAt = new Date();
      driver.isVerified = true;
      driver.isProfileCompleted = true;
      driver.registrationStatus = 'SUBMITTED';
      driver.operationalStatus = 'ENABLED';
      driver.isAvailable = true;
      if (dto.fullName || dto.name) driver.fullName = dto.fullName ?? dto.name;
      if (dto.email) driver.email = dto.email;
      if (dto.dateOfBirth) driver.dateOfBirth = new Date(dto.dateOfBirth);

      if (!driver.driverProfile) {
        const driverCode = `DRV-${Date.now().toString().slice(-6)}`;
        driver.driverProfile = {
          driverCode,
          licenseNo: dto.licenseNo,
          vendorUserId: new Types.ObjectId(vendorUserId),
          fleetSource: 'vendor',
          driverType: dto.driverType ?? 'Tow Driver',
          city: dto.city ?? 'Bhubaneswar',
          state: dto.state ?? 'Odisha',
          rating: 5.0,
          reviewCount: 1,
          status: 'PENDING',
          totalTrips: 0,
          experienceYears: dto.experienceYears ?? 3,
          documents: Object.entries(dto.documents ?? {})
            .filter(([_, url]) => Boolean(url))
            .map(([type, url]) => ({
              type,
              url: url as string,
              status: 'PENDING',
              uploadedAt: new Date(),
            })),
          statusHistory: [
            {
              status: 'PENDING',
              note: 'Direct staff onboarding by vendor',
              changedAt: new Date(),
            },
          ],
        };
      } else {
        driver.driverProfile.vendorUserId = new Types.ObjectId(vendorUserId);
        driver.driverProfile.fleetSource = 'vendor';
        driver.driverProfile.driverType = dto.driverType ?? driver.driverProfile.driverType ?? 'Tow Driver';
        if (dto.licenseNo) driver.driverProfile.licenseNo = dto.licenseNo;
        if (dto.city) driver.driverProfile.city = dto.city;
        if (dto.experienceYears != null) driver.driverProfile.experienceYears = dto.experienceYears;
        if (dto.documents) {
          for (const [type, url] of Object.entries(dto.documents)) {
            if (!url) continue;
            const existingDoc = driver.driverProfile.documents.find((d) => d.type === type);
            if (existingDoc) {
              existingDoc.url = url;
              existingDoc.uploadedAt = new Date();
            } else {
              driver.driverProfile.documents.push({
                type,
                url,
                status: 'PENDING',
                uploadedAt: new Date(),
              });
            }
          }
        }
      }
      await driver.save();
    } else {
      const driverCode = `DRV-${Date.now().toString().slice(-6)}`;
      driver = new UserModel({
        fullName: dto.fullName ?? dto.name,
        mobileNumber: phone,
        email: dto.email,
        role: 'driver',
        driverContext: 'VENDOR_MANAGED',
        vendorUserId: new Types.ObjectId(vendorUserId),
        phoneVerifiedAt: new Date(),
        isVerified: true,
        isProfileCompleted: true,
        registrationStatus: 'SUBMITTED',
        reviewStatus: 'PENDING',
        operationalStatus: 'ENABLED',
        isAvailable: true,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        driverProfile: {
          driverCode,
          licenseNo: dto.licenseNo,
          vendorUserId: new Types.ObjectId(vendorUserId),
          fleetSource: 'vendor',
          driverType: dto.driverType ?? 'Tow Driver',
          city: dto.city ?? 'Bhubaneswar',
          state: dto.state ?? 'Odisha',
          rating: 5.0,
          reviewCount: 1,
          status: 'PENDING',
          totalTrips: 0,
          experienceYears: dto.experienceYears ?? 3,
          documents: Object.entries(dto.documents ?? {})
            .filter(([_, url]) => Boolean(url))
            .map(([type, url]) => ({
              type,
              url: url as string,
              status: 'PENDING',
              uploadedAt: new Date(),
            })),
          statusHistory: [
            {
              status: 'PENDING',
              note: 'Direct staff onboarding by vendor with inline OTP',
              changedAt: new Date(),
            },
          ],
        },
      });
      await driver.save();
    }

    // Atomically maintain 1-to-1 DriverVendorMembership record in ACTIVE status
    await DriverVendorMembershipModel.findOneAndUpdate(
      { driverUserId: driver._id },
      {
        $set: {
          vendorUserId: new Types.ObjectId(vendorUserId),
          driverUserId: driver._id,
          status: 'ACTIVE',
          driverLockKey: `driver-lock:${driver._id}`,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    ).exec();

    emitToDriver(driver.id, 'driver:jobs-updated', { reason: 'vendor_staff_onboarded' });

    return mapVendorDriver(driver);
  }

  async create(vendorUserId: string, dto: CreateVendorDriverDto) {
    await this.assertVendorApproved(vendorUserId);
    const phone = normalizeMobileNumber(dto.phone);
    const loginId = normalizeDriverLoginId(dto.loginId);
    const passwordHash = await hashDriverPassword(dto.password);

    await assertLoginIdAvailable(loginId);

    const existing = await UserModel.findOne({ mobileNumber: phone }).exec();
    if (existing) {
      if (existing.role !== 'driver' || !existing.driverProfile) {
        throw new ConflictError('This mobile number is already registered as a non-driver account');
      }
      if (existing.activeBookingId) {
        throw new BadRequestError('Cannot add a driver with an active booking to a vendor fleet');
      }
      const currentVendor = existing.driverProfile.vendorUserId?.toString();
      if (currentVendor && currentVendor !== vendorUserId) {
        throw new ConflictError('Driver already belongs to another vendor');
      }

      await assertLoginIdAvailable(loginId, existing.id);

      const set: Record<string, unknown> = {
        'driverProfile.vendorUserId': new Types.ObjectId(vendorUserId),
        'driverProfile.fleetSource': 'vendor',
        'driverProfile.loginId': loginId,
        'driverProfile.passwordHash': passwordHash,
        isAvailable: false,
      };
      if (dto.licenseNo) set['driverProfile.licenseNo'] = dto.licenseNo;
      if (dto.driverType) set['driverProfile.driverType'] = dto.driverType;
      if (dto.city) set['driverProfile.city'] = dto.city;
      if (dto.vehicleRegistration) {
        set['driverProfile.vehicleRegistration'] = dto.vehicleRegistration;
      }
      if (dto.name) set.fullName = dto.name;
      if (process.env.NODE_ENV !== 'production') {
        set['driverProfile.status'] = 'APPROVED';
        set.isVerified = true;
        set.isProfileCompleted = true;
      }

      const expectedVendorId = currentVendor
        ? new Types.ObjectId(currentVendor)
        : null;
      const linked = await UserModel.findOneAndUpdate(
        {
          _id: existing._id,
          role: 'driver',
          activeBookingId: null,
          'driverProfile.vendorUserId': expectedVendorId,
        },
        { $set: set },
        { new: true, runValidators: true },
      ).exec();

      if (!linked) {
        throw new ConflictError('Driver or booking state changed; refresh and try again');
      }
      return mapVendorDriver(linked);
    }

    const count = await driverRepository.count();
    const status = process.env.NODE_ENV === 'production' ? 'PENDING' : 'APPROVED';
    const created = await driverRepository.create({
      fullName: dto.name,
      mobileNumber: phone,
      email: dto.email,
      driverCode: `VDRV${String(count + 1).padStart(4, '0')}`,
      licenseNo: dto.licenseNo,
      driverType: dto.driverType,
      vendorUserId,
      fleetSource: 'vendor',
      loginId,
      passwordHash,
      city: dto.city ?? 'Bhubaneswar',
      state: 'Odisha',
      vehicleRegistration: dto.vehicleRegistration,
      status: status as 'PENDING' | 'APPROVED',
      isVerified: true,
      statusHistory: [{ status: status as 'PENDING' | 'APPROVED', changedAt: new Date() }],
    });

    await UserModel.findByIdAndUpdate(created.id, {
      isProfileCompleted: true,
      isAvailable: false,
    }).exec();

    const user = await UserModel.findById(created.id).exec();
    if (!user) throw new NotFoundError('Driver not found after create');
    return mapVendorDriver(user);
  }

  async claimByPhone(vendorUserId: string, phoneRaw: string) {
    await this.assertVendorApproved(vendorUserId);
    const phone = normalizeMobileNumber(phoneRaw);
    const driver = await UserModel.findOne({ mobileNumber: phone, role: 'driver' }).exec();
    if (!driver?.driverProfile) {
      throw new NotFoundError('No driver found with this mobile number');
    }
    if (driver.activeBookingId) {
      throw new BadRequestError('Cannot add a driver with an active booking to a vendor fleet');
    }
    const currentVendor = driver.driverProfile.vendorUserId?.toString();
    if (currentVendor && currentVendor !== vendorUserId) {
      throw new ConflictError('Driver already belongs to another vendor');
    }
    const expectedVendorId = currentVendor
      ? new Types.ObjectId(currentVendor)
      : null;
    const linked = await UserModel.findOneAndUpdate(
      {
        _id: driver._id,
        role: 'driver',
        activeBookingId: null,
        'driverProfile.vendorUserId': expectedVendorId,
      },
      {
        $set: {
          'driverProfile.vendorUserId': new Types.ObjectId(vendorUserId),
          'driverProfile.fleetSource': 'vendor',
          isAvailable: false,
        },
      },
      { new: true, runValidators: true },
    ).exec();

    if (!linked) {
      throw new ConflictError('Driver or booking state changed; refresh and try again');
    }
    return mapVendorDriver(linked);
  }

  async remove(vendorUserId: string, driverId: string) {
    await this.assertVendor(vendorUserId);
    const driver = await UserModel.findOne({ _id: driverId, role: 'driver' }).exec();
    if (!driver?.driverProfile) throw new NotFoundError('Driver not found');
    if (driver.driverProfile.vendorUserId?.toString() !== vendorUserId) {
      throw new ForbiddenError('Driver is not on your vendor team');
    }
    if (driver.activeBookingId) {
      throw new BadRequestError('Cannot remove a driver with an active booking');
    }
    driver.driverProfile.vendorUserId = undefined;
    driver.driverProfile.fleetSource = undefined;
    driver.driverProfile.loginId = undefined;
    driver.driverProfile.passwordHash = undefined;
    await driver.save();
    return { removed: true, driverId };
  }

  /**
   * Vendor sets a new password for a fleet driver's Login ID sign-in
   * (driver forgot their password). The hash is never returned.
   */
  async resetDriverPassword(
    vendorUserId: string,
    driverId: string,
    dto: ResetVendorDriverPasswordDto,
  ) {
    await this.assertVendor(vendorUserId);
    const driver = await UserModel.findOne({ _id: driverId, role: 'driver' })
      .select('+driverProfile.passwordHash')
      .exec();
    if (!driver?.driverProfile) throw new NotFoundError('Driver not found');
    if (driver.driverProfile.vendorUserId?.toString() !== vendorUserId) {
      throw new ForbiddenError('Driver is not on your vendor team');
    }
    if (!driver.driverProfile.loginId) {
      throw new BadRequestError('This driver has no Login ID. Edit the driver to add one.');
    }

    driver.driverProfile.passwordHash = await hashDriverPassword(dto.password);
    await driver.save();
    return { reset: true, driverId };
  }

  /**
   * Link a fleet driver to one of this vendor's vehicle registrations
   * (the driver↔vehicle relationship is stored on the driver profile),
   * or unlink with an empty/null registration.
   */
  async assignVehicle(
    vendorUserId: string,
    driverId: string,
    dto: AssignVendorDriverVehicleDto,
  ) {
    await this.assertVendorApproved(vendorUserId);

    const driver = await UserModel.findOne({ _id: driverId, role: 'driver' }).exec();
    if (!driver?.driverProfile) throw new NotFoundError('Driver not found');
    if (driver.driverProfile.vendorUserId?.toString() !== vendorUserId) {
      throw new ForbiddenError('Driver is not on your vendor team');
    }
    if (driver.activeBookingId) {
      throw new BadRequestError('Cannot change a driver vehicle during an active booking');
    }

    const registrationRaw = (dto.vehicleRegistration ?? '').trim().toUpperCase();
    if (registrationRaw) {
      const vehicle = await VendorVehicleModel.findOne({
        vendorId: vendorUserId,
        registrationNo: registrationRaw,
      }).exec();
      if (!vehicle) {
        throw new BadRequestError('Registration number does not match a vehicle in your fleet');
      }
      if (vehicle.status !== 'ACTIVE') {
        throw new BadRequestError('Only ACTIVE vehicles can be assigned to a driver');
      }
    }

    const update = registrationRaw
      ? { $set: { 'driverProfile.vehicleRegistration': registrationRaw } }
      : { $unset: { 'driverProfile.vehicleRegistration': 1 } };
    const updated = await UserModel.findOneAndUpdate(
      {
        _id: driverId,
        role: 'driver',
        'driverProfile.vendorUserId': vendorUserId,
        activeBookingId: null,
      },
      update,
      { new: true, runValidators: true },
    ).exec();

    if (!updated?.driverProfile) {
      const current = await UserModel.findOne({ _id: driverId, role: 'driver' })
        .select('driverProfile.vendorUserId activeBookingId')
        .exec();
      if (!current?.driverProfile) throw new NotFoundError('Driver not found');
      if (current.driverProfile.vendorUserId?.toString() !== vendorUserId) {
        throw new ForbiddenError('Driver is not on your vendor team');
      }
      if (current.activeBookingId) {
        throw new BadRequestError('Cannot change a driver vehicle during an active booking');
      }
      throw new ConflictError('Driver assignment changed while saving. Please try again.');
    }

    return mapVendorDriver(updated);
  }

  async uploadDocument(
    vendorUserId: string,
    driverId: string,
    documentType: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    await this.assertVendorApproved(vendorUserId);

    const driver = await UserModel.findOne({ _id: driverId, role: 'driver' }).exec();
    if (!driver?.driverProfile) throw new NotFoundError('Driver not found');
    if (driver.driverProfile.vendorUserId?.toString() !== vendorUserId) {
      throw new ForbiddenError('Driver is not on your vendor team');
    }
    if (driver.activeBookingId) {
      throw new BadRequestError('Cannot update driver documents during an active booking');
    }

    const upload = await storageService.uploadDriverDocument({
      driverId,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      documentType,
    });

    const DOC_LABELS: Record<string, string> = {
      driving_license: 'Driving License',
      aadhaar: 'Aadhaar Card',
      police_verification: 'Police Verification',
      medical_certificate: 'Medical Fitness Certificate',
      medical: 'Medical Fitness Certificate',
    };
    const docLabel = DOC_LABELS[documentType] ?? documentType.replace(/_/g, ' ');

    if (!driver.driverProfile.documents?.length) {
      driver.driverProfile.documents = [];
    }

    const existingIndex = driver.driverProfile.documents.findIndex((d) => d.type === docLabel);
    if (existingIndex >= 0) {
      driver.driverProfile.documents[existingIndex].url = upload.fileUrl;
      driver.driverProfile.documents[existingIndex].status = 'PENDING';
      driver.driverProfile.documents[existingIndex].uploadedAt = new Date();
    } else {
      driver.driverProfile.documents.push({
        type: docLabel,
        url: upload.fileUrl,
        status: 'PENDING',
        uploadedAt: new Date(),
      });
    }

    // Keep the driver offline until admin approves the updated documents.
    driver.driverProfile.status = 'PENDING';
    driver.isAvailable = false;
    await driver.save();

    return mapVendorDriver(driver);
  }
}

export const vendorDriversService = new VendorDriversService();
