/**
 * GET /api/admin/practice-health
 *
 * Returns health status for all practices (or a single practice).
 * Powers the admin practices management page.
 *
 * Query params:
 *   ?id=<practice_website_id>  — single practice
 *   (none)                     — all practices
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';

// TODO: Add system-admin role check when role system is expanded

export interface PracticeHealth {
  id: string;
  name: string | null;
  url: string;
  npi: string | null;
  state: string | null;
  organization_id: string | null;
  status: 'active' | 'pending' | 'error' | 'unclaimed';
  claimed_at: string | null;
  scan_status: string;
  last_scan_at: string | null;
  scan_tier: string;
  consecutive_errors: number;
  provider_count: number;
  mismatch_count: number;
  accepted_payers: string[] | null;
  providers_total: number;
  providers_active: number;
  providers_unverified: number;
  providers_departed: number;
  delta_events_total: number;
  delta_events_unresolved: number;
  payer_snapshots_total: number;
  payer_snapshots_listed: number;
  payer_snapshots_not_listed: number;
  payer_mismatches_open: number;
  last_payer_sync_at: string | null;
  workflows_total: number;
  workflows_action_needed: number;
  workflows_resolved: number;
  alerts_total: number;
  alerts_unread: number;
  dashboard_issues: DashboardIssue[];
}

export interface DashboardIssue {
  type: 'scan_stale' | 'scan_error' | 'no_providers' | 'no_payer_sync' | 'high_mismatch' | 'unclaimed';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

function detectIssues(p: PracticeHealth): DashboardIssue[] {
  const issues: DashboardIssue[] = [];

  if (!p.organization_id && !p.claimed_at) {
    issues.push({ type: 'unclaimed', severity: 'info', message: 'Practice not yet claimed' });
  }

  if (p.scan_status === 'error' || p.scan_status === 'unreachable') {
    issues.push({ type: 'scan_error', severity: 'error', message: `Scan status: ${p.scan_status} (${p.consecutive_errors} consecutive errors)` });
  }

  if (p.last_scan_at) {
    const daysSinceScan = (Date.now() - new Date(p.last_scan_at).getTime()) / (1000 * 60 * 60 * 24);
    const staleDays = p.scan_tier === 'daily' ? 3 : p.scan_tier === 'weekly' ? 14 : 45;
    if (daysSinceScan > staleDays) {
      issues.push({ type: 'scan_stale', severity: 'warning', message: `Last scan ${Math.round(daysSinceScan)} days ago (${p.scan_tier} tier)` });
    }
  } else {
    issues.push({ type: 'scan_stale', severity: 'warning', message: 'Never scanned' });
  }

  if (p.providers_total === 0) {
    issues.push({ type: 'no_providers', severity: 'warning', message: 'No providers detected' });
  }

  if (p.providers_total > 0 && !p.last_payer_sync_at) {
    issues.push({ type: 'no_payer_sync', severity: 'info', message: 'Payer directory sync not yet run' });
  }

  if (p.mismatch_count > 0 && p.providers_total > 0) {
    const pct = Math.round((p.mismatch_count / p.providers_total) * 100);
    if (pct > 50) {
      issues.push({ type: 'high_mismatch', severity: 'error', message: `${pct}% of providers have mismatches` });
    }
  }

  return issues;
}

const GET_HANDLER = withAuth(async (request: NextRequest, ctx) => {
  try {
    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get('id');
    const supabase = ctx.supabase;

    // Call the server-side RPC function that does all aggregation in SQL
    const { data: rows, error } = await supabase.rpc('get_practice_health_summary', {
      p_practice_id: practiceId || null,
    });

    if (error) {
      throw new Error(`RPC get_practice_health_summary: ${error.message}`);
    }

    // The RPC returns a JSONB array directly
    const rawPractices = Array.isArray(rows) ? rows : (rows || []);

    // Add status + dashboard issues (computed in JS for flexibility)
    const results: PracticeHealth[] = rawPractices.map((p: any) => {
      let status: PracticeHealth['status'] = 'pending';
      if (p.organization_id || p.claimed_at) {
        status = 'active';
      } else if (p.scan_status === 'error' || p.scan_status === 'unreachable') {
        status = 'error';
      } else if (!p.organization_id) {
        status = 'unclaimed';
      }

      const health: PracticeHealth = {
        ...p,
        status,
        dashboard_issues: [],
      };

      health.dashboard_issues = detectIssues(health);
      return health;
    });

    return NextResponse.json({ practices: results });
  } catch (err) {
    console.error('[practice-health] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
});

export { GET_HANDLER as GET };
