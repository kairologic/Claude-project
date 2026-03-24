import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * GET /api/settings/agent
 * Fetch practice_agent_settings
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
      .from('practice_agent_settings')
      .select('*')
      .eq('practice_id', practice_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Agent GET] Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agent settings' },
        { status: 500 }
      );
    }

    // Return settings or empty object if none exist
    return NextResponse.json(data || { practice_id, created_at: new Date().toISOString() });
  } catch (error) {
    console.error('[Agent GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/agent
 * Update practice_agent_settings
 * Body: { practice_id, ...settings_fields }
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

    // Check if settings exist
    const { data: existing } = await supabase
      .from('practice_agent_settings')
      .select('id')
      .eq('practice_id', practice_id)
      .single();

    let data, error;

    if (existing) {
      // Update existing
      ({ data, error } = await supabase
        .from('practice_agent_settings')
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
        .from('practice_agent_settings')
        .insert({
          practice_id,
          ...updateData,
        })
        .select()
        .single());
    }

    if (error) {
      console.error('[Agent PUT] Error updating settings:', error);
      return NextResponse.json(
        { error: 'Failed to update agent settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Agent PUT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
