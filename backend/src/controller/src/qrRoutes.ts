import { Router } from 'express';

import { validate } from '../../middleware/src/validation';
import { qrRateLimiter } from '../../middleware/src/rateLimiter';
import { adminAuthMiddleware } from '../../middleware/src/adminAuth';
import { vehicleController } from './vehicle';
import { vehicleIdSchema } from '../../services/src/vehicleValidator';

const router = Router();

/**
 * BUG-19 hardening — the scan endpoint stays PUBLIC by design (a stranger
 * scanning a windshield sticker must reach the owner in an emergency) but is
 * throttled hard per IP. The metadata endpoint (scan counts, active flags —
 * enumeration fuel with zero emergency value) is admin-only now.
 */
router.get('/:id', qrRateLimiter, validate(vehicleIdSchema, 'params'), vehicleController.verifyQr);

router.get(
  '/:id/metadata',
  qrRateLimiter,
  adminAuthMiddleware,
  validate(vehicleIdSchema, 'params'),
  vehicleController.getQrMetadata,
);

export default router;
