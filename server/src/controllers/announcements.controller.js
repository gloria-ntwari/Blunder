import { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';
import { emitAnnouncement, emitAnnouncementReaction, emitDataChanged } from '../socket/index.js';

const canPost = (user) =>
  ['super_admin', 'sv_committee', 'teacher', 'student_leader', 'committee', 'mentor'].includes(user.role) ||
  Boolean(user.can_post_school_wide);

// ── GET /api/announcements ────────────────────────────────────────────────────
export const getAnnouncements = async (req, res, next) => {
  try {
    const pageNumber = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (pageNumber - 1) * limitNumber;
    const u = req.user;

    // Build scope filter based on user's membership
    const scopeConditions = [`a.scope = 'school_wide'`];
    const scopeParams = [];

    if (u.academic_track) {
      scopeParams.push(u.academic_track);
      const trackParam = `$${scopeParams.length}`;
      scopeParams.push(u.class_year || null);
      const classParam = `$${scopeParams.length}`;
      scopeConditions.push(
        `(a.scope = 'academic_track' AND a.target_track = ${trackParam}
          AND (a.target_class IS NULL OR a.target_class = ${classParam}))`
      );
    }
    if (u.mentor_group_id) {
      scopeParams.push(u.mentor_group_id);
      scopeConditions.push(
        `(a.scope = 'mentor_group' AND a.target_mentor_group_id = $${scopeParams.length})`
      );
    }

    // Admins / super_admin see everything
    const where =
      ['super_admin', 'admin'].includes(u.role)
        ? 'WHERE (a.expires_at IS NULL OR a.expires_at > NOW())'
        : `WHERE (${scopeConditions.join(' OR ')}) AND (a.expires_at IS NULL OR a.expires_at > NOW())`;
    const queryParams = ['super_admin', 'admin'].includes(u.role) ? [] : scopeParams;
    const userParamIndex = queryParams.length + 1;

    const result = await query(
      `SELECT a.*, u.full_name as author_name, u.avatar_url as author_avatar,
         (SELECT COUNT(*) FROM announcement_views v WHERE v.announcement_id = a.id)::int AS view_count,
         (SELECT COUNT(*) FROM announcement_reactions r WHERE r.announcement_id = a.id AND r.reaction = '❤️')::int AS heart_count,
         (SELECT COUNT(*) FROM announcement_reactions r WHERE r.announcement_id = a.id AND r.reaction = '👍')::int AS like_count,
         (SELECT COUNT(*) FROM announcement_reactions r WHERE r.announcement_id = a.id AND r.reaction = '😂')::int AS laugh_count,
         (SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) FROM (SELECT reaction, COUNT(*)::int AS cnt FROM announcement_reactions WHERE announcement_id = a.id GROUP BY reaction) rc) AS reaction_counts,
         (SELECT COALESCE(jsonb_agg(reaction), '[]'::jsonb) FROM announcement_reactions WHERE announcement_id = a.id AND user_id = $${userParamIndex}) AS user_reactions,
         EXISTS (SELECT 1 FROM announcement_reactions r WHERE r.announcement_id = a.id AND r.user_id = $${userParamIndex} AND r.reaction = '❤️') AS user_hearted,
         EXISTS (SELECT 1 FROM announcement_reactions r WHERE r.announcement_id = a.id AND r.user_id = $${userParamIndex} AND r.reaction = '👍') AS user_liked,
         EXISTS (SELECT 1 FROM announcement_reactions r WHERE r.announcement_id = a.id AND r.user_id = $${userParamIndex} AND r.reaction = '😂') AS user_laughed,
         (SELECT COUNT(*) FROM announcement_votes v WHERE v.announcement_id = a.id AND v.answer = 'yes')::int AS yes_count,
         (SELECT COUNT(*) FROM announcement_votes v WHERE v.announcement_id = a.id AND v.answer = 'no')::int AS no_count,
         (SELECT answer FROM announcement_votes v WHERE v.announcement_id = a.id AND v.user_id = $${userParamIndex}) AS user_vote
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       ${where}
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT ${limitNumber} OFFSET ${offset}`,
      [...queryParams, u.id]
    );

    if (result.rows.length) {
      const ids = result.rows.map((row) => row.id);
      const viewed = await query(
        `INSERT INTO announcement_views (announcement_id, user_id)
         SELECT unnest($1::uuid[]), $2 ON CONFLICT DO NOTHING RETURNING announcement_id`,
        [ids, u.id]
      );
      const newlyViewed = new Set(viewed.rows.map((row) => row.announcement_id));
      result.rows.forEach((row) => { if (newlyViewed.has(row.id)) row.view_count += 1; });
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM announcements a ${where}`, queryParams
    );

    res.json({
      announcements: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: pageNumber,
    });
  } catch (err) { next(err); }
};

export const reactToAnnouncement = async (req, res, next) => {
  try {
    const { reaction } = req.body;
    if (typeof reaction !== 'string' || [...reaction].length > 8) return res.status(400).json({ message: 'Invalid reaction' });
    const exists = await query('SELECT scope, target_track, target_mentor_group_id FROM announcements WHERE id = $1', [req.params.id]);
    if (!exists.rows.length) return res.status(404).json({ message: 'Announcement not found' });
    const current = await query('SELECT 1 FROM announcement_reactions WHERE announcement_id = $1 AND user_id = $2 AND reaction = $3', [req.params.id, req.user.id, reaction]);
    if (current.rows.length) {
      await query('DELETE FROM announcement_reactions WHERE announcement_id = $1 AND user_id = $2 AND reaction = $3', [req.params.id, req.user.id, reaction]);
    } else {
      await query('INSERT INTO announcement_reactions (announcement_id, user_id, reaction) VALUES ($1, $2, $3)', [req.params.id, req.user.id, reaction]);
    }
    const countsResult = await query(
      `SELECT reaction, COUNT(*)::int AS count FROM announcement_reactions
       WHERE announcement_id = $1 GROUP BY reaction`, [req.params.id]
    );
    const reaction_counts = { '👍': 0, '❤️': 0, '😂': 0 };
    countsResult.rows.forEach(({ reaction: key, count }) => { reaction_counts[key] = count; });
    const active = !current.rows.length;
    const update = {
      announcement_id: req.params.id,
      reaction_counts,
      user_id: req.user.id,
      reaction,
      active,
    };
    emitAnnouncementReaction(req.app.get('io'), exists.rows[0], update);
    res.json({ active, reaction_counts });
  } catch (err) { next(err); }
};

export const voteOnAnnouncement = async (req, res, next) => {
  try {
    const answer = String(req.body.answer || '').toLowerCase();
    if (!['yes', 'no'].includes(answer)) return res.status(400).json({ message: 'Choose yes or no' });
    const result = await query('SELECT poll_enabled FROM announcements WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Announcement not found' });
    if (!result.rows[0].poll_enabled) return res.status(400).json({ message: 'This announcement has no poll' });
    await query(`INSERT INTO announcement_votes (announcement_id, user_id, answer) VALUES ($1, $2, $3)
      ON CONFLICT (announcement_id, user_id) DO UPDATE SET answer = EXCLUDED.answer, created_at = NOW()`, [req.params.id, req.user.id, answer]);
    res.json({ answer });
  } catch (err) { next(err); }
};

// ── GET /api/announcements/:id ────────────────────────────────────────────────
export const getAnnouncementById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, u.full_name as author_name, u.avatar_url as author_avatar
       FROM announcements a LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── POST /api/announcements ───────────────────────────────────────────────────
export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, body, scope, target_track, target_class, target_mentor_group_id, is_pinned, is_urgent, poll_enabled, expires_at } = req.body;
    const u = req.user;
    if (!canPost(u)) return res.status(403).json({ message: 'You do not have permission to post announcements' });
    const image_url = req.file ? await uploadImage(req.file.buffer, 'blunder/announcements') : null;

    // Mentors can post only to their own mentor group or their own class.
    if (u.role === 'mentor') {
      if (!['mentor_group', 'academic_track'].includes(scope))
        return res.status(403).json({ message: 'Mentors can only post to their mentor group or class' });

      if (scope === 'academic_track' &&
        (target_track !== u.academic_track || target_class !== u.class_year)) {
        return res.status(403).json({ message: 'You can only post announcements for your own class' });
      }

      const myGroup = await query(
        'SELECT id FROM mentor_groups WHERE mentor_user_id = $1 OR id = $2', [u.id, u.mentor_group_id || null]
      );
      if (scope === 'mentor_group' && (!myGroup.rows.length || (target_mentor_group_id && !myGroup.rows.some(r => r.id === target_mentor_group_id))))
        return res.status(403).json({ message: 'You can only post for your own mentor group' });
    }

    if (u.can_post_school_wide && u.role === 'student' && scope !== 'school_wide') {
      return res.status(403).json({ message: 'You are permitted to post school-wide announcements only' });
    }

    // School leaders can only post for their academic track
    if (u.role === 'school_leader' || (u.role === 'admin' && u.admin_type === 'school_leader')) {
      if (!['academic_track', 'school_wide'].includes(scope))
        return res.status(403).json({ message: 'School leaders can post school-wide or academic track announcements' });
      if (scope === 'academic_track' && u.academic_track && target_track && target_track !== u.academic_track) {
        return res.status(403).json({ message: `School leaders can only post for ${u.academic_track} track` });
      }
    }

    const result = await query(
      `INSERT INTO announcements
         (title, body, scope, target_track, target_class, target_mentor_group_id, is_pinned, is_urgent, image_url, created_by, poll_enabled, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [title, body, scope || 'school_wide', target_track || null, target_class || null,
       target_mentor_group_id || null, is_pinned === 'true' || is_pinned === true,
       is_urgent === 'true' || is_urgent === true, image_url, u.id, poll_enabled === 'true' || poll_enabled === true, expires_at || null]
    );

    const io = req.app.get('io');
    emitAnnouncement(io, result.rows[0]);
    emitDataChanged(io, 'announcement', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/announcements/:id ────────────────────────────────────────────────
export const updateAnnouncement = async (req, res, next) => {
  try {
    if (!canPost(req.user)) return res.status(403).json({ message: 'You do not have permission to edit announcements' });
    const { title, body, is_pinned, is_urgent, poll_enabled, expires_at } = req.body;
    const image_url = req.file ? await uploadImage(req.file.buffer, 'blunder/announcements') : undefined;
    const result = await query(
      `UPDATE announcements SET
         title = COALESCE($1, title), body = COALESCE($2, body),
         is_pinned = COALESCE($3, is_pinned), is_urgent = COALESCE($4, is_urgent),
         image_url = COALESCE($5, image_url), poll_enabled = COALESCE($6, poll_enabled),
         expires_at = CASE WHEN $7 THEN $8::timestamptz ELSE expires_at END, updated_at = NOW()
       WHERE id = $9 AND created_by = $10 RETURNING *`,
      [title, body, is_pinned === undefined ? null : is_pinned === 'true' || is_pinned === true,
       is_urgent === undefined ? null : is_urgent === 'true' || is_urgent === true,
       image_url, poll_enabled === undefined ? null : poll_enabled === 'true' || poll_enabled === true,
       expires_at !== undefined, expires_at || null, req.params.id, req.user.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'Not found or not your announcement' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── DELETE /api/announcements/:id ─────────────────────────────────────────────
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM announcements WHERE id = $1 AND (created_by = $2 OR $3 = 'super_admin') RETURNING id`,
      [req.params.id, req.user.id, req.user.role]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'Not found or insufficient permissions' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
