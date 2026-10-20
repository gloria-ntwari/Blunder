import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  getFoodMenu, getTodayMenu, createFoodMenu, updateFoodMenu,
  deleteFoodMenu, createSnackAlert, getActiveSnackAlerts,
} from '../controllers/food.controller.js';

const router = express.Router();

router.get('/today', authenticate, getTodayMenu);
router.get('/snack-alerts', authenticate, getActiveSnackAlerts);
router.get('/', authenticate, getFoodMenu);
router.post('/', authenticate, authorize('super_admin', 'admin'), upload.single('image'), createFoodMenu);
router.put('/:id', authenticate, authorize('super_admin', 'admin'), upload.single('image'), updateFoodMenu);
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), deleteFoodMenu);
router.post('/snack-alert', authenticate, authorize('super_admin', 'admin'), createSnackAlert);

export default router;
