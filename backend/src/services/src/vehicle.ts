import { NotFoundError } from '../../utils/src/errors';
import { generateVehicleQrCode, getVehicleQrPayload } from '../../utils/src/qrCode';
import { userRepository } from './userRepository';
import { vehicleQrRepository } from './vehicleQrRepository';
import { vehicleRepository } from './vehicleRepository';
import type { IVehicle } from '../../models/src/vehicle';
import type {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleResponseDto,
} from './vehicleValidator';

function mapVehicle(vehicle: IVehicle): VehicleResponseDto {
  return {
    id: vehicle.id,
    customerId: vehicle.customerId.toString(),
    vehicleType: vehicle.vehicleType,
    vehicleSubtype: vehicle.vehicleSubtype,
    vehicleNumber: vehicle.vehicleNumber,
    brand: vehicle.brand,
    model: vehicle.vehicleModel,
    color: vehicle.color,
    fuelType: vehicle.fuelType,
    qrCode: vehicle.qrCode,
    photo: vehicle.photo,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export class VehicleService {
  async createVehicle(customerId: string, dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    const vehicle = await vehicleRepository.create({
      customerId: customerId as unknown as IVehicle['customerId'],
      vehicleType: dto.vehicleType,
      vehicleSubtype: dto.vehicleSubtype,
      vehicleNumber: dto.vehicleNumber.toUpperCase(),
      brand: dto.brand,
      vehicleModel: dto.model,
      color: dto.color,
      fuelType: dto.fuelType,
      photo: dto.photo,
      qrCode: 'pending',
    });

    const qrCode = await generateVehicleQrCode(vehicle.id);
    vehicle.qrCode = qrCode;
    await vehicle.save();

    await vehicleQrRepository.upsertForVehicle({
      vehicleId: vehicle.id,
      customerId,
      payloadUrl: getVehicleQrPayload(vehicle.id),
      qrImageDataUrl: qrCode,
    });

    return mapVehicle(vehicle);
  }

  async listVehicles(customerId: string): Promise<VehicleResponseDto[]> {
    const vehicles = await vehicleRepository.findByCustomer(customerId);
    return vehicles.map(mapVehicle);
  }

  async getVehicle(customerId: string, vehicleId: string): Promise<VehicleResponseDto> {
    const vehicle = await vehicleRepository.findByIdForCustomer(vehicleId, customerId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }
    return mapVehicle(vehicle);
  }

  async updateVehicle(
    customerId: string,
    vehicleId: string,
    dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const vehicle = await vehicleRepository.updateByIdForCustomer(vehicleId, customerId, {
      vehicleType: dto.vehicleType,
      vehicleSubtype: dto.vehicleSubtype,
      vehicleNumber: dto.vehicleNumber?.toUpperCase(),
      brand: dto.brand,
      vehicleModel: dto.model,
      color: dto.color,
      fuelType: dto.fuelType,
      photo: dto.photo,
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    return mapVehicle(vehicle);
  }

  async deleteVehicle(customerId: string, vehicleId: string): Promise<void> {
    const vehicle = await vehicleRepository.deleteByIdForCustomer(vehicleId, customerId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }
  }

  async verifyVehicleQr(vehicleId: string) {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      return { valid: false as const, vehicleId };
    }

    const qrRecord = await vehicleQrRepository.findByVehicleId(vehicleId);
    if (!qrRecord?.isActive) {
      return { valid: false as const, vehicleId };
    }

    await vehicleQrRepository.recordScan(vehicleId);

    const owner = await userRepository.findById(vehicle.customerId.toString());

    return {
      valid: true as const,
      vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      brand: vehicle.brand,
      model: vehicle.vehicleModel,
      vehicleType: vehicle.vehicleType,
      fuelType: vehicle.fuelType,
      color: vehicle.color,
      ownerName: owner?.fullName,
      ownerMobile: owner?.mobileNumber,
      emergencyName: owner?.emergencyContact?.name,
      emergencyMobile: owner?.emergencyContact?.mobileNumber,
      emergencyRelationship: owner?.emergencyContact?.relationship,
    };
  }

  async getQrMetadata(vehicleId: string) {
    const qr = await vehicleQrRepository.findByVehicleId(vehicleId);
    if (!qr) {
      throw new NotFoundError('QR metadata not found');
    }
    return {
      vehicleId: qr.vehicleId.toString(),
      payloadUrl: qr.payloadUrl,
      scanCount: qr.scanCount,
      lastScannedAt: qr.lastScannedAt?.toISOString(),
      isActive: qr.isActive,
    };
  }

  async regenerateAllQrCodes(): Promise<number> {
    const vehicles = await vehicleRepository.findAll();
    let updated = 0;

    for (const vehicle of vehicles) {
      const qrCode = await generateVehicleQrCode(vehicle.id);
      vehicle.qrCode = qrCode;
      await vehicle.save();
      await vehicleQrRepository.upsertForVehicle({
        vehicleId: vehicle.id,
        customerId: vehicle.customerId.toString(),
        payloadUrl: getVehicleQrPayload(vehicle.id),
        qrImageDataUrl: qrCode,
      });
      updated += 1;
    }

    return updated;
  }
}

export const vehicleService = new VehicleService();
