import type { Request, Response } from 'express';

import { asyncHandler } from '../../../utils/src/asyncHandler';
import { sendSuccess } from '../../../utils/src/apiResponse';
import { adminBookingsService } from '../../../services/src/admin/adminBookings';
import { adminServiceBookingsService } from '../../../services/src/admin/adminServiceBookings';
import { routeParam } from '../../../services/src/admin/routeParam';
import { getAdminActor } from '../../../utils/src/adminRequest.utils';

export const adminBookingsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminBookingsService.list(req.query as never));
  }),

  getCounts: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await adminBookingsService.getCounts());
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const type =
      req.query.type === 'towing' || req.query.type === 'driver' || req.query.type === 'legacy'
        ? req.query.type
        : undefined;
    sendSuccess(res, await adminBookingsService.getById(routeParam(req.params.id), type));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminBookingsService.create(req.body, getAdminActor(req)), 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminBookingsService.update(routeParam(req.params.id), req.body, getAdminActor(req)));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await adminBookingsService.remove(routeParam(req.params.id), getAdminActor(req));
    sendSuccess(res, { message: 'Deleted' });
  }),

  assignVendor: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminBookingsService.assignVendor(
      routeParam(req.params.id),
      req.body.vendorId,
      getAdminActor(req),
    ));
  }),

  assignDriver: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminBookingsService.assignDriver(
      routeParam(req.params.id),
      req.body.driverId,
      getAdminActor(req),
    ));
  }),

  assignServiceDriver: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminServiceBookingsService.assignDriver(
      routeParam(req.params.id),
      req.body,
      getAdminActor(req),
    ));
  }),

  cancelServiceBooking: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminServiceBookingsService.cancelBooking(
      routeParam(req.params.id),
      req.body,
      getAdminActor(req),
    ));
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminBookingsService.updateStatus(
      routeParam(req.params.id),
      req.body.status,
      getAdminActor(req),
      { reason: req.body.reason, amount: req.body.amount, bookingType: req.body.bookingType },
    ));
  }),
};
