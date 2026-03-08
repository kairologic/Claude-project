import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

/**
 * Preview Claim API — Task 2.2
 * POST /api/preview/claim
 * 
 * Converts a preview token into a full practice dashboard:
 *   1. Validates token (not expired, not claimed)
 *   2. Creates organization record
 *   3. Links organization to practice_websites
 *   4. Creates dashboard_tokens entry for magic link auth
 *   5. Marks preview token as claimed
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB error: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    // 1. Validate preview token
    const tokens = await db(`preview_tokens?token=eq.${encodeURIComponent(token)}&select=*`);
    if (!tokens?.length) return NextResponse.json({ error: 'Invalid preview token' }, { status: 404 });

    const previewToken = tokens[0];
    if (previewToken.is_claimed) return NextResponse.json({ error: 'This preview has already been claimed' }, { status: 409 });
    if (new Date(previewToken.expires_at) < new Date()) return NextResponse.json({ error: 'This preview has expired' }, { status: 410 });

    const practiceWebsiteId = previewToken.practice_website_id;

    // 2. Get practice info
    const practices = await db(`practice_websites?id=eq.${practiceWebsiteId}&select=id,name,url,state,practice_group_id`);
    if (!practices?.length) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    const practice = practices[0];

    // 3. Create organization (billing + auth entity)
    const orgs = await db('organizations', {
      method: 'POST',
      body: JSON.stringify({
        name: practice.name || `Practice at ${practice.url}`,
        org_type: 'PRACTICE',
        contact_email: email.toLowerCase().trim(),
        plan_tier: 'starter',
        max_practices: 1,
        max_providers: 10,
        primary_practice_group_id: practice.practice_group_id || null,
      }),
    });
    const orgId = orgs?.[0]?.id;

    // 4. Link organization to practice_websites
    await db(`practice_websites?id=eq.${practiceWebsiteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ organization_id: orgId }),
    });

    // 5. Create a dashboard access token for magic link auth
    // Hash the password for storage (simple approach, upgrade to bcrypt later)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const dashToken = crypto.randomBytes(32).toString('hex');

    await db('dashboard_tokens', {
      method: 'POST',
      body: JSON.stringify({
        token: dashToken,
        email: email.toLowerCase().trim(),
        npi: practice.npi || practiceWebsiteId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }),
    });

    // 6. If provider exists in registry, update with email
    if (practice.npi) {
      try {
        await db(`registry?npi=eq.${practice.npi}`, {
          method: 'PATCH',
          body: JSON.stringify({ email: email.toLowerCase().trim() }),
        });
      } catch { /* registry row may not exist */ }
    }

    // 7. Mark preview token as claimed
    await db(`preview_tokens?id=eq.${previewToken.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_claimed: true,
        claimed_at: new Date().toISOString(),
      }),
    });

    // 8. Upgrade scan tier from monthly to weekly (claimed practices get weekly scans)
    await db(`practice_websites?id=eq.${practiceWebsiteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ scan_tier: 'weekly' }),
    });

    return NextResponse.json({
      success: true,
      practice_website_id: practiceWebsiteId,
      organization_id: orgId,
      dashboard_url: `/practice/${practiceWebsiteId}`,
    });

  } catch (err) {
    console.error('[Claim API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Claim failed' },
      { status: 500 },
    );
  }
}
