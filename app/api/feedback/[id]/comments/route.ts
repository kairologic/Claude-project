import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseHeaders = {
  'apikey': SUPABASE_ANON,
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
};

/**
 * GET /api/feedback/[id]/comments
 * Fetch all comments for a feedback item, ordered by created_at asc.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/feedback_comments?feedback_id=eq.${id}&order=created_at.asc`,
    { headers: supabaseHeaders }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Comments] GET failed (${res.status}): ${text}`);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }

  const comments = await res.json();
  return NextResponse.json(comments);
}

/**
 * POST /api/feedback/[id]/comments
 * Add a new comment to a feedback item.
 * Body: { author: string, author_role: 'practice' | 'admin', message: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  let body: { author?: string; author_role?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { author, author_role, message } = body;

  if (!author || !author_role || !message) {
    return NextResponse.json({ error: 'author, author_role, and message are required' }, { status: 400 });
  }

  if (!['practice', 'admin'].includes(author_role)) {
    return NextResponse.json({ error: 'author_role must be practice or admin' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback_comments`, {
    method: 'POST',
    headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({ feedback_id: id, author, author_role, message }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Comments] POST failed (${res.status}): ${text}`);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }

  const rows = await res.json();
  return NextResponse.json(Array.isArray(rows) ? rows[0] : rows, { status: 201 });
}
