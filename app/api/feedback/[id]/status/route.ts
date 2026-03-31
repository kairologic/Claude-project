import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

/**
 * PATCH /api/feedback/[id]/status
 * Update the status of a feedback item.
 * Auto-inserts a system comment when status changes.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, changed_by } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get current status first
    const { data: current, error: fetchErr } = await supabase
      .from('feedback')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Feedback item not found' }, { status: 404 });
    }

    if (current.status === status) {
      return NextResponse.json({ message: 'Status unchanged', status: current.status });
    }

    // Update the status
    const { data, error } = await supabase
      .from('feedback')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Status] Update error:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    // Auto-insert system comment about status change
    const statusLabels: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };

    await supabase.from('feedback_comments').insert({
      feedback_id: id,
      author: changed_by || 'System',
      author_role: 'system',
      message: `Status changed from ${statusLabels[current.status] || current.status} to ${statusLabels[status] || status}`,
    });

    return NextResponse.json({ feedback: data });
  } catch (err) {
    console.error('[Status] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/feedback/[id]/status
 * Get the current status of a feedback item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('feedback')
      .select('id, status, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Feedback item not found' }, { status: 404 });
    }

    return NextResponse.json({ id: data.id, status: data.status, updated_at: data.updated_at });
  } catch (err) {
    console.error('[Status] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
