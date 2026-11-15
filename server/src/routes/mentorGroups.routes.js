import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  getMentorGroups,
  createMentorGroup,
  updateMentorGroup,
  deleteMentorGroup,
} from '../controllers/mentorGroups.controller.js';

const router = express.Router();

// Public for registration; authenticated student leaders are scoped to their track.
router.get('/', (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return getMentorGroups(req, res, next);
  return authenticate(req, res, () => getMentorGroups(req, res, next));
});

// Super Admin & Student Leader only
router.post('/', authenticate, authorize('super_admin', 'student_leader'), createMentorGroup);
router.put('/:id', authenticate, authorize('super_admin', 'student_leader'), updateMentorGroup);
router.delete('/:id', authenticate, authorize('super_admin', 'student_leader'), deleteMentorGroup);

export default router;
