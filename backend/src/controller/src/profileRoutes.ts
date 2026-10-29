import { Router } from 'express';

import { profileController } from './profile';
import {
  completeProfileSchema,
  mobileChangeConfirmSchema,
  mobileChangeRequestSchema,
  passwordChangeSchema,
  pinSetSchema,
  pinVerifySchema,
  updateProfileSchema,
} from '../../services/src/profileValidator';
import { validate } from '../../middleware/src/validation';
import { authMiddleware } from '../../middleware/src/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', profileController.getProfile);
router.put('/complete', validate(completeProfileSchema), profileController.completeProfile);
router.put('/', validate(updateProfileSchema), profileController.updateProfile);

// Identity credential endpoints (backed by real services — no placebo screens)
router.post('/password/change', validate(passwordChangeSchema), profileController.changePassword);
router.post('/mobile/change-request', validate(mobileChangeRequestSchema), profileController.requestMobileChange);
router.post('/mobile/change-confirm', validate(mobileChangeConfirmSchema), profileController.confirmMobileChange);
router.post('/pin/set', validate(pinSetSchema), profileController.setPin);
router.post('/pin/verify', validate(pinVerifySchema), profileController.verifyPin);

export default router;
