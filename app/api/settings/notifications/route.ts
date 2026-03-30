import { NextRequest, NextResponse } from 'next/server';
import { withPracticeAccess, withAdminAccess, API_ERRORS } from '@/lib/api/with-auth';
import type { PracticeContext } from '@/lib/api/with-auth';

/**
 * GET /api/settings/notifications
 * Fetch notification_preferences for practice
 * Query param: practice_id
 */
const GET_HANDLER = withPracticeAccess(
  async (request: NextRequest, ctx: PracticeContext) => {
    try {
      const { data, error } = await ctx.supabase
        .from('notification_preferences')
        .select('*')
        .eq('practice_id', ctx.practiceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is OK
        console.error('[Notifications GET] Error fetching preferences:', error);
        return API_ERRORS.internal('Failed to fetch notification preferences');
      }

      // Return preferences or empty object if none exist
      return NextResponse.json(data || { practice_id: ctx.practiceId, created_at: new Date().toISOString() });
    } catch (error) {
      console.error('[Notifications GET] Error:', error);
      return API_ERRORS.internal();
    }
  }
);

/**
 * PUT /api/settings/notifications
 * Update notification_preferences
 * Body: { practice_id, ...preference_fields }
 */
const PUT_HANDLER = withAdminAccess(
  async (request: NextRequest, ctx: PracticeContext) => {
    try {
      const body = await request.json();
      const { ...updateData } = body;

      // Check if preferences exist
      const { data: existing } = await ctx.supabase
        .from('notification_preferences')
        .select('id')
        .eq('practice_id', ctx.practiceId)
        .single();

      let data, error;

      if (existing) {
        // Update existing
        ({ data, error } = await ctx.supabase
          .from('notification_preferences')
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
          .from('notification_preferences')
          .insert({
            practice_id: ctx.practiceId,
            ...updateData,
          })
          .select()
          .single());
      }

      if (error) {
        console.error('[Notifications PUT] Error updating preferences:', error);
        return API_ERRORS.internal('Failed to update notification preferences');
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error('[Notifications PUT] Error:', error);
      return API_ERRORS.internal();
    }
  }
);

export { GET_HANDLER as GET, PUT_HANDLER as PUT };
