import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  getMe, updateMe, getUsers, getUserById, updateUser, deleteUser, getMentorGroups, getMentors,
} from '../controllers/users.controller.js';

const router = express.Router();

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, upload.single('avatar'), updateMe);
router.get('/mentor-groups', (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return getMentorGroups(req, res, next);
  return authenticate(req, res, () => getMentorGroups(req, res, next));
}); // Public for registration; authenticated student leaders receive only their track.
router.get('/mentors', getMentors);           // public — used in registration

// Super admins can view all users; student leaders can view permitted roles.
router.get('/', authenticate, authorize('super_admin', 'student_leader'), getUsers);
router.get('/:id', authenticate, authorize('super_admin', 'student_leader'), getUserById);
router.put('/:id', authenticate, authorize('super_admin', 'student_leader'), updateUser);
router.delete('/:id', authenticate, authorize('super_admin', 'student_leader'), deleteUser);

export default router;
