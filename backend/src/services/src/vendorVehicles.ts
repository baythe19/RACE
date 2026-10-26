import { Types } from 'mongoose';

import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/src/errors';
import { VendorVehicleModel } from '../../models/src/vendorVehicle';
import { storageService } from '../../storage/src/index';
import { UserModel } from '../../models/src/user';
import { TowingBookingModel } from '../../models/src/towingBooking';
import { DriverBookingModel } from '../../models/src/driverBooking';
import type { CreateVendorVehicleDto, UpdateVendorVehicleDto } from './vendorVehiclesValidator';

function mapVehicle(doc: {
  _id: Types.ObjectId;
  vendorId: Types.ObjectId;
  registrationNo: string;
  type: string;
  vehicleModel: string;
  year?: number;
  status: string;
  insuranceExpiry?: Date;
  maintenanceNote?: string;
  documents?: Array<{
    type: string;
    url: string;
    fileName: string;
    status: string;
    uploadedAt?: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: doc._id.toString(),
    vendorId: doc.vendorId.toString(),
    registrationNo: doc.registrationNo,
    type: doc.type,
    model: doc.vehicleModel,
    year: doc.year,
    status: doc.status,
    insuranceExpiry: doc.insuranceExpiry?.toISOString(),
    maintenanceNote: doc.maintenanceNote,
    documents: doc.documents?.map(document => ({
      type: document.type,
      url: document.url,
      fileName: document.fileName,
      status: document.status,
      uploadedAt: document.uploadedAt?.toISOString(),
    })) ?? [],
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}

function buildMaintenanceNote(dto: CreateVendorVehicleDto): string | undefined {
  const parts = [
    dto.rcNumber ? `RC: ${dto.rcNumber}` : null,
    dto.insuranceProvider ? `Insurer: ${dto.insuranceProvider}` : null,
    dto.insurancePolicyNumber ? `Policy: ${dto.insurancePolicyNumber}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export class VendorVehiclesService {
  private async assertVehicleHasNoOpenAssignments(vehicleId: Types.ObjectId) {
    const filter = {
      assignedFleetVehicleId: vehicleId,
      status: {
        $in: ['CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'],
      },
    };
    const [towingBooking, driverBooking] = await Promise.all([
      TowingBookingModel.exists(filter).exec(),
      DriverBookingModel.exists(filter).exec(),
    ]);
    if (towingBooking || driverBooking) {
      throw new ConflictError(
        'This vehicle is assigned to an open job. Complete or cancel the job before changing its status or removing it.',
      );
    }
  }

  private async assertVendor(userId: string) {
    const user = await UserModel.findById(userId).exec();
    if (!user || user.role !== 'vendor') {
      throw new ForbiddenError('Vendor access only');
    }
    return user;
  }

  private async assertVendorApproved(userId: string) {
    const user = await this.assertVendor(userId);
    if (user.accountStatus === 'SUSPENDED' || user.operationalStatus === 'SUSPENDED') {
      throw new ForbiddenError('Your vendor account is suspended.');
    }
    if (user.vendorProfile?.status === 'rejected' || user.reviewStatus === 'REJECTED') {
      throw new ForbiddenError('Your vendor account was rejected by administrator.');
    }
    return user;
  }

  async list(vendorUserId: string) {
    await this.assertVendor(vendorUserId);
    const vehicles = await VendorVehicleModel.find({ vendorId: vendorUserId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return vehicles.map(mapVehicle);
  }

  async create(vendorUserId: string, dto: CreateVendorVehicleDto) {
    await this.assertVendorApproved(vendorUserId);
    const registrationNo = dto.registrationNo.trim().toUpperCase();

    const existing = await VendorVehicleModel.findOne({
      vendorId: vendorUserId,
      registrationNo,
    }).exec();
    if (existing) {
      throw new ConflictError('A vehicle with this registration number already exists in your fleet');
    }

    const vehicle = await VendorVehicleModel.create({
      vendorId: new Types.ObjectId(vendorUserId),
      registrationNo,
      type: dto.type,
      vehicleModel: dto.model,
      year: dto.year,
      status: dto.status ?? 'ACTIVE',
      insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
      maintenanceNote: buildMaintenanceNote(dto),
    });

    return mapVehicle(vehicle);
  }

  async update(vendorUserId: string, vehicleId: string, dto: UpdateVendorVehicleDto) {
    await this.assertVendor(vendorUserId);
    const vehicle = await VendorVehicleModel.findById(vehicleId).exec();
    if (!vehicle) throw new NotFoundError('Vehicle not found');
    if (vehicle.vendorId.toString() !== vendorUserId) {
      throw new ForbiddenError('Vehicle is not in your fleet');
    }

    if (dto.status && dto.status !== 'ACTIVE') {
      await this.assertVehicleHasNoOpenAssignments(vehicle._id);
    }
    if (dto.type) vehicle.type = dto.type;
    if (dto.model) vehicle.vehicleModel = dto.model;
    if (dto.year !== undefined) vehicle.year = dto.year ?? undefined;
    if (dto.status) vehicle.status = dto.status;
    if (dto.insuranceExpiry !== undefined) {
      vehicle.insuranceExpiry = dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined;
    }
    if (dto.maintenanceNote !== undefined) vehicle.maintenanceNote = dto.maintenanceNote;
    await vehicle.save();

    return mapVehicle(vehicle);
  }

  async uploadDocument(
    vendorUserId: string,
    vehicleId: string,
    documentType: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    await this.assertVendorApproved(vendorUserId);
    const vehicle = await VendorVehicleModel.findById(vehicleId).exec();
    if (!vehicle) throw new NotFoundError('Vehicle not found');
    if (vehicle.vendorId.toString() !== vendorUserId) {
      throw new ForbiddenError('Vehicle is not in your fleet');
    }

    const upload = await storageService.uploadVendorVehicleDocument({
      vendorId: vendorUserId,
      vehicleId,
      vendorType: 'towing_company',
      documentType,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
    const document = {
      type: documentType,
      url: upload.fileUrl,
      fileName: upload.fileName,
      status: 'PENDING' as const,
      uploadedAt: new Date(),
    };
    if (!vehicle.documents) vehicle.documents = [];
    const existingIndex = vehicle.documents.findIndex(item => item.type === documentType);
    if (existingIndex >= 0) vehicle.documents[existingIndex] = document;
    else vehicle.documents.push(document);

    await vehicle.save();
    return mapVehicle(vehicle);
  }

  async remove(vendorUserId: string, vehicleId: string) {
    await this.assertVendor(vendorUserId);
    const vehicle = await VendorVehicleModel.findById(vehicleId).exec();
    if (!vehicle) throw new NotFoundError('Vehicle not found');
    if (vehicle.vendorId.toString() !== vendorUserId) {
      throw new ForbiddenError('Vehicle is not in your fleet');
    }
    await this.assertVehicleHasNoOpenAssignments(vehicle._id);
    await vehicle.deleteOne();
    return { removed: true, vehicleId };
  }
}

export const vendorVehiclesService = new VendorVehiclesService();
