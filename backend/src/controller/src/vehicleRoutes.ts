import { Router } from 'express';

import { vehicleController } from './vehicle';
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleIdSchema,
} from '../../services/src/vehicleValidator';
import { validate } from '../../middleware/src/validation';
import { authMiddleware } from '../../middleware/src/auth';
import { qrRateLimiter } from '../../middleware/src/rateLimiter';
import { vendorDocumentUpload } from '../../middleware/src/upload';

const router = Router();

router.get('/:id/verify', qrRateLimiter, validate(vehicleIdSchema, 'params'), vehicleController.verifyQr);

router.use(authMiddleware);

router.post('/', validate(createVehicleSchema), vehicleController.create);
router.post('/:id/photo', vendorDocumentUpload.single('file'), validate(vehicleIdSchema, 'params'), vehicleController.uploadPhoto);
router.get('/', vehicleController.list);
router.get('/:id', validate(vehicleIdSchema, 'params'), vehicleController.getById);
router.put(
  '/:id',
  validate(vehicleIdSchema, 'params'),
  validate(updateVehicleSchema),
  vehicleController.update,
);
router.delete('/:id', validate(vehicleIdSchema, 'params'), vehicleController.remove);

export default router;
