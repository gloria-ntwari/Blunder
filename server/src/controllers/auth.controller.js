import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { sendInviteEmail, sendPasswordResetEmail, sendVerificationEmail } from '../config/mailer.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const signTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    // Persistent sessions stay valid until explicit logout or server-side revocation.
    // Security-sensitive events should revoke the user's stored refresh tokens.
  });
  return { accessToken, refreshToken };
};

// ── Self-registration Step 1 (returns temp token) ────────────────────────────
export const registerStep1 = async (req, res, next) => {
  try {
    const { full_name, email, password, role = 'student' } = req.body;
    if (!full_name || !email || !password)
      return res.status(400).json({ message: 'full_name, email and password are required' });
    if (!['student', 'teacher'].includes(role))
      return res.status(400).json({ message: 'You may register only as a student or teacher' });

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@(?:mail\.)?louisenlund\.de$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please register with an @louisenlund.de or @mail.louisenlund.de email address.' });
    }
    const exists = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (exists.rows.length)
      return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, FALSE) RETURNING id`,
      [full_name.trim(), normalizedEmail, hash, role]
    );

    const userId = result.rows[0].id;
    // Keep pending registrations out of the login flow until email verification.
    const tempToken = jwt.sign({ userId, role, step: 1 }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.status(201).json({ tempToken, role, message: 'Account created. Complete your academic details.' });
  } catch (err) { next(err); }
};

// ── Self-registration Step 2 ─────────────────────────────────────────────────
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

    const VALID_TRACKS = ['IB', 'MINT', 'Abitur', 'Agrar'];
    if (!VALID_TRACKS.includes(academic_track))
      return res.status(400).json({ message: 'Invalid academic track' });

    const role = decoded.role || 'student';
    const isTeacher = role === 'teacher';

    const updated = await query(
      `UPDATE users SET academic_track = $1, class_year = $2, mentor_group_id = $3,
       updated_at = NOW()
       WHERE id = $4 AND is_active = FALSE RETURNING id, email`,
      [academic_track, isTeacher ? null : class_year, isTeacher ? null : (mentor_group_id || null), decoded.userId]
    );

    if (!updated.rows.length) return res.status(400).json({ message: 'Registration could not be completed. Please start again.' });

    const email = updated.rows[0].email;
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await query(`UPDATE otps SET used = TRUE WHERE LOWER(email) = $1 AND purpose = 'verify_email' AND used = FALSE`, [email]);
    await query(
      `INSERT INTO otps (email, code, purpose, expires_at, used) VALUES ($1, $2, 'verify_email', $3, FALSE)`,
      [email, code, expiresAt]
    );
    try {
      await sendVerificationEmail(email, code);
    } catch (mailErr) {
      console.error('[Verification email error]', mailErr.message);
      return res.status(503).json({ message: 'Your details were saved, but we could not send the verification email. Use resend code to try again.', email });
    }
    res.json({ message: 'Details saved. Check your email for a verification code.', email });
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
      'SELECT * FROM users WHERE LOWER(email) = $1',
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

    if (!user.is_active) {
      return res.status(403).json({ message: 'Please verify your email before signing in. Use the resend option on the verification page.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const { accessToken, refreshToken } = signTokens(user.id);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NULL)',
      [user.id, refreshToken]
    );

    const { password_hash, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) { next(err); }
};

// Verify a self-registered account's email address.
export const verifyRegistrationEmail = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const code = req.body.code?.trim();
    if (!email || !code) return res.status(400).json({ message: 'Email and verification code are required' });

    const result = await query(
      `SELECT id FROM otps WHERE LOWER(email) = $1 AND code = $2 AND purpose = 'verify_email' AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );
    if (!result.rows.length) return res.status(400).json({ message: 'Invalid or expired verification code' });

    await query('UPDATE otps SET used = TRUE WHERE id = $1', [result.rows[0].id]);
    const activated = await query(
      `UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE LOWER(email) = $1 AND password_hash IS NOT NULL RETURNING id`,
      [email]
    );
    if (!activated.rows.length) return res.status(400).json({ message: 'This registration cannot be verified' });
    res.json({ message: 'Email verified. You can now sign in.' });
  } catch (err) { next(err); }
};

