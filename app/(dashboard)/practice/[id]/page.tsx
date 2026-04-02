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
  const [practiceResult, kpiResult, topIssuesResult, credentialingResult] = await Promise.all([
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

  // 4. Payer sync status from payer_directory_mismatches (PRACTICE-level acceptance gaps)
  const payerMismatchResult = await safeQuery(
    admin
      .from('payer_directory_mismatches')
      .select('payer_code, status, last_detected_at, mismatch_type')
      .eq('practice_website_id', practiceId)
      .eq('npi', 'PRACTICE')
      .order('payer_code'),
    [],
  );

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

  const getPayerColor = (status: string): string => {
    if (status === 'open') return colors.red;
    if (status === 'resolved') return colors.green;
    if (status === 'accepted_risk') return colors.gold;
    return colors.gray400;
  };

  const getPayerStatusText = (status: string, lastDetected: string | null): string => {
    if (status === 'open')
      return lastDetected ? `Not listed · ${getRelativeTime(lastDetected)}` : 'Not listed';
    if (status === 'resolved') return 'Listed';
    if (status === 'accepted_risk') return 'Accepted risk';
    return 'Pending';
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

  const payers = (payerMismatchResult.data || []).map((m: any) => ({
    payer: PAYER_DISPLAY_NAMES[m.payer_code] || m.payer_code,
    status: getPayerStatusText(m.status, m.last_detected_at),
    color: getPayerColor(m.status),
  }));

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
    />
  );
}
