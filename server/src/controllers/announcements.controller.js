import { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';
import { emitAnnouncement } from '../socket/index.js';

const canPost = (user) =>
  ['super_admin', 'admin', 'mentor'].includes(user.role);

// ── GET /api/announcements ────────────────────────────────────────────────────
export const getAnnouncements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const u = req.user;

    // Build scope filter based on user's membership
    const scopeConditions = [`scope = 'school_wide'`];

    if (u.academic_track) {
      scopeConditions.push(
        `(scope = 'academic_track' AND target_track = '${u.academic_track}')`
      );
    }
    if (u.mentor_group_id) {
      scopeConditions.push(
        `(scope = 'mentor_group' AND target_mentor_group_id = '${u.mentor_group_id}')`
      );
    }

    // Admins / super_admin see everything
    const where =
      ['super_admin', 'admin'].includes(u.role)
        ? ''
        : `WHERE (${scopeConditions.join(' OR ')})`;

    const result = await query(
      `SELECT a.*, u.full_name as author_name, u.avatar_url as author_avatar
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       ${where}
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM announcements a ${where}`, []
    );

    res.json({
      announcements: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
    });
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
    const { title, body, scope, target_track, target_class, target_mentor_group_id, is_pinned, is_urgent } = req.body;
    const u = req.user;
    const image_url = req.file ? await uploadImage(req.file.buffer, 'blunder/announcements') : null;

    // Mentors can only post mentor_group announcements for their own group
    if (u.role === 'mentor') {
      if (scope !== 'mentor_group')
        return res.status(403).json({ message: 'Mentors can only post mentor-group announcements' });

      const myGroup = await query(
        'SELECT id FROM mentor_groups WHERE mentor_user_id = $1 OR id = $2', [u.id, u.mentor_group_id || null]
      );
      if (!myGroup.rows.length || (target_mentor_group_id && !myGroup.rows.some(r => r.id === target_mentor_group_id)))
        return res.status(403).json({ message: 'You can only post for your own mentor group' });
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
         (title, body, scope, target_track, target_class, target_mentor_group_id, is_pinned, is_urgent, image_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, body, scope || 'school_wide', target_track || null, target_class || null,
       target_mentor_group_id || null, is_pinned === 'true' || is_pinned === true,
       is_urgent === 'true' || is_urgent === true, image_url, u.id]
    );

    const io = req.app.get('io');
    emitAnnouncement(io, result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/announcements/:id ────────────────────────────────────────────────
export const updateAnnouncement = async (req, res, next) => {
  try {
    const { title, body, is_pinned, is_urgent } = req.body;
    const image_url = req.file ? await uploadImage(req.file.buffer, 'blunder/announcements') : undefined;
    const result = await query(
      `UPDATE announcements SET
         title = COALESCE($1, title), body = COALESCE($2, body),
         is_pinned = COALESCE($3, is_pinned), is_urgent = COALESCE($4, is_urgent),
         image_url = COALESCE($5, image_url), updated_at = NOW()
       WHERE id = $6 AND created_by = $7 RETURNING *`,
      [title, body, is_pinned === undefined ? null : is_pinned === 'true' || is_pinned === true,
       is_urgent === undefined ? null : is_urgent === 'true' || is_urgent === true,
       image_url, req.params.id, req.user.id]
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
