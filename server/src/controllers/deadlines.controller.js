import { query } from '../config/db.js';

export const getDeadlines = async (req, res, next) => {
  try {
    const u = req.user;
    let academicCondition;
    if (['super_admin', 'admin'].includes(u.role)) {
      academicCondition = `d.type = 'academic'`;
    } else if (u.role === 'school_leader' && u.academic_track) {
      academicCondition = `(d.type = 'academic' AND (d.track IS NULL OR d.track = '${u.academic_track}'))`;
    } else if (u.academic_track) {
      if (u.class_year) {
        academicCondition = `(d.type = 'academic' AND (d.track IS NULL OR (d.track = '${u.academic_track}' AND (d.target_class IS NULL OR d.target_class = '${u.class_year}'))))`;
      } else {
        academicCondition = `(d.type = 'academic' AND (d.track IS NULL OR d.track = '${u.academic_track}'))`;
      }
    } else {
      academicCondition = `(d.type = 'academic' AND d.track IS NULL)`;
    }

    const result = await query(
      `SELECT d.*, u.full_name as created_by_name
       FROM deadlines d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE
         ${academicCondition}
         OR (d.type = 'personal' AND d.owner_id = $1)
       ORDER BY d.due_date ASC`,
      [u.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

export const createDeadline = async (req, res, next) => {
  try {
    const { title, description, due_date, type, track, target_class } = req.body;
    const u = req.user;

    // Students can only create personal deadlines
    if (u.role === 'student' && type !== 'personal')
      return res.status(403).json({ message: 'Students can only create personal deadlines' });

    const owner_id = type === 'personal' ? u.id : null;

    const result = await query(
      `INSERT INTO deadlines (title, description, due_date, type, track, target_class, owner_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, due_date, type || 'personal', track || null, target_class || null, owner_id, u.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

export const updateDeadline = async (req, res, next) => {
  try {
    const { title, description, due_date } = req.body;
    const result = await query(
      `UPDATE deadlines SET
         title = COALESCE($1, title), description = COALESCE($2, description),
         due_date = COALESCE($3, due_date), updated_at = NOW()
       WHERE id = $4 AND (owner_id = $5 OR created_by = $5 OR $6 = 'super_admin')
       RETURNING *`,
      [title, description, due_date, req.params.id, req.user.id, req.user.role]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Deadline not found or not yours' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

export const deleteDeadline = async (req, res, next) => {
  try {
    await query(
      `DELETE FROM deadlines WHERE id = $1 AND (owner_id = $2 OR created_by = $2 OR $3 = 'super_admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    res.json({ message: 'Deadline deleted' });
  } catch (err) { next(err); }
};
