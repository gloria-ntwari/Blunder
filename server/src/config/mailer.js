import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.EMAIL_FROM || 'B.Lunder <onboarding@resend.dev>';

const sendEmail = async ({ to, subject, html }) => {
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message || 'Resend failed to send the email');
  return data;
};

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

  await sendEmail({
    to: email,
    subject: `Your B.Lunder ${roleLabel} Invitation`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: auto; padding: 36px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1a2b49; margin: 0 0 8px 0; font-size: 24px;">Welcome to B.Lunder 🎓</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">The Louisenlund Community</p>
        </div>
        <p style="color: #1a1a2e; font-size: 15px; line-height: 1.5;">You have been invited as a <strong>${roleLabel}</strong> on the Louisenlund campus platform.</p>
        <p style="color: #1a1a2e; font-size: 15px; line-height: 1.5;">Click the button below to set up your password and complete your registration:</p>
        <div style="text-align: center; padding: 24px 0 20px 0;">
          <a href="${setupLink}" style="display: inline-block; padding: 14px 36px; background: #1a2b49; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px;">Set Up My Account</a>
        </div>
        <p style="color: #64748b; font-size: 13px; margin-top: 16px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #2383c9; font-size: 12px; word-break: break-all; margin-top: 4px;"><a href="${setupLink}" style="color: #2383c9;">${setupLink}</a></p>
        <div style="margin-top: 24px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #2383c9;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">This invitation link will expire in <strong>24 hours</strong>. Do not share it with anyone.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">B.Lunder — A little closer. Every day. | Stiftung Louisenlund</p>
      </div>
    `,
  });
};

/**
 * Send password reset OTP
 */
export const sendPasswordResetEmail = async (email, otpCode) => {
  await sendEmail({
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

export default resend;
