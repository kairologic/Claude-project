import { NextRequest, NextResponse } from 'next/server';
import { withAuth, API_ERRORS } from '@/lib/api/with-auth';
import type { AuthContext } from '@/lib/api/with-auth';
import { canTransitionWorkflow, logStatusChange, logApproval } from '@/lib/workflow';
import type { WorkflowStatus } from '@/lib/workflow';

/**
 * GET /api/workflows/[id]
 * Returns workflow instance + tasks + events for the detail panel.
 *
 * Secured with withAuth: requires authenticated user.
 * NOTE: Practice scoping is validated by looking up the workflow's practice_id
 * and ensuring the user has access to that practice. This is done via RLS on the workflow table.
 */
const GET_HANDLER = withAuth(
  async (
    _request: NextRequest,
    ctx: AuthContext,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const supabase = ctx.supabase;

  const [workflowRes, tasksRes, eventsRes] = await Promise.all([
    supabase
      .from('workflow_instances')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('workflow_tasks')
      .select('*')
      .eq('workflow_id', id)
      .order('task_order', { ascending: true }),
    supabase
      .from('workflow_events')
      .select('*')
      .eq('workflow_id', id)
      .order('created_at', { ascending: true }),
  ]);

    if (workflowRes.error) {
      return API_ERRORS.notFound('Workflow');
    }

    return NextResponse.json({
      workflow: workflowRes.data,
      tasks: tasksRes.data || [],
      events: eventsRes.data || [],
    });
  }
);

/**
 * PATCH /api/workflows/[id]
 * Update workflow instance fields (status, approved_value, etc.)
 *
 * Secured with withAuth: requires authenticated user.
 * NOTE: Practice scoping is validated by looking up the workflow's practice_id
 * and ensuring the user has access to that practice. This is done via RLS on the workflow table.
 */
const PATCH_HANDLER = withAuth(
  async (
    request: NextRequest,
    ctx: AuthContext,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();
    const supabase = ctx.supabase;

    // Load current workflow for transition validation
    const { data: current } = await supabase
      .from('workflow_instances')
      .select('status')
      .eq('id', id)
      .single();

    const oldStatus = current?.status as WorkflowStatus | undefined;

    // Validate status transition if status is changing
    if (body.status && oldStatus && body.status !== oldStatus) {
      const transition = canTransitionWorkflow(
        oldStatus,
        body.status as WorkflowStatus
      );
      if (!transition.allowed) {
        return API_ERRORS.badRequest(transition.reason || 'Invalid status transition', { code: 'INVALID_TRANSITION' });
      }
    }

    const allowedFields = [
      'status', 'approved_value', 'approved_by', 'approved_at',
      'completed_at', 'completed_reason',
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from('workflow_instances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return API_ERRORS.internal(error.message);
    }

    // Audit logging
    if (body.status && oldStatus && body.status !== oldStatus) {
      await logStatusChange(supabase, id, oldStatus, body.status, { type: 'user' });
    }
    if (body.approved_value) {
      await logApproval(supabase, id, body.approved_value, { type: 'user' });
    }

    return NextResponse.json({ workflow: data });
  }
);

export { GET_HANDLER as GET, PATCH_HANDLER as PATCH };
