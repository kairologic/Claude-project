/**
 * app/practice/[id]/page.tsx
 *
 * Dashboard home — server component that fetches provider-centric data
 * and passes it to the DashboardHome client component.
 *
 * v2: Provider-centric paradigm. KPIs count providers, not workflows.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { getAuthenticatedUser } from '@/lib/auth/auth-helpers';
import { colors } from '@/lib/design-tokens';
import { safeQuerySingle, safeQuery } from '@/lib/supabase/safe-query';
import DashboardHome from '@/components/dashboard/DashboardHome';

export default async function DashboardHomePage({ params }: { params: { id: string } }) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Get authenticated user for personalization
  const auth = await getAuthenticatedUser();
  // Derive display name: prefer metadata name, then capitalize email prefix
  const rawName = auth?.user?.user_metadata?.name || auth?.user?.email?.split('@')[0] || 'there';
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // Parallel query 1: practice name + KPI data (independent queries)
  const [practiceResult, kpiResult, topIssuesResult, credentialingResult, reviewMatchesResult] = await Promise.all([
    safeQuerySingle(
      admin.from('practice_websites').select('name, provider_count').eq('id', practiceId).single(),
      null,
    ),
    safeQuerySingle(
      admin
        .from('v_dashboard_kpis')
        .select('needs_attention, in_progress, monitoring_count, all_clear, total_providers')
        .eq('practice_website_id', practiceId)
        .maybeSingle(),
      null,
    ),
    safeQuery(
      admin
        .from('v_provider_health')
        .select('*')
        .eq('practice_website_id', practiceId)
        .gt('open_issues', 0)
        .order('open_issues', { ascending: false })
        .limit(5),
      [],
    ),
    safeQuery(
      admin
        .from('v_provider_health')
        .select('*')
        .eq('practice_website_id', practiceId)
        .in('roster_status', ['onboarding', 'departing']),
      [],
    ),
    // 5. Review matches: providers with low confidence scores needing manual review
    safeQuery(
      admin
        .from('practice_providers')
        .select('npi, provider_name, confidence_score, confidence_tier, confidence_scored_at')
        .eq('practice_website_id', practiceId)
        .not('confidence_tier', 'is', null)
        .in('confidence_tier', ['review', 'unverified'])
        .order('confidence_score', { ascending: true })
        .limit(20),
      [],
    ),
  ]);

  interface PracticeRecord {
    name: string;
    provider_count: number;
  }
  interface KpiRecord {
    needs_attention: number;
    in_progress: number;
    monitoring_count: number;
    all_clear: number;
    total_providers: number;
  }

  const practice = practiceResult.data as PracticeRecord | null;
  const kpiData = kpiResult.data as KpiRecord | null;
  // v_provider_health returns all fields expected by DashboardHome's ProviderHealth interface
  const topIssues = topIssuesResult.data || [];
  const credentialingProviders = credentialingResult.data || [];
  const reviewMatches = (reviewMatchesResult.data || []).map((r: any) => ({
    npi: r.npi,
    provider_name: r.provider_name,
    confidence_score: parseFloat(r.confidence_score) || 0,
    confidence_tier: r.confidence_tier as 'review' | 'unverified',
  }));

  // Merge: credentialing providers first, then top issues (deduplicated)
  const seen = new Set<string>();
  const priorityProviders: typeof topIssues = [];
  for (const p of credentialingProviders) {
    if (!seen.has(p.npi)) {
      priorityProviders.push(p);
      seen.add(p.npi);
    }
  }
  for (const p of topIssues) {
    if (!seen.has(p.npi)) {
      priorityProviders.push(p);
      seen.add(p.npi);
    }
  }

  // 3. Unseen alert count for this user
  let unseenAlertCount = 0;
  if (auth?.user) {
    const [allAlertsResult, readAlertsResult] = await Promise.all([
      safeQuery(
        admin.from('alerts').select('id').eq('practice_id', practiceId).eq('is_active', true),
        [],
      ),
      safeQuery(admin.from('user_alert_reads').select('alert_id').eq('user_id', auth.user.id), []),
    ]);

    const readIds = new Set((readAlertsResult.data || []).map((r) => r.alert_id));
    unseenAlertCount = (allAlertsResult.data || []).filter((a) => !readIds.has(a.id)).length;
  }

  // 4. Payer sync status — aggregate from provider-level payer_directory_snapshots
  //    Shows which payers have directory listings for this practice's providers,
  //    with provider counts and last sync dates.
  const payerSnapshotResult = await safeQuery(
    admin.rpc('get_practice_payer_sync_status', { p_practice_id: practiceId }),
    [],
  );

  // Fallback: if the RPC doesn't exist yet, query directly
  let payerSyncRows = payerSnapshotResult.data || [];
  if (payerSnapshotResult.error || payerSyncRows.length === 0) {
    // Direct aggregation query via raw join
    const directResult = await safeQuery(
      admin
        .from('payer_directory_snapshots')
        .select('payer_code, npi, snapshot_date')
        .in(
          'npi',
          (
            await safeQuery(
              admin
                .from('practice_providers')
                .select('npi')
                .eq('practice_website_id', practiceId),
              [],
            )
          ).data?.map((p: any) => p.npi) || [],
        ),
      [],
    );

    // Aggregate by payer_code
    const payerMap = new Map<
      string,
      { provider_count: number; latest_snapshot: string; npis: Set<string> }
    >();
    for (const row of directResult.data || []) {
      const entry = payerMap.get(row.payer_code) || {
        provider_count: 0,
        latest_snapshot: '',
        npis: new Set<string>(),
      };
      if (!entry.npis.has(row.npi)) {
        entry.npis.add(row.npi);
        entry.provider_count = entry.npis.size;
      }
      if (row.snapshot_date > entry.latest_snapshot) entry.latest_snapshot = row.snapshot_date;
      payerMap.set(row.payer_code, entry);
    }
    payerSyncRows = Array.from(payerMap.entries()).map(([code, data]) => ({
      payer_code: code,
      provider_count: data.provider_count,
      latest_snapshot: data.latest_snapshot,
    }));
  }

  const getRelativeTime = (dateString: string): string => {
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 14) return '1 week ago';
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} month(s) ago`;
  };

  // Friendly payer display names
  const PAYER_DISPLAY_NAMES: Record<string, string> = {
    aetna: 'Aetna',
    bcbs: 'BCBS',
    bcbs_tx: 'BCBS TX',
    bcbs_ca: 'BCBS CA',
    cigna: 'Cigna',
    curative: 'Curative',
    humana: 'Humana',
    medicare: 'Medicare',
    tricare: 'TRICARE',
    uhc: 'UnitedHealthcare',
  };

  const totalProviders = kpiData?.total_providers || practice?.provider_count || 0;

  const payers = payerSyncRows.map((row: any) => {
    const listed = row.provider_count || 0;
    const synced = listed >= totalProviders;
    const partial = listed > 0 && listed < totalProviders;
    return {
      payer: PAYER_DISPLAY_NAMES[row.payer_code] || row.payer_code,
      status: synced
        ? `All listed · ${getRelativeTime(row.latest_snapshot)}`
        : partial
          ? `${listed}/${totalProviders} listed · ${getRelativeTime(row.latest_snapshot)}`
          : 'Not listed',
      color: synced ? colors.green : partial ? colors.gold : colors.red,
    };
  });

  const kpis = {
    needs_attention: kpiData?.needs_attention || 0,
    in_progress: kpiData?.in_progress || 0,
    monitoring: kpiData?.monitoring_count || 0,
    all_clear: kpiData?.all_clear || 0,
    total_providers: kpiData?.total_providers || 0,
    unseen_alert_count: unseenAlertCount,
  };

  return (
    <DashboardHome
      kpis={kpis}
      priorityProviders={priorityProviders || []}
      payers={payers}
      practiceId={practiceId}
      practiceName={practice?.name || 'Practice'}
      userName={userName}
      reviewMatches={reviewMatches}
    />
  );
}
