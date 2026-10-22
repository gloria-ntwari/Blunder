import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  getMe, updateMe, getUsers, getUserById, updateUser, deleteUser, getMentorGroups, getMentors,
} from '../controllers/users.controller.js';

const router = express.Router();

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, upload.single('avatar'), updateMe);
router.get('/mentor-groups', getMentorGroups); // used in registration (public)
router.get('/mentors', getMentors);           // mentors by track+class (public)

router.get('/', authenticate, authorize('super_admin', 'admin'), getUsers);
router.get('/:id', authenticate, authorize('super_admin', 'admin'), getUserById);
router.put('/:id', authenticate, authorize('super_admin'), updateUser);
router.delete('/:id', authenticate, authorize('super_admin'), deleteUser);

export default router;
