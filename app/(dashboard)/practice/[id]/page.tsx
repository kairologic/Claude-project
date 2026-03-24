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
import DashboardHome from '@/components/dashboard/DashboardHome';

export default async function DashboardHomePage({
  params,
}: {
  params: { id: string };
}) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Get authenticated user for personalization
  const auth = await getAuthenticatedUser();
  // Derive display name: prefer metadata name, then capitalize email prefix
  const rawName = auth?.user?.user_metadata?.name
    || auth?.user?.email?.split('@')[0]
    || 'there';
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // Get practice name
  const { data: practice } = await admin
    .from('practice_websites')
    .select('name, provider_count')
    .eq('id', practiceId)
    .single();

  // 1. Provider-centric KPIs from v_dashboard_kpis view
  const { data: kpiData } = await admin
    .from('v_dashboard_kpis')
    .select('*')
    .eq('practice_website_id', practiceId)
    .maybeSingle();

  // 2. Priority providers: top 5 by open issues + any credentialing/onboarding providers
  const { data: topIssues } = await admin
    .from('v_provider_health')
    .select('*')
    .eq('practice_website_id', practiceId)
    .gt('open_issues', 0)
    .order('open_issues', { ascending: false })
    .limit(5);

  // Also fetch providers being credentialed/onboarded (may not be in top 5 by issues)
  const { data: credentialingProviders } = await admin
    .from('v_provider_health')
    .select('*')
    .eq('practice_website_id', practiceId)
    .in('roster_status', ['onboarding', 'departing']);

  // Merge: credentialing providers first, then top issues (deduplicated)
  const seen = new Set<string>();
  const priorityProviders: any[] = [];
  for (const p of (credentialingProviders || [])) {
    if (!seen.has(p.npi)) { priorityProviders.push(p); seen.add(p.npi); }
  }
  for (const p of (topIssues || [])) {
    if (!seen.has(p.npi)) { priorityProviders.push(p); seen.add(p.npi); }
  }

  // 3. Unseen alert count for this user
  let unseenAlertCount = 0;
  if (auth?.user) {
    const { data: allAlerts } = await admin
      .from('alerts')
      .select('id')
      .eq('practice_id', practiceId)
      .eq('is_active', true);

    const { data: readAlerts } = await admin
      .from('user_alert_reads')
      .select('alert_id')
      .eq('user_id', auth.user.id);

    const readIds = new Set((readAlerts || []).map(r => r.alert_id));
    unseenAlertCount = (allAlerts || []).filter(a => !readIds.has(a.id)).length;
  }

  // 4. Payer sync status (static for now, will be from payer_directory_snapshots later)
  const payers = [
    { payer: 'UnitedHealthcare', status: '2 days ago', color: colors.green },
    { payer: 'Aetna', status: '2 days ago', color: colors.green },
    { payer: 'Cigna', status: '2 days ago', color: colors.green },
    { payer: 'Humana', status: '9 days ago', color: colors.gold },
    { payer: 'BCBS TX', status: 'Pending credentials', color: colors.gray400 },
  ];

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
