import { NextResponse } from 'next/server';

export const revalidate = 3600; // ISR: cache for 1 hour

interface HeroStat {
  value: number;
  label: string;
}

interface HeroStatsResponse {
  stats: Record<string, HeroStat>;
  cached_at: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/public/hero-stats
 * Returns cached aggregate stats for the hero section
 * Stats are computed from Supabase and cached for 1 hour via ISR
 */
export async function GET(): Promise<NextResponse<HeroStatsResponse | { error: string }>> {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('[Hero Stats] Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 },
      );
    }

    // Fetch all stats in parallel
    const [
      totalProvidersRes,
      txProvidersRes,
      oigExclusionsRes,
      aiToolsRes,
      payerDirectoriesRes,
      websitesRes,
    ] = await Promise.all([
      supabaseGet('providers?select=npi&limit=1'),
      supabaseGet('practice_websites?select=id&where=state.eq.TX&limit=1'),
      supabaseGet('provider_exclusions?select=id&where=rein_date.is.null&limit=1'),
      supabaseGet('ai_tools_detected?select=id&limit=1'),
      supabaseGet('payer_directory_snapshots?select=id&limit=1'),
      supabaseGet('practice_websites?select=id&where=url.not.is.null&limit=1'),
    ]);

    // Extract counts from responses
    const totalProviders = await getCount('providers', 'npi');
    const txProviders = await getCount(
      'practice_websites',
      'id',
      'state.eq.TX&and(last_scan_at.not.is.null)',
    );
    const oigExclusions = await getCount(
      'provider_exclusions',
      'id',
      'rein_date.is.null',
    );
    const aiTools = await getCount('ai_tools_detected', 'id');
    const payerDirs = await getCount('payer_directory_snapshots', 'id');
    const websites = await getCount('practice_websites', 'id', 'url.not.is.null');

    const stats: Record<string, HeroStat> = {
      total_providers_monitored: {
        value: totalProviders,
        label: 'Total Providers Monitored',
      },
      tx_providers_scanned: {
        value: txProviders,
        label: 'TX Providers Scanned',
      },
      oig_exclusions_flagged: {
        value: oigExclusions,
        label: 'OIG Exclusions Flagged',
      },
      ai_tools_detected: {
        value: aiTools,
        label: 'AI Tools Detected',
      },
      payer_directories_checked: {
        value: payerDirs,
        label: 'Payer Directories Checked',
      },
      websites_monitored: {
        value: websites,
        label: 'Websites Monitored',
      },
    };

    const response: HeroStatsResponse = {
      stats,
      cached_at: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('[Hero Stats] Error fetching stats:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch hero stats' },
      { status: 500 },
    );
  }
}

/**
 * Make authenticated GET request to Supabase REST API
 */
async function supabaseGet(path: string): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Supabase ${path}: ${res.status} ${res.statusText}`);
  }

  return res;
}

/**
 * Get count of records from a table via Supabase REST API
 * Uses the exact count header to get result count without fetching rows
 */
async function getCount(
  table: string,
  column: string = 'id',
  filters?: string,
): Promise<number> {
  try {
    const path = filters
      ? `${table}?select=${column}&${filters}`
      : `${table}?select=${column}`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'count=exact',
        'Content-Range': '0-0/*', // Only fetch count header
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(
        `[Hero Stats] Failed to get count for ${table}: ${res.status}`,
      );
      return 0;
    }

    // The content-range header contains "start-end/total"
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // Fallback: count returned rows
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch (error: any) {
    console.error(
      `[Hero Stats] Error getting count for ${table}:`,
      error?.message,
    );
    return 0;
  }
}
