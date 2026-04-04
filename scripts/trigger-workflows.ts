/**
 * trigger-workflows.ts
 *
 * Converts new nppes_delta_events into workflow_instances + tasks + alerts.
 * Run after each delta detection scan (scan-500-practices.ts / run-scan-and-delta.ts)
 * or on a schedule as a standalone cron job.
 *
 * Usage:
 *   npx tsx scripts/trigger-workflows.ts
 *   npx tsx scripts/trigger-workflows.ts --dry-run
 *   npx tsx scripts/trigger-workflows.ts --state TX
 *   npx tsx scripts/trigger-workflows.ts --limit 100
 */

import { createClient } from '@supabase/supabase-js';
import type {
  WorkflowType,
  WorkflowStatus,
  TaskStatus,
  AlertSeverity,
  FindingDetails,
  TaskMetadata,
} from '../lib/types/dashboard-schema';

// ─── Config ───────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const STATE = args.find((a, i) => args[i - 1] === '--state') || null;
const LIMIT = parseInt(args.find((a, i) => args[i - 1] === '--limit') || '0') || 0;
const BATCH_SIZE = 500;

// ─── Signal type → human-readable summary ─────────────────────────────────────

const SIGNAL_SUMMARIES: Record<string, string> = {
  address_change: 'Address mismatch detected',
  phone_change: 'Phone number mismatch detected',
  name_change: 'Name mismatch detected',
  specialty_change: 'Specialty mismatch detected',
  provider_moved: 'Provider may have relocated',
  departed_provider: 'Departed provider still listed',
};

// ─── Standard NPPES Update task template ──────────────────────────────────────

interface TaskTemplate {
  task_order: number;
  task_type: string;
  title: string;
  description: string;
}

