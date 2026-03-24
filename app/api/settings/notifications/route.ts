import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * GET /api/settings/notifications
 * Fetch notification_preferences for practice
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
      .from('notification_preferences')
      .select('*')
      .eq('practice_id', practice_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is OK
      console.error('[Notifications GET] Error fetching preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences' },
        { status: 500 }
      );
    }

    // Return preferences or empty object if none exist
    return NextResponse.json(data || { practice_id, created_at: new Date().toISOString() });
  } catch (error) {
    console.error('[Notifications GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/notifications
 * Update notification_preferences
 * Body: { practice_id, ...preference_fields }
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

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('practice_id', practice_id)
      .single();

    let data, error;

    if (existing) {
      // Update existing
      ({ data, error } = await supabase
        .from('notification_preferences')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('practice_id', practice_id)
        .select()
        .single());
    } else {
      // Create new
      ({ data, error } = await supabase
        .from('notification_preferences')
        .insert({
          practice_id,
          ...updateData,
        })
        .select()
        .single());
    }

    if (error) {
      console.error('[Notifications PUT] Error updating preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Notifications PUT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
