import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getDeadlines, createDeadline, updateDeadline, deleteDeadline } from '../controllers/deadlines.controller.js';

const router = express.Router();

router.get('/', authenticate, getDeadlines);
router.post('/', authenticate, createDeadline);
router.put('/:id', authenticate, updateDeadline);
router.delete('/:id', authenticate, deleteDeadline);

export default router;
