import { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';
import { emitNotification, emitSchulhausChanged } from '../socket/index.js';

const canView = (user) => user?.role !== 'teacher';
const canManage = (user) => ['dj_team', 'super_admin'].includes(user?.role);

const requireView = (req, res) => {
  if (canView(req.user)) return true;
  res.status(403).json({ message: 'Schülerhaus is not available to teacher accounts' });
  return false;
};

const requireManager = (req, res) => {
  if (canManage(req.user)) return true;
  res.status(403).json({ message: 'Only the DJ team can manage Schülerhaus content' });
  return false;
};

const notifySchulhausAudience = async (req, { title, body, entityType, entityId }) => {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
       SELECT id, $1, $2, $3, $4, $5 FROM users
       WHERE is_active = TRUE AND role <> 'teacher' AND id <> $6
       RETURNING id, user_id, type, title, body, entity_type, entity_id, is_read, created_at`,
      [entityType, title, body, entityType, entityId, req.user.id]
    );
    const io = req.app.get('io');
    result.rows.forEach((notification) => emitNotification(io, notification.user_id, notification));
  } catch (err) {
    console.error('[Schulhaus notifications]', err.message);
  }
};

export const getSchulhaus = async (req, res, next) => {
  if (!requireView(req, res)) return;
  try {
    const [dressCodes, songs, announcements] = await Promise.all([
      query(`SELECT d.*, u.full_name AS author_name,
               COALESCE((SELECT jsonb_object_agg(reaction, total) FROM (
                 SELECT reaction, COUNT(*)::int AS total FROM schulhaus_dress_code_reactions
                 WHERE dress_code_id = d.id GROUP BY reaction
               ) reaction_totals), '{}'::jsonb) AS reaction_counts,
               COALESCE((SELECT jsonb_agg(reaction) FROM schulhaus_dress_code_reactions
                         WHERE dress_code_id = d.id AND user_id = $1), '[]'::jsonb) AS user_reactions,
               (SELECT COUNT(*)::int FROM schulhaus_dress_code_comments c WHERE c.dress_code_id = d.id) AS comment_count,
               COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'body', c.body, 'author_name', cu.full_name, 'created_at', c.created_at) ORDER BY c.created_at ASC)
                         FROM schulhaus_dress_code_comments c LEFT JOIN users cu ON cu.id = c.user_id
                         WHERE c.dress_code_id = d.id), '[]'::jsonb) AS comments
             FROM schulhaus_dress_codes d
             LEFT JOIN users u ON u.id = d.created_by
             ORDER BY d.wear_date ASC NULLS LAST, d.created_at DESC`, [req.user.id]),
      query(`SELECT s.*,
               (SELECT COUNT(*)::int FROM schulhaus_song_votes v WHERE v.song_id = s.id) AS vote_count,
               EXISTS (SELECT 1 FROM schulhaus_song_votes v WHERE v.song_id = s.id AND v.user_id = $1) AS has_voted,
               EXISTS (SELECT 1 FROM schulhaus_song_suggestions ss WHERE ss.song_id = s.id AND ss.user_id = $1) AS has_suggested,
               (SELECT COUNT(*)::int FROM schulhaus_song_suggestions ss WHERE ss.song_id = s.id) AS suggestion_count,
               COALESCE((SELECT jsonb_agg(jsonb_build_object('id', su.id, 'name', su.full_name) ORDER BY su.full_name)
                         FROM schulhaus_song_suggestions ss JOIN users su ON su.id = ss.user_id
                         WHERE ss.song_id = s.id), '[]'::jsonb) AS suggesters
             FROM schulhaus_songs s
             ORDER BY s.in_playlist DESC, vote_count DESC, s.created_at DESC`, [req.user.id]),
      query(`SELECT a.*, u.full_name AS author_name FROM schulhaus_announcements a
             LEFT JOIN users u ON u.id = a.created_by
             ORDER BY a.created_at DESC`),
    ]);
    res.json({ dress_codes: dressCodes.rows, songs: songs.rows, announcements: announcements.rows });
  } catch (err) { next(err); }
};

export const createDressCode = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ message: 'Dress code title is required' });
  try {
    const imageUrl = req.file ? await uploadImage(req.file.buffer, 'blunder/schulhaus-dress-codes') : null;
    const result = await query(
      `INSERT INTO schulhaus_dress_codes (title, details, wear_date, image_url, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, req.body.details?.trim() || null, req.body.wear_date || null, imageUrl, req.user.id]
    );
    await notifySchulhausAudience(req, {
      title: `New dress code: ${title}`,
      body: req.body.details?.trim() || 'The DJ team shared a new dress code.',
      entityType: 'schulhaus_dress_code',
      entityId: result.rows[0].id,
    });
    emitSchulhausChanged(req.app.get('io'));
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

