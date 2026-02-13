import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

/**
 * Magic Link Auth API
 * POST /api/auth/magic-link
 * 
 * Sends a passwordless login link to the provider's email.
 * Token is stored in Supabase `dashboard_tokens` table.
 * 
 * Required Supabase table:
 * CREATE TABLE dashboard_tokens (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   token text NOT NULL UNIQUE,
 *   email text NOT NULL,
 *   npi text NOT NULL,
 *   expires_at timestamptz NOT NULL,
 *   used_at timestamptz,
 *   created_at timestamptz DEFAULT now()
 * );
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_PORT = parseInt(process.env.SES_SMTP_PORT || '587');
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.com';
const SES_FROM_NAME = process.env.SES_FROM_NAME || 'KairoLogic Compliance';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';

async function supabaseFetch(path: string, options: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Find provider in registry by email
    const regRes = await supabaseFetch(`registry?email=eq.${encodeURIComponent(emailLower)}&select=npi,name,email,subscription_status,is_paid`);
    const providers = await regRes.json();

    if (!providers || providers.length === 0) {
      // Email not found — return a clear, helpful error
      return NextResponse.json({ 
        error: 'not_found',
        message: 'We couldn\'t find an account associated with this email address.',
        support_email: 'support@kairologic.net',
      }, { status: 404 });
    }

    const provider = providers[0];

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    // 3. Store token in Supabase
    const tokenRes = await supabaseFetch('dashboard_tokens', {
      method: 'POST',
      body: JSON.stringify({
        token,
        email: emailLower,
        npi: provider.npi,
        expires_at: expiresAt,
      }),
    });

    if (!tokenRes.ok) {
      console.error('[Magic Link] Failed to store token:', await tokenRes.text());
      return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 });
    }

    // 4. Send magic link email via SES
    const loginUrl = `${BASE_URL}/dashboard?token=${token}`;
    const sent = await sendMagicLinkEmail(emailLower, provider.name || 'Healthcare Provider', loginUrl);

    if (!sent) {
      console.error('[Magic Link] Failed to send email');
      return NextResponse.json({ error: 'Failed to send login email' }, { status: 500 });
    }

    console.log(`[Magic Link] Sent to ${emailLower} for NPI ${provider.npi}`);

    return NextResponse.json({ 
      success: true, 
      message: 'If this email is associated with a KairoLogic account, you will receive a login link.' 
    });

  } catch (err) {
    console.error('[Magic Link] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function sendMagicLinkEmail(to: string, providerName: string, loginUrl: string): Promise<boolean> {
  if (!SES_SMTP_USER || !SES_SMTP_PASS) {
    console.error('[Magic Link] SES not configured');
    return false;
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: SES_SMTP_HOST,
      port: SES_SMTP_PORT,
      secure: false,
      auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
    });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#0f1b2d;padding:24px 30px;">
      <div style="font-size:18px;font-weight:800;"><span style="color:#fff;">KAIRO</span><span style="color:#c9a84c;">LOGIC</span></div>
      <div style="font-size:10px;color:#c9a84c;text-transform:uppercase;letter-spacing:1.5px;margin-top:2px;">Sentry Shield Dashboard</div>
    </div>
    <div style="padding:30px;">
      <h2 style="font-size:18px;color:#0f1b2d;margin:0 0 8px;">Your Dashboard Login Link</h2>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 20px;">
        Hi — here's your secure login link for the <strong>${providerName}</strong> Sentry Shield dashboard. This link expires in 30 minutes.
      </p>
      <a href="${loginUrl}" style="display:block;text-align:center;background:#c9a84c;color:#0f1b2d;font-size:14px;font-weight:700;padding:14px 24px;border-radius:8px;text-decoration:none;">
        Open My Dashboard →
      </a>
      <p style="font-size:12px;color:#64748b;margin-top:16px;line-height:1.5;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;">
        🔒 <strong>Two-factor authentication:</strong> After clicking the link, you'll receive a 6-digit verification code at this email address. You can choose to trust your device so you won't need a code next time.
      </p>
      <p style="font-size:11px;color:#94a3b8;margin-top:16px;line-height:1.5;">
        If you didn't request this link, you can safely ignore this email. For security, this link can only be used once and expires in 30 minutes.
      </p>
      <p style="font-size:10px;color:#cbd5e1;margin-top:16px;">
        <a href="${loginUrl}" style="color:#94a3b8;word-break:break-all;">${loginUrl}</a>
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 30px;border-top:1px solid #e2e8f0;">
      <p style="font-size:10px;color:#94a3b8;margin:0;">KairoLogic · kairologic.net · compliance@kairologic.com</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"${SES_FROM_NAME}" <${SES_FROM_EMAIL}>`,
      to,
      subject: 'Your KairoLogic Dashboard Login Link',
      html,
      text: `Your KairoLogic dashboard login link:\n\n${loginUrl}\n\nThis link expires in 30 minutes.`,
    });

    return true;
  } catch (err) {
    console.error('[Magic Link] Email error:', err);
    return false;
  }
}
