import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import AuditTrailView from '@/components/dashboard/AuditTrailView';

export default async function AuditPage({ params }: { params: { id: string } }) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Fetch recent workflow events for this practice
  const { data: events } = await admin
    .from('workflow_events')
    .select('id, workflow_id, event_type, actor_type, actor_email, title, details, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  // Fetch workflow references for context
  const { data: workflows } = await admin
    .from('workflow_instances')
    .select('id, workflow_type, provider_name, provider_npi')
    .eq('practice_id', practiceId);

  const workflowMap = Object.fromEntries((workflows || []).map((w) => [w.id, w]));

  return <AuditTrailView events={events || []} workflowMap={workflowMap} practiceId={practiceId} />;
}
