import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  createDressCode,
  createPlaylistSong,
  createSchulhausAnnouncement,
  deleteDressCode,
  deleteSchulhausAnnouncement,
  getSchulhaus,
  suggestSong,
  toggleSongVote,
  updateDressCode,
  voteDressCode,
  updateSchulhausAnnouncement,
  updatePlaylistStatus,
} from '../controllers/schulhaus.controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/', getSchulhaus);
router.post('/dress-codes', upload.single('image'), createDressCode);
router.put('/dress-codes/:id', upload.single('image'), updateDressCode);
router.delete('/dress-codes/:id', deleteDressCode);
router.post('/dress-codes/:id/vote', voteDressCode);
router.post('/songs', suggestSong);
router.post('/songs/playlist', createPlaylistSong);
router.post('/songs/:id/vote', toggleSongVote);
router.put('/songs/:id/playlist', updatePlaylistStatus);
router.post('/announcements', upload.single('image'), createSchulhausAnnouncement);
router.put('/announcements/:id', upload.single('image'), updateSchulhausAnnouncement);
router.delete('/announcements/:id', deleteSchulhausAnnouncement);

export default router;
