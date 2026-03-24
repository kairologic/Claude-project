import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');

    const supabase = createAdminSupabaseClient();
    let query = supabase
      .from('content_posts')
      .select('*, content_graphics(*)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (channel) query = query.contains('channels', [channel]);

    const { data, error } = await query.limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
