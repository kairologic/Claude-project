/**
 * POST /api/admin/practice-scan
 *
 * On-demand scan or payer sync for a specific practice.
 * Input: { practice_id, action: 'scan' | 'payer_sync' | 'both' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

// TODO: Add system-admin role check when role system is expanded

async function POST_HANDLER(request: NextRequest) {
  const supabase = createAdminSupabaseClient();
  try {
    const { practice_id, action } = await request.json();

    if (!practice_id) {
      return NextResponse.json({ error: 'practice_id required' }, { status: 400 });
    }
    if (!action || !['scan', 'payer_sync', 'both'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be scan, payer_sync, or both' },
        { status: 400 },
      );
    }

    // Verify practice exists
    const { data: practices, error: practiceError } = await supabase
      .from('practice_websites')
      .select('id,name,url')
      .eq('id', practice_id);

    if (practiceError || !practices || practices.length === 0) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const results: { scan?: string; payer_sync?: string } = {};

    if (action === 'scan' || action === 'both') {
      // Force the practice to be scanned on the next scheduler run
      // by setting scan_scheduled_at to now
      await supabase
        .from('practice_websites')
        .update({
          scan_scheduled_at: new Date().toISOString(),
          scan_status: 'pending',
        })
        .eq('id', practice_id);
      results.scan = 'queued';
    }

    if (action === 'payer_sync' || action === 'both') {
      // Run inline payer sync — calls FHIR APIs directly for this practice
      try {
        const origin = new URL(request.url).origin;
        const syncRes = await fetch(`${origin}/api/admin/practice-payer-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ practice_id }),
        });
        const syncData = await syncRes.json();
        if (syncRes.ok) {
          results.payer_sync = syncData.message || 'completed';
        } else {
          results.payer_sync = `error: ${syncData.error || 'unknown'}`;
        }
      } catch (syncErr) {
        results.payer_sync = `error: ${syncErr instanceof Error ? syncErr.message : 'sync failed'}`;
      }
    }

    return NextResponse.json({
      success: true,
      practice_id,
      actions: results,
      message: `${action === 'scan' ? 'Scan queued' : action === 'payer_sync' ? 'Payer sync completed' : 'Scan queued + payer sync completed'} for ${practices[0].name || practice_id}`,
    });
  } catch (err) {
    console.error('[practice-scan] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to queue action' },
      { status: 500 },
    );
  }
}

export { POST_HANDLER as POST };
