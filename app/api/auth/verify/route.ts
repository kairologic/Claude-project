import { NextRequest, NextResponse } from 'next/server';

/**
 * Magic Link Token Verification
 * POST /api/auth/verify
 * 
 * Validates a magic link token and returns provider data.
 * Marks token as used so it can't be reused.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // 1. Find token in database
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

    // 4. Mark as used
    await supabaseFetch(
      `dashboard_tokens?id=eq.${tokenRecord.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ used_at: new Date().toISOString() }),
      }
    );

    // 5. Generate a session token (longer-lived, for dashboard access)
    const crypto = await import('crypto');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Store session
    await supabaseFetch('dashboard_tokens', {
      method: 'POST',
      body: JSON.stringify({
        token: sessionToken,
        email: tokenRecord.email,
        npi: tokenRecord.npi,
        expires_at: sessionExpires,
        // used_at stays null — this is an active session
      }),
    });

    console.log(`[Auth] Verified magic link for ${tokenRecord.email}, session created`);

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      npi: tokenRecord.npi,
      email: tokenRecord.email,
      expires_at: sessionExpires,
    });

  } catch (err) {
    console.error('[Auth Verify] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
