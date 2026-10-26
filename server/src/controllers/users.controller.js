import { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';

// ── GET /api/users/me ─────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.admin_type, u.academic_track,
              u.class_year, u.avatar_url,
              mg.id as mentor_group_id,
              mg.name as mentor_group_name
       FROM users u
       LEFT JOIN mentor_groups mg ON u.mentor_group_id = mg.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/users/me ─────────────────────────────────────────────────────────
export const updateMe = async (req, res, next) => {
  try {
    const { full_name, email, academic_track, class_year, mentor_group_id } = req.body;
    let avatar_url = req.user.avatar_url;

    if (req.file) {
      avatar_url = await uploadImage(req.file.buffer, 'blunder/avatars');
    }

    const normalizedEmail = email?.trim().toLowerCase() || req.user.email;
    if (normalizedEmail !== req.user.email) {
      const existing = await query(
        'SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2',
        [normalizedEmail, req.user.id]
      );
      if (existing.rows.length) return res.status(409).json({ message: 'Email already in use' });
    }

    const selectedGroupId = mentor_group_id || null;
    if (selectedGroupId) {
      const group = await query(
        'SELECT id, academic_track, class_year FROM mentor_groups WHERE id = $1',
        [selectedGroupId]
      );
      if (!group.rows.length) return res.status(400).json({ message: 'Selected mentor group was not found' });
      if (academic_track && group.rows[0].academic_track !== academic_track) {
        return res.status(400).json({ message: 'Mentor group does not match the selected academic track' });
      }
      if (class_year && group.rows[0].class_year !== class_year) {
        return res.status(400).json({ message: 'Mentor group does not match the selected class / year' });
      }
    }

    await query(
      `UPDATE users SET
        full_name = COALESCE(NULLIF($1, ''), full_name),
        email = $2,
        academic_track = $3,
        class_year = $4,
        mentor_group_id = $5,
        avatar_url = $6,
        updated_at = NOW()
       WHERE id = $7`,
      [full_name?.trim(), normalizedEmail, academic_track || null, class_year || null, selectedGroupId, avatar_url, req.user.id]
    );

    const updated = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.admin_type, u.academic_track,
              u.class_year, u.avatar_url,
              mg.id AS mentor_group_id, mg.name AS mentor_group_name
       FROM users u
       LEFT JOIN mentor_groups mg ON u.mentor_group_id = mg.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json({ message: 'Profile updated', user: updated.rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/users ────────────────────────────────────────────────────────────
export const getUsers = async (req, res, next) => {
  try {
    const { role, academic_track, mentor_group_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    // Never expose unrelated roles to a student leader, regardless of the
    // filter sent by the client.
    if (req.user.role === 'student_leader') {
      conditions.push(`u.role IN ('student_leader', 'committee', 'mentor')`);
    }

    if (role) { params.push(role); conditions.push(`u.role = $${params.length}`); }
    if (academic_track) { params.push(academic_track); conditions.push(`u.academic_track = $${params.length}`); }
    if (mentor_group_id) { params.push(mentor_group_id); conditions.push(`u.mentor_group_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.admin_type, u.academic_track,
              u.class_year, u.avatar_url, u.is_active, u.created_at,
              u.mentor_group_id,
              mg.name as mentor_group_name
       FROM users u
       LEFT JOIN mentor_groups mg ON u.mentor_group_id = mg.id
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
      `SELECT id, full_name, email, role, admin_type, academic_track, class_year, avatar_url, is_active
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
        admin_type = $3,
        academic_track = $4,
        class_year = $5,
        mentor_group_id = $6,
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
       WHERE id = $8`,
      [full_name, role, admin_type ?? null, academic_track ?? null, class_year ?? null, mentor_group_id ?? null, is_active, req.params.id]
    );

    // If role is mentor, keep mentor_groups.mentor_user_id in sync
    const userRole = role || (await query('SELECT role FROM users WHERE id = $1', [req.params.id])).rows[0]?.role;
    if (userRole === 'mentor') {
      await query('UPDATE mentor_groups SET mentor_user_id = NULL WHERE mentor_user_id = $1', [req.params.id]);
      if (mentor_group_id) {
        await query('UPDATE mentor_groups SET mentor_user_id = $1 WHERE id = $2', [req.params.id, mentor_group_id]);
      }
    }

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
    const { academic_track, class_year } = req.query;
    const params = [];
    const conditions = [];

    if (academic_track) {
      params.push(academic_track);
      conditions.push(`mg.academic_track = $${params.length}`);
    }
    if (class_year) {
      params.push(class_year);
      conditions.push(`mg.class_year = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT mg.id, mg.name, mg.academic_track, mg.class_year,
              mg.mentor_user_id,
              u.full_name as mentor_name,
              COUNT(students.id)::int as student_count
       FROM mentor_groups mg
       LEFT JOIN users u ON mg.mentor_user_id = u.id
       LEFT JOIN users students ON students.mentor_group_id = mg.id
       ${where}
       GROUP BY mg.id, mg.name, mg.academic_track, mg.class_year, mg.mentor_user_id, u.full_name
       ORDER BY mg.name`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// ── GET /api/users/mentors?academic_track=IB&class_year=DP1 ───────────────────
// Returns mentors (role='mentor') who have a mentor_group for the given academic_track.
// When class_year is provided, only mentors whose own class_year matches are returned.
export const getMentors = async (req, res, next) => {
  try {
    const { academic_track, class_year } = req.query;
    const params = [];
    const conditions = [`u.role = 'mentor'`];

    if (academic_track) {
      params.push(academic_track);
      conditions.push(`mg.academic_track = $${params.length}`);
    }

    if (class_year) {
      params.push(class_year);
      conditions.push(`u.class_year = $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT u.id AS mentor_user_id, u.full_name, u.email, u.academic_track,
              mg.id AS mentor_group_id,
              mg.name AS group_name
       FROM users u
       JOIN mentor_groups mg ON mg.mentor_user_id = u.id
       ${where}
       ORDER BY u.full_name`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};
