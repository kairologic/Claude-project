/**
 * app/practice/[id]/alerts/page.tsx
 *
 * Alerts page — server component that fetches all active alerts
 * with per-user seen state.
 */

import { createAdminSupabaseClient, getAuthenticatedUser } from '@/lib/auth/auth-helpers';
import { safeQuery } from '@/lib/supabase/safe-query';
import AlertsView from '@/components/dashboard/AlertsView';

export default async function AlertsPage({ params }: { params: { id: string } }) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();
  const auth = await getAuthenticatedUser();
  const userId = auth?.user?.id || '';

  // Fetch all active alerts for this practice
  const alertsResult = await safeQuery(
    admin
      .from('alerts')
      .select('id, severity, title, description, provider_name, provider_npi, workflow_id, created_at')
      .eq('practice_id', practiceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    [],
  );

  const alertsRaw = alertsResult.data;

  // Fetch user's read state (if user exists)
  let readAlertIds = new Set<string>();
  if (userId) {
    const readsResult = await safeQuery(
      admin.from('user_alert_reads').select('alert_id').eq('user_id', userId),
      [],
    );
    readAlertIds = new Set((readsResult.data || []).map((r) => r.alert_id));
  }

  const alerts = (alertsRaw || []).map((a) => ({
    ...a,
    is_seen: readAlertIds.has(a.id),
  }));

  return <AlertsView alerts={alerts} practiceId={practiceId} userId={userId} />;
}
