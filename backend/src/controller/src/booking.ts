import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/src/asyncHandler';
import { sendSuccess } from '../../utils/src/apiResponse';
import { getAuthUser, getParamId } from '../../utils/src/request';
import { combinedBookingService } from '../../services/src/combinedBooking';
import type { CombinedBookingListQuery } from '../../services/src/combinedBookingValidator';

export class BookingController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const query = req.query as CombinedBookingListQuery;
    const bookings = await combinedBookingService.listBookings(user.id, query);
    return sendSuccess(res, bookings);
  });

  confirmPaymentMode = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await combinedBookingService.confirmPaymentMode(
      user.id,
      getParamId(req.params.id),
      req.body.paymentMode,
      req.body.bookingType,
    );
    return sendSuccess(res, result);
  });
}

export const bookingController = new BookingController();
