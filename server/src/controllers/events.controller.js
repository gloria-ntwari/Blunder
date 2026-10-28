import { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';
import { emitEvent, emitDataChanged } from '../socket/index.js';

export const getEvents = async (req, res, next) => {
  try {
    const { from, to, scope, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const u = req.user;
    const params = [];
    const conditions = [];

    // A multi-day event is visible for every month/day it overlaps.
    if (from) { params.push(from); conditions.push(`COALESCE(e.end_date, e.event_date) >= $${params.length}`); }
    if (to)   { params.push(to);   conditions.push(`e.event_date <= $${params.length}`); }

    // Scope filter for non-admin roles
    if (!['super_admin', 'admin'].includes(u.role)) {
      const scopeOr = [`e.scope = 'school'`];
      if (u.role === 'school_leader' && u.academic_track) {
        scopeOr.push(`(e.scope = 'academic' AND e.target_track = '${u.academic_track}')`);
      } else if (u.academic_track) {
        if (u.class_year) {
          scopeOr.push(`(e.scope = 'academic' AND e.target_track = '${u.academic_track}' AND (e.target_class IS NULL OR e.target_class = '${u.class_year}'))`);
        } else {
          scopeOr.push(`(e.scope = 'academic' AND e.target_track = '${u.academic_track}')`);
        }
      }
      if (u.mentor_group_id) scopeOr.push(`(e.scope = 'mentor_group' AND e.target_mentor_group_id = '${u.mentor_group_id}')`);
      conditions.push(`(${scopeOr.join(' OR ')})`);
    }

    if (scope) { params.push(scope); conditions.push(`e.scope = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT e.*, u.full_name as created_by_name
       FROM events e LEFT JOIN users u ON e.created_by = u.id
       ${where}
       ORDER BY e.event_date ASC, e.start_time ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json(result.rows);
  } catch (err) { next(err); }
};

export const createEvent = async (req, res, next) => {
  try {
    const { title, description, event_date, end_date, start_time, end_time, location, scope, target_track, target_class, target_mentor_group_id } = req.body;
    if (end_date && event_date && end_date < event_date) {
      return res.status(400).json({ message: 'End date cannot be before the start date' });
    }
    let image_url = null;
    if (req.file) image_url = await uploadImage(req.file.buffer, 'blunder/events');

    const result = await query(
      `INSERT INTO events (title, description, event_date, end_date, start_time, end_time, location, scope, target_track, target_class, target_mentor_group_id, image_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [title, description, event_date, end_date || null, start_time, end_time, location, scope || 'school', target_track || null, target_class || null, target_mentor_group_id || null, image_url, req.user.id]
    );

    const io = req.app.get('io');
    emitEvent(io, result.rows[0]);
    emitDataChanged(io, 'event', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { title, description, event_date, end_date, start_time, end_time, location } = req.body;
    if (end_date && event_date && end_date < event_date) {
      return res.status(400).json({ message: 'End date cannot be before the start date' });
    }
    const result = await query(
      `UPDATE events SET
         title = COALESCE($1, title), description = COALESCE($2, description),
         event_date = COALESCE($3, event_date), end_date = $4,
         start_time = COALESCE($5, start_time), end_time = COALESCE($6, end_time), location = COALESCE($7, location),
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, event_date, end_date || null, start_time, end_time, location, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

export const deleteEvent = async (req, res, next) => {
  try {
    await query(
      `DELETE FROM events WHERE id = $1 AND (created_by = $2 OR $3 = 'super_admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    res.json({ message: 'Event deleted' });
  } catch (err) { next(err); }
};
