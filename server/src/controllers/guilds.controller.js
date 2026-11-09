import pool, { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';
import { emitNotification } from '../socket/index.js';

const guildPageRoles = ['student', 'student_leader', 'sv_committee', 'committee', 'mentor', 'super_admin'];
const invitableRoles = [...guildPageRoles, 'teacher'];

const canUseGuilds = (req, res) => {
  if (!guildPageRoles.includes(req.user.role)) {
    res.status(403).json({ message: 'Guilds are available to student accounts only' });
    return false;
  }
  return true;
};

const getGuildAccess = async (guildId, userId) => query(
  `SELECT g.id, g.name, g.created_by, gm.user_id
   FROM guilds g JOIN guild_members gm ON gm.guild_id = g.id
   WHERE g.id = $1 AND gm.user_id = $2`, [guildId, userId]
);

export const listGuilds = async (req, res, next) => {
  if (!canUseGuilds(req, res)) return;
  try {
    const view = req.query.view === 'all' && req.user.role === 'super_admin' ? 'all' : 'mine';
    const result = await query(
      `SELECT g.id, g.name, g.created_by, g.created_at, g.updated_at,
              creator.full_name AS creator_name,
              (SELECT COUNT(*)::int FROM guild_members members_count WHERE members_count.guild_id = g.id) AS member_count,
              (SELECT COUNT(*)::int FROM guild_announcements announcements_count WHERE announcements_count.guild_id = g.id AND (announcements_count.expires_at IS NULL OR announcements_count.expires_at > NOW())) AS announcement_count,
              CASE WHEN g.created_by = $1 THEN
                COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', member.id, 'email', member.email, 'full_name', member.full_name))
                  FILTER (WHERE member.id IS NOT NULL), '[]'::jsonb)
              ELSE '[]'::jsonb END AS members
       FROM guilds g
       LEFT JOIN guild_members mine ON mine.guild_id = g.id AND mine.user_id = $1
       JOIN users creator ON creator.id = g.created_by
       LEFT JOIN guild_members gm ON gm.guild_id = g.id
       LEFT JOIN users member ON member.id = gm.user_id
       LEFT JOIN guild_announcements ga ON ga.guild_id = g.id
       WHERE ($2 = 'all' OR mine.user_id = $1)
       GROUP BY g.id, creator.full_name ORDER BY g.updated_at DESC, g.name`,
      [req.user.id, view]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

export const createGuild = async (req, res, next) => {
  if (!canUseGuilds(req, res)) return;
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ message: 'Guild name is required' });
  try {
    const emails = [...new Set((Array.isArray(req.body.emails) ? req.body.emails : [])
      .map((email) => String(email).trim().toLowerCase()).filter(Boolean))];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created = await client.query('INSERT INTO guilds (name, created_by) VALUES ($1, $2) RETURNING *', [name, req.user.id]);
      await client.query('INSERT INTO guild_members (guild_id, user_id) VALUES ($1, $2)', [created.rows[0].id, req.user.id]);
      if (emails.length) await client.query(
        `INSERT INTO guild_members (guild_id, user_id)
         SELECT $1, id FROM users WHERE LOWER(email) = ANY($2::text[]) AND role::text = ANY($3::text[])
         ON CONFLICT DO NOTHING`, [created.rows[0].id, emails, invitableRoles]
      );
      await client.query('COMMIT');
      const members = await query(
        `SELECT u.id, u.email, u.full_name FROM guild_members gm JOIN users u ON u.id = gm.user_id WHERE gm.guild_id = $1 ORDER BY u.full_name`,
        [created.rows[0].id]
      );
      res.status(201).json({ ...created.rows[0], members: members.rows });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (err) { next(err); }
};

export const updateGuild = async (req, res, next) => {
  if (!canUseGuilds(req, res)) return;
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ message: 'Guild name is required' });
  try {
    const existing = await query('SELECT id, created_by FROM guilds WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Guild not found' });
    if (existing.rows[0].created_by !== req.user.id && req.user.role !== 'super_admin')
      return res.status(403).json({ message: 'Only the Guild creator or a Super Admin can edit it' });
    const emails = [...new Set((Array.isArray(req.body.emails) ? req.body.emails : [])
      .map((email) => String(email).trim().toLowerCase()).filter(Boolean))];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('UPDATE guilds SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [name, req.params.id]);
      if (existing.rows[0].created_by === req.user.id) {
        await client.query('DELETE FROM guild_members WHERE guild_id = $1 AND user_id NOT IN ($2, $3)',
          [req.params.id, req.user.id, existing.rows[0].created_by]);
        if (emails.length) await client.query(
          `INSERT INTO guild_members (guild_id, user_id)
           SELECT $1, id FROM users WHERE LOWER(email) = ANY($2::text[]) AND role::text = ANY($3::text[])
           ON CONFLICT DO NOTHING`, [req.params.id, emails, invitableRoles]
        );
      }
      await client.query('COMMIT');
      const members = await query(
        `SELECT u.id, u.email, u.full_name FROM guild_members gm JOIN users u ON u.id = gm.user_id WHERE gm.guild_id = $1 ORDER BY u.full_name`, [req.params.id]
      );
      res.json({ ...result.rows[0], members: existing.rows[0].created_by === req.user.id ? members.rows : [] });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (err) { next(err); }
};

export const deleteGuild = async (req, res, next) => {
  if (!canUseGuilds(req, res)) return;
  try {
    const deleted = await query(
      'DELETE FROM guilds WHERE id = $1 AND created_by = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!deleted.rows.length) {
      const existing = await query('SELECT id FROM guilds WHERE id = $1', [req.params.id]);
      if (!existing.rows.length) return res.status(404).json({ message: 'Guild not found' });
      return res.status(403).json({ message: 'Only the Guild creator can delete it' });
    }
    res.json({ message: 'Guild deleted' });
  } catch (err) { next(err); }
};

export const listGuildAnnouncements = async (req, res, next) => {
  if (!canUseGuilds(req, res)) return;
  try {
    const access = await getGuildAccess(req.params.id, req.user.id);
    if (!access.rows.length) return res.status(404).json({ message: 'Guild not found' });
    const result = await query(
      `SELECT ga.*, u.full_name AS author_name, u.avatar_url AS author_avatar, g.name AS guild_name,
              (SELECT COUNT(*) FROM guild_announcement_views v WHERE v.announcement_id = ga.id)::int AS view_count,
              (SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb)
                 FROM (SELECT reaction, COUNT(*)::int AS cnt FROM guild_announcement_reactions
                       WHERE announcement_id = ga.id GROUP BY reaction) reaction_totals) AS reaction_counts,
              (SELECT COALESCE(jsonb_agg(reaction), '[]'::jsonb) FROM guild_announcement_reactions
               WHERE announcement_id = ga.id AND user_id = $2) AS user_reactions
       FROM guild_announcements ga JOIN users u ON u.id = ga.created_by
       JOIN guilds g ON g.id = ga.guild_id
       WHERE ga.guild_id = $1 AND (ga.expires_at IS NULL OR ga.expires_at > NOW())
       ORDER BY ga.is_pinned DESC, ga.created_at DESC`, [req.params.id, req.user.id]
    );
    if (result.rows.length) {
      const viewed = await query(
        `INSERT INTO guild_announcement_views (announcement_id, user_id)
         SELECT unnest($1::uuid[]), $2 ON CONFLICT DO NOTHING RETURNING announcement_id`,
        [result.rows.map((row) => row.id), req.user.id]
      );
      const newlyViewed = new Set(viewed.rows.map((row) => row.announcement_id));
      result.rows.forEach((row) => { if (newlyViewed.has(row.id)) row.view_count += 1; });
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

export const createGuildAnnouncement = async (req, res, next) => {
  if (!canUseGuilds(req, res)) return;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  if (!title || !body) return res.status(400).json({ message: 'Title and announcement are required' });
  try {
    const access = await getGuildAccess(req.params.id, req.user.id);
    if (!access.rows.length || access.rows[0].created_by !== req.user.id)
      return res.status(404).json({ message: 'Guild not found or you cannot post announcements' });
    const imageUrl = req.file ? await uploadImage(req.file.buffer, 'blunder/guild-announcements') : null;
    const result = await query(
      `INSERT INTO guild_announcements (guild_id, created_by, title, body, image_url, is_pinned, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, req.user.id, title, body, imageUrl, req.body.is_pinned === 'true' || req.body.is_pinned === true, req.body.expires_at || null]
    );
    const announcement = result.rows[0];
    const notificationResult = await query(
      `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
       SELECT gm.user_id, 'announcement', $2, $3, 'guild_announcement', $4
       FROM guild_members gm WHERE gm.guild_id = $1 RETURNING *`,
      [req.params.id, `New Guild announcement: ${access.rows[0].name}`, title, announcement.id]
    );
    const io = req.app.get('io');
    notificationResult.rows.forEach((notification) => emitNotification(io, notification.user_id, notification));
    res.status(201).json({ ...announcement, guild_name: access.rows[0].name, author_name: req.user.full_name, author_avatar: req.user.avatar_url, view_count: 0, reaction_counts: {}, user_reactions: [] });
  } catch (err) { next(err); }
};

export const reactToGuildAnnouncement = async (req, res, next) => {
  try {
    const { reaction } = req.body;
    if (typeof reaction !== 'string' || [...reaction].length > 8)
      return res.status(400).json({ message: 'Invalid reaction' });
    const access = await getGuildAccess(req.params.id, req.user.id);
    if (!access.rows.length) return res.status(404).json({ message: 'Guild not found' });
    const announcement = await query(
      'SELECT id FROM guild_announcements WHERE id = $1 AND guild_id = $2',
      [req.params.announcementId, req.params.id]
    );
    if (!announcement.rows.length) return res.status(404).json({ message: 'Announcement not found' });
    const existing = await query(
      'SELECT 1 FROM guild_announcement_reactions WHERE announcement_id = $1 AND user_id = $2 AND reaction = $3',
      [req.params.announcementId, req.user.id, reaction]
    );
    if (existing.rows.length) {
      await query(
        'DELETE FROM guild_announcement_reactions WHERE announcement_id = $1 AND user_id = $2 AND reaction = $3',
        [req.params.announcementId, req.user.id, reaction]
      );
    } else {
      await query(
        'INSERT INTO guild_announcement_reactions (announcement_id, user_id, reaction) VALUES ($1, $2, $3)',
        [req.params.announcementId, req.user.id, reaction]
      );
    }
    const countsResult = await query(
      `SELECT reaction, COUNT(*)::int AS count FROM guild_announcement_reactions
       WHERE announcement_id = $1 GROUP BY reaction`, [req.params.announcementId]
    );
    const reaction_counts = { '👍': 0, '❤️': 0, '😂': 0 };
    countsResult.rows.forEach(({ reaction: key, count }) => { reaction_counts[key] = count; });
    const members = await query('SELECT user_id FROM guild_members WHERE guild_id = $1', [req.params.id]);
    const io = req.app.get('io');
    members.rows.forEach(({ user_id }) => io.to(`user:${user_id}`).emit('guild_announcement_reaction_changed', {
      guild_id: req.params.id,
      announcement_id: req.params.announcementId,
      reaction_counts,
    }));
    res.json({ active: !existing.rows.length, reaction_counts });
  } catch (err) { next(err); }
};
