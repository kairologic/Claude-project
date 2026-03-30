/**
 * app/practice/[id]/workflows/page.tsx
 *
 * Workflows page — server component that fetches all workflows
 * for this practice and passes them to the WorkflowsView client component.
 *
 * Optimization: 90-day retention filter on resolved/cancelled workflows.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { safeQuery, safeQuerySingle } from '@/lib/supabase/safe-query';
import WorkflowsView from '@/components/dashboard/WorkflowsView';

export default async function WorkflowsPage({
  params,
}: {
  params: { id: string };
}) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Parallel queries: workflows + KPI data
  const [workflowsResult, kpiResult] = await Promise.all([
    safeQuery(
      admin
        .from('workflow_instances')
        .select('id, workflow_type, status, provider_npi, provider_name, finding_summary, finding_details, priority, overdue_at, created_at')
        .eq('practice_id', practiceId)
        .or(`status.not.in.(resolved,cancelled),updated_at.gt.${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false }),
      []
    ),
    safeQuerySingle(
      admin
        .from('v_workflow_kpis')
        .select('action_needed_count, in_progress_count, awaiting_count, resolved_count')
        .eq('practice_id', practiceId)
        .single(),
      null
    ),
  ]);

  interface WorkflowRow {
    id: string;
    workflow_type: string;
    status: string;
    provider_npi: string | null;
    provider_name: string | null;
    finding_summary: string | null;
    finding_details: Record<string, unknown> | null;
    priority: number;
    overdue_at: string | null;
    created_at: string;
  }
  interface WorkflowKpiRow {
    action_needed_count: number;
    in_progress_count: number;
    awaiting_count: number;
    resolved_count: number;
  }

  const allWorkflows = (workflowsResult.data || []) as WorkflowRow[];
  const kpiData = kpiResult.data as WorkflowKpiRow | null;

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
