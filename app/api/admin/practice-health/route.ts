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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function db(path: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB GET ${path}: ${res.status} ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export interface PracticeHealth {
  id: string;
  name: string | null;
  url: string;
  npi: string | null;
  state: string | null;
  organization_id: string | null;
  // Status
  status: 'active' | 'pending' | 'error' | 'unclaimed';
  claimed_at: string | null;
  // Scan health
  scan_status: string;
  last_scan_at: string | null;
  scan_tier: string;
  consecutive_errors: number;
  provider_count: number;
  mismatch_count: number;
  accepted_payers: string[] | null;
  // Provider confirmation
  providers_total: number;
  providers_active: number;
  providers_unverified: number;
  providers_departed: number;
  // Delta events
  delta_events_total: number;
  delta_events_unresolved: number;
  // Payer directory sync
  payer_snapshots_total: number;
  payer_snapshots_listed: number;
  payer_snapshots_not_listed: number;
  payer_mismatches_open: number;
  last_payer_sync_at: string | null;
  // Workflows
  workflows_total: number;
  workflows_action_needed: number;
  workflows_resolved: number;
  // Alerts
  alerts_total: number;
  alerts_unread: number;
  // Dashboard issues
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get('id');

    // 1. Fetch practice websites
    let practiceFilter = 'practice_websites?select=id,name,url,npi,state,organization_id,scan_status,last_scan_at,scan_tier,consecutive_errors,provider_count,mismatch_count,accepted_payers,accepted_payers_extracted_at&order=name.asc.nullslast';
    if (practiceId) {
      practiceFilter += `&id=eq.${practiceId}`;
    } else {
      // For the grid, only return claimed + recently scanned practices (not all 57K)
      practiceFilter += '&or=(organization_id.not.is.null,last_scan_at.not.is.null)&limit=500';
    }

    const practices = await db(practiceFilter);
    if (!practices || practices.length === 0) {
      return NextResponse.json({ practices: [] });
    }

    const practiceIds = practices.map((p: any) => p.id);
    const idList = practiceIds.map((id: string) => `"${id}"`).join(',');

    // 2. Batch fetch related data
    const [
      providerCounts,
      deltaEvents,
      payerSnapshots,
      payerMismatches,
      workflows,
      alerts,
      claimTokens,
    ] = await Promise.all([
      // Provider counts by practice
      db(`practice_providers?practice_website_id=in.(${idList})&select=practice_website_id,roster_status`),
      // Delta events
      db(`nppes_delta_events?practice_website_id=in.(${idList})&select=practice_website_id,status`),
      // Payer snapshots (latest per NPI+payer)
      db(`payer_directory_snapshots?select=npi,payer_code,fhir_practitioner_id,snapshot_date&order=snapshot_date.desc`),
      // Open payer mismatches
      db(`payer_directory_mismatches?practice_website_id=in.(${idList})&status=eq.open&select=practice_website_id`),
      // Workflows
      db(`workflow_instances?practice_id=in.(${idList})&select=practice_id,status`),
      // Alerts
      db(`alerts?practice_id=in.(${idList})&select=practice_id,is_read`),
      // Claim tokens
      db(`preview_tokens?practice_website_id=in.(${idList})&is_claimed=eq.true&select=practice_website_id,claimed_at`),
    ]);

    // 3. Get provider-to-practice mapping for payer snapshot join
    const providerPracticeMap = new Map<string, string>();
    for (const pp of (providerCounts || [])) {
      // We need NPI here too — fetch separately
    }

    const providerNpis = await db(
      `practice_providers?practice_website_id=in.(${idList})&select=npi,practice_website_id`
    );
    for (const pp of (providerNpis || [])) {
      if (pp.npi) providerPracticeMap.set(pp.npi, pp.practice_website_id);
    }

    // 4. Aggregate per practice
    const results: PracticeHealth[] = practices.map((p: any) => {
      const pid = p.id;

      // Provider counts
      const pProviders = (providerCounts || []).filter((r: any) => r.practice_website_id === pid);
      const active = pProviders.filter((r: any) => r.roster_status === 'active' || r.roster_status === 'onboarding').length;
      const unverified = pProviders.filter((r: any) => r.roster_status === 'UNVERIFIED').length;
      const departed = pProviders.filter((r: any) => r.roster_status === 'DEPARTED' || r.roster_status === 'departing').length;

      // Deltas
      const pDeltas = (deltaEvents || []).filter((r: any) => r.practice_website_id === pid);
      const unresolvedDeltas = pDeltas.filter((r: any) => r.status !== 'resolved' && r.status !== 'confirmed').length;

      // Payer snapshots for this practice's providers
      const practiceNpis = (providerNpis || [])
        .filter((r: any) => r.practice_website_id === pid)
        .map((r: any) => r.npi);
      const pSnapshots = (payerSnapshots || []).filter((r: any) => practiceNpis.includes(r.npi));
      const listed = pSnapshots.filter((r: any) => r.fhir_practitioner_id != null).length;
      const notListed = pSnapshots.filter((r: any) => r.fhir_practitioner_id == null).length;
      const lastSync = pSnapshots.length > 0 ? pSnapshots[0]?.snapshot_date : null;

      // Payer mismatches
      const pMismatches = (payerMismatches || []).filter((r: any) => r.practice_website_id === pid);

      // Workflows
      const pWorkflows = (workflows || []).filter((r: any) => r.practice_id === pid);
      const wfAction = pWorkflows.filter((r: any) => r.status === 'action_needed').length;
      const wfResolved = pWorkflows.filter((r: any) => r.status === 'resolved').length;

      // Alerts
      const pAlerts = (alerts || []).filter((r: any) => r.practice_id === pid);
      const unreadAlerts = pAlerts.filter((r: any) => !r.is_read).length;

      // Claim status
      const claimed = (claimTokens || []).find((r: any) => r.practice_website_id === pid);

      // Determine overall status
      let status: PracticeHealth['status'] = 'pending';
      if (p.organization_id || claimed) {
        status = 'active';
      } else if (p.scan_status === 'error' || p.scan_status === 'unreachable') {
        status = 'error';
      } else if (!p.organization_id) {
        status = 'unclaimed';
      }

      const health: PracticeHealth = {
        id: pid,
        name: p.name,
        url: p.url,
        npi: p.npi,
        state: p.state,
        organization_id: p.organization_id,
        status,
        claimed_at: claimed?.claimed_at || null,
        scan_status: p.scan_status,
        last_scan_at: p.last_scan_at,
        scan_tier: p.scan_tier,
        consecutive_errors: p.consecutive_errors || 0,
        provider_count: p.provider_count || 0,
        mismatch_count: p.mismatch_count || 0,
        accepted_payers: p.accepted_payers,
        providers_total: pProviders.length,
        providers_active: active,
        providers_unverified: unverified,
        providers_departed: departed,
        delta_events_total: pDeltas.length,
        delta_events_unresolved: unresolvedDeltas,
        payer_snapshots_total: pSnapshots.length,
        payer_snapshots_listed: listed,
        payer_snapshots_not_listed: notListed,
        payer_mismatches_open: pMismatches.length,
        last_payer_sync_at: lastSync,
        workflows_total: pWorkflows.length,
        workflows_action_needed: wfAction,
        workflows_resolved: wfResolved,
        alerts_total: pAlerts.length,
        alerts_unread: unreadAlerts,
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
}
