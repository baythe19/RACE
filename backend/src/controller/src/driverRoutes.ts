import { Router } from 'express';

import { authMiddleware } from '../../middleware/src/auth';
import { requireRole } from '../../middleware/src/role';
import { validate } from '../../middleware/src/validation';
import { driverDocumentUpload } from '../../middleware/src/upload';
import { driverController } from './driver';
import { registerDriverSelfSchema } from '../../services/src/driverSelf';
import { z } from 'zod';
import {
  driverBookingsQuerySchema,
  driverBookingActionSchema,
  updateDriverAvailabilitySchema,
  updateDriverBookingStatusSchema,
  updateDriverLocationSchema,
} from '../../services/src/driverValidator';

const uploadDriverSelfDocumentSchema = z.object({
  documentType: z.string().min(2).max(60),
});

const router = Router();

router.use(authMiddleware);

// Self registration — any authenticated user (typically customer after OTP) can become a driver
router.post(
  '/register',
  validate(registerDriverSelfSchema),
  driverController.registerSelf,
);

// Self-driver KYC upload (BUG-05/PA-2): real file storage for own documents —
// authenticated, before role gate, mirroring /register's access model.
router.post(
  '/upload-document',
  driverDocumentUpload.single('file'),
  validate(uploadDriverSelfDocumentSchema),
  driverController.uploadSelfDocument,
);

router.use(requireRole('driver'));

router.patch(
  '/availability',
  validate(updateDriverAvailabilitySchema),
  driverController.updateAvailability,
);
router.patch(
  '/location',
  validate(updateDriverLocationSchema),
  driverController.updateLocation,
);
router.get(
  '/bookings',
  validate(driverBookingsQuerySchema, 'query'),
  driverController.listBookings,
);
router.get('/bookings/offers', driverController.listOpenOffers);
router.get('/bookings/active', driverController.getActiveBooking);
router.patch(
  '/bookings/:id/status',
  validate(updateDriverBookingStatusSchema),
  driverController.updateBookingStatus,
);
router.post(
  '/bookings/:id/accept',
  validate(driverBookingActionSchema),
  driverController.acceptBooking,
);
router.post(
  '/bookings/:id/reject',
  validate(driverBookingActionSchema),
  driverController.rejectBooking,
);

export default router;
