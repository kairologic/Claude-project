import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * GET /api/search/recent
 * Fetch last 20 search_queries for a practice
 * Query param: practice_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const practice_id = searchParams.get('practice_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    if (!practice_id) {
      return NextResponse.json(
        { error: 'Missing practice_id query parameter' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Verify practice exists
    const { data: practice } = await supabase
      .from('practice_websites')
      .select('id')
      .eq('id', practice_id)
      .single();

    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }

    // Fetch recent searches
    const { data, error } = await supabase
      .from('search_queries')
      .select('*')
      .eq('practice_id', practice_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Search Recent GET] Error fetching searches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch search history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      practice_id,
      count: (data || []).length,
      searches: data || [],
    });
  } catch (error) {
    console.error('[Search Recent GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
