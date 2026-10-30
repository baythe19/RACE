import { Router } from 'express';

import { authMiddleware } from '../../middleware/src/auth';
import { validate } from '../../middleware/src/validation';
import { notificationController } from './notification';
import { updateNotificationPrefsSchema } from '../../services/src/notificationValidator';

const router = Router();

router.use(authMiddleware);

router.get('/', notificationController.list);
router.get('/preferences', notificationController.getPrefs);
router.patch('/preferences', validate(updateNotificationPrefsSchema), notificationController.updatePrefs);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.delete('/', notificationController.deleteAll);
router.delete('/:id', notificationController.deleteOne);

export default router;
