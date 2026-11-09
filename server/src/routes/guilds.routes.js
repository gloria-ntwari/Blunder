import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { createGuild, createGuildAnnouncement, deleteGuild, listGuildAnnouncements, listGuilds, reactToGuildAnnouncement, updateGuild } from '../controllers/guilds.controller.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();
router.use(authenticate);
router.get('/', listGuilds);
router.post('/', createGuild);
router.put('/:id', updateGuild);
router.delete('/:id', deleteGuild);
router.get('/:id/announcements', listGuildAnnouncements);
router.post('/:id/announcements', upload.single('image'), createGuildAnnouncement);
router.post('/:id/announcements/:announcementId/reactions', reactToGuildAnnouncement);
export default router;
