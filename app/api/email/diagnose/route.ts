import { NextResponse } from 'next/server';

/**
 * GET /api/email/diagnose
 * Returns SES configuration status (no secrets exposed)
 */
export async function GET() {
  const smtpUser = process.env.SES_SMTP_USER || '';
  const smtpPass = process.env.SES_SMTP_PASS || '';
  const smtpHost = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
  const smtpPort = process.env.SES_SMTP_PORT || '587';
  const fromEmail = process.env.SES_FROM_EMAIL || 'compliance@kairologic.com';
  const fromName = process.env.SES_FROM_NAME || 'KairoLogic Compliance';

  const configured = !!(smtpUser && smtpPass);

  // Try a connection test if configured
  let connectionTest = 'not_attempted';
  if (configured) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.verify();
      connectionTest = 'success';
    } catch (err: any) {
      connectionTest = `failed: ${err.message}`;
    }
  }

  return NextResponse.json({
    smtp_configured: configured,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user_prefix: smtpUser ? smtpUser.substring(0, 8) + '...' : 'NOT SET',
    smtp_pass_set: !!smtpPass,
    from_email: fromEmail,
    from_name: fromName,
    connection_test: connectionTest,
    env_vars_needed: ['SES_SMTP_HOST', 'SES_SMTP_PORT', 'SES_SMTP_USER', 'SES_SMTP_PASS', 'SES_FROM_EMAIL'],
  });
}
