import { query } from '../config/db.js';
import { uploadImage } from '../config/cloudinary.js';
import { emitSnackAlert } from '../socket/index.js';

// ── GET /api/food ─────────────────────────────────────────────────────────────
export const getFoodMenu = async (req, res, next) => {
  try {
    const { date, meal_type } = req.query;
    const params = [];
    const conditions = [];

    if (date) { params.push(date); conditions.push(`menu_date = $${params.length}`); }
    if (meal_type) { params.push(meal_type); conditions.push(`meal_type = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT fm.*, u.full_name as created_by_name
       FROM food_menu fm
       LEFT JOIN users u ON fm.created_by = u.id
       ${where}
       ORDER BY fm.menu_date, fm.meal_type`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// ── GET /api/food/today ───────────────────────────────────────────────────────
export const getTodayMenu = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM food_menu WHERE menu_date = CURRENT_DATE ORDER BY meal_type`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const parseMenuItems = (rawItems) => {
  if (!rawItems) return [];
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try {
      let parsed = JSON.parse(rawItems);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return rawItems
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
  return [];
};

// ── POST /api/food ────────────────────────────────────────────────────────────
export const createFoodMenu = async (req, res, next) => {
  try {
    const { menu_date, meal_type, items, is_special_snack } = req.body;
    let image_url = null;

    if (req.file) {
      image_url = await uploadImage(req.file.buffer, 'blunder/food');
    }

    const parsed = parseMenuItems(items);

    const result = await query(
      `INSERT INTO food_menu (menu_date, meal_type, items, image_url, is_special_snack, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (menu_date, meal_type) DO UPDATE
         SET items = EXCLUDED.items, image_url = COALESCE(EXCLUDED.image_url, food_menu.image_url),
             is_special_snack = EXCLUDED.is_special_snack, updated_at = NOW()
       RETURNING *`,
      [menu_date, meal_type, JSON.stringify(parsed), image_url, is_special_snack || false, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/food/:id ─────────────────────────────────────────────────────────
export const updateFoodMenu = async (req, res, next) => {
  try {
    const { items, is_special_snack } = req.body;
    let image_url = undefined;

    if (req.file) {
      image_url = await uploadImage(req.file.buffer, 'blunder/food');
    }

    const parsed = items !== undefined ? JSON.stringify(parseMenuItems(items)) : null;

    const result = await query(
      `UPDATE food_menu
       SET items = COALESCE($1, items),
           image_url = COALESCE($2, image_url),
           is_special_snack = COALESCE($3, is_special_snack),
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [parsed, image_url, is_special_snack, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Menu entry not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── DELETE /api/food/:id ──────────────────────────────────────────────────────
export const deleteFoodMenu = async (req, res, next) => {
  try {
    await query('DELETE FROM food_menu WHERE id = $1', [req.params.id]);
    res.json({ message: 'Menu entry deleted' });
  } catch (err) { next(err); }
};

// ── POST /api/food/snack-alert ────────────────────────────────────────────────
export const createSnackAlert = async (req, res, next) => {
  try {
    const { message, expires_minutes = 60 } = req.body;
    if (!message) return res.status(400).json({ message: 'Message required' });

    const expiresAt = new Date(Date.now() + expires_minutes * 60 * 1000);

    const result = await query(
      `INSERT INTO snack_alerts (message, created_by, expires_at) VALUES ($1, $2, $3) RETURNING *`,
      [message, req.user.id, expiresAt]
    );

    // Broadcast via Socket.io
    const io = req.app.get('io');
    emitSnackAlert(io, { ...result.rows[0], created_by_name: req.user.full_name });

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ── GET /api/food/snack-alerts (active) ───────────────────────────────────────
export const getActiveSnackAlerts = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sa.*, u.full_name as created_by_name
       FROM snack_alerts sa
       LEFT JOIN users u ON sa.created_by = u.id
       WHERE sa.expires_at > NOW()
       ORDER BY sa.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};
