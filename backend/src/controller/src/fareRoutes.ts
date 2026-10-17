import { Router } from 'express';

import { validate } from '../../middleware/src/validation';
import { fareRateLimiter } from '../../middleware/src/rateLimiter';
import { fareController } from './fare';
import { driverFareQuerySchema, towingFareQuerySchema } from '../../services/src/fareValidator';

const router = Router();

// BUG-18: public endpoint hitting a billed Google API — tight per-IP cap +
// result caching in googleMaps.ts keeps quota abuse in check.
router.get(
  '/towing',
  fareRateLimiter,
  validate(towingFareQuerySchema, 'query'),
  fareController.estimateTowing,
);
router.get(
  '/driver',
  fareRateLimiter,
  validate(driverFareQuerySchema, 'query'),
  fareController.estimateDriver,
);

export default router;
