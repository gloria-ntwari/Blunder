import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getNotifications, markRead, markAllRead } from '../controllers/notifications.controller.js';

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, markAllRead);
router.put('/:id/read', authenticate, markRead);

export default router;
