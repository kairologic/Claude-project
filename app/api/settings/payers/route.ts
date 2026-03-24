import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * GET /api/settings/payers
 * List payer_directory_endpoints with latest snapshot dates
 * Optional query param: practice_id (for filtering if needed)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();

    // Fetch all active payer endpoints
    const { data: payers, error: payersError } = await supabase
      .from('payer_directory_endpoints')
      .select('*')
      .eq('is_active', true)
      .order('payer_name', { ascending: true });

    if (payersError) {
      console.error('[Payers GET] Error fetching payers:', payersError);
      return NextResponse.json(
        { error: 'Failed to fetch payers' },
        { status: 500 }
      );
    }

    // For each payer, get the latest snapshot date
    const payersWithDates = await Promise.all(
      (payers || []).map(async (payer) => {
        const { data: latestSnapshot } = await supabase
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
      })
    );

    return NextResponse.json(payersWithDates);
  } catch (error) {
    console.error('[Payers GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
