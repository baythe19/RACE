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
import { driverRepository } from './driverRepository';
import type { AssignVendorDriverVehicleDto, CreateVendorDriverDto } from './vendorDriversValidator';

function mapVendorDriver(user: IUser) {
  const profile = user.driverProfile;
  return {
    id: user.id,
    name: user.fullName ?? 'Driver',
    phone: user.mobileNumber,
    email: user.email,
    driverType: profile?.driverType ?? 'Tow Driver',
    licenseNo: profile?.licenseNo ?? '',
    city: profile?.city ?? '',
    vehicleRegistration: profile?.vehicleRegistration,
    status: profile?.status ?? 'PENDING',
    isAvailable: Boolean(user.isAvailable),
    isBusy: Boolean(user.activeBookingId),
    rating: profile?.rating ?? 0,
    vendorId: profile?.vendorUserId?.toString() ?? '',
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
    const status = user.vendorProfile?.status;
    if (status !== 'approved') {
      throw new ForbiddenError(
        'Your vendor account must be approved by admin before you can add vendor drivers.',
      );
    }
    return user;
  }

  async list(vendorUserId: string) {
    await this.assertVendor(vendorUserId);
    const drivers = await UserModel.find({
      role: 'driver',
      'driverProfile.vendorUserId': new Types.ObjectId(vendorUserId),
    }).exec();
    return drivers.map(mapVendorDriver);
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
      const currentVendor = existing.driverProfile.vendorUserId?.toString();
      if (currentVendor && currentVendor !== vendorUserId) {
        throw new ConflictError('Driver already belongs to another vendor');
      }

      await assertLoginIdAvailable(loginId, existing.id);

      existing.driverProfile.vendorUserId = new Types.ObjectId(vendorUserId);
      existing.driverProfile.fleetSource = 'vendor';
      existing.driverProfile.loginId = loginId;
      existing.driverProfile.passwordHash = passwordHash;
      if (dto.licenseNo) existing.driverProfile.licenseNo = dto.licenseNo;
      if (dto.driverType) existing.driverProfile.driverType = dto.driverType;
      if (dto.city) existing.driverProfile.city = dto.city;
      if (dto.vehicleRegistration) {
        existing.driverProfile.vehicleRegistration = dto.vehicleRegistration;
      }
      if (dto.name) existing.fullName = dto.name;
      if (process.env.NODE_ENV !== 'production') {
        existing.driverProfile.status = 'APPROVED';
        existing.isVerified = true;
        existing.isProfileCompleted = true;
      }
      await existing.save();
      return mapVendorDriver(existing);
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
      isAvailable: true,
      currentLocation: {
        latitude: 20.2961,
        longitude: 85.8245,
        updatedAt: new Date(),
      },
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
    const currentVendor = driver.driverProfile.vendorUserId?.toString();
    if (currentVendor && currentVendor !== vendorUserId) {
      throw new ConflictError('Driver already belongs to another vendor');
    }
    driver.driverProfile.vendorUserId = new Types.ObjectId(vendorUserId);
    driver.driverProfile.fleetSource = 'vendor';
    await driver.save();
    return mapVendorDriver(driver);
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

    const registrationRaw = (dto.vehicleRegistration ?? '').trim().toUpperCase();
    if (registrationRaw) {
      const vehicle = await VendorVehicleModel.findOne({
        vendorId: vendorUserId,
        registrationNo: registrationRaw,
      }).exec();
      if (!vehicle) {
        throw new BadRequestError('Registration number does not match a vehicle in your fleet');
      }
      if (vehicle.status === 'INACTIVE') {
        throw new BadRequestError('This vehicle is inactive — set it to ACTIVE before assigning');
      }
      driver.driverProfile.vehicleRegistration = registrationRaw;
    } else {
      driver.driverProfile.vehicleRegistration = undefined;
    }

    await driver.save();
    return mapVendorDriver(driver);
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

    // Keep driver pending until admin approves.
    driver.driverProfile.status = 'PENDING';
    await driver.save();

    return mapVendorDriver(driver);
  }
}

export const vendorDriversService = new VendorDriversService();
