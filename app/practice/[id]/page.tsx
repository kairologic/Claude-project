/**
 * app/practice/[id]/page.tsx
 *
 * Dashboard home — server component that fetches real data
 * and passes it to the DashboardHome client component.
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
  const userName = auth?.user?.user_metadata?.name
    || auth?.user?.email?.split('@')[0]
    || 'there';

  // Get practice name
  const { data: practice } = await admin
    .from('practice_websites')
    .select('name, provider_count')
    .eq('id', practiceId)
    .single();

  // 1. KPIs from view
  const { data: kpiData } = await admin
    .from('v_workflow_kpis')
    .select('*')
    .eq('practice_id', practiceId)
    .single();

  // 2. Unseen alert count for this user
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

  // 3. Top workflows (non-resolved, sorted by priority then date)
  const { data: workflows } = await admin
    .from('workflow_instances')
    .select('id, workflow_type, status, provider_npi, provider_name, finding_summary, finding_details, priority, overdue_at, created_at')
    .eq('practice_id', practiceId)
    .neq('status', 'resolved')
    .neq('status', 'cancelled')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  // 4. Recent alerts
  const { data: alertsRaw } = await admin
    .from('alerts')
    .select('id, severity, title, description, provider_name, created_at')
    .eq('practice_id', practiceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3);

  // Mark seen/unseen
  let readAlertIds = new Set<string>();
  if (auth?.user) {
    const { data: reads } = await admin
      .from('user_alert_reads')
      .select('alert_id')
      .eq('user_id', auth.user.id);
    readAlertIds = new Set((reads || []).map(r => r.alert_id));
  }

  const alerts = (alertsRaw || []).map(a => ({
    ...a,
    is_seen: readAlertIds.has(a.id),
  }));

  // 5. Payer sync status (static for now, will be from payer_directory_snapshots later)
  const payers = [
    { payer: 'UnitedHealthcare', status: 'Pending', color: colors.blue },
    { payer: 'Aetna', status: 'Pending', color: colors.blue },
    { payer: 'Cigna', status: 'Pending', color: colors.blue },
    { payer: 'Humana', status: 'Pending', color: colors.blue },
    { payer: 'BCBS TX', status: 'Not connected', color: colors.gray400 },
  ];

  const kpis = {
    action_needed_count: kpiData?.action_needed_count || 0,
    in_progress_count: kpiData?.in_progress_count || 0,
    awaiting_count: kpiData?.awaiting_count || 0,
    resolved_count: kpiData?.resolved_count || 0,
    unseen_alert_count: unseenAlertCount,
  };

  return (
    <DashboardHome
      kpis={kpis}
      workflows={workflows || []}
      alerts={alerts}
      payers={payers}
      practiceId={practiceId}
      practiceName={practice?.name || 'Practice'}
      userName={userName}
    />
  );
}
