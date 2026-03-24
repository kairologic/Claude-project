import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * GET /api/settings/practice
 * Fetch practice profile from practice_websites by practice_id
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
      .from('practice_websites')
      .select('*')
      .eq('id', practice_id)
      .single();

    if (error) {
      console.error('[Practice GET] Error fetching practice:', error);
      return NextResponse.json(
        { error: 'Failed to fetch practice' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Practice GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/practice
 * Update practice_websites fields
 * Body: { practice_id, name?, npi?, address?, city?, state?, zip?, url?, primary_phone?, primary_fax?, practice_specialties? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { practice_id, ...updateData } = body;

    if (!practice_id) {
      return NextResponse.json(
        { error: 'Missing practice_id in request body' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Verify practice exists
    const { data: existingPractice, error: checkError } = await supabase
      .from('practice_websites')
      .select('id')
      .eq('id', practice_id)
      .single();

    if (checkError || !existingPractice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }

    // Update practice with provided fields
    const { data, error } = await supabase
      .from('practice_websites')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', practice_id)
      .select()
      .single();

    if (error) {
      console.error('[Practice PUT] Error updating practice:', error);
      return NextResponse.json(
        { error: 'Failed to update practice' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Practice PUT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
