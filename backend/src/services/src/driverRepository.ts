import { Types } from 'mongoose';

import { UserModel, type IUser } from '../../models/src/user';
import {
  mapDriverFilterToUserQuery,
  toDriverRecord,
  type DriverRecord,
} from './userProfileMappers';

export class DriverRepository {
  async create(data: {
    mobileNumber: string;
    fullName: string;
    email?: string;
    driverCode: string;
    licenseNo: string;
    driverType: string;
    vendorUserId?: Types.ObjectId | string;
    fleetSource?: 'vendor' | 'admin';
    loginId?: string;
    passwordHash?: string;
    city: string;
    state?: string;
    vehicleRegistration?: string;
    status?: DriverRecord['status'];
    statusHistory?: DriverRecord['statusHistory'];
    isVerified?: boolean;
    experienceYears?: number;
    emergencyContact?: { name: string; mobileNumber: string; relationship?: string };
  }): Promise<DriverRecord> {
    const user = await UserModel.create({
      mobileNumber: data.mobileNumber,
      fullName: data.fullName,
      email: data.email,
      role: 'driver',
      isAvailable: false,
      isVerified: data.isVerified ?? true,
      isProfileCompleted: false,
      emergencyContact: data.emergencyContact ?? undefined,
      driverProfile: {
        driverCode: data.driverCode,
        licenseNo: data.licenseNo,
        driverType: data.driverType,
        vendorUserId: data.vendorUserId
          ? new Types.ObjectId(data.vendorUserId.toString())
          : undefined,
        fleetSource: data.fleetSource,
        loginId: data.loginId,
        passwordHash: data.passwordHash,
        city: data.city,
        state: data.state ?? 'Odisha',
        vehicleRegistration: data.vehicleRegistration,
        status: data.status ?? 'PENDING',
        rating: 0,
        reviewCount: 0,
        totalTrips: 0,
        experienceYears: data.experienceYears,
        documents: [],
        statusHistory: data.statusHistory ?? [{ status: data.status ?? 'PENDING', changedAt: new Date() }],
      },
    });
    return toDriverRecord(user);
  }

  async findById(id: string): Promise<DriverRecord | null> {
    const user = await UserModel.findOne({ _id: id, role: 'driver' }).exec();
    return user?.driverProfile ? toDriverRecord(user) : null;
  }

  async findUserById(id: string): Promise<IUser | null> {
    return UserModel.findOne({ _id: id, role: 'driver' }).exec();
  }

  async updateById(id: string, data: Partial<DriverRecord>): Promise<DriverRecord | null> {
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};

    if (data.name) set.fullName = data.name;
    if (data.phone) set.mobileNumber = data.phone;
    if (data.email !== undefined) set.email = data.email;
    if (data.driverCode) set['driverProfile.driverCode'] = data.driverCode;
    if (data.licenseNo) set['driverProfile.licenseNo'] = data.licenseNo;
    if (data.driverType) set['driverProfile.driverType'] = data.driverType;
    if (data.vendorId !== undefined) {
      if (data.vendorId) {
        set['driverProfile.vendorUserId'] = new Types.ObjectId(data.vendorId.toString());
      } else {
        unset['driverProfile.vendorUserId'] = 1;
      }
    }
    if (data.city) set['driverProfile.city'] = data.city;
    if (data.state) set['driverProfile.state'] = data.state;
    if (data.vehicleRegistration !== undefined) {
      if (data.vehicleRegistration) {
        set['driverProfile.vehicleRegistration'] = data.vehicleRegistration;
      } else {
        unset['driverProfile.vehicleRegistration'] = 1;
      }
    }
    if (data.status) {
      set['driverProfile.status'] = data.status;
      set.isAvailable = false;
    }
    if (data.rating != null) set['driverProfile.rating'] = data.rating;
    if (data.reviewCount != null) set['driverProfile.reviewCount'] = data.reviewCount;
    if (data.totalTrips != null) set['driverProfile.totalTrips'] = data.totalTrips;
    if (data.documents) set['driverProfile.documents'] = data.documents;
    if (data.statusHistory) set['driverProfile.statusHistory'] = data.statusHistory;

    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const user = await UserModel.findOneAndUpdate(
      { _id: id, role: 'driver', activeBookingId: null },
      update,
      { new: true, runValidators: true },
    ).exec();

    return user?.driverProfile ? toDriverRecord(user) : null;
  }

  async deleteById(id: string): Promise<DriverRecord | null> {
    const user = await UserModel.findOneAndDelete({
      _id: id,
      role: 'driver',
      activeBookingId: null,
    });
    return user?.driverProfile ? toDriverRecord(user) : null;
  }

  async count(filter: Record<string, unknown> = {}): Promise<number> {
    return UserModel.countDocuments(mapDriverFilterToUserQuery(filter));
  }

  async find(filter: Record<string, unknown> = {}): Promise<IUser[]> {
    return UserModel.find(mapDriverFilterToUserQuery(filter)).exec();
  }

  async updateManyVendor(
    driverIds: string[],
    vendorUserId: Types.ObjectId | null,
    fleetSource?: 'vendor' | 'admin',
  ): Promise<void> {
    const update = vendorUserId
      ? {
          $set: {
            'driverProfile.vendorUserId': vendorUserId,
            'driverProfile.fleetSource': fleetSource ?? 'admin',
          },
        }
      : { $unset: { 'driverProfile.vendorUserId': 1, 'driverProfile.fleetSource': 1 } };
    await UserModel.updateMany({ _id: { $in: driverIds }, role: 'driver' }, update);
  }
}

export const driverRepository = new DriverRepository();
