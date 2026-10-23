import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  getAnnouncements, getAnnouncementById, createAnnouncement,
  updateAnnouncement, deleteAnnouncement,
} from '../controllers/announcements.controller.js';

const router = express.Router();

router.get('/', authenticate, getAnnouncements);
router.get('/:id', authenticate, getAnnouncementById);

// All staff roles can post — scope restrictions enforced in controller/client
router.post('/', authenticate, authorize(
  'super_admin', 'sv_committee', 'teacher', 'student_leader', 'committee', 'mentor'
), createAnnouncement);
router.put('/:id', authenticate, authorize(
  'super_admin', 'sv_committee', 'teacher', 'student_leader', 'committee', 'mentor'
), updateAnnouncement);
router.delete('/:id', authenticate, authorize(
  'super_admin', 'sv_committee', 'teacher', 'student_leader', 'committee', 'mentor'
), deleteAnnouncement);

export default router;
