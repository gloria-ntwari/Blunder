import express from 'express';
import {
  registerStep1, registerStep2, login, refresh, logout,
  inviteUser, verifyOtp, verifyEmail, resendVerificationEmail, setPassword, forgotPassword, resetPassword,
} from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register/step1', registerStep1);
router.post('/register/step2', registerStep2);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/refresh', refresh);
router.post('/logout', logout);
// super_admin can invite all roles; student_leader can invite committee and mentor
router.post('/invite', authenticate, authorize('super_admin', 'student_leader'), inviteUser);
router.post('/verify-otp', verifyOtp);
router.post('/set-password', setPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
