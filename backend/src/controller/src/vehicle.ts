import type { Request, Response } from 'express';
import { storageService } from '../../storage/src';

import { asyncHandler } from '../../utils/src/asyncHandler';
import { sendError, sendSuccess } from '../../utils/src/apiResponse';
import { getAuthUser, getParamId } from '../../utils/src/request';
import {
  renderVehicleEmergencyPage,
  renderVehicleNotFoundPage,
} from '../../utils/src/vehicleVerifyPage';
import { vehicleService } from '../../services/src/vehicle';

export class VehicleController {
  uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const file = req.file;
    if (!file) {
      return sendError(res, 'Vehicle photo file is required', 400);
    }
    const vehicle = await vehicleService.getVehicle(user.id, getParamId(req.params.id));
    const upload = await storageService.uploadCustomerVehiclePhoto({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      vendorType: 'customer',
      documentType: 'vehicle_photo',
      customerId: user.id,
      vehicleId: vehicle.id,
    });
    const updated = await vehicleService.updateVehicle(user.id, vehicle.id, { photo: upload.fileUrl });
    return sendSuccess(res, updated);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vehicle = await vehicleService.createVehicle(user.id, req.body);
    return sendSuccess(res, vehicle, 201);
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vehicles = await vehicleService.listVehicles(user.id);
    return sendSuccess(res, vehicles);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vehicle = await vehicleService.getVehicle(user.id, getParamId(req.params.id));
    return sendSuccess(res, vehicle);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vehicle = await vehicleService.updateVehicle(
      user.id,
      getParamId(req.params.id),
      req.body,
    );
    return sendSuccess(res, vehicle);
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    await vehicleService.deleteVehicle(user.id, getParamId(req.params.id));
    return sendSuccess(res, { message: 'Vehicle deleted successfully' });
  });

  verifyQr = asyncHandler(async (req: Request, res: Response) => {
    const result = await vehicleService.verifyVehicleQr(getParamId(req.params.id));
    const prefersHtml = req.accepts(['html', 'json']) === 'html';

    if (prefersHtml) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Cache-Control', 'private, no-store');

      if (!result.valid) {
        return res.status(404).type('html').send(renderVehicleNotFoundPage());
      }

      return res
        .type('html')
        .send(
          renderVehicleEmergencyPage({
            vehicleNumber: result.vehicleNumber,
            brand: result.brand,
            model: result.model,
            vehicleType: result.vehicleType,
            fuelType: result.fuelType,
            color: result.color,
            ownerName: result.ownerName,
            ownerMobile: result.ownerMobile,
            emergencyName: result.emergencyName,
            emergencyMobile: result.emergencyMobile,
            emergencyRelationship: result.emergencyRelationship,
          }),
        );
    }

    const hasAuth = Boolean(req.headers.authorization && req.headers.authorization.startsWith('Bearer '));
    const maskPhone = (phone?: string) => {
      if (!phone) return undefined;
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 8) return phone;
      const prefix = phone.slice(0, Math.min(phone.length - 4, 6));
      const suffix = phone.slice(-2);
      return `${prefix}•••••${suffix}`;
    };

    const responsePayload = result.valid
      ? {
          ...result,
          ownerMobile: hasAuth ? result.ownerMobile : maskPhone(result.ownerMobile),
          emergencyMobile: hasAuth ? result.emergencyMobile : maskPhone(result.emergencyMobile),
          ownerMobileMasked: maskPhone(result.ownerMobile),
          emergencyMobileMasked: maskPhone(result.emergencyMobile),
        }
      : result;

    return sendSuccess(res, responsePayload);
  });

  getQrMetadata = asyncHandler(async (req: Request, res: Response) => {
    const metadata = await vehicleService.getQrMetadata(getParamId(req.params.id));
    return sendSuccess(res, metadata);
  });
}

export const vehicleController = new VehicleController();
