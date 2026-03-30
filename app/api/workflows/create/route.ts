/**
 * POST /api/workflows/create
 *
 * Generic workflow creation endpoint.
 * Accepts a workflow type, provider context, and finding details,
 * then creates the workflow instance + tasks from the template.
 *
 * Secured with withPracticeAccess (editor role): requires authenticated user
 * with editor or admin access to the practice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPracticeAccess, API_ERRORS } from '@/lib/api/with-auth';
import type { PracticeContext } from '@/lib/api/with-auth';
import { getTaskTemplates } from '@/lib/workflow/workflow-templates';
import { logWorkflowEvent } from '@/lib/workflow/audit-logger';
import type { WorkflowType, TaskStatus, FindingDetails, TaskMetadata } from '@/lib/types/dashboard-schema';

interface CreateWorkflowBody {
  workflow_type: WorkflowType;
  provider_npi?: string;
  provider_name?: string;
  priority?: number;
  finding_summary?: string;
  finding_details?: FindingDetails;
  trigger_source?: string;
  trigger_ref_id?: string;
  trigger_ref_table?: string;
  target_days?: number;       // Days until target completion (default: 21)
  overdue_days?: number;      // Days until overdue (default: 14)
  /** Optional metadata to inject into specific tasks by task_type */
  task_metadata?: Record<string, TaskMetadata>;
}

const VALID_WORKFLOW_TYPES: WorkflowType[] = [
  'nppes_update',
  'payer_directory',
  'onboarding',
  'release',
  'license_renewal',
  'compliance',
];

const POST_HANDLER = withPracticeAccess(
  async (req: NextRequest, ctx: PracticeContext) => {
    try {
      const body: CreateWorkflowBody = await req.json();
      const practice_id = ctx.practiceId;

      // ── Validate required fields ──────────────────────────────
      if (!body.workflow_type || !VALID_WORKFLOW_TYPES.includes(body.workflow_type)) {
        return API_ERRORS.badRequest(
          `workflow_type must be one of: ${VALID_WORKFLOW_TYPES.join(', ')}`
        );
      }

      // ── Get task templates for this workflow type ──────────────
      const templates = getTaskTemplates(body.workflow_type);
      if (templates.length === 0) {
        return API_ERRORS.badRequest(
          `No task templates defined for workflow type: ${body.workflow_type}`
        );
      }

      const supabase = ctx.supabase;
    const now = new Date();
    const targetDays = body.target_days ?? 21;
    const overdueDays = body.overdue_days ?? 14;

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + targetDays);
    const overdueDate = new Date(now);
    overdueDate.setDate(overdueDate.getDate() + overdueDays);

    // ── Create workflow instance ──────────────────────────────
    const { data: workflow, error: wfError } = await supabase
      .from('workflow_instances')
      .insert({
        practice_id: practice_id,
        workflow_type: body.workflow_type,
        status: 'action_needed',
        priority: body.priority ?? 2,
        provider_npi: body.provider_npi || null,
        provider_name: body.provider_name || null,
        trigger_source: body.trigger_source || 'manual',
        trigger_ref_id: body.trigger_ref_id || null,
        trigger_ref_table: body.trigger_ref_table || null,
        finding_summary: body.finding_summary || null,
        finding_details: body.finding_details || {},
        target_completion: targetDate.toISOString().split('T')[0],
        overdue_at: overdueDate.toISOString().split('T')[0],
      })
      .select('id, practice_id, workflow_type, status, provider_name, finding_summary')
      .single();

      if (wfError || !workflow) {
        console.error('Failed to create workflow:', wfError?.message);
        return API_ERRORS.internal(wfError?.message || 'Failed to create workflow');
      }

      // ── Create tasks from template ────────────────────────────
      const taskRows = templates.map((t) => {
      const extraMeta = body.task_metadata?.[t.task_type] || {};
      const metadata: TaskMetadata = {
        ...extraMeta,
        ...(t.group ? { group: t.group } : {}),
      };

      // For payer finding review, inject comparison data from finding_details
      if (t.task_type === 'review_payer_finding' && body.finding_details) {
        metadata.comparison_data = {
          field: body.finding_details.field || '',
          sources: [
            { source: 'Website', value: body.finding_details.website_value || '' },
            { source: 'NPPES', value: body.finding_details.nppes_value || '' },
            ...(body.finding_details.payer_name && body.finding_details.payer_value
              ? [{ source: body.finding_details.payer_name, value: body.finding_details.payer_value }]
              : []),
          ],
        };
      }

      // For monitor/confirm tasks, set default schedule
      if (
        t.task_type === 'confirm_payer' ||
        t.task_type === 'monitor_credentialing' ||
        t.task_type === 'monitor_removal' ||
        t.task_type === 'rescan_confirm'
      ) {
        metadata.check_schedule = 'weekly';
        metadata.check_day = 'monday';
        metadata.check_time_utc = '06:00';
      }

        return {
          workflow_id: workflow.id,
          task_order: t.task_order,
          task_type: t.task_type,
          title: t.title,
          description: t.description,
          status: (t.task_order === 1 ? 'active' : 'pending') as TaskStatus,
          metadata,
        };
      });

      const { error: taskError } = await supabase
        .from('workflow_tasks')
        .insert(taskRows);

      if (taskError) {
        console.error('Failed to create tasks:', taskError.message);
        // Workflow was created but tasks failed — still return the workflow
        return NextResponse.json(
          { workflow, tasks_created: 0, error: `Workflow created but tasks failed: ${taskError.message}` },
          { status: 207 }
        );
      }

      // ── Log creation event ────────────────────────────────────
      await logWorkflowEvent(supabase, {
        workflow_id: workflow.id,
        event_type: 'workflow_created',
        actor_type: 'system',
        title: `${workflow.finding_summary || workflow.workflow_type} — workflow created`,
        details: {
          workflow_type: workflow.workflow_type,
          provider_name: workflow.provider_name,
          trigger_source: body.trigger_source || 'manual',
          tasks_created: taskRows.length,
        },
      });

      // ── Create alert ──────────────────────────────────────────
      await supabase.from('alerts').insert({
        practice_id: practice_id,
        severity: 'action',
        title: `${workflow.provider_name || 'Provider'}: ${workflow.finding_summary || 'New workflow'}`,
        description: `A new ${body.workflow_type.replace(/_/g, ' ')} workflow has been created and needs attention.`,
        workflow_id: workflow.id,
        provider_npi: body.provider_npi || null,
        provider_name: body.provider_name || null,
        source: body.trigger_source || 'manual',
        is_active: true,
      });

      return NextResponse.json(
        {
          workflow,
          tasks_created: taskRows.length,
        },
        { status: 201 }
      );
    } catch (err) {
      console.error('POST /api/workflows/create error:', err);
      return API_ERRORS.internal(err instanceof Error ? err.message : 'Internal server error');
    }
  },
  { requiredRole: 'editor' }
);

export { POST_HANDLER as POST };
