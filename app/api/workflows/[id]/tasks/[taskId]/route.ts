import { NextRequest, NextResponse } from 'next/server';
import { withAuth, API_ERRORS } from '@/lib/api/with-auth';
import type { AuthContext } from '@/lib/api/with-auth';
import { logTaskChange } from '@/lib/workflow';

/**
 * PATCH /api/workflows/[id]/tasks/[taskId]
 * Update a workflow task (status, metadata, confirmation_data, etc.)
 *
 * Secured with withAuth: requires authenticated user.
 * NOTE: Practice scoping is validated by looking up the task's associated workflow
 * and verifying the user has access to that practice. This is done via RLS on the task table.
 */
const PATCH_HANDLER = withAuth(
  async (
    request: NextRequest,
    ctx: AuthContext,
    { params }: { params: Promise<{ id: string; taskId: string }> }
  ) => {
    const { id, taskId } = await params;
    const body = await request.json();
    const supabase = ctx.supabase;

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
      return API_ERRORS.internal(error.message);
    }

    // Audit log: task status change (replaces inline insert)
    if (body.status && data) {
      const oldStatus = body._previous_status || 'active';
      await logTaskChange(
        supabase, id, taskId, data.title,
        oldStatus, body.status,
        { type: 'user' }
      );
    }

    return NextResponse.json({ task: data });
  }
);

export { PATCH_HANDLER as PATCH };
