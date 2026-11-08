import { query } from '../config/db.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT n.*, ga.guild_id AS target_guild_id
       FROM notifications n
       LEFT JOIN guild_announcements ga ON n.entity_type = 'guild_announcement' AND ga.id = n.entity_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const unread = await query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unread.rows[0].count),
    });
  } catch (err) { next(err); }
};

export const markRead = async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
};

export const markAllRead = async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
};
