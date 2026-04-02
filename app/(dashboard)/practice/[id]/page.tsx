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
  const [
    practiceResult,
    kpiResult,
    topIssuesResult,
    credentialingResult,
    complianceResult,
    payerSnapshotsResult,
  ] = await Promise.all([
    safeQuerySingle(
      admin
        .from('practice_websites')
        .select('name, provider_count, practice_group_id')
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
    // compliance_findings query placeholder — resolved after practice record is available
    Promise.resolve({ data: [], error: null }),
    // Payer sync: fetch via payer_directory_mismatches (has practice_website_id)
    safeQuery(
      admin
        .from('payer_directory_mismatches')
        .select('payer_code, status, last_detected_at, mismatch_type')
        .eq('practice_website_id', practiceId)
        .eq('npi', 'PRACTICE')
        .order('payer_code'),
      [],
    ),
  ]);

  interface PracticeRecord {
    name: string;
    provider_count: number;
    practice_group_id: string | null;
  }
  interface KpiRecord {
    needs_attention: number;
    in_progress: number;
    monitoring_count: number;
    all_clear: number;
    total_providers: number;
  }

  interface PayerMismatchRow {
    payer_code: string;
    status: string;
    last_detected_at: string | null;
    mismatch_type: string;
  }

  const practice = practiceResult.data as PracticeRecord | null;
  const kpiData = kpiResult.data as KpiRecord | null;
  // v_provider_health returns all fields expected by DashboardHome's ProviderHealth interface
  const topIssues = topIssuesResult.data || [];
  const credentialingProviders = credentialingResult.data || [];
  const payerMismatches = payerSnapshotsResult.data as PayerMismatchRow[] | null;

  // Resolve compliance findings via practice_group_id (FK from practice_websites → practice_groups)
  // Fallback: if practice_group_id is null, try practiceId directly (self-referencing case)
  const practiceGroupId = practice?.practice_group_id || practiceId;
  const cfResult = await safeQuery(
    admin
      .from('compliance_findings')
      .select('check_id, category, severity, status, title, score')
      .eq('practice_group_id', practiceGroupId)
      .eq('is_domain_level', true)
      .order('created_at', { ascending: true }),
    [],
  );
  const complianceFindings: any[] = cfResult.data || [];

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

  // 4. Payer sync status from payer_directory_snapshots
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
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

  const payers = (payerMismatches || []).map((m) => ({
    payer: m.payer_code,
    status: getPayerStatusText(m.status, m.last_detected_at),
    color: getPayerColor(m.status),
  }));

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
    ai_05_ehr_vendor: 'AI-05 (EHR vendor AI detection)',
    ab_3030_ca_ai_disclosure: 'AB 3030 (CA AI disclosure)',
  };

  // Build compliance checks dynamically from findings, with "Not scanned" as default
  const allCheckIds = [
    'sb_1188_data_sovereignty',
    'hb_149_ai_transparency',
    'ai_05_ehr_vendor',
    'ab_3030_ca_ai_disclosure',
  ];
  const findingsByCheckId = new Map(complianceFindings.map((f: any) => [f.check_id, f]));

  const complianceChecks = allCheckIds.map((checkId) => {
    const finding = findingsByCheckId.get(checkId);

    if (finding) {
      return {
        check_id: checkId,
        label: complianceLabelMap[checkId] || checkId,
        value: complianceStatusMap[finding.status] || finding.status,
        status: finding.status,
      };
    }

    // No finding for this check: show "Not scanned"
    return {
      check_id: checkId,
      label: complianceLabelMap[checkId] || checkId,
      value: 'Not scanned',
      status: 'not_scanned',
    };
  });

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
