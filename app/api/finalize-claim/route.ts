/**
 * app/api/finalize-claim/route.ts
 *
 * POST: Called after user sets their password.
 * Links the authenticated user to the practice and marks the token as claimed.
 *
 * Body: { practice_id: string, token_id?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
  linkUserToPractice,
  markTokenClaimed,
} from '@/lib/auth/auth-helpers';
import { resolveScanTierOnClaim } from '@/lib/scanner/scan-tier-resolver';

export async function POST(request: NextRequest) {
  try {
    const { practice_id, token_id } = await request.json();

    if (!practice_id) {
      return NextResponse.json({ error: 'practice_id is required' }, { status: 400 });
    }

    // Get the authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Link user to practice as admin (they claimed it)
    await linkUserToPractice(user.id, practice_id, 'admin', true);

    // Promote scan tier: claimed practices get at least weekly scans
    const admin = createAdminSupabaseClient();

    // Get the practice to determine subscription tier
    const { data: practiceData } = await admin
      .from('practice_websites')
      .select('subscription_tier')
      .eq('id', practice_id)
      .single();

    const scanTier = resolveScanTierOnClaim(practiceData?.subscription_tier || null);

    await admin
      .from('practice_websites')
      .update({
        scan_tier: scanTier,
        scan_scheduled_at: new Date().toISOString(), // Schedule immediate first scan
      })
      .eq('id', practice_id);

    // Mark the preview token as claimed
    if (token_id) {
      await markTokenClaimed(token_id, user.id);
    }

    return NextResponse.json({
      success: true,
      practice_id,
      role: 'admin',
    });
  } catch (err: any) {
    console.error('Finalize claim error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
