/**
 * app/practice/[id]/workflows/page.tsx
 *
 * Workflows page — server component that fetches all workflows
 * for this practice and passes them to the WorkflowsView client component.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import WorkflowsView from '@/components/dashboard/WorkflowsView';

export default async function WorkflowsPage({
  params,
}: {
  params: { id: string };
}) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Fetch all workflows for this practice
  const { data: workflows } = await admin
    .from('workflow_instances')
    .select('id, workflow_type, status, provider_npi, provider_name, finding_summary, finding_details, priority, overdue_at, created_at')
    .eq('practice_id', practiceId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  // Get counts per status
  const { data: kpiData } = await admin
    .from('v_workflow_kpis')
    .select('*')
    .eq('practice_id', practiceId)
    .single();

  const allWorkflows = workflows || [];

  const counts = {
    all: allWorkflows.length,
    action_needed: kpiData?.action_needed_count || 0,
    in_progress: kpiData?.in_progress_count || 0,
    awaiting: kpiData?.awaiting_count || 0,
    resolved: kpiData?.resolved_count || 0,
  };

  return (
    <WorkflowsView
      workflows={allWorkflows}
      practiceId={practiceId}
      counts={counts}
    />
  );
}
