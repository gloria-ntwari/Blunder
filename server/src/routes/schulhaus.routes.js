import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  createDressCode,
  createPlaylistSong,
  createSchulhausAnnouncement,
  addDressCodeComment,
  deleteDressCode,
  deleteSchulhausAnnouncement,
  getSchulhaus,
  suggestSong,
  toggleSongVote,
  unsuggestSong,
  updateDressCode,
  updatePlaylistSong,
  reactToDressCode,
  updateSchulhausAnnouncement,
  updatePlaylistStatus,
} from '../controllers/schulhaus.controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/', getSchulhaus);
router.post('/dress-codes', upload.single('image'), createDressCode);
router.put('/dress-codes/:id', upload.single('image'), updateDressCode);
router.delete('/dress-codes/:id', deleteDressCode);
router.post('/dress-codes/:id/reactions', reactToDressCode);
router.post('/dress-codes/:id/comments', addDressCodeComment);
router.post('/songs', suggestSong);
router.post('/songs/playlist', createPlaylistSong);
router.put('/songs/:id', updatePlaylistSong);
router.delete('/songs/:id/suggestion', unsuggestSong);
router.post('/songs/:id/vote', toggleSongVote);
router.put('/songs/:id/playlist', updatePlaylistStatus);
router.post('/announcements', upload.single('image'), createSchulhausAnnouncement);
router.put('/announcements/:id', upload.single('image'), updateSchulhausAnnouncement);
router.delete('/announcements/:id', deleteSchulhausAnnouncement);

export default router;
