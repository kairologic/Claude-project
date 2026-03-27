import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { canTransitionWorkflow, logStatusChange, logApproval } from '@/lib/workflow';
import type { WorkflowStatus } from '@/lib/workflow';

/**
 * GET /api/workflows/[id]
 * Returns workflow instance + tasks + events for the detail panel.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminSupabaseClient();

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
    return NextResponse.json(
      { error: workflowRes.error.message },
      { status: workflowRes.error.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({
    workflow: workflowRes.data,
    tasks: tasksRes.data || [],
    events: eventsRes.data || [],
  });
}

/**
 * PATCH /api/workflows/[id]
 * Update workflow instance fields (status, approved_value, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminSupabaseClient();

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
      return NextResponse.json(
        { error: transition.reason },
        { status: 422 }
      );
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
