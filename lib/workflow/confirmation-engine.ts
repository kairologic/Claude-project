/**
 * lib/workflow/confirmation-engine.ts
 *
 * #75 — Confirmation engine.
 * Checks external sources (NPPES, payer directories) to auto-close
 * workflows where the expected change has been confirmed.
 *
 * Used by the cron job to auto-confirm + auto-resolve workflows.
 * Centralizes the confirm → complete task → resolve workflow → notify flow.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  canTransitionWorkflow,
  WorkflowStatus,
  getNotificationsForEvent,
  WorkflowEventType,
} from './state-machine';
import { logAutoConfirmed, logStatusChange, logTaskChange, logEscalation } from './audit-logger';
import { sendWorkflowNotification, getPracticeEmails } from './email-notifications';

// ── Types ───────────────────────────────────────────────────

type WorkflowRow = {
  id: string;
  practice_id: string;
  status: string;
  provider_npi: string;
  provider_name: string;
  workflow_type: string;
  approved_value?: string;
  finding_summary?: string;
  created_at: string;
};

type TaskRow = {
  id: string;
  workflow_id: string;
  task_type: string;
  status: string;
  title: string;
  metadata: Record<string, unknown> | null;
};

export type ConfirmationResult = {
  workflow_id: string;
  action: 'confirmed' | 'escalation_warning' | 'escalation_action' | 'no_change' | 'error';
  details?: string;
};

// ── Confirm a workflow ──────────────────────────────────────

export async function confirmWorkflow(
  supabase: SupabaseClient,
  workflow: WorkflowRow,
  monitorTask: TaskRow,
  confirmationSource: string,
  matchedValue: string,
): Promise<ConfirmationResult> {
  try {
    const now = new Date().toISOString();

    // 1. Complete the monitor task
    await supabase
      .from('workflow_tasks')
      .update({
        status: 'completed',
        confirmation_source: confirmationSource,
        confirmed_at: now,
        confirmation_data: { matched_value: matchedValue, confirmed_by: 'auto' },
        completed_at: now,
        updated_at: now,
      })
      .eq('id', monitorTask.id);

    await logTaskChange(
      supabase,
      workflow.id,
      monitorTask.id,
      monitorTask.title,
      'active',
      'completed',
      { type: 'cron' },
    );

    // 2. Transition workflow to resolved
    const transition = canTransitionWorkflow(workflow.status as WorkflowStatus, 'resolved');

    if (transition.allowed) {
      await supabase
        .from('workflow_instances')
        .update({
          status: 'resolved',
          completed_at: now,
          completed_reason: `Auto-confirmed via ${confirmationSource}`,
          updated_at: now,
        })
        .eq('id', workflow.id);

      await logStatusChange(supabase, workflow.id, workflow.status, 'resolved', { type: 'cron' });
      await logAutoConfirmed(supabase, workflow.id, confirmationSource, matchedValue);

      // 3. Send notification
      await notifyForEvent(supabase, workflow, 'auto_confirmed', {
        confirmed_value: matchedValue,
      });
      await notifyForEvent(supabase, workflow, 'workflow_resolved');
    }

    return { workflow_id: workflow.id, action: 'confirmed', details: matchedValue };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { workflow_id: workflow.id, action: 'error', details: msg };
  }
}

// ── Escalate an overdue workflow ────────────────────────────

export async function escalateWorkflow(
  supabase: SupabaseClient,
  workflow: WorkflowRow,
  monitorTask: TaskRow,
  daysOverdue: number,
  level: 'warning' | 'action',
): Promise<ConfirmationResult> {
  try {
    // Update task metadata with escalation flag
    const metadata = { ...(monitorTask.metadata || {}) };
    if (level === 'warning') {
      metadata.escalation_14d_sent = true;
      metadata.escalation_14d_at = new Date().toISOString();
    } else {
      metadata.escalation_28d_sent = true;
      metadata.escalation_28d_at = new Date().toISOString();
    }

    await supabase
      .from('workflow_tasks')
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', monitorTask.id);

    // Create an alert
    await supabase.from('alerts').insert({
      practice_id: workflow.practice_id,
      severity: level === 'warning' ? 'warning' : 'action',
      title:
        level === 'warning'
          ? `NPPES update pending ${daysOverdue} days`
          : `NPPES update ${daysOverdue} days overdue — action needed`,
      description: `The update for ${workflow.provider_name} (NPI: ${workflow.provider_npi}) has been awaiting confirmation for ${daysOverdue} days.`,
      workflow_id: workflow.id,
      provider_npi: workflow.provider_npi,
      provider_name: workflow.provider_name,
      source: 'confirmation_engine',
    });

    // Log the escalation
    await logEscalation(supabase, workflow.id, level, daysOverdue);

    // Send notification
    const eventType: WorkflowEventType =
      level === 'warning' ? 'escalation_warning' : 'escalation_action';
    await notifyForEvent(supabase, workflow, eventType, {
      days_overdue: daysOverdue,
    });

    return {
      workflow_id: workflow.id,
      action: level === 'warning' ? 'escalation_warning' : 'escalation_action',
      details: `${daysOverdue} days overdue`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { workflow_id: workflow.id, action: 'error', details: msg };
  }
}

// ── Internal: send notifications for an event ───────────────

async function notifyForEvent(
  supabase: SupabaseClient,
  workflow: WorkflowRow,
  eventType: WorkflowEventType,
  extraVars?: Record<string, unknown>,
): Promise<void> {
  const triggers = getNotificationsForEvent(eventType);
  if (triggers.length === 0) return;

  for (const trigger of triggers) {
    const emails = await getPracticeEmails(supabase, workflow.practice_id, trigger.recipient);

    for (const email of emails) {
      await sendWorkflowNotification(supabase, {
        template: trigger.email_template,
        to: email,
        workflow_id: workflow.id,
        vars: {
          provider_name: workflow.provider_name,
          workflow_type: workflow.workflow_type?.replace(/_/g, ' '),
          finding_summary: workflow.finding_summary || undefined,
          ...extraVars,
        },
      });
    }
  }
}
