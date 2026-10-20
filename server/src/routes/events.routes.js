import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/events.controller.js';

const router = express.Router();

router.get('/', authenticate, getEvents);
router.post('/', authenticate, authorize('super_admin', 'admin', 'school_leader', 'mentor'), upload.single('image'), createEvent);
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'school_leader', 'mentor'), upload.single('image'), updateEvent);
router.delete('/:id', authenticate, authorize('super_admin', 'admin', 'school_leader', 'mentor'), deleteEvent);

export default router;
