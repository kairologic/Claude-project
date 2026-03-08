import { NextRequest, NextResponse } from 'next/server';
import { markAsSubmitted, runConfirmationPoll } from '@/lib/forms/confirmation-loop';

/**
 * Form Confirmation API — Task 2.6
 *
 * POST /api/forms/confirm
 * Actions:
 *   { action: "mark_submitted", update_request_id: string }
 *     — Manager clicked "Mark as Submitted", activates polling
 *
 *   { action: "run_poll" }
 *     — Run the confirmation polling loop (called by cron/GitHub Actions)
 *
 *   { action: "status", update_request_id: string }
 *     — Check current status of an update request
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function db(path: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { action, update_request_id, submitted_by } = await request.json();

    switch (action) {
      case 'mark_submitted': {
        if (!update_request_id) {
          return NextResponse.json({ error: 'update_request_id required' }, { status: 400 });
        }
        await markAsSubmitted(update_request_id, submitted_by);
        return NextResponse.json({ success: true, status: 'SUBMITTED', polling: true });
      }

      case 'run_poll': {
        const result = await runConfirmationPoll();
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      case 'status': {
        if (!update_request_id) {
          return NextResponse.json({ error: 'update_request_id required' }, { status: 400 });
        }
        const rows = await db(`update_requests?id=eq.${update_request_id}&select=*`);
        if (!rows?.length) {
          return NextResponse.json({ error: 'Update request not found' }, { status: 404 });
        }
        return NextResponse.json(rows[0]);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: mark_submitted, run_poll, or status' },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error('[Form Confirm API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Confirmation action failed' },
      { status: 500 },
    );
  }
}
