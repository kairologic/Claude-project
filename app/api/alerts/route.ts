/**
 * GET /api/alerts?practice_id={id}&limit={n}&seen={true|false}
 *
 * Fetch alerts for a practice from the alerts table.
 * Supports filtering by seen/unseen state and pagination.
 *
 * PATCH /api/alerts
 * Mark alert(s) as seen.
 * Body: { id: string } | { ids: string[] } | { practice_id: string, mark_all: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const practice_id = searchParams.get('practice_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const seen = searchParams.get('seen'); // 'true' | 'false' | null (all)

    if (!practice_id) {
      return NextResponse.json({ error: 'Missing practice_id query parameter' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    let query = supabase
      .from('alerts')
      .select('*')
      .eq('practice_id', practice_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (seen === 'false') {
      query = query.eq('is_seen', false);
    } else if (seen === 'true') {
      query = query.eq('is_seen', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[alerts GET] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts', detail: error.message },
        { status: 500 },
      );
    }

    const alerts = data || [];
    const unseen_count = alerts.filter((a: any) => !a.is_seen).length;

    return NextResponse.json({ alerts, total: alerts.length, unseen_count });
  } catch (err) {
    console.error('[alerts GET] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminSupabaseClient();

    if (body.mark_all && body.practice_id) {
      // Mark all alerts for a practice as seen
      const { error } = await supabase
        .from('alerts')
        .update({ is_seen: true, seen_at: new Date().toISOString() })
        .eq('practice_id', body.practice_id)
        .eq('is_seen', false);

      if (error) {
        return NextResponse.json({ error: 'Failed to mark alerts as seen' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (body.ids && Array.isArray(body.ids)) {
      // Mark specific alert IDs as seen
      const { error } = await supabase
        .from('alerts')
        .update({ is_seen: true, seen_at: new Date().toISOString() })
        .in('id', body.ids);

      if (error) {
        return NextResponse.json({ error: 'Failed to mark alerts as seen' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      // Mark single alert as seen
      const { error } = await supabase
        .from('alerts')
        .update({ is_seen: true, seen_at: new Date().toISOString() })
        .eq('id', body.id);

      if (error) {
        return NextResponse.json({ error: 'Failed to mark alert as seen' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Must provide id, ids array, or mark_all with practice_id' },
      { status: 400 },
    );
  } catch (err) {
    console.error('[alerts PATCH] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