export const resendRegistrationVerification = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await query('SELECT id, is_active FROM users WHERE LOWER(email) = $1 AND password_hash IS NOT NULL', [email]);
    if (!user.rows.length || user.rows[0].is_active) {
      return res.json({ message: 'If the account needs verification, a new code has been sent.' });
    }

    const recent = await query(
      `SELECT id FROM otps WHERE LOWER(email) = $1 AND purpose = 'verify_email' AND created_at > NOW() - INTERVAL '60 seconds' LIMIT 1`,
      [email]
    );
    if (recent.rows.length) {
      const latest = await query(
        `SELECT id FROM otps WHERE LOWER(email) = $1 AND purpose = 'verify_email' AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
        [email]
      );
      if (latest.rows.length) return res.status(429).json({ message: 'Please wait a minute before requesting another code.' });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await query(`UPDATE otps SET used = TRUE WHERE LOWER(email) = $1 AND purpose = 'verify_email' AND used = FALSE`, [email]);
    await query(`INSERT INTO otps (email, code, purpose, expires_at, used) VALUES ($1, $2, 'verify_email', $3, FALSE)`, [email, code, expiresAt]);
    try {
      await sendVerificationEmail(email, code);
    } catch (mailErr) {
      console.error('[Verification email error]', mailErr.message);
      return res.status(503).json({ message: 'We could not send the verification email. Please try again shortly.' });
    }
    res.json({ message: 'A new verification code has been sent.' });
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
      'SELECT id, user_id FROM refresh_tokens WHERE token = $1 AND (expires_at IS NULL OR expires_at > NOW())',
      [refreshToken]
    );
    if (!stored.rows.length)
      return res.status(401).json({ message: 'Refresh token not found or expired' });

    if (stored.rows[0].user_id !== decoded.userId)
      return res.status(401).json({ message: 'Invalid refresh token' });

    const activeUser = await query('SELECT is_active FROM users WHERE id = $1', [decoded.userId]);
    if (!activeUser.rows.length || !activeUser.rows[0].is_active) {
      await query('DELETE FROM refresh_tokens WHERE user_id = $1', [decoded.userId]);
      return res.status(401).json({ message: 'Session is no longer valid' });
    }

    const { accessToken, refreshToken: newRefresh } = signTokens(decoded.userId);

    // Rotate refresh token
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NULL)',
      [decoded.userId, newRefresh]
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

// ── Invite users from the roles permitted to the current administrator ───────
export const inviteUser = async (req, res, next) => {
  try {
    let { email, full_name, role, admin_type, academic_track, class_year, mentor_group_id } = req.body;

    if (!['sv_committee', 'teacher', 'student_leader', 'committee', 'mentor', 'student'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    // Student leaders can only invite student leaders, committee members, and mentors.
    if (req.user.role === 'student_leader' && !['student_leader', 'committee', 'mentor'].includes(role))
      return res.status(403).json({ message: 'Student leaders can only invite student leaders, committee members, and mentors' });

    email = email.trim().toLowerCase();
    full_name = full_name.trim();

    // Teachers don't have a class_year (they teach the whole track)
    if (role === 'teacher') {
      class_year = null;
    }

    const exists = await query('SELECT id, password_hash FROM users WHERE LOWER(email) = $1', [email]);
    let userId;

    if (exists.rows.length) {
      if (exists.rows[0].password_hash) {
        return res.status(409).json({ message: 'A user with this email already exists' });
      }
      // If an invited user has not set a password yet, update their details and re-issue the OTP.
      userId = exists.rows[0].id;
      await query(
        `UPDATE users SET full_name = $1, role = $2, admin_type = $3, academic_track = $4, class_year = $5, updated_at = NOW() WHERE id = $6`,
        [full_name, role, admin_type || null, academic_track || null, class_year || null, userId]
      );
    } else {
      const result = await query(
        `INSERT INTO users (full_name, email, role, admin_type, academic_track, class_year)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [full_name, email, role, admin_type || null, academic_track || null, class_year || null]
      );
      userId = result.rows[0].id;
    }

    // If mentor_group_id provided, link user to the group
    if (mentor_group_id) {
      await query('UPDATE users SET mentor_group_id = $1 WHERE id = $2', [mentor_group_id, userId]);
    }

    // If role is mentor and a mentor_group_id was provided, assign this mentor to that group
    if (role === 'mentor') {
      const { mentor_group_id } = req.body;
      if (mentor_group_id) {
        // Unassign this mentor from any previous group
        await query(
          'UPDATE mentor_groups SET mentor_user_id = NULL WHERE mentor_user_id = $1',
          [userId]
        );
        // Assign to the specified group
        await query(
          'UPDATE mentor_groups SET mentor_user_id = $1 WHERE id = $2',
          [userId, mentor_group_id]
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
        : `${role.replace('_', ' ')} record created, but the invitation email could not be delivered. Please check your email provider configuration and try again.`,
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
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, decoded.userId]
    );
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [decoded.userId]);

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
    const updated = await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = $2 RETURNING id', [hash, normalizedEmail]);
    if (updated.rows.length) await query('DELETE FROM refresh_tokens WHERE user_id = $1', [updated.rows[0].id]);

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) { next(err); }
};
