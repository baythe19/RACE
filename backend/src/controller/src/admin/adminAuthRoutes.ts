import { Router } from 'express';

import { validate } from '../../../middleware/src/validation';
import { adminAuthMiddleware } from '../../../middleware/src/adminAuth';
import { adminAuthRateLimiter } from '../../../middleware/src/rateLimiter';
import { adminAuthController } from './adminAuth';
import {
  adminForgotPasswordSchema,
  adminLoginSchema,
  adminRefreshTokenSchema,
  adminResetPasswordSchema,
} from '../../../services/src/admin/adminAuthValidator';

const router = Router();

router.post('/login', adminAuthRateLimiter, validate(adminLoginSchema), adminAuthController.login);
router.post('/refresh-token', validate(adminRefreshTokenSchema), adminAuthController.refreshToken);
router.post('/logout', adminAuthController.logout);
router.post('/forgot-password', validate(adminForgotPasswordSchema), adminAuthController.forgotPassword);
router.post('/reset-password', validate(adminResetPasswordSchema), adminAuthController.resetPassword);
router.get('/me', adminAuthMiddleware, adminAuthController.me);

export default router;
