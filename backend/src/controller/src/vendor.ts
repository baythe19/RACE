import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/src/asyncHandler';
import { sendSuccess } from '../../utils/src/apiResponse';
import { AppError } from '../../utils/src/errors';
import { getAuthUser, getParamId } from '../../utils/src/request';
import { vendorDriversService } from '../../services/src/vendorDrivers';
import { vendorVehiclesService } from '../../services/src/vendorVehicles';
import { vendorBookingsService } from '../../services/src/vendorBookings';
import { vendorService } from '../../services/src/vendor';
import { driverVendorMembershipService } from '../../services/src/driverVendorMembership';

export class VendorController {
  saveDraft = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vendor = await vendorService.saveDraft(user.id, req.body);
    return sendSuccess(res, vendor);
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vendor = await vendorService.register(user.id, req.body);
    return sendSuccess(res, vendor, 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vendor = await vendorService.update(user.id, req.body);
    return sendSuccess(res, vendor);
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vendor = await vendorService.getProfile(user.id);
    return sendSuccess(res, vendor);
  });

  getStatus = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vendor = await vendorService.getStatus(user.id);
    return sendSuccess(res, vendor);
  });

  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const stats = await vendorService.getDashboardStats(user.id);
    return sendSuccess(res, stats);
  });

  getPayoutAccount = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const account = await vendorService.getPayoutAccount(user.id);
    return sendSuccess(res, account);
  });

  savePayoutAccount = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const account = await vendorService.savePayoutAccount(user.id, req.body);
    return sendSuccess(res, account);
  });

  getEarnings = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const earnings = await vendorService.getEarningsHistory(user.id);
    return sendSuccess(res, earnings);
  });

  uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const file = req.file;
    if (!file) throw new AppError('No file uploaded', 400);

    const vendor = await vendorService.uploadDocument(user.id, req.body.documentType, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    return sendSuccess(res, vendor, 201);
  });

  uploadSelfie = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const file = req.file;
    if (!file) throw new AppError('No file uploaded', 400);

    const vendor = await vendorService.uploadSelfie(user.id, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    return sendSuccess(res, vendor, 201);
  });

  // Admin
  listForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const vendors = await vendorService.listForAdmin({
      status: req.query.status as string | undefined,
      verificationStage: req.query.verificationStage as string | undefined,
    });
    return sendSuccess(res, vendors);
  });

  getByIdForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const vendor = await vendorService.getByIdForAdmin(getParamId(req.params.id));
    return sendSuccess(res, vendor);
  });

  approve = asyncHandler(async (req: Request, res: Response) => {
    const vendor = await vendorService.approve(getParamId(req.params.id), req.body.reviewNotes);
    return sendSuccess(res, vendor);
  });

  reject = asyncHandler(async (req: Request, res: Response) => {
    const vendor = await vendorService.reject(getParamId(req.params.id), req.body.reviewNotes);
    return sendSuccess(res, vendor);
  });

  requestResubmission = asyncHandler(async (req: Request, res: Response) => {
    const vendor = await vendorService.requestResubmission(
      getParamId(req.params.id),
      req.body.reviewNotes,
    );
    return sendSuccess(res, vendor);
  });

  reviewDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentType = Array.isArray(req.params.documentType)
      ? req.params.documentType[0]
      : req.params.documentType;
    const vendor = await vendorService.reviewDocument(
      getParamId(req.params.id),
      documentType,
      req.body,
    );
    return sendSuccess(res, vendor);
  });

  listDriverMemberships = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    return sendSuccess(res, await driverVendorMembershipService.listVendor(user.id));
  });

  inviteDriver = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    return sendSuccess(res, await driverVendorMembershipService.invite(user.id, req.body.phone), 202);
  });

  revokeDriverMembership = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await driverVendorMembershipService.revoke(
      user.id,
      getParamId(req.params.id),
      req.body.reason,
    );
    return sendSuccess(res, result);
  });

  listDrivers = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const drivers = await vendorDriversService.list(user.id);
    return sendSuccess(res, drivers);
  });

  createDriver = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const driver = await vendorDriversService.create(user.id, req.body);
    return sendSuccess(res, driver, 201);
  });

  claimDriver = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const driver = await vendorDriversService.claimByPhone(user.id, req.body.phone);
    return sendSuccess(res, driver);
  });

  removeDriver = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await vendorDriversService.remove(user.id, getParamId(req.params.id));
    return sendSuccess(res, result);
  });

  resetDriverPassword = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await vendorDriversService.resetDriverPassword(
      user.id,
      getParamId(req.params.id),
      req.body,
    );
    return sendSuccess(res, result);
  });

  uploadDriverDocument = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const file = req.file;
    if (!file) throw new AppError('No file uploaded', 400);

    const driver = await vendorDriversService.uploadDocument(
      user.id,
      getParamId(req.params.id),
      req.body.documentType,
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
      },
    );
    return sendSuccess(res, driver, 201);
  });

  listVehicles = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vehicles = await vendorVehiclesService.list(user.id);
    return sendSuccess(res, vehicles);
  });

  createVehicle = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vehicle = await vendorVehiclesService.create(user.id, req.body);
    return sendSuccess(res, vehicle, 201);
  });

  updateVehicle = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const vehicle = await vendorVehiclesService.update(
      user.id,
      getParamId(req.params.id),
      req.body,
    );
    return sendSuccess(res, vehicle);
  });

  removeVehicle = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await vendorVehiclesService.remove(user.id, getParamId(req.params.id));
    return sendSuccess(res, result);
  });

  uploadVehicleDocument = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const file = req.file;
    if (!file) throw new AppError('No file uploaded', 400);
    const vehicle = await vendorVehiclesService.uploadDocument(
      user.id,
      getParamId(req.params.id),
      req.body.documentType,
      { buffer: file.buffer, mimetype: file.mimetype, originalname: file.originalname },
    );
    return sendSuccess(res, vehicle, 201);
  });

  listBookingOffers = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const offers = await vendorBookingsService.listOffers(user.id);
    return sendSuccess(res, offers);
  });

  getBookingTracking = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const bookingType = req.query.bookingType;
    if (bookingType !== 'towing' && bookingType !== 'driver') {
      throw new AppError('bookingType must be towing or driver', 400);
    }
    const tracking = await vendorBookingsService.getBookingTracking(
      user.id,
      getParamId(req.params.id),
      bookingType,
    );
    return sendSuccess(res, tracking);
  });

  listBookings = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const bookings = await vendorBookingsService.listBookings(user.id);
    return sendSuccess(res, bookings);
  });

  assignDriverVehicle = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const driver = await vendorDriversService.assignVehicle(
      user.id,
      getParamId(req.params.id),
      req.body,
    );
    return sendSuccess(res, driver);
  });

  approveBooking = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await vendorBookingsService.approveBooking(
      user.id,
      getParamId(req.params.id),
      req.body,
    );
    return sendSuccess(res, result);
  });

  assignBooking = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await vendorBookingsService.assignBooking(
      user.id,
      getParamId(req.params.id),
      req.body,
    );
    return sendSuccess(res, result);
  });

  verifyTripOtp = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await vendorBookingsService.verifyTripOtp(
      user.id,
      getParamId(req.params.id),
      req.body,
    );
    return sendSuccess(res, result);
  });
}

export const vendorController = new VendorController();
