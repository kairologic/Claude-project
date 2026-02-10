import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/widget/baseline?npi=XXX&page_url=/path
 * Returns baseline hashes for the widget to compare against.
 * 
 * POST /api/widget/baseline
 * Stores new baseline hashes (called after a full scan completes).
 * Body: { npi, page_url, categories: { ai_disclosure: { hash, content }, ... } }
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const npi = searchParams.get('npi');
  const pageUrl = searchParams.get('page_url') || '/';

  if (!npi) {
    return NextResponse.json({ error: 'npi required' }, { status: 400 });
  }

  try {
    // Fetch all baselines for this NPI + page
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/compliance_baselines?npi=eq.${encodeURIComponent(npi)}&page_url=eq.${encodeURIComponent(pageUrl)}&select=category,hash,content_snapshot,framework,updated_at`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Baseline GET] Supabase error:', errText);
      return NextResponse.json({ error: 'Failed to fetch baselines' }, { status: 500 });
    }

    const rows = await res.json();

    if (!rows || rows.length === 0) {
      return NextResponse.json({ baselines: null, message: 'No baseline exists yet' }, { status: 200 });
    }

    // Convert to { category: { hash, content, empty } } map
    const baselines: Record<string, { hash: string; content: string; empty: boolean }> = {};
    for (const row of rows) {
      baselines[row.category] = {
        hash: row.hash,
        content: row.content_snapshot || '',
        empty: !row.content_snapshot,
      };
    }

    return NextResponse.json({
      baselines,
      npi,
      page_url: pageUrl,
      framework: rows[0]?.framework || 'tx_sb1188_hb149',
      last_updated: rows.reduce((latest: string, r: any) => r.updated_at > latest ? r.updated_at : latest, ''),
    });
  } catch (err: any) {
    console.error('[Baseline GET] Error:', err);
    return NextResponse.json({ error: 'Baseline fetch failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { npi, page_url, categories, framework } = body;

    if (!npi || !categories || typeof categories !== 'object') {
      return NextResponse.json({ error: 'npi and categories required' }, { status: 400 });
    }

    const pageUrlNorm = page_url || '/';
    const fw = framework || 'tx_sb1188_hb149';
    const now = new Date().toISOString();
    let upserted = 0;

    // Upsert each category baseline
    for (const [category, data] of Object.entries(categories)) {
      const { hash, content } = data as { hash: string; content?: string };

      if (!hash) continue;

      const record = {
        npi,
        page_url: pageUrlNorm,
        category,
        hash,
        content_snapshot: (content || '').substring(0, 2000),
        framework: fw,
        updated_at: now,
      };

      // Upsert using ON CONFLICT
      const res = await fetch(`${SUPABASE_URL}/rest/v1/compliance_baselines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        upserted++;
      } else {
        const errText = await res.text();
        console.error(`[Baseline POST] Failed to upsert ${category}:`, errText);
      }
    }

    return NextResponse.json({
      ok: true,
      upserted,
      npi,
      page_url: pageUrlNorm,
    });
  } catch (err: any) {
    console.error('[Baseline POST] Error:', err);
    return NextResponse.json({ error: 'Baseline save failed' }, { status: 500 });
  }
}
