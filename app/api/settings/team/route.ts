import { NextRequest, NextResponse } from 'next/server';
import { withPracticeAccess, API_ERRORS } from '@/lib/api/with-auth';
import type { PracticeContext } from '@/lib/api/with-auth';

/**
 * GET /api/settings/team
 * List team members for a practice from practice_team_members
 * Query param: practice_id
 */
const GET_HANDLER = withPracticeAccess(
  async (request: NextRequest, ctx: PracticeContext) => {
    try {
      const { data, error } = await ctx.supabase
        .from('practice_team_members')
        .select('*')
        .eq('practice_id', ctx.practiceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Team GET] Error fetching team members:', error);
        return API_ERRORS.internal('Failed to fetch team members');
      }

      return NextResponse.json(data || []);
    } catch (error) {
      console.error('[Team GET] Error:', error);
      return API_ERRORS.internal();
    }
  }
);

export { GET_HANDLER as GET };
