import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS = process.env.SMTP_FROM || `B.Lunder <${process.env.SMTP_USER}>`;

/**
 * Send OTP email to a new user being invited
 */
export const sendInviteEmail = async (email, setupToken, role = 'admin') => {
  const roleLabel =
    role === 'mentor' ? 'Mentor'
    : role === 'school_leader' ? 'School Leader'
    : role === 'admin' ? 'Admin'
    : 'User';

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const setupLink = `${clientUrl}/set-password?token=${setupToken}`;

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: email,
    subject: `Your B.Lunder ${roleLabel} Invitation`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f8fafb; border-radius: 12px;">
        <h2 style="color: #1a2b49;">Welcome to B.Lunder 🎓</h2>
        <p style="color: #1a1a2e;">You have been invited as a <strong>${roleLabel}</strong> on the Louisenlund campus platform.</p>
        <p style="color: #1a1a2e;">Click the button below to set up your password and activate your account:</p>
        <div style="text-align: center; padding: 20px 0;">
          <a href="${setupLink}" style="display: inline-block; padding: 14px 32px; background: #1a2b49; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px;">Set Up My Account</a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Or copy and paste this link into your browser:</p>
        <p style="color: #2383c9; font-size: 12px; word-break: break-all;">${setupLink}</p>
        <p style="color: #6b7280; font-size: 13px;">This link expires in <strong>24 hours</strong>. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e4f2fe; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">B.Lunder — A little closer. Every day. | Stiftung Louisenlund</p>
      </div>
    `,
  });
};

/**
 * Send password reset OTP
 */
export const sendPasswordResetEmail = async (email, otpCode) => {
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Reset your B.Lunder password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f8fafb; border-radius: 12px;">
        <h2 style="color: #1a2b49;">Password Reset</h2>
        <p style="color: #1a1a2e;">We received a request to reset your B.Lunder password. Use the code below:</p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1a2b49; padding: 16px 0;">${otpCode}</div>
        <p style="color: #6b7280; font-size: 13px;">This code expires in <strong>15 minutes</strong>.</p>
        <hr style="border: none; border-top: 1px solid #e4f2fe; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
};

export default transporter;
