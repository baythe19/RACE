import { Router } from 'express';

import { authMiddleware } from '../../middleware/src/auth';
import { requireRole } from '../../middleware/src/role';
import { vendorDocumentUpload } from '../../middleware/src/upload';
import { validate } from '../../middleware/src/validation';
import { vendorController } from './vendor';
import {
  assignVendorDriverVehicleSchema,
  claimVendorDriverSchema,
  createVendorDriverSchema,
  resetVendorDriverPasswordSchema,
  uploadVendorDriverDocumentSchema,
} from '../../services/src/vendorDriversValidator';
import {
  createVendorVehicleSchema,
  updateVendorVehicleSchema,
} from '../../services/src/vendorVehiclesValidator';
import { vendorApproveBookingSchema, vendorAssignBookingSchema, vendorVerifyTripOtpSchema } from '../../services/src/vendorBookingsValidator';
import {
  registerVendorSchema,
  saveVendorDraftSchema,
  updateVendorSchema,
  uploadDocumentSchema,
} from '../../services/src/vendorValidator';

const router = Router();

router.use(authMiddleware);

router.post('/draft', validate(saveVendorDraftSchema), vendorController.saveDraft);
router.post('/register', validate(registerVendorSchema), vendorController.register);
router.put('/update', validate(updateVendorSchema), vendorController.update);
router.get('/profile', vendorController.getProfile);
router.get('/status', vendorController.getStatus);
router.get('/dashboard', requireRole('vendor'), vendorController.getDashboard);

router.post(
  '/upload-document',
  vendorDocumentUpload.single('file'),
  validate(uploadDocumentSchema),
  vendorController.uploadDocument,
);

router.post('/selfie', vendorDocumentUpload.single('file'), vendorController.uploadSelfie);

router.get('/drivers', requireRole('vendor'), vendorController.listDrivers);
router.post(
  '/drivers',
  requireRole('vendor'),
  validate(createVendorDriverSchema),
  vendorController.createDriver,
);
router.post(
  '/drivers/:id/upload-document',
  requireRole('vendor'),
  vendorDocumentUpload.single('file'),
  validate(uploadVendorDriverDocumentSchema),
  vendorController.uploadDriverDocument,
);
router.post(
  '/drivers/claim',
  requireRole('vendor'),
  validate(claimVendorDriverSchema),
  vendorController.claimDriver,
);
router.post(
  '/drivers/:id/assign-vehicle',
  requireRole('vendor'),
  validate(assignVendorDriverVehicleSchema),
  vendorController.assignDriverVehicle,
);
router.post(
  '/drivers/:id/reset-password',
  requireRole('vendor'),
  validate(resetVendorDriverPasswordSchema),
  vendorController.resetDriverPassword,
);
router.delete('/drivers/:id', requireRole('vendor'), vendorController.removeDriver);

router.get('/vehicles', requireRole('vendor'), vendorController.listVehicles);
router.post(
  '/vehicles',
  requireRole('vendor'),
  validate(createVendorVehicleSchema),
  vendorController.createVehicle,
);
router.put(
  '/vehicles/:id',
  requireRole('vendor'),
  validate(updateVendorVehicleSchema),
  vendorController.updateVehicle,
);
router.delete('/vehicles/:id', requireRole('vendor'), vendorController.removeVehicle);

router.get('/bookings', requireRole('vendor'), vendorController.listBookings);
router.get('/bookings/offers', requireRole('vendor'), vendorController.listBookingOffers);
router.post(
  '/bookings/:id/approve',
  requireRole('vendor'),
  validate(vendorApproveBookingSchema),
  vendorController.approveBooking,
);
router.post(
  '/bookings/:id/assign',
  requireRole('vendor'),
  validate(vendorAssignBookingSchema),
  vendorController.assignBooking,
);
router.post(
  '/bookings/:id/verify-trip-otp',
  requireRole('vendor'),
  validate(vendorVerifyTripOtpSchema),
  vendorController.verifyTripOtp,
);

export default router;
