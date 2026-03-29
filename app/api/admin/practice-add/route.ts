/**
 * POST /api/admin/practice-add
 *
 * Manually add a practice to the system.
 * Input: { npi, url }
 * Flow: Look up NPI in NPPES → create practice_websites row → kick off scan
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=representation',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB ${options.method || 'GET'} ${path}: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

export async function POST(request: NextRequest) {
  try {
    const { npi, url } = await request.json();

    if (!url || !url.includes('.')) {
      return NextResponse.json({ error: 'Valid URL required' }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Check for duplicate URL
    const existing = await db(
      `practice_websites?url=ilike.${encodeURIComponent(normalizedUrl)}*&select=id,name,url&limit=1`
    );
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `Practice already exists: ${existing[0].name || existing[0].url}`, existing: existing[0] },
        { status: 409 },
      );
    }

    // Look up NPI in NPPES data if provided
    let practiceName: string | null = null;
    let state: string | null = null;

    if (npi) {
      const npiData = await db(
        `providers?npi=eq.${npi}&select=first_name,last_name,organization_name,state&limit=1`
      );
      if (npiData && npiData.length > 0) {
        const p = npiData[0];
        practiceName = p.organization_name || `${p.first_name} ${p.last_name}`.trim();
        state = p.state;
      }
    }

    // Create practice_websites row
    const newPractice = await db('practice_websites', {
      method: 'POST',
      body: JSON.stringify({
        url: normalizedUrl,
        npi: npi || null,
        name: practiceName,
        state,
        scan_status: 'pending',
        scan_tier: 'weekly',
        consecutive_errors: 0,
        provider_count: 0,
        mismatch_count: 0,
      }),
    });

    const practiceId = newPractice?.[0]?.id;

    // If NPI provided, also add to practice_providers
    if (npi && practiceId) {
      await db('practice_providers', {
        method: 'POST',
        body: JSON.stringify({
          practice_website_id: practiceId,
          npi,
          provider_name: practiceName,
          association_source: 'MANUAL_ADMIN',
          roster_status: 'active',
          first_detected_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        }),
        headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' } as any,
      });
    }

    return NextResponse.json({
      success: true,
      practice: newPractice?.[0] || { id: practiceId },
      message: `Practice created${practiceName ? `: ${practiceName}` : ''}. Scan will run on next cycle, or trigger manually.`,
    });
  } catch (err) {
    console.error('[practice-add] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add practice' },
      { status: 500 },
    );
  }
}
