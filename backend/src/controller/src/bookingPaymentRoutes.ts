import { Router } from 'express';

import { authMiddleware } from '../../middleware/src/auth';
import { validate } from '../../middleware/src/validation';
import { bookingPaymentController } from './bookingPayment';
import {
  initiateBookingPaymentSchema,
  verifyBookingPaymentSchema,
} from '../../services/src/bookingPaymentValidator';

const router = Router();

/**
 * Server-to-server gateway callback webhook (unauthenticated, HMAC signature-verified).
 * Mounts before authMiddleware.
 */
router.post('/webhook', bookingPaymentController.handleWebhook);

router.use(authMiddleware);

router.post('/advance', validate(initiateBookingPaymentSchema), bookingPaymentController.initiateAdvance);
router.post(
  '/advance/verify',
  validate(verifyBookingPaymentSchema),
  bookingPaymentController.verifyAdvance,
);
router.post('/final', validate(initiateBookingPaymentSchema), bookingPaymentController.initiateFinal);
router.post(
  '/final/verify',
  validate(verifyBookingPaymentSchema),
  bookingPaymentController.verifyFinal,
);

export default router;
