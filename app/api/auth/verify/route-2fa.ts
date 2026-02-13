import { NextRequest, NextResponse } from 'next/server';

/**
 * Magic Link Token Verification — Step 1 of 2FA
 * POST /api/auth/verify
 * 
 * Validates the magic link token. If the device is trusted (valid device_token cookie),
 * skips PIN and grants session immediately. Otherwise, generates a 6-digit PIN
 * and emails it to the provider.
 * 
 * Flow A (trusted device): Magic link → verify token → check device cookie → session granted
 * Flow B (new device):     Magic link → verify token → send PIN → user enters PIN → session granted
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.com';

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

async function sendPinEmail(email: string, pin: string) {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: SES_SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"KairoLogic Security" <${SES_FROM_EMAIL}>`,
    to: email,
    subject: `Your verification code: ${pin}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:24px;font-weight:800;color:#0f1b2d;">KAIRO</span><span style="font-size:24px;font-weight:800;color:#c9a84c;">LOGIC</span>
        </div>
        <div style="background:#fff;border-radius:12px;padding:32px;text-align:center;border:1px solid #e2e8f0;">
          <div style="font-size:14px;color:#64748b;margin-bottom:8px;">Your verification code is:</div>
          <div style="font-size:40px;font-weight:800;letter-spacing:8px;color:#0f1b2d;font-family:monospace;margin:16px 0;">${pin}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:12px;">This code expires in <strong>10 minutes</strong>.</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:8px;">If you didn't request this, you can safely ignore this email.</div>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:10px;color:#94a3b8;">
          KairoLogic Compliance Dashboard — Secure Access
        </div>
      </div>
    `,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, device_token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // 1. Find magic link token in database
    const tokenRes = await supabaseFetch(
      `dashboard_tokens?token=eq.${encodeURIComponent(token)}&select=*`
    );
    const tokens = await tokenRes.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });
    }

    const tokenRecord = tokens[0];

    // 2. Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This login link has expired. Please request a new one.' }, { status: 401 });
    }

    // 3. Check if already used
    if (tokenRecord.used_at) {
      return NextResponse.json({ error: 'This login link has already been used. Please request a new one.' }, { status: 401 });
    }

    // 4. Mark magic link as used
    await supabaseFetch(
      `dashboard_tokens?id=eq.${tokenRecord.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ used_at: new Date().toISOString() }),
      }
    );

    const crypto = await import('crypto');

    // ═══ CHECK TRUSTED DEVICE ═══
    // If the client sent a device_token, check if it's valid for this NPI
    if (device_token) {
      const deviceRes = await supabaseFetch(
        `dashboard_tokens?token=eq.device:${encodeURIComponent(device_token)}&npi=eq.${encodeURIComponent(tokenRecord.npi)}&used_at=is.null&select=*`
      );
      const deviceRecords = await deviceRes.json();

      if (deviceRecords && deviceRecords.length > 0) {
        const deviceRecord = deviceRecords[0];

        // Check device token not expired (90 days)
        if (new Date(deviceRecord.expires_at) > new Date()) {
          // TRUSTED DEVICE — skip PIN, grant session directly
          const sessionToken = crypto.randomBytes(32).toString('hex');
          const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await supabaseFetch('dashboard_tokens', {
            method: 'POST',
            body: JSON.stringify({
              token: sessionToken,
              email: tokenRecord.email,
              npi: tokenRecord.npi,
              expires_at: sessionExpires,
            }),
          });

          console.log(`[Auth] Trusted device verified for ${tokenRecord.email} — PIN skipped`);

          return NextResponse.json({
            success: true,
            trusted_device: true,
            session_token: sessionToken,
            npi: tokenRecord.npi,
            email: tokenRecord.email,
            expires_at: sessionExpires,
          });
        }
      }
      // Device token invalid/expired — fall through to PIN flow
    }

    // ═══ NEW DEVICE — SEND PIN ═══
    const pin = crypto.randomInt(100000, 999999).toString();
    const pendingSessionId = crypto.randomBytes(32).toString('hex');
    const pinExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    // Store pending session
    await supabaseFetch('dashboard_tokens', {
      method: 'POST',
      body: JSON.stringify({
        token: pendingSessionId,
        email: tokenRecord.email,
        npi: tokenRecord.npi,
        expires_at: pinExpires,
      }),
    });

    // Store PIN hash (pin: prefix convention)
    await supabaseFetch('dashboard_tokens', {
      method: 'POST',
      body: JSON.stringify({
        token: `pin:${pendingSessionId}`,
        email: pinHash,
        npi: tokenRecord.npi,
        expires_at: pinExpires,
      }),
    });

    // Send PIN email
    try {
      await sendPinEmail(tokenRecord.email, pin);
    } catch (emailErr) {
      console.error('[Auth] Failed to send PIN email:', emailErr);
      return NextResponse.json({ error: 'Failed to send verification code. Please try again.' }, { status: 500 });
    }

    console.log(`[Auth] PIN sent to ${tokenRecord.email} for NPI ${tokenRecord.npi}`);

    return NextResponse.json({
      success: true,
      requires_pin: true,
      pending_session_id: pendingSessionId,
      email_hint: tokenRecord.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      npi: tokenRecord.npi,
      message: 'Verification code sent to your email',
    });

  } catch (err) {
    console.error('[Auth Verify] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
