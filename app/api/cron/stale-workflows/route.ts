import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import {
  generateStaleReport,
  bulkCancelStale,
  ESCALATION_TIERS,
} from '@/lib/resilience/stale-workflow-manager';

/**
 * Vercel Cron: Stale Workflow Detection & Escalation
 * Runs weekly (Wednesdays at 8 AM UTC).
 *
 * 1. Scans all active workflows and calculates health scores
 * 2. Escalates workflows that cross tier thresholds:
 *    - 7 days:  nudge (log only for now)
 *    - 14 days: warning alert to practice
 *    - 28 days: action-required alert
 *    - 60 days: flag stale for review
 * 3. Auto-cancels workflows >90 days old
 * 4. Logs a summary report
 */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const startTime = Date.now();
  const log: string[] = [];

  try {
    // 1. Generate stale report across all practices
    const report = await generateStaleReport(supabase);
    log.push(
      `Active workflows: ${report.total_active}. ` +
        `Healthy: ${report.healthy}, Nudge: ${report.nudge}, ` +
        `Warning: ${report.warning}, Action: ${report.action}, Stale: ${report.stale}. ` +
        `Avg health: ${report.average_health_score}`,
    );

    // 2. Create escalation alerts for workflows crossing thresholds
    let alertsCreated = 0;

    for (const wf of report.workflows) {
      if (wf.health.tier === 'healthy' || wf.health.tier === 'nudge') continue;

      // Check if we've already sent an alert at this tier for this workflow
      const { data: existingAlerts } = await supabase
        .from('workflow_events')
        .select('id')
        .eq('workflow_id', wf.id)
        .eq('event_type', `escalation_${wf.health.tier}`)
        .limit(1);

      if (existingAlerts && existingAlerts.length > 0) continue; // Already escalated

      // Fetch the practice_id for this workflow
      const { data: wfData } = await supabase
        .from('workflow_instances')
        .select('practice_id')
        .eq('id', wf.id)
        .single();

      if (!wfData) continue;

      const tierConfig = ESCALATION_TIERS[wf.health.tier as keyof typeof ESCALATION_TIERS];
      if (!tierConfig) continue;

      // Create escalation event
      await supabase.from('workflow_events').insert({
        workflow_id: wf.id,
        event_type: `escalation_${wf.health.tier}`,
        actor_type: 'system',
        title: `Workflow ${wf.health.tier}: ${wf.health.days_open} days open, health score ${wf.health.score}`,
        details: {
          tier: wf.health.tier,
          health_score: wf.health.score,
          days_open: wf.health.days_open,
          days_overdue: wf.health.days_overdue,
          last_activity_days: wf.health.last_activity_days,
          factors: wf.health.factors,
        },
      });

      // Create alert for warning+ tiers
      if (
        wf.health.tier === 'warning' ||
        wf.health.tier === 'action' ||
        wf.health.tier === 'stale'
      ) {
        await supabase.from('alerts').insert({
          practice_website_id: wfData.practice_id,
          alert_type: 'stale_workflow',
          severity: tierConfig.severity,
          title: `${wf.workflow_type} workflow for ${wf.provider_name || 'unknown'} is ${wf.health.tier} (${wf.health.days_open}d open)`,
          message:
            `The ${wf.workflow_type} workflow for ${wf.provider_name || 'unknown provider'} ` +
            `has been open for ${wf.health.days_open} days with a health score of ${wf.health.score}/100. ` +
            (wf.health.days_overdue > 0 ? `It is ${wf.health.days_overdue} days overdue. ` : '') +
            `Last activity: ${wf.health.last_activity_days} days ago. ` +
            `Please review and take action or cancel if no longer needed.`,
          provider_npi: null,
        });
        alertsCreated++;
      }
    }

    log.push(`Escalation alerts created: ${alertsCreated}`);

    // 3. Auto-cancel workflows > 90 days old
    const cleanup = await bulkCancelStale(supabase, { staleDays: 90 });
    if (cleanup.cancelled > 0) {
      log.push(`Auto-cancelled ${cleanup.cancelled} workflows (>90 days old)`);
    }
    if (cleanup.errors.length > 0) {
      log.push(`Cleanup errors: ${cleanup.errors.join('; ')}`);
    }

    return NextResponse.json({
      message: `Stale workflow check complete.`,
      report: {
        total_active: report.total_active,
        healthy: report.healthy,
        nudge: report.nudge,
        warning: report.warning,
        action: report.action,
        stale: report.stale,
        average_health_score: report.average_health_score,
      },
      alerts_created: alertsCreated,
      auto_cancelled: cleanup.cancelled,
      log,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error('[stale-workflows] Fatal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Stale workflow check failed' },
      { status: 500 },
    );
  }
}
