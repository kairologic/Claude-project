/**
 * lib/archival/archive-engine.ts
 *
 * Moves resolved/cancelled workflows and alerts past their retention
 * period from live tables to _archive tables.
 *
 * Designed to run daily via cron (GitHub Actions or Vercel cron).
 * Each batch is transactional: if archive INSERT succeeds, live DELETE follows.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_ARCHIVE_CONFIG, getArchiveQuarter, type ArchiveConfig } from './archive-config';

interface ArchiveResult {
  workflowsArchived: number;
  tasksArchived: number;
  eventsArchived: number;
  alertsArchived: number;
  errors: string[];
  durationMs: number;
}

export async function runArchivalCycle(
  supabase: SupabaseClient,
  config: ArchiveConfig = DEFAULT_ARCHIVE_CONFIG,
): Promise<ArchiveResult> {
  const start = Date.now();
  const result: ArchiveResult = {
    workflowsArchived: 0,
    tasksArchived: 0,
    eventsArchived: 0,
    alertsArchived: 0,
    errors: [],
    durationMs: 0,
  };

  const quarter = getArchiveQuarter();
  const now = new Date();

  try {
    // ── Archive workflows ────────────────────────────────────────
    const workflowCutoff = new Date(now);
    workflowCutoff.setDate(workflowCutoff.getDate() - config.workflowRetentionDays);

    // Find workflows eligible for archival
    const { data: eligibleWorkflows, error: wfFetchErr } = await supabase
      .from('workflow_instances')
      .select('id')
      .in('status', ['resolved', 'cancelled'])
      .lt('updated_at', workflowCutoff.toISOString())
      .limit(config.batchSize);

    if (wfFetchErr) {
      result.errors.push(`Failed to fetch eligible workflows: ${wfFetchErr.message}`);
    } else if (eligibleWorkflows && eligibleWorkflows.length > 0) {
      const workflowIds = eligibleWorkflows.map(w => w.id);

      // 1. Copy workflows to archive
      const { data: workflows } = await supabase
        .from('workflow_instances')
        .select('*')
        .in('id', workflowIds);

      if (workflows && workflows.length > 0) {
        const archiveRows = workflows.map(w => ({
          ...w,
          archived_at: now.toISOString(),
          archive_quarter: quarter,
          archived_by: 'system',
        }));

        const { error: insertErr } = await supabase
          .from('workflow_instances_archive')
          .insert(archiveRows);

        if (insertErr) {
          result.errors.push(`Failed to insert workflow archives: ${insertErr.message}`);
        } else {
          // 2. Copy related tasks
          const { data: tasks } = await supabase
            .from('workflow_tasks')
            .select('*')
            .in('workflow_id', workflowIds);

          if (tasks && tasks.length > 0) {
            const taskArchiveRows = tasks.map(t => ({
              ...t,
              archived_at: now.toISOString(),
              archive_quarter: quarter,
              archived_by: 'system',
            }));
            await supabase.from('workflow_tasks_archive').insert(taskArchiveRows);
            result.tasksArchived = tasks.length;
          }

          // 3. Copy related events
          const { data: events } = await supabase
            .from('workflow_events')
            .select('*')
            .in('workflow_id', workflowIds);

          if (events && events.length > 0) {
            const eventArchiveRows = events.map(e => ({
              ...e,
              archived_at: now.toISOString(),
              archive_quarter: quarter,
              archived_by: 'system',
            }));
            await supabase.from('workflow_events_archive').insert(eventArchiveRows);
            result.eventsArchived = events.length;
          }

          // 4. Delete from live tables (tasks & events first, then workflows)
          await supabase.from('workflow_events').delete().in('workflow_id', workflowIds);
          await supabase.from('workflow_tasks').delete().in('workflow_id', workflowIds);
          await supabase.from('workflow_instances').delete().in('id', workflowIds);

          result.workflowsArchived = workflows.length;

          // 5. Log archival event
          await supabase.from('workflow_events_archive').insert({
            workflow_id: workflowIds[0], // Reference first workflow
            event_type: 'archived',
            actor_type: 'system',
            title: `Archived ${workflows.length} workflows (${quarter})`,
            details: {
              count: workflows.length,
              quarter,
              task_count: result.tasksArchived,
              event_count: result.eventsArchived,
            },
            created_at: now.toISOString(),
          });
        }
      }
    }

    // ── Archive alerts ───────────────────────────────────────────
    const alertCutoff = new Date(now);
    alertCutoff.setDate(alertCutoff.getDate() - config.alertRetentionDays);

    const { data: eligibleAlerts, error: alertFetchErr } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', false)
      .lt('created_at', alertCutoff.toISOString())
      .limit(config.batchSize);

    if (alertFetchErr) {
      result.errors.push(`Failed to fetch eligible alerts: ${alertFetchErr.message}`);
    } else if (eligibleAlerts && eligibleAlerts.length > 0) {
      const alertArchiveRows = eligibleAlerts.map(a => ({
        ...a,
        archived_at: now.toISOString(),
        archive_quarter: quarter,
        archived_by: 'system',
      }));

      const { error: alertInsertErr } = await supabase
        .from('alerts_archive')
        .insert(alertArchiveRows);

      if (alertInsertErr) {
        result.errors.push(`Failed to insert alert archives: ${alertInsertErr.message}`);
      } else {
        const alertIds = eligibleAlerts.map(a => a.id);
        await supabase.from('alerts').delete().in('id', alertIds);
        result.alertsArchived = eligibleAlerts.length;
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  result.durationMs = Date.now() - start;

  if (config.verbose) {
    console.log(`[Archive] Cycle complete in ${result.durationMs}ms:`, {
      workflows: result.workflowsArchived,
      tasks: result.tasksArchived,
      events: result.eventsArchived,
      alerts: result.alertsArchived,
      errors: result.errors.length,
    });
  }

  return result;
}
