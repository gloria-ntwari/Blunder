import { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';

// ── GET /api/lost-found ───────────────────────────────────────────────────────
export const getLostFound = async (req, res, next) => {
  try {
    const { status, post_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (status === 'unclaimed') { conditions.push('lf.is_claimed = FALSE'); }
    else if (status === 'claimed') { conditions.push('lf.is_claimed = TRUE'); }

    if (post_type === 'found' || post_type === 'lost') {
      params.push(post_type);
      conditions.push(`lf.post_type = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT lf.*, u.full_name as posted_by_name, u.avatar_url as posted_by_avatar,
              cu.full_name as claimed_by_name
       FROM lost_found lf
       LEFT JOIN users u ON lf.posted_by = u.id
       LEFT JOIN users cu ON lf.claimed_by = cu.id
       ${where}
       ORDER BY lf.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await query(`SELECT COUNT(*) FROM lost_found lf ${where}`,
      params.slice(0, params.length - 2));

    res.json({
      items: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
    });
  } catch (err) { next(err); }
};

// ── GET /api/lost-found/:id ───────────────────────────────────────────────────
export const getLostFoundById = async (req, res, next) => {
  try {
    const item = await query(
      `SELECT lf.*, u.full_name as posted_by_name, u.avatar_url as posted_by_avatar
       FROM lost_found lf LEFT JOIN users u ON lf.posted_by = u.id
       WHERE lf.id = $1`,
      [req.params.id]
    );
    if (!item.rows.length) return res.status(404).json({ message: 'Item not found' });

    const comments = await query(
      `SELECT c.*, u.full_name as author_name, u.avatar_url as author_avatar
       FROM comments c LEFT JOIN users u ON c.user_id = u.id
       WHERE c.entity_type = 'lost_found' AND c.entity_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    res.json({ item: item.rows[0], comments: comments.rows });
  } catch (err) { next(err); }
};

// ── POST /api/lost-found ──────────────────────────────────────────────────────
export const createLostFound = async (req, res, next) => {
  try {
    const { item_name, description, location_found, date_found, post_type = 'found' } = req.body;
    let photo_url = null;

    if (req.file) {
      photo_url = await uploadImage(req.file.buffer, 'blunder/lost-found');
    }

    const validType = ['found', 'lost'].includes(post_type) ? post_type : 'found';

    const result = await query(
      `INSERT INTO lost_found (item_name, description, photo_url, location_found, date_found, posted_by, post_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [item_name, description, photo_url, location_found, date_found || new Date(), req.user.id, validType]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/lost-found/:id ───────────────────────────────────────────────────
export const updateLostFound = async (req, res, next) => {
  try {
    const { item_name, description, location_found, date_found } = req.body;
    let photo_url;

    if (req.file) {
      photo_url = await uploadImage(req.file.buffer, 'blunder/lost-found');
    }

    const setClauses = [];
    const params = [];

    if (item_name) { params.push(item_name); setClauses.push(`item_name = $${params.length}`); }
    if (description !== undefined) { params.push(description); setClauses.push(`description = $${params.length}`); }
    if (location_found) { params.push(location_found); setClauses.push(`location_found = $${params.length}`); }
    if (date_found) { params.push(date_found); setClauses.push(`date_found = $${params.length}`); }
    if (photo_url) { params.push(photo_url); setClauses.push(`photo_url = $${params.length}`); }

    if (!setClauses.length) return res.status(400).json({ message: 'Nothing to update' });

    params.push(req.params.id);
    await query(
      `UPDATE lost_found SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );

    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
};

// ── POST /api/lost-found/:id/claim ────────────────────────────────────────────
export const claimItem = async (req, res, next) => {
  try {
    const check = await query('SELECT * FROM lost_found WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ message: 'Item not found' });
    if (check.rows[0].is_claimed) return res.status(409).json({ message: 'Already claimed' });

    await query(
      `UPDATE lost_found SET is_claimed = TRUE, claimed_by = $1, claimed_at = NOW() WHERE id = $2`,
      [req.user.id, req.params.id]
    );

    res.json({ message: 'Item claimed successfully' });
  } catch (err) { next(err); }
};

// ── DELETE /api/lost-found/:id ────────────────────────────────────────────────
export const deleteLostFound = async (req, res, next) => {
  try {
    await query(
      `DELETE FROM lost_found WHERE id = $1 AND (posted_by = $2 OR $3 = 'super_admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

// ── POST /api/lost-found/:id/comments ────────────────────────────────────────
export const addComment = async (req, res, next) => {
  try {
    const { body, parent_comment_id } = req.body;
    if (!body) return res.status(400).json({ message: 'Comment body required' });

    const result = await query(
      `INSERT INTO comments (entity_type, entity_id, parent_comment_id, user_id, body)
       VALUES ('lost_found', $1, $2, $3, $4) RETURNING *`,
      [req.params.id, parent_comment_id || null, req.user.id, body]
    );

    const comment = await query(
      `SELECT c.*, u.full_name as author_name, u.avatar_url as author_avatar
       FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(comment.rows[0]);
  } catch (err) { next(err); }
};
