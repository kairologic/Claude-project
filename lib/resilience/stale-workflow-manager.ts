/**
 * lib/resilience/stale-workflow-manager.ts
 *
 * #79j-l — Stale workflow detection and management.
 * Escalation tiers, workflow health scoring, and bulk cleanup.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Escalation tiers ──────────────────────────────────────────

export const ESCALATION_TIERS = {
  /** 7 days: auto-nudge assigned user */
  nudge: { days: 7, action: 'nudge', severity: 'info' as const },
  /** 14 days: warning alert to practice admin */
  warning: { days: 14, action: 'escalate_warning', severity: 'warning' as const },
  /** 28 days: action-required alert to all users */
  action: { days: 28, action: 'escalate_action', severity: 'action' as const },
  /** 60 days: auto-flag for bulk review */
  stale: { days: 60, action: 'flag_stale', severity: 'action' as const },
} as const;

export type EscalationTier = keyof typeof ESCALATION_TIERS;

// ── Health score ──────────────────────────────────────────────

export interface WorkflowHealthScore {
  workflow_id: string;
  score: number; // 0-100
  factors: {
    age_penalty: number; // 0-40 based on days open
    overdue_penalty: number; // 0-30 based on how far past due
    stalled_penalty: number; // 0-20 based on task inactivity
    error_penalty: number; // 0-10 based on failed operations
  };
  tier: EscalationTier | 'healthy';
  days_open: number;
  days_overdue: number;
  last_activity_days: number;
}

/**
 * Calculate a health score for a workflow.
 * 100 = perfectly healthy, 0 = critically stale.
 */
export function calculateWorkflowHealth(workflow: {
  created_at: string;
  overdue_at: string | null;
  status: string;
  updated_at: string;
  error_count?: number;
}): WorkflowHealthScore {
  const now = Date.now();
  const created = new Date(workflow.created_at).getTime();
  const daysOpen = Math.floor((now - created) / 86_400_000);

  const overdue = workflow.overdue_at ? new Date(workflow.overdue_at).getTime() : null;
  const daysOverdue = overdue && now > overdue ? Math.floor((now - overdue) / 86_400_000) : 0;

  const lastActivity = new Date(workflow.updated_at).getTime();
  const lastActivityDays = Math.floor((now - lastActivity) / 86_400_000);

  const errorCount = workflow.error_count || 0;

  // Calculate penalties
  const agePenalty = Math.min(40, daysOpen * 0.7);
  const overduePenalty = Math.min(30, daysOverdue * 1.5);
  const stalledPenalty = Math.min(20, lastActivityDays * 1.0);
  const errorPenalty = Math.min(10, errorCount * 2);

  const score = Math.max(
    0,
    Math.round(100 - agePenalty - overduePenalty - stalledPenalty - errorPenalty),
  );

  // Determine escalation tier
  let tier: EscalationTier | 'healthy' = 'healthy';
  if (daysOpen >= ESCALATION_TIERS.stale.days) tier = 'stale';
  else if (daysOpen >= ESCALATION_TIERS.action.days) tier = 'action';
  else if (daysOpen >= ESCALATION_TIERS.warning.days) tier = 'warning';
  else if (daysOpen >= ESCALATION_TIERS.nudge.days) tier = 'nudge';

  return {
    workflow_id: '',
    score,
    factors: {
      age_penalty: Math.round(agePenalty),
      overdue_penalty: Math.round(overduePenalty),
      stalled_penalty: Math.round(stalledPenalty),
      error_penalty: Math.round(errorPenalty),
    },
    tier,
    days_open: daysOpen,
    days_overdue: daysOverdue,
    last_activity_days: lastActivityDays,
  };
}

// ── Stale workflow detection ─────────────────────────────────

export interface StaleWorkflowReport {
  total_active: number;
  healthy: number;
  nudge: number;
  warning: number;
  action: number;
  stale: number;
  average_health_score: number;
  workflows: Array<{
    id: string;
    provider_name: string | null;
    workflow_type: string;
    status: string;
    health: WorkflowHealthScore;
  }>;
}

