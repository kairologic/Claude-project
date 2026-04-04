/**
 * POST /api/cron/archive
 *
 * Runs the archival cycle. Called by:
 *   - Vercel Cron (vercel.json) daily at 3 AM UTC
 *   - GitHub Actions schedule
 *   - Manual trigger (admin only)
 *
 * Protected by CRON_SECRET header for scheduled calls,
 * or withAuth for manual admin triggers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { runArchivalCycle } from '@/lib/archival/archive-engine';
import { DEFAULT_ARCHIVE_CONFIG } from '@/lib/archival/archive-config';

export async function POST(request: NextRequest) {
  // Verify cron secret OR authenticated admin
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret !== expectedSecret) {
    // Fall back to auth check for manual triggers
    // For now, just reject if no valid cron secret
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const result = await runArchivalCycle(supabase, DEFAULT_ARCHIVE_CONFIG);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[Archive Cron] Error:', err);
    return NextResponse.json(
      { error: 'Archive cycle failed', message: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
