import { Router } from 'express';

import { authMiddleware } from '../../middleware/src/auth';
import { validate } from '../../middleware/src/validation';
import { notificationController } from './notification';
import { updateNotificationPrefsSchema } from '../../services/src/notificationValidator';

const router = Router();

router.use(authMiddleware);

router.get('/', notificationController.list);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.delete('/', notificationController.deleteAll);
router.get('/preferences', notificationController.getPrefs);
router.patch('/preferences', validate(updateNotificationPrefsSchema), notificationController.updatePrefs);

export default router;
