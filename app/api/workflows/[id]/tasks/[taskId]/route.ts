import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * PATCH /api/workflows/[id]/tasks/[taskId]
 * Update a workflow task (status, metadata, confirmation_data, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  const body = await request.json();
  const supabase = createAdminSupabaseClient();

  const allowedFields = [
    'status', 'metadata', 'completed_by', 'completed_at',
    'confirmation_source', 'confirmed_at', 'confirmation_data',
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('workflow_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('workflow_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also log an event
  if (body.status === 'completed') {
    await supabase.from('workflow_events').insert({
      workflow_id: id,
      event_type: 'task_completed',
      actor_type: 'user',
      title: `Task completed: ${data.title}`,
      details: { task_id: taskId, task_type: data.task_type },
    });
  }

  return NextResponse.json({ task: data });
}
