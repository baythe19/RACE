import { Router } from 'express';

import { env } from '../../config/env';
import { authMiddleware } from '../../middleware/src/auth';
import { paymentController } from './payment';
import authRoutes from './authRoutes';
import bookingRoutes from './bookingRoutes';
import driverBookingRoutes from './driverBookingRoutes';
import roadsideBookingRoutes from './roadsideBookingRoutes';
import towingBookingRoutes from './towingBookingRoutes';
import brandRoutes from './brandRoutes';
import locationRoutes from './locationRoutes';
import notificationRoutes from './notificationRoutes';
import paymentRoutes from './paymentRoutes';
import bookingPaymentRoutes from './bookingPaymentRoutes';
import profileRoutes from './profileRoutes';
import serviceRoutes from './serviceRoutes';
import sosRoutes from './sosRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import vehicleRoutes from './vehicleRoutes';
import qrRoutes from './qrRoutes';
import vendorRoutes from './vendorRoutes';
import driverRoutes from './driverRoutes';
import adminRoutes from './admin/index';
import fareRoutes from './fareRoutes';
import documentRoutes from './documentRoutes';
import enquiryRoutes from './enquiryRoutes';

const router = Router();
const api = env.API_PREFIX;

/** Customer & mobile app API */
router.use(`${api}/auth`, authRoutes);
router.use(`${api}/brand`, brandRoutes);
router.use(`${api}/services`, serviceRoutes);
router.use(`${api}/profile`, profileRoutes);
router.get(`${api}/profile/wallet`, authMiddleware, paymentController.getWallet);
router.use(`${api}/profile/locations`, locationRoutes);
router.use(`${api}/profile/payment-methods`, paymentRoutes);
router.use(`${api}/profile/notifications`, notificationRoutes);
router.use(`${api}/vehicles`, vehicleRoutes);
router.use(`${api}/qr`, qrRoutes);
router.use(`${api}/bookings/towing`, towingBookingRoutes);
router.use(`${api}/bookings/driver`, driverBookingRoutes);
router.use(`${api}/bookings/roadside`, roadsideBookingRoutes);
router.use(`${api}/bookings`, bookingRoutes);
router.use(`${api}/payments`, bookingPaymentRoutes);
router.use(`${api}/fare`, fareRoutes);
router.use(`${api}/subscriptions`, subscriptionRoutes);
router.use(`${api}/sos`, sosRoutes);
router.use(`${api}/vendor`, vendorRoutes);
router.use(`${api}/driver`, driverRoutes);
router.use(`${api}/enquiries`, enquiryRoutes);
// BUG-02/P0.4 — KYC/document access is identity-gated (replaces /uploads static).
router.use(`${api}/documents`, documentRoutes);

/** Admin panel API */
router.use(`${api}/admin`, adminRoutes);

export default router;