export const updateDressCode = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ message: 'Dress code title is required' });
  try {
    const existing = await query('SELECT image_url FROM schulhaus_dress_codes WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Dress code not found' });
    const imageUrl = req.body.remove_image === 'true' || req.body.remove_image === true
      ? null
      : req.file ? await uploadImage(req.file.buffer, 'blunder/schulhaus-dress-codes') : existing.rows[0].image_url;
    const result = await query(
      `UPDATE schulhaus_dress_codes SET title = $1, details = $2, wear_date = $3, image_url = $4
       WHERE id = $5 RETURNING *`,
      [title, req.body.details?.trim() || null, req.body.wear_date || null, imageUrl, req.params.id]
    );
    emitSchulhausChanged(req.app.get('io'));
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

export const deleteDressCode = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  try {
    await query('DELETE FROM schulhaus_dress_codes WHERE id = $1', [req.params.id]);
    emitSchulhausChanged(req.app.get('io'));
    res.json({ message: 'Dress code removed' });
  } catch (err) { next(err); }
};

export const reactToDressCode = async (req, res, next) => {
  if (!requireView(req, res)) return;
  const { reaction } = req.body;
  if (typeof reaction !== 'string' || !reaction.trim() || [...reaction].length > 8) return res.status(400).json({ message: 'Invalid reaction' });
  try {
    const code = await query('SELECT id FROM schulhaus_dress_codes WHERE id = $1', [req.params.id]);
    if (!code.rows.length) return res.status(404).json({ message: 'Dress code not found' });
    const current = await query('SELECT 1 FROM schulhaus_dress_code_reactions WHERE dress_code_id = $1 AND user_id = $2 AND reaction = $3', [req.params.id, req.user.id, reaction]);
    if (current.rows.length) {
      await query('DELETE FROM schulhaus_dress_code_reactions WHERE dress_code_id = $1 AND user_id = $2 AND reaction = $3', [req.params.id, req.user.id, reaction]);
    } else {
      await query('INSERT INTO schulhaus_dress_code_reactions (dress_code_id, user_id, reaction) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [req.params.id, req.user.id, reaction]);
    }
    const counts = await query(`SELECT COALESCE(jsonb_object_agg(reaction, total), '{}'::jsonb) AS reaction_counts FROM (
      SELECT reaction, COUNT(*)::int AS total FROM schulhaus_dress_code_reactions WHERE dress_code_id = $1 GROUP BY reaction
    ) reaction_totals`, [req.params.id]);
    const result = await query('SELECT reaction FROM schulhaus_dress_code_reactions WHERE dress_code_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    emitSchulhausChanged(req.app.get('io'));
    res.json({ reaction_counts: counts.rows[0].reaction_counts, user_reactions: result.rows.map((row) => row.reaction) });
  } catch (err) { next(err); }
};

export const addDressCodeComment = async (req, res, next) => {
  if (!requireView(req, res)) return;
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  const words = body ? body.split(/\s+/u).filter(Boolean) : [];
  if (!body) return res.status(400).json({ message: 'Write a comment first' });
  if (words.length > 10) return res.status(400).json({ message: 'Comments can be up to 10 words' });
  try {
    const code = await query('SELECT id FROM schulhaus_dress_codes WHERE id = $1', [req.params.id]);
    if (!code.rows.length) return res.status(404).json({ message: 'Dress code not found' });
    const result = await query(
      `INSERT INTO schulhaus_dress_code_comments (dress_code_id, user_id, body) VALUES ($1, $2, $3)
       RETURNING id, body, created_at`, [req.params.id, req.user.id, body]
    );
    emitSchulhausChanged(req.app.get('io'));
    res.status(201).json({ ...result.rows[0], author_name: req.user.full_name });
  } catch (err) { next(err); }
};

export const suggestSong = async (req, res, next) => {
  if (!requireView(req, res)) return;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const artist = typeof req.body.artist === 'string' ? req.body.artist.trim() : '';
  const link = typeof req.body.link === 'string' ? req.body.link.trim() : '';
  if (link) {
    try {
      if (!['http:', 'https:'].includes(new URL(link).protocol)) throw new Error('Invalid protocol');
    } catch {
      return res.status(400).json({ message: 'Music link must be a valid http or https URL' });
    }
  }
  try {
    let songId = req.body.song_id;
    if (!songId) {
      if (!title) return res.status(400).json({ message: 'Music name is required' });
      const created = await query(
        `INSERT INTO schulhaus_songs (title, artist, link)
         VALUES ($1, $2, $3)
         ON CONFLICT (LOWER(TRIM(title))) DO UPDATE
           SET artist = COALESCE(schulhaus_songs.artist, EXCLUDED.artist),
               link = COALESCE(schulhaus_songs.link, EXCLUDED.link)
         RETURNING id`,
        [title, artist || null, link || null]
      );
      songId = created.rows[0]?.id;
    }
    const song = await query('SELECT id FROM schulhaus_songs WHERE id = $1', [songId]);
    if (!song.rows.length) return res.status(404).json({ message: 'Music suggestion not found' });
    const suggestion = await query(
      'INSERT INTO schulhaus_song_suggestions (song_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING song_id',
      [songId, req.user.id]
    );
    if (suggestion.rows.length) {
      const details = await query('SELECT title FROM schulhaus_songs WHERE id = $1', [songId]);
      await notifySchulhausAudience(req, {
        title: `New music suggestion: ${details.rows[0].title}`,
        body: 'A student suggested music for the Schülerhaus playlist.',
        entityType: 'schulhaus_song',
        entityId: songId,
      });
    }
    emitSchulhausChanged(req.app.get('io'));
    res.status(201).json({ message: 'Music suggestion saved', song_id: songId });
  } catch (err) { next(err); }
};

export const createPlaylistSong = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const artist = typeof req.body.artist === 'string' ? req.body.artist.trim() : '';
  const link = typeof req.body.link === 'string' ? req.body.link.trim() : '';
  if (!title) return res.status(400).json({ message: 'Music name is required' });
  if (link) {
    try {
      if (!['http:', 'https:'].includes(new URL(link).protocol)) throw new Error('Invalid protocol');
    } catch {
      return res.status(400).json({ message: 'Music link must be a valid http or https URL' });
    }
  }
  try {
    const result = await query(
      `INSERT INTO schulhaus_songs (title, artist, link, in_playlist, added_to_playlist_by)
       VALUES ($1, $2, $3, TRUE, $4)
       ON CONFLICT (LOWER(TRIM(title))) DO UPDATE
         SET artist = COALESCE(EXCLUDED.artist, schulhaus_songs.artist),
             link = COALESCE(EXCLUDED.link, schulhaus_songs.link),
             in_playlist = TRUE, added_to_playlist_by = EXCLUDED.added_to_playlist_by
       RETURNING *`,
      [title, artist || null, link || null, req.user.id]
    );
    await notifySchulhausAudience(req, {
      title: `New playlist music: ${result.rows[0].title}`,
      body: result.rows[0].artist ? `Added by the DJ team · ${result.rows[0].artist}` : 'Added to the Schülerhaus playlist by the DJ team.',
      entityType: 'schulhaus_song',
      entityId: result.rows[0].id,
    });
    emitSchulhausChanged(req.app.get('io'));
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

export const updatePlaylistSong = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const artist = typeof req.body.artist === 'string' ? req.body.artist.trim() : '';
  const link = typeof req.body.link === 'string' ? req.body.link.trim() : '';
  if (!title) return res.status(400).json({ message: 'Music name is required' });
  if (link) {
    try { if (!['http:', 'https:'].includes(new URL(link).protocol)) throw new Error('Invalid protocol'); }
    catch { return res.status(400).json({ message: 'Music link must be a valid http or https URL' }); }
  }
  try {
    const result = await query(
      `UPDATE schulhaus_songs SET title = $1, artist = $2, link = $3
       WHERE id = $4 AND in_playlist = TRUE RETURNING *`,
      [title, artist || null, link || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Playlist song not found' });
    emitSchulhausChanged(req.app.get('io'));
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

export const unsuggestSong = async (req, res, next) => {
  if (!requireView(req, res)) return;
  try {
    const result = await query(
      'DELETE FROM schulhaus_song_suggestions WHERE song_id = $1 AND user_id = $2 RETURNING song_id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Your suggestion was not found' });
    await query(`DELETE FROM schulhaus_songs s WHERE s.id = $1 AND s.in_playlist = FALSE
                 AND NOT EXISTS (SELECT 1 FROM schulhaus_song_suggestions ss WHERE ss.song_id = s.id)`, [req.params.id]);
    emitSchulhausChanged(req.app.get('io'));
    res.json({ message: 'Suggestion removed' });
  } catch (err) { next(err); }
};

export const toggleSongVote = async (req, res, next) => {
  if (!requireView(req, res)) return;
  try {
    const song = await query('SELECT id FROM schulhaus_songs WHERE id = $1', [req.params.id]);
    if (!song.rows.length) return res.status(404).json({ message: 'Song not found' });
    const current = await query('SELECT 1 FROM schulhaus_song_votes WHERE song_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (current.rows.length) {
      await query('DELETE FROM schulhaus_song_votes WHERE song_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    } else {
      await query('INSERT INTO schulhaus_song_votes (song_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
    }
    const count = await query('SELECT COUNT(*)::int AS vote_count FROM schulhaus_song_votes WHERE song_id = $1', [req.params.id]);
    emitSchulhausChanged(req.app.get('io'));
    res.json({ has_voted: !current.rows.length, vote_count: count.rows[0].vote_count });
  } catch (err) { next(err); }
};

export const updatePlaylistStatus = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  try {
    const result = await query(
      `UPDATE schulhaus_songs SET in_playlist = $1, added_to_playlist_by = CASE WHEN $1 THEN $2 ELSE NULL END
       WHERE id = $3 RETURNING id, in_playlist`,
      [Boolean(req.body.in_playlist), req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Song not found' });
    emitSchulhausChanged(req.app.get('io'));
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

export const createSchulhausAnnouncement = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  if (!title || !body) return res.status(400).json({ message: 'Title and announcement are required' });
  try {
    const imageUrl = req.file ? await uploadImage(req.file.buffer, 'blunder/schulhaus-announcements') : null;
    const result = await query(
      'INSERT INTO schulhaus_announcements (title, body, image_url, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, body, imageUrl, req.user.id]
    );
    await notifySchulhausAudience(req, {
      title: `Schülerhaus announcement: ${title}`,
      body,
      entityType: 'schulhaus_announcement',
      entityId: result.rows[0].id,
    });
    emitSchulhausChanged(req.app.get('io'));
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

export const updateSchulhausAnnouncement = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  if (!title || !body) return res.status(400).json({ message: 'Title and announcement are required' });
  try {
    const existing = await query('SELECT image_url FROM schulhaus_announcements WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Announcement not found' });
    const imageUrl = req.body.remove_image === 'true' || req.body.remove_image === true
      ? null
      : req.file ? await uploadImage(req.file.buffer, 'blunder/schulhaus-announcements') : existing.rows[0].image_url;
    const result = await query(
      `UPDATE schulhaus_announcements SET title = $1, body = $2, image_url = $3
       WHERE id = $4 RETURNING *`, [title, body, imageUrl, req.params.id]
    );
    emitSchulhausChanged(req.app.get('io'));
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

export const deleteSchulhausAnnouncement = async (req, res, next) => {
  if (!requireManager(req, res)) return;
  try {
    await query('DELETE FROM schulhaus_announcements WHERE id = $1', [req.params.id]);
    emitSchulhausChanged(req.app.get('io'));
    res.json({ message: 'Announcement removed' });
  } catch (err) { next(err); }
};
