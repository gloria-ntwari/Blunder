import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

/**
 * Verify JWT access token and attach user to req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, full_name, email, role, admin_type, academic_track, class_year, mentor_group_id, house_id, avatar_url, is_verified, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Allow only specified roles
 * @param {...string} roles - allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

/**
 * Allow only specified admin_types (when role === admin)
 */
export const authorizeAdminType = (...types) => {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') return next(); // super_admin can do anything
    if (req.user.role !== 'admin' || !types.includes(req.user.admin_type)) {
      return res.status(403).json({ message: 'Access denied: insufficient admin type' });
    }
    next();
  };
};
