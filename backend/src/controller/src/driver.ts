import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/src/asyncHandler';
import { sendSuccess } from '../../utils/src/apiResponse';
import { AppError } from '../../utils/src/errors';
import { getAuthUser, getParamId } from '../../utils/src/request';
import { driverSelfService } from '../../services/src/driverSelf';
import { driverService } from '../../services/src/driver';
import { driverVendorMembershipService } from '../../services/src/driverVendorMembership';

export class DriverController {
  listVendorInvitations = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    return sendSuccess(res, await driverVendorMembershipService.listDriverInvitations(user.id));
  });

  getVendorMembership = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    return sendSuccess(res, await driverVendorMembershipService.getDriverMembership(user.id));
  });

  respondVendorInvitation = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await driverVendorMembershipService.respond(
      user.id,
      getParamId(req.params.id),
      req.body.decision,
    );
    return sendSuccess(res, result);
  });

  updateAvailability = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await driverService.updateAvailability(user.id, user.role, req.body);
    return sendSuccess(res, result);
  });

  updateLocation = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await driverService.updateLocation(user.id, user.role, req.body);
    return sendSuccess(res, result);
  });

  listBookings = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const bookings = await driverService.listBookings(user.id, user.role, req.query as never);
    return sendSuccess(res, bookings);
  });

  listOpenOffers = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const offers = await driverService.listOpenOffers(user.id, user.role);
    return sendSuccess(res, offers);
  });

  getActiveBooking = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await driverService.getActiveBooking(user.id, user.role);
    return sendSuccess(res, result);
  });

  updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const booking = await driverService.updateBookingStatus(
      user.id,
      user.role,
      getParamId(req.params.id),
      req.body,
    );
    return sendSuccess(res, booking);
  });

  acceptBooking = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const booking = await driverService.acceptBooking(
      user.id,
      user.role,
      getParamId(req.params.id),
      req.body.bookingType,
    );
    return sendSuccess(res, booking);
  });

  rejectBooking = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await driverService.rejectBooking(
      user.id,
      user.role,
      getParamId(req.params.id),
      req.body.bookingType,
    );
    return sendSuccess(res, result);
  });

  registerSelf = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await driverSelfService.register(user.id, req.body);
    return sendSuccess(res, result, 201);
  });

  uploadSelfDocument = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const file = req.file;
    if (!file) throw new AppError('No file uploaded', 400);

    const result = await driverSelfService.uploadSelfDocument(user.id, req.body.documentType, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    return sendSuccess(res, result, 201);
  });
}

export const driverController = new DriverController();