const NPPES_UPDATE_TASKS: TaskTemplate[] = [
  {
    task_order: 1,
    task_type: 'review_approve',
    title: 'Review & approve correction',
    description: 'Compare NPPES vs website data and select the correct value',
  },
  {
    task_order: 2,
    task_type: 'download_form',
    title: 'Download pre-filled NPPES form',
    description: 'PDF with corrected data pre-populated',
  },
  {
    task_order: 3,
    task_type: 'submit_nppes',
    title: 'Submit form to NPPES',
    description: 'Upload or mail correction form to CMS',
  },
  {
    task_order: 4,
    task_type: 'monitor_auto_confirm',
    title: 'Monitor & auto-confirm',
    description: 'Auto-checks weekly; closes workflow when NPPES reflects update',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeltaEvent {
  id: string;
  npi: string;
  practice_website_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  detection_source: string;
  confidence: string;
  confidence_score: number;
  signal_type: string;
  source_url: string | null;
  detected_at: string;
}

interface ProviderLookup {
  npi: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  KairoLogic — Workflow Trigger                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (STATE) console.log(`State filter: ${STATE}`);
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  console.log('');

  // 1. Fetch unresolved delta events that don't have workflows yet
  let query = supabase
    .from('nppes_delta_events')
    .select(
      'id, npi, practice_website_id, field_name, old_value, new_value, detection_source, confidence, confidence_score, signal_type, source_url, detected_at',
    )
    .eq('resolved', false)
    .eq('verification_status', 'verified')
    .order('detected_at', { ascending: true });

  if (LIMIT) query = query.limit(LIMIT);

  const { data: deltas, error: deltaError } = await query;

  if (deltaError) {
    console.error('Error fetching deltas:', deltaError.message);
    process.exit(1);
  }

  if (!deltas || deltas.length === 0) {
    console.log('No new unresolved delta events found.');
    return;
  }

  console.log(`Found ${deltas.length} unresolved delta events`);

  // 2. Check which already have workflows (dedup)
  const deltaIds = deltas.map((d) => d.id);
  const { data: existingWfs } = await supabase
    .from('workflow_instances')
    .select('trigger_ref_id')
    .in('trigger_ref_id', deltaIds)
    .eq('trigger_ref_table', 'nppes_delta_events');

  const existingRefIds = new Set((existingWfs || []).map((w) => w.trigger_ref_id));
  const newDeltas = deltas.filter((d) => !existingRefIds.has(d.id));

  console.log(`Already have workflows: ${existingRefIds.size}`);
  console.log(`New workflows to create: ${newDeltas.length}`);

  if (newDeltas.length === 0) {
    console.log('All delta events already have workflows. Nothing to do.');
    return;
  }

  // 3. Lookup provider names
  const uniqueNpis = [...new Set(newDeltas.map((d) => d.npi))];
  const { data: providerData } = await supabase
    .from('providers')
    .select('npi, first_name, last_name, organization_name')
    .in('npi', uniqueNpis);

  const providerMap = new Map<string, string>();
  (providerData || []).forEach((p: ProviderLookup) => {
    const name =
      [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
      p.organization_name ||
      `NPI ${p.npi}`;
    providerMap.set(p.npi, name);
  });

  console.log(`Provider names resolved: ${providerMap.size} of ${uniqueNpis.length}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would create:');
    console.log(`  ${newDeltas.length} workflow_instances`);
    console.log(`  ${newDeltas.length * 4} workflow_tasks`);
    console.log(`  ${newDeltas.length} alerts`);
    console.log(`  ${newDeltas.length} workflow_events`);
    console.log('\nSample workflow:');
    const sample = newDeltas[0];
    console.log(`  NPI: ${sample.npi}`);
    console.log(`  Provider: ${providerMap.get(sample.npi) || 'Unknown'}`);
    console.log(`  Field: ${sample.field_name}`);
    console.log(`  NPPES: ${sample.old_value}`);
    console.log(`  Website: ${sample.new_value}`);
    console.log(`  Summary: ${SIGNAL_SUMMARIES[sample.signal_type] || 'Data mismatch detected'}`);
    return;
  }

  // 4. Process in batches
  let totalWf = 0,
    totalTasks = 0,
    totalAlerts = 0,
    totalEvents = 0;

  for (let i = 0; i < newDeltas.length; i += BATCH_SIZE) {
    const batch = newDeltas.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newDeltas.length / BATCH_SIZE);
    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} events)...`);

    // Build workflow instances
    const workflowRows = batch.map((d) => {
      const providerName = providerMap.get(d.npi) || `NPI ${d.npi}`;
      const summary = SIGNAL_SUMMARIES[d.signal_type] || `Data mismatch detected (${d.field_name})`;
      const detectedDate = new Date(d.detected_at);
      const targetDate = new Date(detectedDate);
      targetDate.setDate(targetDate.getDate() + 21);
      const overdueDate = new Date(detectedDate);
      overdueDate.setDate(overdueDate.getDate() + 14);

      return {
        practice_id: d.practice_website_id,
        workflow_type: 'nppes_update' as WorkflowType,
        status: 'action_needed' as WorkflowStatus,
        priority: d.confidence_score >= 0.9 ? 3 : d.confidence_score >= 0.8 ? 2 : 1,
        provider_npi: d.npi,
        provider_name: providerName,
        trigger_source: 'delta_engine',
        trigger_ref_id: d.id,
        trigger_ref_table: 'nppes_delta_events',
        finding_summary: summary,
        finding_details: {
          field: d.field_name,
          signal_type: d.signal_type,
          nppes_value: d.old_value,
          website_value: d.new_value,
          confidence: d.confidence,
          confidence_score: d.confidence_score,
          detection_source: d.detection_source,
          source_url: d.source_url,
        } as FindingDetails,
        target_completion: targetDate.toISOString().split('T')[0],
        overdue_at: overdueDate.toISOString().split('T')[0],
        created_at: d.detected_at,
      };
    });

    // Insert workflows
    const { data: insertedWfs, error: wfError } = await supabase
      .from('workflow_instances')
      .insert(workflowRows)
      .select(
        'id, practice_id, provider_npi, provider_name, finding_summary, finding_details, created_at, overdue_at',
      );

    if (wfError) {
      console.error(`  Error inserting workflows:`, wfError.message);
      continue;
    }

    totalWf += insertedWfs.length;
    console.log(`  Workflows: ${insertedWfs.length}`);

    // Build tasks for each workflow
    const taskRows = insertedWfs.flatMap((wf) =>
      NPPES_UPDATE_TASKS.map((t) => {
        let metadata: TaskMetadata = {};

        if (t.task_type === 'review_approve') {
          metadata = {
            comparison_data: {
              field: wf.finding_details?.field || '',
              sources: [
                { source: 'Website', value: wf.finding_details?.website_value || '' },
                { source: 'NPPES', value: wf.finding_details?.nppes_value || '' },
              ],
            },
            options: [
              { source: 'From website', value: wf.finding_details?.website_value || '' },
              { source: 'From NPPES', value: wf.finding_details?.nppes_value || '' },
            ],
          };
        } else if (t.task_type === 'monitor_auto_confirm') {
          metadata = {
            check_schedule: 'weekly',
            check_day: 'monday',
            check_time_utc: '06:00',
          };
        }

        return {
          workflow_id: wf.id,
          task_order: t.task_order,
          task_type: t.task_type,
          title: t.title,
          description: t.description,
          status: (t.task_order === 1 ? 'active' : 'pending') as TaskStatus,
          metadata,
          created_at: wf.created_at,
        };
      }),
    );

    const { error: taskError } = await supabase.from('workflow_tasks').insert(taskRows);
    if (taskError) {
      console.error(`  Error inserting tasks:`, taskError.message);
    } else {
      totalTasks += taskRows.length;
      console.log(`  Tasks: ${taskRows.length}`);
    }

    // Build alerts
    const alertRows = insertedWfs.map((wf) => {
      const field = wf.finding_details?.field || '';
      let desc = `${field} mismatch between NPPES and website. Review and approve correction.`;
      if (field === 'address_line_1') {
        desc = `NPPES shows "${(wf.finding_details?.nppes_value || '').substring(0, 40)}" but website shows "${(wf.finding_details?.website_value || '').substring(0, 40)}"`;
      } else if (field === 'phone') {
        desc = `Phone on website (${(wf.finding_details?.website_value || '').substring(0, 14)}) doesn't match NPPES (${(wf.finding_details?.nppes_value || '').substring(0, 14)})`;
      }

      return {
        practice_id: wf.practice_id,
        severity: 'action' as AlertSeverity,
        title: `${wf.provider_name}: ${wf.finding_summary}`,
        description: desc,
        workflow_id: wf.id,
        provider_npi: wf.provider_npi,
        provider_name: wf.provider_name,
        source: 'delta_engine',
        is_active: true,
        created_at: wf.created_at,
      };
    });

    const { error: alertError } = await supabase.from('alerts').insert(alertRows);
    if (alertError) {
      console.error(`  Error inserting alerts:`, alertError.message);
    } else {
      totalAlerts += alertRows.length;
      console.log(`  Alerts: ${alertRows.length}`);
    }

    // Build audit events
    const eventRows = insertedWfs.map((wf) => ({
      workflow_id: wf.id,
      event_type: 'created',
      actor_type: 'system',
      title: `${wf.finding_summary} — workflow created`,
      details: {
        provider_npi: wf.provider_npi,
        provider_name: wf.provider_name,
        trigger_source: 'delta_engine',
        finding_details: wf.finding_details,
      },
      created_at: wf.created_at,
    }));

    const { error: eventError } = await supabase.from('workflow_events').insert(eventRows);
    if (eventError) {
      console.error(`  Error inserting events:`, eventError.message);
    } else {
      totalEvents += eventRows.length;
      console.log(`  Events: ${eventRows.length}`);
    }
  }

  // 5. Mark overdue
  const today = new Date().toISOString().split('T')[0];
  const { data: overdueWfs } = await supabase
    .from('workflow_instances')
    .select('id')
    .eq('status', 'action_needed')
    .lte('overdue_at', today);

  if (overdueWfs && overdueWfs.length > 0) {
    console.log(`\nMarking ${overdueWfs.length} workflows as overdue...`);
    // Bump priority for overdue items (can't do increment via Supabase client, use RPC or raw)
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Workflows created:  ${totalWf}`);
  console.log(`  Tasks created:      ${totalTasks}`);
  console.log(`  Alerts created:     ${totalAlerts}`);
  console.log(`  Events created:     ${totalEvents}`);
  console.log(`  Overdue:            ${overdueWfs?.length || 0}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
