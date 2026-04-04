import { NextRequest, NextResponse } from 'next/server';
import { withPracticeAccess, withAdminAccess, API_ERRORS } from '@/lib/api/with-auth';
import type { PracticeContext } from '@/lib/api/with-auth';

/**
 * GET /api/settings/agent
 * Fetch practice_agent_settings
 * Query param: practice_id
 */
const GET_HANDLER = withPracticeAccess(async (request: NextRequest, ctx: PracticeContext) => {
  try {
    const { data, error } = await ctx.supabase
      .from('practice_agent_settings')
      .select('*')
      .eq('practice_id', ctx.practiceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Agent GET] Error fetching settings:', error);
      return API_ERRORS.internal('Failed to fetch agent settings');
    }

    // Return settings or empty object if none exist
    return NextResponse.json(
      data || { practice_id: ctx.practiceId, created_at: new Date().toISOString() },
    );
  } catch (error) {
    console.error('[Agent GET] Error:', error);
    return API_ERRORS.internal();
  }
});

/**
 * PUT /api/settings/agent
 * Update practice_agent_settings
 * Body: { practice_id, ...settings_fields }
 */
const PUT_HANDLER = withAdminAccess(async (request: NextRequest, ctx: PracticeContext) => {
  try {
    const body = await request.json();
    const { ...updateData } = body;

    // Check if settings exist
    const { data: existing } = await ctx.supabase
      .from('practice_agent_settings')
      .select('id')
      .eq('practice_id', ctx.practiceId)
      .single();

    let data, error;

    if (existing) {
      // Update existing
      ({ data, error } = await ctx.supabase
        .from('practice_agent_settings')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('practice_id', ctx.practiceId)
        .select()
        .single());
    } else {
      // Create new
      ({ data, error } = await ctx.supabase
        .from('practice_agent_settings')
        .insert({
          practice_id: ctx.practiceId,
          ...updateData,
        })
        .select()
        .single());
    }

    if (error) {
      console.error('[Agent PUT] Error updating settings:', error);
      return API_ERRORS.internal('Failed to update agent settings');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Agent PUT] Error:', error);
    return API_ERRORS.internal();
  }
});

export { GET_HANDLER as GET, PUT_HANDLER as PUT };
