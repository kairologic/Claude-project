import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * Schedule a post for future publishing.
 * POST: Set schedule  { scheduled_at: "2026-03-26T14:00:00Z", channels: ["linkedin", "blog"] }
 * DELETE: Cancel schedule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient();
    const { scheduled_at, channels } = await request.json();

    if (!scheduled_at) {
      return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'Schedule time must be in the future' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      scheduled_at: scheduledDate.toISOString(),
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    };

    // Optionally update channels if provided
    if (channels && Array.isArray(channels)) {
      updateData.channels = channels;
    }

    const { data, error } = await supabase
      .from('content_posts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('content_posts')
      .update({
        scheduled_at: null,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
