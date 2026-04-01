import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseHeaders = {
  'apikey': SUPABASE_ANON,
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
};

const VALID_STATUSES = ['new', 'reviewed', 'in_progress', 'resolved', 'closed'] as const;
type FeedbackStatus = typeof VALID_STATUSES[number];

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

/**
 * PATCH /api/feedback/[id]/status
 * Update the status of a feedback item and auto-insert a system comment.
 * Body: { status: FeedbackStatus }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status as FeedbackStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  // Update the feedback status
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/feedback?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    }
  );

  if (!updateRes.ok) {
    const text = await updateRes.text();
    console.error(`[Status] PATCH failed (${updateRes.status}): ${text}`);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }

  const rows = await updateRes.json();
  const updated = Array.isArray(rows) ? rows[0] : rows;

  // Auto-insert a system comment to record the status change
  const label = STATUS_LABELS[status as FeedbackStatus];
  const commentRes = await fetch(`${SUPABASE_URL}/rest/v1/feedback_comments`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify({
      feedback_id: id,
      author: 'System',
      author_role: 'admin',
      message: `Status changed to ${label}`,
    }),
  });

  if (!commentRes.ok) {
    // Non-fatal — status was updated successfully
    console.error(`[Status] System comment insert failed (${commentRes.status})`);
  }

  return NextResponse.json({ success: true, feedback: updated });
}
