import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/src/asyncHandler';
import { sendSuccess } from '../../utils/src/apiResponse';
import { getAuthUser } from '../../utils/src/request';
import { bookingPaymentService } from '../../services/src/bookingPayment';
import { paymentWebhookService } from '../../services/src/payments/paymentWebhook';

export class BookingPaymentController {
  initiateAdvance = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const session = await bookingPaymentService.initiateAdvance(user.id, req.body);
    return sendSuccess(res, session, 201);
  });

  verifyAdvance = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const session = await bookingPaymentService.verifyAdvance(user.id, req.body);
    return sendSuccess(res, session);
  });

  initiateFinal = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const session = await bookingPaymentService.initiateFinal(user.id, req.body);
    return sendSuccess(res, session, 201);
  });

  verifyFinal = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const session = await bookingPaymentService.verifyFinal(user.id, req.body);
    return sendSuccess(res, session);
  });

  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature =
      (req.headers['x-razorpay-signature'] as string) ||
      (req.headers['x-webhook-signature'] as string) ||
      (req.headers['x-signature'] as string);

    const result = await paymentWebhookService.processWebhook(req.body, {
      signature,
      rawBody: JSON.stringify(req.body),
    });
    return sendSuccess(res, result);
  });
}

export const bookingPaymentController = new BookingPaymentController();
