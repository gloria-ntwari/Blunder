import { query } from '../config/db.js';

// ── GET /api/mentor-groups ──────────────────────────────────────────────────
// Public: returns mentor groups, optionally filtered by academic_track and/or class_year
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
              m.full_name AS mentor_name,
              COUNT(s.id)::int AS student_count
       FROM mentor_groups mg
       LEFT JOIN users m ON mg.mentor_user_id = m.id
       LEFT JOIN users s ON s.mentor_group_id = mg.id AND s.role = 'student'
       ${where}
       GROUP BY mg.id, mg.name, mg.academic_track, mg.class_year, mg.mentor_user_id, m.full_name
       ORDER BY mg.name`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// ── POST /api/mentor-groups ─────────────────────────────────────────────────
// Super Admin & Student Leader only
export const createMentorGroup = async (req, res, next) => {
  try {
    const { name, academic_track, class_year } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ message: 'Mentor group name is required' });
    if (!academic_track)
      return res.status(400).json({ message: 'Academic track is required' });
    if (!class_year)
      return res.status(400).json({ message: 'Class / year level is required' });

    const result = await query(
      `INSERT INTO mentor_groups (name, academic_track, class_year)
       VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), academic_track, class_year]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/mentor-groups/:id ──────────────────────────────────────────────
// Super Admin & Student Leader only
export const updateMentorGroup = async (req, res, next) => {
  try {
    const { name, academic_track, class_year, mentor_user_id } = req.body;

    const result = await query(
      `UPDATE mentor_groups SET
        name = COALESCE($1, name),
        academic_track = COALESCE($2, academic_track),
        class_year = COALESCE($3, class_year),
        mentor_user_id = $4
       WHERE id = $5 RETURNING *`,
      [name?.trim() || null, academic_track || null, class_year || null, mentor_user_id || null, req.params.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: 'Mentor group not found' });

    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── DELETE /api/mentor-groups/:id ───────────────────────────────────────────
// Super Admin & Student Leader only
export const deleteMentorGroup = async (req, res, next) => {
  try {
    // Unassign students from this group first
    await query('UPDATE users SET mentor_group_id = NULL WHERE mentor_group_id = $1', [req.params.id]);

    const result = await query('DELETE FROM mentor_groups WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length)
      return res.status(404).json({ message: 'Mentor group not found' });

    res.json({ message: 'Mentor group deleted' });
  } catch (err) { next(err); }
};
