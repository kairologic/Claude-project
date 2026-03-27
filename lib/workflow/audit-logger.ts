/**
 * lib/workflow/audit-logger.ts
 *
 * #25 — Workflow event audit trail logger.
 * Central place to log all workflow events to the workflow_events table.
 * Used by API routes, cron jobs, and the confirmation engine.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  WorkflowEvent,
  WorkflowEventType,
  getNotificationsForEvent,
} from './state-machine';

// ── Core logger ─────────────────────────────────────────────

export async function logWorkflowEvent(
  supabase: SupabaseClient,
  event: WorkflowEvent
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('workflow_events')
    .insert({
      workflow_id: event.workflow_id,
      event_type: event.event_type,
      actor_id: event.actor_id || null,
      actor_type: event.actor_type,
      actor_email: event.actor_email || null,
      title: event.title,
      details: event.details || {},
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[audit-logger] Failed to log event: ${error.message}`, event);
    return null;
  }

  return data;
}

// ── Convenience helpers ─────────────────────────────────────

export async function logStatusChange(
  supabase: SupabaseClient,
  workflowId: string,
  from: string,
  to: string,
  actor: { type: 'user' | 'system' | 'cron'; id?: string; email?: string }
): Promise<void> {
  await logWorkflowEvent(supabase, {
    workflow_id: workflowId,
    event_type: 'workflow_status_changed',
    actor_type: actor.type,
    actor_id: actor.id,
    actor_email: actor.email,
    title: `Workflow status changed: ${from} → ${to}`,
    details: { from_status: from, to_status: to },
  });
}

export async function logTaskChange(
  supabase: SupabaseClient,
  workflowId: string,
  taskId: string,
  taskTitle: string,
  from: string,
  to: string,
  actor: { type: 'user' | 'system' | 'cron'; id?: string; email?: string }
): Promise<void> {
  const eventType: WorkflowEventType =
    to === 'completed' ? 'task_completed' :
    to === 'active' ? 'task_activated' :
    'task_status_changed';

  await logWorkflowEvent(supabase, {
    workflow_id: workflowId,
    event_type: eventType,
    actor_type: actor.type,
    actor_id: actor.id,
    actor_email: actor.email,
    title: to === 'completed'
      ? `Task completed: ${taskTitle}`
      : `Task ${from} → ${to}: ${taskTitle}`,
    details: { task_id: taskId, from_status: from, to_status: to },
  });
}

export async function logApproval(
  supabase: SupabaseClient,
  workflowId: string,
  approvedValue: string,
  actor: { type: 'user' | 'system' | 'cron'; id?: string; email?: string }
): Promise<void> {
  await logWorkflowEvent(supabase, {
    workflow_id: workflowId,
    event_type: 'correction_approved',
    actor_type: actor.type,
    actor_id: actor.id,
    actor_email: actor.email,
    title: `Correction approved: "${approvedValue}"`,
    details: { approved_value: approvedValue },
  });
}

export async function logAutoConfirmed(
  supabase: SupabaseClient,
  workflowId: string,
  source: string,
  matchedValue: string
): Promise<void> {
  await logWorkflowEvent(supabase, {
    workflow_id: workflowId,
    event_type: 'auto_confirmed',
    actor_type: 'cron',
    title: `Auto-confirmed via ${source}`,
    details: { source, matched_value: matchedValue },
  });
}

export async function logEscalation(
  supabase: SupabaseClient,
  workflowId: string,
  level: 'warning' | 'action',
  daysOverdue: number
): Promise<void> {
  await logWorkflowEvent(supabase, {
    workflow_id: workflowId,
    event_type: level === 'warning' ? 'escalation_warning' : 'escalation_action',
    actor_type: 'cron',
    title: level === 'warning'
      ? `Overdue warning: ${daysOverdue} days awaiting confirmation`
      : `Escalation: ${daysOverdue} days overdue — manual action needed`,
    details: { days_overdue: daysOverdue, escalation_level: level },
  });
}

// ── Check what notifications should fire ────────────────────

export function shouldNotify(eventType: WorkflowEventType) {
  return getNotificationsForEvent(eventType);
}
