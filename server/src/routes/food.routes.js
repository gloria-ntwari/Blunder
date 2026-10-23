import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  getFoodMenu, getTodayMenu, createFoodMenu, updateFoodMenu,
  deleteFoodMenu, createSnackAlert, getActiveSnackAlerts,
} from '../controllers/food.controller.js';

const router = express.Router();

// Everyone authenticated can view
router.get('/today', authenticate, getTodayMenu);
router.get('/snack-alerts', authenticate, getActiveSnackAlerts);
router.get('/', authenticate, getFoodMenu);

// Only super_admin and sv_committee can manage food (teachers excluded)
router.post('/', authenticate, authorize('super_admin', 'sv_committee'), upload.single('image'), createFoodMenu);
router.put('/:id', authenticate, authorize('super_admin', 'sv_committee'), upload.single('image'), updateFoodMenu);
router.delete('/:id', authenticate, authorize('super_admin', 'sv_committee'), deleteFoodMenu);
router.post('/snack-alert', authenticate, authorize('super_admin', 'sv_committee'), createSnackAlert);

export default router;