/**
 * Scan all active workflows and generate a health report.
 * Used by the admin dashboard and weekly health check cron.
 */
export async function generateStaleReport(
  supabase: SupabaseClient,
  practiceId?: string,
): Promise<StaleWorkflowReport> {
  let query = supabase
    .from('workflow_instances')
    .select('id, provider_name, workflow_type, status, created_at, updated_at, overdue_at')
    .in('status', ['action_needed', 'in_progress', 'awaiting']);

  if (practiceId) {
    query = query.eq('practice_id', practiceId);
  }

  const { data: workflows, error } = await query;

  if (error || !workflows) {
    return {
      total_active: 0,
      healthy: 0,
      nudge: 0,
      warning: 0,
      action: 0,
      stale: 0,
      average_health_score: 100,
      workflows: [],
    };
  }

  const scored = workflows.map((wf) => {
    const health = calculateWorkflowHealth(wf);
    health.workflow_id = wf.id;
    return {
      id: wf.id,
      provider_name: wf.provider_name,
      workflow_type: wf.workflow_type,
      status: wf.status,
      health,
    };
  });

  // Sort by health score ascending (worst first)
  scored.sort((a, b) => a.health.score - b.health.score);

  const totalScore = scored.reduce((sum, s) => sum + s.health.score, 0);

  return {
    total_active: scored.length,
    healthy: scored.filter((s) => s.health.tier === 'healthy').length,
    nudge: scored.filter((s) => s.health.tier === 'nudge').length,
    warning: scored.filter((s) => s.health.tier === 'warning').length,
    action: scored.filter((s) => s.health.tier === 'action').length,
    stale: scored.filter((s) => s.health.tier === 'stale').length,
    average_health_score: scored.length > 0 ? Math.round(totalScore / scored.length) : 100,
    workflows: scored,
  };
}

// ── Bulk cleanup ─────────────────────────────────────────────

export interface BulkCleanupResult {
  cancelled: number;
  errors: string[];
}

/**
 * Cancel all workflows that have been stale for > threshold days.
 * Used for periodic cleanup of abandoned workflows.
 */
export async function bulkCancelStale(
  supabase: SupabaseClient,
  options: {
    staleDays?: number;
    practiceId?: string;
    dryRun?: boolean;
  } = {},
): Promise<BulkCleanupResult> {
  const { staleDays = 90, practiceId, dryRun = false } = options;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);

  let query = supabase
    .from('workflow_instances')
    .select('id, provider_name, workflow_type, status, created_at')
    .in('status', ['action_needed', 'in_progress', 'awaiting'])
    .lt('created_at', cutoff.toISOString());

  if (practiceId) {
    query = query.eq('practice_id', practiceId);
  }

  const { data: staleWfs, error } = await query;

  if (error || !staleWfs || staleWfs.length === 0) {
    return { cancelled: 0, errors: error ? [error.message] : [] };
  }

  if (dryRun) {
    console.log(
      `[DRY RUN] Would cancel ${staleWfs.length} stale workflows (>${staleDays} days old)`,
    );
    return { cancelled: staleWfs.length, errors: [] };
  }

  const ids = staleWfs.map((w) => w.id);
  const { error: updateError } = await supabase
    .from('workflow_instances')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      completed_reason: `Auto-cancelled: stale for >${staleDays} days`,
    })
    .in('id', ids);

  if (updateError) {
    return { cancelled: 0, errors: [updateError.message] };
  }

  // Log cancellation events
  const events = staleWfs.map((wf) => ({
    workflow_id: wf.id,
    event_type: 'workflow_cancelled',
    actor_type: 'system',
    title: `Auto-cancelled: stale for >${staleDays} days`,
    details: {
      cancellation_reason: 'stale_cleanup',
      days_open: Math.floor((Date.now() - new Date(wf.created_at).getTime()) / 86_400_000),
    },
  }));

  await supabase.from('workflow_events').insert(events);

  return { cancelled: ids.length, errors: [] };
}
