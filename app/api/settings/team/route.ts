import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * GET /api/settings/team
 * List team members for a practice from practice_team_members
 * Query param: practice_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const practice_id = searchParams.get('practice_id');

    if (!practice_id) {
      return NextResponse.json(
        { error: 'Missing practice_id query parameter' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('practice_team_members')
      .select('*')
      .eq('practice_id', practice_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Team GET] Error fetching team members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[Team GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
