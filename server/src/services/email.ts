import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export const emailConfigured = Boolean(transporter);

/**
 * Sends an email if SMTP is configured; otherwise logs the actionable link
 * to the server console so the flow remains fully usable in development.
 */
export async function sendEmail(to: string, subject: string, html: string, devLink?: string) {
  if (!transporter) {
    logger.info(`✉️  [email fallback] to=${to} subject="${subject}"${devLink ? `\n    → ${devLink}` : ''}`);
    return;
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, html });
}

const shell = (title: string, body: string, cta: { label: string; url: string }) => `
  <div style="background:#070B16;padding:40px 16px;font-family:Inter,system-ui,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#0E1525;border:1px solid rgba(148,163,216,.12);border-radius:18px;padding:36px">
      <div style="font-size:18px;font-weight:700;background:linear-gradient(90deg,#3B82F6,#8B5CF6);-webkit-background-clip:text;color:#6366F1;margin-bottom:20px">NovusIDE</div>
      <h1 style="color:#E6EAF4;font-size:20px;margin:0 0 12px">${title}</h1>
      <p style="color:#9AA5C0;font-size:14px;line-height:1.6;margin:0 0 28px">${body}</p>
      <a href="${cta.url}" style="display:inline-block;background:#3B82F6;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:12px">${cta.label}</a>
      <p style="color:#5D6A8A;font-size:12px;margin:28px 0 0">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>`;

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${config.clientUrl}/verify-email?token=${token}`;
  await sendEmail(
    to,
    'Verify your NovusIDE email',
    shell(`Welcome, ${name}!`, 'Confirm your email address to unlock your NovusIDE workspace.', {
      label: 'Verify email',
      url,
    }),
    url
  );
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${config.clientUrl}/reset-password?token=${token}`;
  await sendEmail(
    to,
    'Reset your NovusIDE password',
    shell(`Hi ${name},`, 'We received a request to reset your password. This link expires in 1 hour.', {
      label: 'Reset password',
      url,
    }),
    url
  );
}

export async function sendInviteEmail(to: string, inviterName: string, projectName: string) {
  const url = `${config.clientUrl}/dashboard`;
  await sendEmail(
    to,
    `${inviterName} invited you to ${projectName} on NovusIDE`,
    shell(
      `You're invited`,
      `${inviterName} invited you to collaborate on <b style="color:#E6EAF4">${projectName}</b>. Sign in (or create an account with this email) to accept.`,
      { label: 'Open NovusIDE', url }
    ),
    url
  );
}
