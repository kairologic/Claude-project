import { NextRequest, NextResponse } from 'next/server';
import { withPracticeAccess, API_ERRORS } from '@/lib/api/with-auth';
import type { PracticeContext } from '@/lib/api/with-auth';

/**
 * GET /api/settings/payers
 * List payer_directory_endpoints with latest snapshot dates
 * Query param: practice_id (for access validation)
 */
const GET_HANDLER = withPracticeAccess(async (request: NextRequest, ctx: PracticeContext) => {
  try {
    // Fetch all active payer endpoints
    const { data: payers, error: payersError } = await ctx.supabase
      .from('payer_directory_endpoints')
      .select('*')
      .eq('is_active', true)
      .order('payer_name', { ascending: true });

    if (payersError) {
      console.error('[Payers GET] Error fetching payers:', payersError);
      return API_ERRORS.internal('Failed to fetch payers');
    }

    // For each payer, get the latest snapshot date
    const payersWithDates = await Promise.all(
      (payers || []).map(async (payer) => {
        const { data: latestSnapshot } = await ctx.supabase
          .from('payer_directory_snapshots')
          .select('snapshot_date')
          .eq('payer_code', payer.payer_code)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single();

        return {
          ...payer,
          latest_snapshot_date: latestSnapshot?.snapshot_date || null,
        };
      }),
    );

    return NextResponse.json(payersWithDates);
  } catch (error) {
    console.error('[Payers GET] Error:', error);
    return API_ERRORS.internal();
  }
});

export { GET_HANDLER as GET };
