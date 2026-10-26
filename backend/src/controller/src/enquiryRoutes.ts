import { Router } from 'express';
import { authMiddleware } from '../../middleware/src/auth';
import { enquiryController } from './enquiry';

const router = Router();

router.use(authMiddleware);

router.post('/', enquiryController.create);
router.get('/my', enquiryController.listMy);
router.get('/', enquiryController.listAll);

export default router;
