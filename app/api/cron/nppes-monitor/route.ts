import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * Vercel Cron: NPPES Monitor + Auto-confirm + Overdue Alert
 * Runs weekly (Mondays at 6 AM UTC).
 *
 * 1. Finds all workflows in 'awaiting' status with monitor_auto_confirm tasks
 * 2. Polls NPPES for each provider to check if the approved value is reflected
 * 3. Auto-confirms workflows where NPPES matches the expected value
 * 4. Flags overdue workflows (>14 days awaiting) and creates alerts
 */

const NPPES_API = 'https://npiregistry.cms.hhs.gov/api/?version=2.1';
const OVERDUE_DAYS = 14;
const ESCALATION_DAYS = 28;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const results = { checked: 0, confirmed: 0, overdue_flagged: 0, errors: 0 };

  try {
    // Find all awaiting workflows with their monitor tasks
    const { data: awaitingWorkflows, error: wfError } = await supabase
      .from('workflow_instances')
      .select(
        `
        id, provider_npi, provider_name, approved_value,
        finding_details, status, created_at, updated_at, practice_id,
        workflow_tasks!inner(id, task_type, status, metadata)
      `,
      )
      .eq('status', 'awaiting')
      .eq('workflow_tasks.task_type', 'monitor_auto_confirm');

    if (wfError) throw wfError;
    if (!awaitingWorkflows || awaitingWorkflows.length === 0) {
      return NextResponse.json({ message: 'No awaiting workflows to check', results });
    }

    for (const wf of awaitingWorkflows) {
      results.checked++;
      const monitorTask = (wf.workflow_tasks as any[])?.[0];
      const npi = wf.provider_npi;
      const expectedValue = monitorTask?.metadata?.expected_value || wf.approved_value;
      const field = wf.finding_details?.field;

      if (!npi || !expectedValue || !field) {
        continue;
      }

      try {
        // Poll NPPES API for current data
        const nppisData = await fetchNppesData(npi);
        if (!nppisData) continue;

        // Check if NPPES now matches the expected value
        const currentValue = extractFieldValue(nppisData, field);
        const isConfirmed =
          normalizeForComparison(currentValue) === normalizeForComparison(expectedValue);

        if (isConfirmed) {
          // Auto-confirm: update workflow + task + log event
          await Promise.all([
            supabase
              .from('workflow_instances')
              .update({
                status: 'resolved',
                completed_at: now.toISOString(),
                completed_reason: 'auto_confirmed_nppes_sync',
                updated_at: now.toISOString(),
              })
              .eq('id', wf.id),
            supabase
              .from('workflow_tasks')
              .update({
                status: 'completed',
                confirmed_at: now.toISOString(),
                confirmation_source: 'nppes_api_poll',
                confirmation_data: {
                  nppes_value: currentValue,
                  expected_value: expectedValue,
                  confirmed_at: now.toISOString(),
                },
                updated_at: now.toISOString(),
              })
              .eq('id', monitorTask.id),
            supabase.from('workflow_events').insert({
              workflow_id: wf.id,
              event_type: 'auto_confirmed',
              actor_type: 'system',
              title: `NPPES auto-confirmed: ${field} now matches expected value`,
              details: {
                field,
                nppes_value: currentValue,
                expected_value: expectedValue,
              },
            }),
          ]);
          results.confirmed++;
        } else {
          // Update poll metadata
          const pollCount = (monitorTask?.metadata?.poll_count || 0) + 1;
          await supabase
            .from('workflow_tasks')
            .update({
              metadata: {
                ...monitorTask.metadata,
                poll_count: pollCount,
                last_polled_at: now.toISOString(),
                last_nppes_value: currentValue,
              },
              updated_at: now.toISOString(),
            })
            .eq('id', monitorTask.id);

          // Check if overdue
          const createdAt = new Date(wf.created_at);
          const daysSinceCreated = Math.floor(
            (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysSinceCreated >= OVERDUE_DAYS && !monitorTask?.metadata?.escalation_14d_sent) {
            // Create overdue alert
            await supabase.from('alerts').insert({
              practice_id: wf.practice_id,
              severity: 'warning',
              source: 'nppes_monitor',
              title: `NPPES update overdue for ${wf.provider_name || npi}`,
              description: `The ${field} correction submitted ${daysSinceCreated} days ago has not been reflected in NPPES yet. Consider resubmitting or contacting NPPES directly.`,
              workflow_id: wf.id,
              provider_npi: npi,
              provider_name: wf.provider_name,
            });
            // Update escalation flag
            await supabase
              .from('workflow_tasks')
              .update({
                metadata: { ...monitorTask.metadata, escalation_14d_sent: true },
              })
              .eq('id', monitorTask.id);
            results.overdue_flagged++;
          }

          if (daysSinceCreated >= ESCALATION_DAYS && !monitorTask?.metadata?.escalation_28d_sent) {
            await supabase.from('alerts').insert({
              practice_id: wf.practice_id,
              severity: 'action',
              source: 'nppes_monitor',
              title: `NPPES update still pending after ${daysSinceCreated} days — ${wf.provider_name || npi}`,
              description: `The ${field} correction has not been confirmed after ${daysSinceCreated} days. Manual intervention recommended.`,
              workflow_id: wf.id,
              provider_npi: npi,
              provider_name: wf.provider_name,
            });
            await supabase
              .from('workflow_tasks')
              .update({
                metadata: { ...monitorTask.metadata, escalation_28d_sent: true },
              })
              .eq('id', monitorTask.id);
          }
        }
      } catch (err) {
        console.error(`[nppes-monitor] Error checking NPI ${npi}:`, err);
        results.errors++;
      }
    }

    return NextResponse.json({ message: 'NPPES monitor complete', results });
  } catch (err) {
    console.error('[nppes-monitor] Fatal error:', err);
    return NextResponse.json({ error: (err as Error).message, results }, { status: 500 });
  }
}

// ── NPPES API helpers ──────────────────────────────────────────

async function fetchNppesData(npi: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${NPPES_API}&number=${npi}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result_count === 0 || !data.results?.[0]) return null;
    return data.results[0];
  } catch {
    return null;
  }
}

function extractFieldValue(nppes: Record<string, any>, field: string): string | null {
  const addr = nppes.addresses?.[0]; // Practice location (first address)

  switch (field) {
    case 'address_line_1':
    case 'address':
      return addr?.address_1 || null;
    case 'address_line_2':
      return addr?.address_2 || null;
    case 'city':
      return addr?.city || null;
    case 'state':
      return addr?.state || null;
    case 'postal_code':
    case 'zip':
      return addr?.postal_code?.substring(0, 5) || null;
    case 'phone':
      return addr?.telephone_number?.replace(/\D/g, '') || null;
    case 'fax':
      return addr?.fax_number?.replace(/\D/g, '') || null;
    default:
      return null;
  }
}

function normalizeForComparison(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toUpperCase()
    .replace(/[.,#\-\s]+/g, ' ')
    .replace(/\bSTE\b/g, 'SUITE')
    .replace(/\bST\b/g, 'STREET')
    .replace(/\bAVE\b/g, 'AVENUE')
    .replace(/\bBLVD\b/g, 'BOULEVARD')
    .replace(/\bDR\b/g, 'DRIVE')
    .replace(/\bLN\b/g, 'LANE')
    .replace(/\bRD\b/g, 'ROAD')
    .replace(/\s+/g, ' ')
    .trim();
}
