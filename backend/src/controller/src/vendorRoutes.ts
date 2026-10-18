import { Router } from 'express';

import { authMiddleware } from '../../middleware/src/auth';
import { requireRole } from '../../middleware/src/role';
import { vendorDocumentUpload } from '../../middleware/src/upload';
import { validate } from '../../middleware/src/validation';
import { vendorController } from './vendor';
import {
  inviteVendorDriverSchema,
  revokeVendorDriverMembershipSchema,
} from '../../services/src/vendorDriversValidator';
import { savePayoutAccountSchema } from '../../services/src/vendorValidator';
import {
  createVendorVehicleSchema,
  updateVendorVehicleSchema,
  uploadVendorVehicleDocumentSchema,
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

/** Payout account — real persistence on the vendor's user profile. */
router.get('/payout-account', requireRole('vendor'), vendorController.getPayoutAccount);
router.put(
  '/payout-account',
  requireRole('vendor'),
  validate(savePayoutAccountSchema),
  vendorController.savePayoutAccount,
);
/** Real earnings/payout history from the transactions collection. */
router.get('/earnings', requireRole('vendor'), vendorController.getEarnings);

router.post(
  '/upload-document',
  vendorDocumentUpload.single('file'),
  validate(uploadDocumentSchema),
  vendorController.uploadDocument,
);

router.post('/selfie', vendorDocumentUpload.single('file'), vendorController.uploadSelfie);

router.get('/drivers', requireRole('vendor'), vendorController.listDrivers);
router.get('/drivers/memberships', requireRole('vendor'), vendorController.listDriverMemberships);
router.post(
  '/drivers/invitations',
  requireRole('vendor'),
  validate(inviteVendorDriverSchema),
  vendorController.inviteDriver,
);
router.delete(
  '/drivers/memberships/:id',
  requireRole('vendor'),
  validate(revokeVendorDriverMembershipSchema),
  vendorController.revokeDriverMembership,
);
router.get('/vehicles', requireRole('vendor'), vendorController.listVehicles);
router.post(
  '/vehicles',
  requireRole('vendor'),
  validate(createVendorVehicleSchema),
  vendorController.createVehicle,
);
router.post(
  '/vehicles/:id/upload-document',
  requireRole('vendor'),
  vendorDocumentUpload.single('file'),
  validate(uploadVendorVehicleDocumentSchema),
  vendorController.uploadVehicleDocument,
);
router.put(
  '/vehicles/:id',
  requireRole('vendor'),
  validate(updateVendorVehicleSchema),
  vendorController.updateVehicle,
);
router.delete('/vehicles/:id', requireRole('vendor'), vendorController.removeVehicle);

router.get('/bookings', requireRole('vendor'), vendorController.listBookings);
router.get('/bookings/:id/tracking', requireRole('vendor'), vendorController.getBookingTracking);
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
