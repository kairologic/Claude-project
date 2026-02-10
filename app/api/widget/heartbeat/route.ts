import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/widget/heartbeat
 * 
 * Widget phones home periodically (1x per hour).
 * Updates last_seen, increments page views, and stores current hashes.
 * 
 * Body: { npi, page_url, widget_mode, category_hashes, timestamp }
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { npi, page_url, widget_mode, category_hashes, timestamp } = body;

    if (!npi || !page_url) {
      return NextResponse.json({ error: 'npi and page_url required' }, { status: 400 });
    }

    // Upsert heartbeat record
    const heartbeatData = {
      npi,
      page_url,
      widget_mode: widget_mode || 'watch',
      last_seen: timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try to update existing record first
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/widget_heartbeats?npi=eq.${encodeURIComponent(npi)}&page_url=eq.${encodeURIComponent(page_url)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          last_seen: heartbeatData.last_seen,
          widget_mode: heartbeatData.widget_mode,
          page_views_24h: undefined, // Will use RPC to increment
          updated_at: heartbeatData.updated_at,
        }),
      }
    );

    const updated = await updateRes.json();

    if (!updated || updated.length === 0) {
      // No existing record — insert new
      await fetch(`${SUPABASE_URL}/rest/v1/widget_heartbeats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          ...heartbeatData,
          page_views_24h: 1,
          page_views_total: 1,
        }),
      });
    } else {
      // Increment page view counters via direct SQL-like update
      const current = updated[0];
      await fetch(
        `${SUPABASE_URL}/rest/v1/widget_heartbeats?npi=eq.${encodeURIComponent(npi)}&page_url=eq.${encodeURIComponent(page_url)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            page_views_24h: (current.page_views_24h || 0) + 1,
            page_views_total: (current.page_views_total || 0) + 1,
          }),
        }
      );
    }

    // If category_hashes provided, silently update baselines
    // This keeps baselines fresh even without a full re-scan
    if (category_hashes && Object.keys(category_hashes).length > 0) {
      // We don't overwrite baselines from heartbeat — baselines are only set
      // from full scans or manual admin action. The hashes in heartbeat are
      // used for comparison only.
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Widget Heartbeat] Error:', err);
    return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 });
  }
}
