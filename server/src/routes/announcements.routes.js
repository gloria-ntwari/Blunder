import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  getAnnouncements, getAnnouncementById, createAnnouncement,
  updateAnnouncement, deleteAnnouncement,
} from '../controllers/announcements.controller.js';

const router = express.Router();

router.get('/', authenticate, getAnnouncements);
router.get('/:id', authenticate, getAnnouncementById);
router.post('/', authenticate, authorize('super_admin', 'admin', 'school_leader', 'mentor'), createAnnouncement);
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'school_leader', 'mentor'), updateAnnouncement);
router.delete('/:id', authenticate, authorize('super_admin', 'admin', 'school_leader', 'mentor'), deleteAnnouncement);

export default router;
