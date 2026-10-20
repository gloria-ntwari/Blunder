import { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';

// ── GET /api/users/me ─────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.admin_type, u.academic_track,
              u.class_year, u.avatar_url, u.is_verified,
              mg.id as mentor_group_id,
              concat(mg_mentor.full_name, '''s Group') as mentor_group_name
       FROM users u
       LEFT JOIN mentor_groups mg ON u.mentor_group_id = mg.id
       LEFT JOIN users mg_mentor ON mg.mentor_user_id = mg_mentor.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/users/me ─────────────────────────────────────────────────────────
export const updateMe = async (req, res, next) => {
  try {
    const { full_name } = req.body;
    let avatar_url = req.user.avatar_url;

    if (req.file) {
      avatar_url = await uploadImage(req.file.buffer, 'blunder/avatars');
    }

    await query(
      `UPDATE users SET full_name = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3`,
      [full_name || req.user.full_name, avatar_url, req.user.id]
    );

    res.json({ message: 'Profile updated' });
  } catch (err) { next(err); }
};

// ── GET /api/users ────────────────────────────────────────────────────────────
export const getUsers = async (req, res, next) => {
  try {
    const { role, academic_track, mentor_group_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (role) { params.push(role); conditions.push(`u.role = $${params.length}`); }
    if (academic_track) { params.push(academic_track); conditions.push(`u.academic_track = $${params.length}`); }
    if (mentor_group_id) { params.push(mentor_group_id); conditions.push(`u.mentor_group_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.admin_type, u.academic_track,
              u.class_year, u.avatar_url, u.is_verified, u.is_active, u.created_at,
              concat(mg_mentor.full_name, '''s Group') as mentor_group_name
       FROM users u
       LEFT JOIN mentor_groups mg ON u.mentor_group_id = mg.id
       LEFT JOIN users mg_mentor ON mg.mentor_user_id = mg_mentor.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${where}`,
      params.slice(0, params.length - 2)
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) { next(err); }
};

// ── GET /api/users/:id ────────────────────────────────────────────────────────
export const getUserById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, role, admin_type, academic_track, class_year, avatar_url, is_verified, is_active
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
export const updateUser = async (req, res, next) => {
  try {
    const { full_name, role, admin_type, academic_track, class_year, mentor_group_id, is_active } = req.body;
    await query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        role = COALESCE($2, role),
        admin_type = COALESCE($3, admin_type),
        academic_track = COALESCE($4, academic_track),
        class_year = COALESCE($5, class_year),
        mentor_group_id = COALESCE($6, mentor_group_id),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
       WHERE id = $8`,
      [full_name, role, admin_type, academic_track, class_year, mentor_group_id, is_active, req.params.id]
    );
    res.json({ message: 'User updated' });
  } catch (err) { next(err); }
};

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ message: 'Cannot delete your own account' });
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

// ── GET /api/users/mentor-groups ──────────────────────────────────────────────
export const getMentorGroups = async (req, res, next) => {
  try {
    const { academic_track } = req.query;
    const params = [];
    let where = '';
    if (academic_track) {
      params.push(academic_track);
      where = `WHERE mg.academic_track = $1`;
    }

    const result = await query(
      `SELECT mg.id, mg.academic_track,
              u.full_name as mentor_name,
              concat(u.full_name, '''s Group') as group_name,
              COUNT(students.id) as student_count
       FROM mentor_groups mg
       JOIN users u ON mg.mentor_user_id = u.id
       LEFT JOIN users students ON students.mentor_group_id = mg.id
       ${where}
       GROUP BY mg.id, mg.academic_track, u.full_name
       ORDER BY u.full_name`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};
