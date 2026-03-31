import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * GET /api/feedback/[id]/comments
 * Fetch all comments for a feedback item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('feedback_comments')
      .select('*')
      .eq('feedback_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Comments] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (err) {
    console.error('[Comments] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/feedback/[id]/comments
 * Add a new comment to a feedback item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { author, author_role, message } = body;

    if (!author || !author_role || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: author, author_role, message' },
        { status: 400 }
      );
    }

    if (!['practice', 'admin', 'system'].includes(author_role)) {
      return NextResponse.json(
        { error: 'author_role must be practice, admin, or system' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('feedback_comments')
      .insert({
        feedback_id: id,
        author,
        author_role,
        message,
      })
      .select()
      .single();

    if (error) {
      console.error('[Comments] Insert error:', error);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    // Also update the feedback updated_at timestamp
    await supabase
      .from('feedback')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err) {
    console.error('[Comments] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
