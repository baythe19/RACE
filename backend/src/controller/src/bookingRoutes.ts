import { Router } from 'express';

import { authMiddleware } from '../../middleware/src/auth';
import { validate } from '../../middleware/src/validation';
import { bookingController } from './booking';
import { combinedBookingListQuerySchema } from '../../services/src/combinedBookingValidator';

const router = Router();

router.use(authMiddleware);

import { z } from 'zod';

const confirmPaymentModeSchema = z.object({
  paymentMode: z.enum(['CASH', 'UPI', 'ONLINE']),
  bookingType: z.enum(['towing', 'driver']).optional(),
});

/** Combined list of towing + driver bookings for the authenticated customer. */
router.get('/', validate(combinedBookingListQuerySchema, 'query'), bookingController.list);
router.post(
  '/:id/confirm-payment-mode',
  validate(confirmPaymentModeSchema),
  bookingController.confirmPaymentMode,
);

export default router;
