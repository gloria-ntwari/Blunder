import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { sendInviteEmail, sendPasswordResetEmail } from '../config/mailer.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const signTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

// ── Student self-registration Step 1 (returns temp token) ────────────────────
export const registerStep1 = async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password)
      return res.status(400).json({ message: 'full_name, email and password are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (exists.rows.length)
      return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, 'student', FALSE) RETURNING id`,
      [full_name.trim(), normalizedEmail, hash]
    );

    const userId = result.rows[0].id;
    // temp short-lived token just to complete step 2
    const tempToken = jwt.sign({ userId, step: 1 }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.status(201).json({ tempToken, message: 'Step 1 complete. Proceed to step 2.' });
  } catch (err) { next(err); }
};

// ── Student self-registration Step 2 ─────────────────────────────────────────
export const registerStep2 = async (req, res, next) => {
  try {
    const { academic_track, class_year, mentor_group_id } = req.body;
    const { tempToken } = req.body;

    if (!tempToken) return res.status(400).json({ message: 'tempToken required' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired temp token' });
    }

    if (decoded.step !== 1) return res.status(400).json({ message: 'Invalid registration token' });

    const VALID_TRACKS = ['IB', 'MINT', 'Abitur'];
    if (!VALID_TRACKS.includes(academic_track))
      return res.status(400).json({ message: 'Invalid academic track' });

    await query(
      `UPDATE users SET academic_track = $1, class_year = $2, mentor_group_id = $3,
       is_verified = TRUE, updated_at = NOW()
       WHERE id = $4`,
      [academic_track, class_year, mentor_group_id || null, decoded.userId]
    );

    const { accessToken, refreshToken } = signTokens(decoded.userId);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [decoded.userId, refreshToken, expiresAt]
    );

    const user = await query(
      'SELECT id, full_name, email, role, academic_track, class_year, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );

    res.json({ accessToken, refreshToken, user: user.rows[0] });
  } catch (err) { next(err); }
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const normalizedEmail = email.trim().toLowerCase();
    const result = await query(
      'SELECT * FROM users WHERE LOWER(email) = $1 AND is_active = TRUE',
      [normalizedEmail]
    );
    const user = result.rows[0];

    if (!user)
      return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.password_hash) {
      return res.status(403).json({
        message: 'Your account was invited, but your password is not set yet. Please check your invitation email to set your password, or use "Forgot password".'
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.is_verified)
      return res.status(403).json({ message: 'Account not verified. Complete registration first.' });

    const { accessToken, refreshToken } = signTokens(user.id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    const { password_hash, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) { next(err); }
};

// ── Refresh token ─────────────────────────────────────────────────────────────
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const stored = await query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    if (!stored.rows.length)
      return res.status(401).json({ message: 'Refresh token not found or expired' });

    const { accessToken, refreshToken: newRefresh } = signTokens(decoded.userId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Rotate refresh token
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [decoded.userId, newRefresh, expiresAt]
    );

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) { next(err); }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

// ── Invite admin, school leader, or mentor (Super Admin only) ────────────────
export const inviteUser = async (req, res, next) => {
  try {
    let { email, full_name, role, admin_type, academic_track, class_year } = req.body;

    if (!['admin', 'school_leader', 'mentor', 'student'].includes(role))
      return res.status(400).json({ message: 'Role must be admin, school_leader, mentor, or student' });

    email = email.trim().toLowerCase();
    full_name = full_name.trim();

    // Admins (non-school-leader) don't belong to any academic track or class
    if (role === 'admin') {
      academic_track = null;
      class_year = null;
    }

    const exists = await query('SELECT id, is_verified FROM users WHERE LOWER(email) = $1', [email]);
    let userId;

    if (exists.rows.length) {
      if (exists.rows[0].is_verified) {
        return res.status(409).json({ message: 'A verified user with this email already exists' });
      }
      // If user exists but is unverified (pending invitation), update their info and re-issue OTP!
      userId = exists.rows[0].id;
      await query(
        `UPDATE users SET full_name = $1, role = $2, admin_type = $3, academic_track = $4, class_year = $5, updated_at = NOW() WHERE id = $6`,
        [full_name, role, admin_type || null, academic_track || null, class_year || null, userId]
      );
    } else {
      const result = await query(
        `INSERT INTO users (full_name, email, role, admin_type, academic_track, class_year, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE) RETURNING id`,
        [full_name, email, role, admin_type || null, academic_track || null, class_year || null]
      );
      userId = result.rows[0].id;
    }

    // If role is mentor, ensure mentor_groups record exists for them
    if (role === 'mentor') {
      const existingGroup = await query('SELECT id FROM mentor_groups WHERE mentor_user_id = $1', [userId]);
      if (!existingGroup.rows.length) {
        await query(
          'INSERT INTO mentor_groups (mentor_user_id, academic_track) VALUES ($1, $2)',
          [userId, academic_track || null]
        );
      } else {
        await query(
          'UPDATE mentor_groups SET academic_track = $1 WHERE mentor_user_id = $2',
          [academic_track || null, userId]
        );
      }
    }

    // Generate OTP (valid for 24h, allows manual entry at /verify-otp if preferred)
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(`UPDATE otps SET used = TRUE WHERE LOWER(email) = $1 AND purpose = 'invite'`, [email]);
    await query(
      `INSERT INTO otps (email, code, purpose, expires_at, used) VALUES ($1, $2, 'invite', $3, FALSE)`,
      [email, otp, otpExpiresAt]
    );

    // Generate a setup token (24h) so the user can click directly to set-password
    const setupToken = jwt.sign(
      { userId, step: 'set_password' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Try sending email with direct setup link
    let emailSent = false;
    let emailError = null;
    try {
      await sendInviteEmail(email, setupToken, role);
      emailSent = true;
    } catch (mailErr) {
      console.error('[Mailer Error]', mailErr.message);
      emailError = mailErr.message;
    }

    res.status(201).json({
      message: emailSent
        ? `${role.replace('_', ' ')} invited successfully. A setup email has been sent to ${email}.`
        : `${role.replace('_', ' ')} record created, but the invitation email could not be delivered. Please check SMTP configuration and try again.`,
      emailSent,
      emailError,
      userId,
    });
  } catch (err) { next(err); }
};

// ── Verify OTP ────────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const cleanCode = code?.trim();

    const result = await query(
      `SELECT * FROM otps WHERE LOWER(email) = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()`,
      [normalizedEmail, cleanCode]
    );

    if (!result.rows.length)
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    await query('UPDATE otps SET used = TRUE WHERE id = $1', [result.rows[0].id]);

    // Issue a temp token to allow set-password
    const user = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (!user.rows.length)
      return res.status(404).json({ message: 'User not found' });

    const tempToken = jwt.sign(
      { userId: user.rows[0].id, step: 'set_password' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'OTP verified', tempToken });
  } catch (err) { next(err); }
};

// ── Set password (after OTP verify) ──────────────────────────────────────────
export const setPassword = async (req, res, next) => {
  try {
    const { tempToken, password } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (decoded.step !== 'set_password')
      return res.status(400).json({ message: 'Invalid token type' });

    const hash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE users SET password_hash = $1, is_verified = TRUE, updated_at = NOW() WHERE id = $2`,
      [hash, decoded.userId]
    );

    res.json({ message: 'Password set successfully. You can now log in.' });
  } catch (err) { next(err); }
};

// ── Forgot password ───────────────────────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    // Always respond the same to prevent email enumeration
    if (user.rows.length) {
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await query(
        `INSERT INTO otps (email, code, purpose, expires_at) VALUES ($1, $2, 'reset', $3)`,
        [normalizedEmail, otp, expiresAt]
      );
      await sendPasswordResetEmail(normalizedEmail, otp);
    }
    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err) { next(err); }
};

// ── Reset password ────────────────────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    const result = await query(
      `SELECT * FROM otps WHERE LOWER(email) = $1 AND code = $2 AND purpose = 'reset' AND used = FALSE AND expires_at > NOW()`,
      [normalizedEmail, code]
    );
    if (!result.rows.length)
      return res.status(400).json({ message: 'Invalid or expired reset code' });

    await query('UPDATE otps SET used = TRUE WHERE id = $1', [result.rows[0].id]);

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = $2', [hash, normalizedEmail]);

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) { next(err); }
};
