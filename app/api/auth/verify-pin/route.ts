import { NextRequest, NextResponse } from 'next/server';

/**
 * PIN Verification — Step 2 of 2FA
 * POST /api/auth/verify-pin
 * 
 * Accepts pending_session_id + 6-digit PIN + optional trust_device flag.
 * If correct, grants a real session token.
 * If trust_device=true, also issues a device_token (90 days) so future
 * logins from this browser skip PIN.
 * 
 * Rate limited: 5 attempts per pending session.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// In-memory rate limiting
const attempts = new Map<string, number>();

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
    const { pending_session_id, pin, trust_device } = await request.json();

    if (!pending_session_id || !pin) {
      return NextResponse.json({ error: 'Session ID and PIN are required' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 6 digits' }, { status: 400 });
    }

    // Rate limiting: max 5 attempts
    const attemptCount = attempts.get(pending_session_id) || 0;
    if (attemptCount >= 5) {
      return NextResponse.json({
        error: 'Too many attempts. Please request a new login link.',
        locked: true,
      }, { status: 429 });
    }
    attempts.set(pending_session_id, attemptCount + 1);

    // 1. Find pending session
    const pendingRes = await supabaseFetch(
      `dashboard_tokens?token=eq.${encodeURIComponent(pending_session_id)}&used_at=is.null&select=*`
    );
    const pendingSessions = await pendingRes.json();

    if (!pendingSessions || pendingSessions.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired session. Please request a new login link.' }, { status: 401 });
    }

    const pending = pendingSessions[0];

    // 2. Check expiry
    if (new Date(pending.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification code expired. Please request a new login link.' }, { status: 401 });
    }

    // 3. Get PIN hash
    const pinRes = await supabaseFetch(
      `dashboard_tokens?token=eq.pin:${encodeURIComponent(pending_session_id)}&select=*`
    );
    const pinRecords = await pinRes.json();

    if (!pinRecords || pinRecords.length === 0) {
      return NextResponse.json({ error: 'Verification data not found. Please request a new login link.' }, { status: 401 });
    }

    const storedPinHash = pinRecords[0].email;

    // 4. Verify PIN
    const crypto = await import('crypto');
    const inputPinHash = crypto.createHash('sha256').update(pin).digest('hex');

    if (inputPinHash !== storedPinHash) {
      const remaining = 5 - (attemptCount + 1);
      return NextResponse.json({
        error: `Incorrect verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        attempts_remaining: remaining,
      }, { status: 401 });
    }

    // ═══ PIN CORRECT ═══

    // 5. Mark pending session + PIN as used
    await supabaseFetch(
      `dashboard_tokens?token=eq.${encodeURIComponent(pending_session_id)}`,
      { method: 'PATCH', body: JSON.stringify({ used_at: new Date().toISOString() }) }
    );
    await supabaseFetch(
      `dashboard_tokens?token=eq.pin:${encodeURIComponent(pending_session_id)}`,
      { method: 'PATCH', body: JSON.stringify({ used_at: new Date().toISOString() }) }
    );

    // 6. Generate real session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await supabaseFetch('dashboard_tokens', {
      method: 'POST',
      body: JSON.stringify({
        token: sessionToken,
        email: pending.email,
        npi: pending.npi,
        expires_at: sessionExpires,
      }),
    });

    // 7. If trust_device, generate a device token (90 days)
    let deviceToken = null;
    if (trust_device) {
      deviceToken = crypto.randomBytes(32).toString('hex');
      const deviceExpires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

      await supabaseFetch('dashboard_tokens', {
        method: 'POST',
        body: JSON.stringify({
          token: `device:${deviceToken}`,
          email: pending.email,
          npi: pending.npi,
          expires_at: deviceExpires,
          // used_at stays null — active device trust
        }),
      });

      console.log(`[Auth] Device trusted for 90 days for ${pending.email}`);
    }

    // Clean up rate limiter
    attempts.delete(pending_session_id);

    console.log(`[Auth] 2FA complete for ${pending.email}, session created`);

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      device_token: deviceToken, // null if not trusted, string if trusted
      npi: pending.npi,
      email: pending.email,
      expires_at: sessionExpires,
    });

  } catch (err) {
    console.error('[Auth Verify-PIN] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
