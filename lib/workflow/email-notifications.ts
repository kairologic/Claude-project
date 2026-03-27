/**
 * lib/workflow/email-notifications.ts
 *
 * #76 / #30-notif — Email notification system via Resend API.
 * Sends transactional emails for workflow events:
 *   - Task created / needs attention
 *   - Workflow overdue warnings
 *   - Auto-confirmed
 *   - Workflow resolved
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logWorkflowEvent } from './audit-logger';

// ── Config ──────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'KairoLogic <notifications@kairologic.net>';
const DASHBOARD_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kairologic.net';

// ── Template definitions ────────────────────────────────────

type TemplateVars = {
  provider_name?: string;
  workflow_type?: string;
  task_title?: string;
  practice_name?: string;
  workflow_url?: string;
  days_overdue?: number;
  confirmed_value?: string;
  finding_summary?: string;
};

const TEMPLATES: Record<string, {
  subject: (v: TemplateVars) => string;
  html: (v: TemplateVars) => string;
}> = {
  workflow_created: {
    subject: (v) => `New ${v.workflow_type || 'workflow'} for ${v.provider_name || 'a provider'}`,
    html: (v) => emailWrapper(`
      <h2 style="color:#0F1E2E;margin:0 0 16px">New Workflow Created</h2>
      <p>A new <strong>${v.workflow_type || 'workflow'}</strong> has been created for
        <strong>${v.provider_name || 'a provider'}</strong>.</p>
      ${v.finding_summary ? `<p style="color:#5A6472;font-size:14px">${v.finding_summary}</p>` : ''}
      <a href="${v.workflow_url}" style="display:inline-block;background:#D4A017;color:#0F1E2E;
        text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:12px">
        View in Dashboard
      </a>
    `),
  },

  task_needs_attention: {
    subject: (v) => `Action needed: ${v.task_title || 'A task'} for ${v.provider_name || 'provider'}`,
    html: (v) => emailWrapper(`
      <h2 style="color:#0F1E2E;margin:0 0 16px">Task Needs Your Attention</h2>
      <p>The following task is ready for action:</p>
      <div style="background:#FDF6E3;border:1px solid #D4A017;border-radius:8px;padding:16px;margin:16px 0">
        <strong style="color:#0F1E2E">${v.task_title || 'Task'}</strong>
        <br><span style="color:#5A6472;font-size:13px">Provider: ${v.provider_name || 'N/A'}</span>
      </div>
      <a href="${v.workflow_url}" style="display:inline-block;background:#D4A017;color:#0F1E2E;
        text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">
        Take Action
      </a>
    `),
  },

  auto_confirmed: {
    subject: (v) => `Confirmed: ${v.provider_name || 'Provider'} update verified`,
    html: (v) => emailWrapper(`
      <h2 style="color:#1A9E6D;margin:0 0 16px">✓ Update Confirmed</h2>
      <p>Great news! The update for <strong>${v.provider_name || 'provider'}</strong>
        has been automatically verified.</p>
      ${v.confirmed_value ? `
        <div style="background:#E6F7F2;border:1px solid #1A9E6D;border-radius:8px;padding:16px;margin:16px 0">
          <strong>Confirmed value:</strong> ${v.confirmed_value}
        </div>` : ''}
      <p style="color:#5A6472;font-size:14px">No further action is needed. The workflow has been resolved.</p>
      <a href="${v.workflow_url}" style="display:inline-block;background:#0F1E2E;color:#FFFFFF;
        text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:8px">
        View Details
      </a>
    `),
  },

  overdue_warning: {
    subject: (v) => `Overdue: ${v.provider_name || 'Provider'} update pending ${v.days_overdue || ''} days`,
    html: (v) => emailWrapper(`
      <h2 style="color:#D4A017;margin:0 0 16px">⚠ Workflow Overdue</h2>
      <p>The update for <strong>${v.provider_name || 'provider'}</strong> has been
        awaiting confirmation for <strong>${v.days_overdue || '14+'} days</strong>.</p>
      <p style="color:#5A6472;font-size:14px">
        This may indicate the update wasn't applied correctly, or NPPES processing is delayed.
        Consider checking the NPPES portal directly.
      </p>
      <a href="${v.workflow_url}" style="display:inline-block;background:#D4A017;color:#0F1E2E;
        text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:8px">
        Review Workflow
      </a>
    `),
  },

  overdue_action: {
    subject: (v) => `URGENT: ${v.provider_name || 'Provider'} update ${v.days_overdue || '28+'}+ days overdue`,
    html: (v) => emailWrapper(`
      <h2 style="color:#D64545;margin:0 0 16px">🚨 Manual Action Required</h2>
      <p>The update for <strong>${v.provider_name || 'provider'}</strong> has been
        awaiting confirmation for <strong>${v.days_overdue || '28+'} days</strong>.</p>
      <p>Automatic monitoring has not detected the expected change. Please:</p>
      <ol style="color:#0F1E2E;line-height:1.8">
        <li>Log into the NPPES portal and verify the update was applied</li>
        <li>If not applied, resubmit the correction</li>
        <li>If applied but not detected, manually resolve the workflow</li>
      </ol>
      <a href="${v.workflow_url}" style="display:inline-block;background:#D64545;color:#FFFFFF;
        text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:8px">
        Take Action Now
      </a>
    `),
  },

  workflow_resolved: {
    subject: (v) => `Resolved: ${v.provider_name || 'Provider'} ${v.workflow_type || 'workflow'} complete`,
    html: (v) => emailWrapper(`
      <h2 style="color:#1A9E6D;margin:0 0 16px">✓ Workflow Resolved</h2>
      <p>The <strong>${v.workflow_type || 'workflow'}</strong> for
        <strong>${v.provider_name || 'provider'}</strong> has been completed and resolved.</p>
      <p style="color:#5A6472;font-size:14px">All tasks are done. No further action needed.</p>
      <a href="${v.workflow_url}" style="display:inline-block;background:#0F1E2E;color:#FFFFFF;
        text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:8px">
        View Summary
      </a>
    `),
  },
};

// ── Email wrapper (shared layout) ───────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border-radius:12px;overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#0F1E2E;padding:20px 28px">
      <span style="color:#D4A017;font-weight:700;font-size:18px;letter-spacing:0.5px">KairoLogic</span>
    </div>
    <div style="padding:28px">
      ${content}
    </div>
    <div style="border-top:1px solid #E8EAED;padding:16px 28px;text-align:center">
      <span style="font-size:12px;color:#9AA3AE">
        You're receiving this because you have an account on
        <a href="${DASHBOARD_URL}" style="color:#185FA5;text-decoration:none">KairoLogic</a>.
      </span>
    </div>
  </div>
</body>
</html>`;
}

// ── Send email via Resend ───────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[email] Resend error ${res.status}: ${err}`);
      return { success: false, error: `Resend ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] Send failed: ${message}`);
    return { success: false, error: message };
  }
}

// ── Public API ──────────────────────────────────────────────

export async function sendWorkflowNotification(
  supabase: SupabaseClient,
  opts: {
    template: string;
    to: string;
    workflow_id: string;
    vars: TemplateVars;
  }
): Promise<boolean> {
  const tpl = TEMPLATES[opts.template];
  if (!tpl) {
    console.error(`[email] Unknown template: ${opts.template}`);
    return false;
  }

  // Build the workflow URL
  const vars: TemplateVars = {
    ...opts.vars,
    workflow_url: opts.vars.workflow_url || `${DASHBOARD_URL}/dashboard?workflow=${opts.workflow_id}`,
  };

  const subject = tpl.subject(vars);
  const html = tpl.html(vars);

  const result = await sendViaResend(opts.to, subject, html);

  // Log the notification event
  await logWorkflowEvent(supabase, {
    workflow_id: opts.workflow_id,
    event_type: 'notification_sent',
    actor_type: 'system',
    title: `Email sent: "${subject}" → ${opts.to}`,
    details: {
      template: opts.template,
      to: opts.to,
      success: result.success,
      message_id: result.messageId,
      error: result.error,
    },
  });

  return result.success;
}

// ── Resolve recipients for a practice ───────────────────────

export async function getPracticeEmails(
  supabase: SupabaseClient,
  practiceId: string,
  recipientType: 'practice_admin' | 'assigned_user' | 'all_practice_users'
): Promise<string[]> {
  // For now, look up practice_users or the practice contact email
  if (recipientType === 'practice_admin' || recipientType === 'all_practice_users') {
    const { data } = await supabase
      .from('practice_users')
      .select('email, role')
      .eq('practice_id', practiceId)
      .eq('is_active', true);

    if (data && data.length > 0) {
      if (recipientType === 'practice_admin') {
        const admins = data.filter((u: { role: string }) => u.role === 'admin' || u.role === 'owner');
        return admins.length > 0
          ? admins.map((u: { email: string }) => u.email)
          : [data[0].email]; // fallback to first user
      }
      return data.map((u: { email: string }) => u.email);
    }
  }

  // Fallback: check practices table for contact_email
  const { data: practice } = await supabase
    .from('practices')
    .select('contact_email, name')
    .eq('id', practiceId)
    .single();

  return practice?.contact_email ? [practice.contact_email] : [];
}
