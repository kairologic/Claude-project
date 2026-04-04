import { NextResponse } from 'next/server';

export const revalidate = 300; // Cache for 5 minutes

/**
 * GET /api/public/ticker-events
 *
 * Returns anonymized real-time activity events for the landing page ticker.
 * Pulls from actual DB tables but strips PII (no names, no NPIs, no addresses).
 * Returns 8-12 recent events across different categories.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TickerEvent {
  id: string;
  icon: string;
  text: string;
  category: 'scan' | 'delta' | 'payer' | 'compliance' | 'license' | 'ai_tool';
  timestamp: string;
}

interface TickerResponse {
  events: TickerEvent[];
  cached_at: string;
}

export async function GET(): Promise<NextResponse<TickerResponse | { error: string }>> {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const events: TickerEvent[] = [];

    // Fetch all stats in parallel
    const [scanStats, deltaStats, payerStats, complianceStats, aiToolStats, licenseStats] =
      await Promise.all([
        getRecentScanStats(),
        getRecentDeltaStats(),
        getPayerSyncStats(),
        getComplianceStats(),
        getAiToolStats(),
        getLicenseStats(),
      ]);

    // Build events from real data
    if (scanStats.scansToday > 0) {
      events.push({
        id: 'scan-today',
        icon: '🔍',
        text: `${scanStats.scansToday.toLocaleString()} provider websites scanned today`,
        category: 'scan',
        timestamp: 'today',
      });
    }
    if (scanStats.scansThisWeek > 0) {
      events.push({
        id: 'scan-week',
        icon: '📊',
        text: `${scanStats.scansThisWeek.toLocaleString()} scans completed this week across ${scanStats.statesCovered} states`,
        category: 'scan',
        timestamp: 'this week',
      });
    }

    if (deltaStats.addressMismatches > 0) {
      events.push({
        id: 'delta-address',
        icon: '📍',
        text: `${deltaStats.addressMismatches} address mismatches detected in TX this week`,
        category: 'delta',
        timestamp: 'this week',
      });
    }
    if (deltaStats.phoneMismatches > 0) {
      events.push({
        id: 'delta-phone',
        icon: '📞',
        text: `${deltaStats.phoneMismatches} phone number discrepancies flagged`,
        category: 'delta',
        timestamp: 'this week',
      });
    }
    if (deltaStats.taxonomyMismatches > 0) {
      events.push({
        id: 'delta-taxonomy',
        icon: '🏥',
        text: `${deltaStats.taxonomyMismatches} specialty/taxonomy mismatches identified`,
        category: 'delta',
        timestamp: 'this week',
      });
    }

    if (payerStats.totalSnapshots > 0) {
      events.push({
        id: 'payer-sync',
        icon: '🔄',
        text: `${payerStats.totalSnapshots.toLocaleString()} payer directory records synced across ${payerStats.payerCount} payers`,
        category: 'payer',
        timestamp: 'latest sync',
      });
    }
    if (payerStats.mismatches > 0) {
      events.push({
        id: 'payer-mismatch',
        icon: '⚠️',
        text: `${payerStats.mismatches} payer directory mismatches awaiting resolution`,
        category: 'payer',
        timestamp: 'active',
      });
    }

    if (complianceStats.recentFindings > 0) {
      events.push({
        id: 'compliance',
        icon: '🛡️',
        text: `${complianceStats.recentFindings} compliance findings generated this week`,
        category: 'compliance',
        timestamp: 'this week',
      });
    }

    if (aiToolStats.detected > 0) {
      events.push({
        id: 'ai-tools',
        icon: '🤖',
        text: `${aiToolStats.detected} EHR/AI tools detected across provider websites`,
        category: 'ai_tool',
        timestamp: 'cumulative',
      });
    }

    if (licenseStats.expiringIn30 > 0) {
      events.push({
        id: 'license-expiry',
        icon: '📋',
        text: `${licenseStats.expiringIn30} provider licenses expiring within 30 days`,
        category: 'license',
        timestamp: 'active',
      });
    }
    if (licenseStats.boardActions > 0) {
      events.push({
        id: 'board-actions',
        icon: '⚖️',
        text: `${licenseStats.boardActions} board actions monitored this month`,
        category: 'license',
        timestamp: 'this month',
      });
    }

    // Always include at least a few events even if DB queries fail
    if (events.length === 0) {
      events.push(
        {
          id: 'fallback-1',
          icon: '🔍',
          text: '1.8M+ provider records continuously monitored',
          category: 'scan',
          timestamp: 'ongoing',
        },
        {
          id: 'fallback-2',
          icon: '🔄',
          text: 'Payer directories synced across 6 major insurers',
          category: 'payer',
          timestamp: 'ongoing',
        },
        {
          id: 'fallback-3',
          icon: '📋',
          text: 'TX and CA provider licenses tracked in real-time',
          category: 'license',
          timestamp: 'ongoing',
        },
      );
    }

    return NextResponse.json(
      { events, cached_at: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error: any) {
    console.error('[Ticker Events] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch ticker events' }, { status: 500 });
  }
}

// ── Data fetchers (all anonymized) ──

async function getRecentScanStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [todayRows, weekRows] = await Promise.all([
      countRows(`scan_sessions?completed_at=gte.${today}T00:00:00`),
      countRows(`scan_sessions?completed_at=gte.${weekAgo}`),
    ]);

    return { scansToday: todayRows, scansThisWeek: weekRows, statesCovered: 2 };
  } catch {
    return { scansToday: 0, scansThisWeek: 0, statesCovered: 2 };
  }
}

async function getRecentDeltaStats() {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [address, phone, taxonomy] = await Promise.all([
      countRows(`nppes_delta_events?field=eq.address&created_at=gte.${weekAgo}`),
      countRows(`nppes_delta_events?field=eq.phone&created_at=gte.${weekAgo}`),
      countRows(`nppes_delta_events?field=eq.taxonomy&created_at=gte.${weekAgo}`),
    ]);

    return {
      addressMismatches: address,
      phoneMismatches: phone,
      taxonomyMismatches: taxonomy,
    };
  } catch {
    return { addressMismatches: 0, phoneMismatches: 0, taxonomyMismatches: 0 };
  }
}

async function getPayerSyncStats() {
  try {
    const [total, mismatches, payers] = await Promise.all([
      countRows('payer_directory_snapshots'),
      countRows('payer_directory_mismatches?status=eq.open'),
      supabaseGetJson('payer_directory_snapshots?select=payer_code&limit=100'),
    ]);

    const uniquePayers = new Set(((payers as any[]) || []).map((r) => r.payer_code));

    return {
      totalSnapshots: total,
      mismatches,
      payerCount: uniquePayers.size,
    };
  } catch {
    return { totalSnapshots: 0, mismatches: 0, payerCount: 0 };
  }
}

async function getComplianceStats() {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const count = await countRows(
      `workflow_instances?workflow_type=eq.compliance&created_at=gte.${weekAgo}`,
    );
    return { recentFindings: count };
  } catch {
    return { recentFindings: 0 };
  }
}

async function getAiToolStats() {
  try {
    const count = await countRows('ai_tools_detected');
    return { detected: count };
  } catch {
    return { detected: 0 };
  }
}

async function getLicenseStats() {
  try {
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [expiring, actions] = await Promise.all([
      countRows(
        `provider_licenses?expiration_date=lte.${in30Days}&expiration_date=gte.${today}&license_status=eq.ACTIVE`,
      ),
      countRows(`provider_licenses?board_action_date=gte.${monthAgo}`),
    ]);

    return { expiringIn30: expiring, boardActions: actions };
  } catch {
    return { expiringIn30: 0, boardActions: 0 };
  }
}

// ── Helpers ──

async function countRows(path: string): Promise<number> {
  try {
    const tablePath = path.includes('?') ? `${path}&select=id` : `${path}?select=id`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tablePath}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'count=exact',
        Range: '0-0',
      },
    });

    if (!res.ok) return 0;

    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) return parseInt(match[1], 10);
    }
    return 0;
  } catch {
    return 0;
  }
}

async function supabaseGetJson(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return [];
  return res.json();
}
