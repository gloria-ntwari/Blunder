import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getNotifications, markRead, markAllRead } from '../controllers/notifications.controller.js';
import { getPushPublicKey, subscribeToPush, unsubscribeFromPush } from '../controllers/push.controller.js';

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, markAllRead);
router.put('/:id/read', authenticate, markRead);
router.get('/push/public-key', authenticate, getPushPublicKey);
router.post('/push/subscribe', authenticate, subscribeToPush);
router.delete('/push/subscribe', authenticate, unsubscribeFromPush);

export default router;
