import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  getMentorGroups,
  createMentorGroup,
  updateMentorGroup,
  deleteMentorGroup,
} from '../controllers/mentorGroups.controller.js';

const router = express.Router();

// Public — used in registration step 2
router.get('/', getMentorGroups);

// Super Admin & Student Leader only
router.post('/', authenticate, authorize('super_admin', 'student_leader'), createMentorGroup);
router.put('/:id', authenticate, authorize('super_admin', 'student_leader'), updateMentorGroup);
router.delete('/:id', authenticate, authorize('super_admin', 'student_leader'), deleteMentorGroup);

export default router;
