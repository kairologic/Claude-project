import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * Schedule a post for future publishing.
 * POST: Set schedule  { scheduled_at, channels, channel_schedules? }
 *   channel_schedules is an optional map of channel -> ISO date for staggered publishing
 *   e.g. { "linkedin": "2026-03-28T14:00:00Z", "blog": "2026-03-29T14:00:00Z" }
 * DELETE: Cancel schedule
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();
    const { scheduled_at, channels, channel_schedules } = await request.json();

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

    // Store per-channel schedule times in metadata if staggered
    if (channel_schedules && typeof channel_schedules === 'object') {
      updateData.schedule_metadata = { channel_schedules };
    }

    const { data, error } = await supabase
      .from('content_posts')
      .update(updateData)
      .eq('id', id)
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('content_posts')
      .update({
        scheduled_at: null,
        status: 'draft',
        schedule_metadata: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
