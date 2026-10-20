import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  getLostFound, getLostFoundById, createLostFound,
  claimItem, deleteLostFound, addComment,
} from '../controllers/lostandfound.controller.js';

const router = express.Router();

router.get('/', authenticate, getLostFound);
router.get('/:id', authenticate, getLostFoundById);
router.post('/', authenticate, upload.single('photo'), createLostFound);
router.post('/:id/claim', authenticate, claimItem);
router.delete('/:id', authenticate, deleteLostFound);
router.post('/:id/comments', authenticate, addComment);

export default router;
