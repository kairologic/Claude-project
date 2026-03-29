/**
 * POST /api/admin/practice-scan
 *
 * On-demand scan or payer sync for a specific practice.
 * Input: { practice_id, action: 'scan' | 'payer_sync' | 'both' }
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
    const { practice_id, action } = await request.json();

    if (!practice_id) {
      return NextResponse.json({ error: 'practice_id required' }, { status: 400 });
    }
    if (!action || !['scan', 'payer_sync', 'both'].includes(action)) {
      return NextResponse.json({ error: 'action must be scan, payer_sync, or both' }, { status: 400 });
    }

    // Verify practice exists
    const practices = await db(`practice_websites?id=eq.${practice_id}&select=id,name,url`);
    if (!practices || practices.length === 0) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const results: { scan?: string; payer_sync?: string } = {};

    if (action === 'scan' || action === 'both') {
      // Force the practice to be scanned on the next scheduler run
      // by setting scan_scheduled_at to now
      await db(`practice_websites?id=eq.${practice_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scan_scheduled_at: new Date().toISOString(),
          scan_status: 'pending',
        }),
      });
      results.scan = 'queued';
    }

    if (action === 'payer_sync' || action === 'both') {
      // Run inline payer sync — calls FHIR APIs directly for this practice
      try {
        const origin = new URL(request.url).origin;
        const syncRes = await fetch(`${origin}/api/admin/practice-payer-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ practice_id }),
        });
        const syncData = await syncRes.json();
        if (syncRes.ok) {
          results.payer_sync = syncData.message || 'completed';
        } else {
          results.payer_sync = `error: ${syncData.error || 'unknown'}`;
        }
      } catch (syncErr) {
        results.payer_sync = `error: ${syncErr instanceof Error ? syncErr.message : 'sync failed'}`;
      }
    }

    return NextResponse.json({
      success: true,
      practice_id,
      actions: results,
      message: `${action === 'scan' ? 'Scan queued' : action === 'payer_sync' ? 'Payer sync completed' : 'Scan queued + payer sync completed'} for ${practices[0].name || practice_id}`,
    });
  } catch (err) {
    console.error('[practice-scan] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to queue action' },
      { status: 500 },
    );
  }
}
