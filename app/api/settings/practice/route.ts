import { NextRequest, NextResponse } from 'next/server';
import { withPracticeAccess, withAdminAccess, API_ERRORS, parseBody } from '@/lib/api/with-auth';
import type { PracticeContext } from '@/lib/api/with-auth';
import { practiceUpdateSchema } from '@/lib/api/validation-schemas';

/**
 * GET /api/settings/practice
 * Fetch practice profile from practice_websites by practice_id
 * Query param: practice_id
 */
const GET_HANDLER = withPracticeAccess(async (request: NextRequest, ctx: PracticeContext) => {
  try {
    const { data, error } = await ctx.supabase
      .from('practice_websites')
      .select('*')
      .eq('id', ctx.practiceId)
      .single();

    if (error) {
      console.error('[Practice GET] Error fetching practice:', error);
      return API_ERRORS.internal('Failed to fetch practice');
    }

    if (!data) {
      return API_ERRORS.notFound('Practice');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Practice GET] Error:', error);
    return API_ERRORS.internal();
  }
});

/**
 * PUT /api/settings/practice
 * Update practice_websites fields
 * Body: { practice_id, name?, city?, state?, phone?, email?, url? }
 */
const PUT_HANDLER = withAdminAccess(async (request: NextRequest, ctx: PracticeContext) => {
  try {
    // Validate request body
    const parsed = await parseBody(request, practiceUpdateSchema);
    if ('error' in parsed) return parsed.error;
    const updateData = parsed.data;

    // Verify practice exists
    const { data: existingPractice, error: checkError } = await ctx.supabase
      .from('practice_websites')
      .select('id')
      .eq('id', ctx.practiceId)
      .single();

    if (checkError || !existingPractice) {
      return API_ERRORS.notFound('Practice');
    }

    // Remove practice_id from update data (can't update primary key)
    const { practice_id, ...safeUpdateData } = updateData;

    // Update practice with provided fields
    const { data, error } = await ctx.supabase
      .from('practice_websites')
      .update({
        ...safeUpdateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.practiceId)
      .select()
      .single();

    if (error) {
      console.error('[Practice PUT] Error updating practice:', error);
      return API_ERRORS.internal('Failed to update practice');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Practice PUT] Error:', error);
    return API_ERRORS.internal();
  }
});

export { GET_HANDLER as GET, PUT_HANDLER as PUT };
