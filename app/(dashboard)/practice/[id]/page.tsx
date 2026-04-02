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

  // Parallel query 1: practice name + KPI data + compliance (independent queries)
  const [practiceResult, kpiResult, topIssuesResult, credentialingResult, complianceResult] =
    await Promise.all([
      safeQuerySingle(
        admin
          .from('practice_websites')
          .select('name, provider_count')
          .eq('id', practiceId)
          .single(),
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
      safeQuery(
        admin
          .from('compliance_findings')
          .select('check_id, category, severity, status, title, score')
          .eq('practice_group_id', practiceId)
          .eq('is_domain_level', true)
          .order('created_at', { ascending: true }),
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
  const complianceFindings = complianceResult.data || [];

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

  // 4. Payer sync status (static for now, will be from payer_directory_snapshots later)
  const payers = [
    { payer: 'UnitedHealthcare', status: '2 days ago', color: colors.green },
    { payer: 'Aetna', status: '2 days ago', color: colors.green },
    { payer: 'Cigna', status: '2 days ago', color: colors.green },
    { payer: 'Humana', status: '9 days ago', color: colors.gold },
    { payer: 'BCBS TX', status: 'Pending credentials', color: colors.gray400 },
  ];

  // Build compliance checks from findings
  const complianceStatusMap: Record<string, string> = {
    open: 'Action needed',
    remediated: 'Compliant',
    accepted_risk: 'Accepted risk',
    false_positive: 'N/A',
  };

  const complianceLabelMap: Record<string, string> = {
    sb_1188_data_sovereignty: 'SB 1188 (Data sovereignty)',
    hb_149_ai_transparency: 'HB 149 (AI transparency)',
    ab_3030_ca_ai_disclosure: 'AB 3030 (CA AI disclosure)',
  };

  const complianceChecks = [
    {
      check_id: 'sb_1188_data_sovereignty',
      label: 'SB 1188 (Data sovereignty)',
      value: 'Pending',
      status: 'pending',
    },
    {
      check_id: 'hb_149_ai_transparency',
      label: 'HB 149 (AI transparency)',
      value: 'Pending',
      status: 'pending',
    },
    {
      check_id: 'ab_3030_ca_ai_disclosure',
      label: 'AB 3030 (CA AI disclosure)',
      value: 'N/A',
      status: 'false_positive',
    },
  ];

  // Override with actual findings
  for (const finding of complianceFindings) {
    const idx = complianceChecks.findIndex((c) => c.check_id === finding.check_id);
    if (idx >= 0) {
      complianceChecks[idx].value = complianceStatusMap[finding.status] || finding.status;
      complianceChecks[idx].status = finding.status;
    }
  }

  // Calculate overall compliance score
  const scoredFindings = complianceFindings.filter(
    (f: any) => f.score !== null && f.status !== 'false_positive',
  );
  const complianceScore =
    scoredFindings.length > 0
      ? Math.round(
          scoredFindings.reduce((sum: number, f: any) => sum + (f.score || 0), 0) /
            scoredFindings.length,
        )
      : null;

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
      complianceChecks={complianceChecks}
      complianceScore={complianceScore}
    />
  );
}
