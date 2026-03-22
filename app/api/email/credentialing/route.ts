/**
 * POST /api/email/credentialing
 *
 * Sends credentialing-related notification emails via Amazon SES.
 * Covers onboarding, departure, phantom listing, and completion events.
 *
 * Body: {
 *   event: 'onboarding_started' | 'departure_started' | 'task_overdue' |
 *          'payer_confirmed' | 'onboarding_complete' | 'departure_complete' |
 *          'phantom_listing' | 'phantom_escalation' | 'phantom_final',
 *   provider_name: string,
 *   provider_npi: string,
 *   practice_name: string,
 *   practice_id: string,
 *   recipient_email: string,
 *   recipient_name?: string,
 *   details?: Record<string, any>,  // event-specific data
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_PORT = parseInt(process.env.SES_SMTP_PORT || '587');
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.net';
const SES_FROM_NAME = process.env.SES_FROM_NAME || 'KairoLogic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const DASHBOARD_URL = 'https://kairologic.net';

// ─── Email template definitions ──────────────────────────────────────────────

interface EmailTemplate {
  subject: (vars: Vars) => string;
  body: (vars: Vars) => string;
}

type Vars = Record<string, any>;

const TEMPLATES: Record<string, EmailTemplate> = {
  onboarding_started: {
    subject: (v) => `Credentialing started — ${v.provider_name}`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#00234E;margin-bottom:8px">
        Credentialing Started
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        ${v.provider_name} (NPI: ${v.provider_npi}) has been added to ${v.practice_name}
      </div>
      <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:12px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Assessment Summary</div>
        <div style="font-size:13px;color:#444;line-height:1.8">
          ${v.task_count || '—'} tasks auto-generated<br>
          Est. timeline: ~${v.estimated_weeks || '8-12'} weeks<br>
          ${v.bottleneck ? `Bottleneck: ${v.bottleneck}` : 'No bottleneck identified'}
        </div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'View Dashboard')}
    `),
  },

  departure_started: {
    subject: (v) => `Departure checklist created — ${v.provider_name}`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#00234E;margin-bottom:8px">
        Provider Departure Started
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        ${v.provider_name} (NPI: ${v.provider_npi}) has been marked as departing from ${v.practice_name}
      </div>
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Departure Checklist</div>
        <div style="font-size:13px;color:#444;line-height:1.8">
          ${v.directories_to_clear || '—'} directories to clear<br>
          ${v.task_count || '—'} tasks generated<br>
          90-day phantom monitoring will begin after tasks complete
        </div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'View Departure Checklist')}
    `),
  },

  task_overdue: {
    subject: (v) => `Action needed: ${v.task_title} overdue — ${v.provider_name}`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#dc2626;margin-bottom:8px">
        Task Overdue
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        A credentialing task for ${v.provider_name} has been open for ${v.days_overdue || '3+'} days
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:4px">${v.task_title || 'Task'}</div>
        <div style="font-size:13px;color:#666">${v.task_description || ''}</div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'Complete Task')}
    `),
  },

  payer_confirmed: {
    subject: (v) => `${v.payer_name} listing confirmed — ${v.provider_name}`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#16a34a;margin-bottom:8px">
        Directory Update Confirmed
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        ${v.provider_name} now appears correctly in the ${v.payer_name} provider directory
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:13px;color:#444">
          Auto-monitoring detected the update. This task has been marked complete.
        </div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'View Progress')}
    `),
  },

  onboarding_complete: {
    subject: (v) => `Credentialing complete — ${v.provider_name} is fully onboarded`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#16a34a;margin-bottom:8px">
        Credentialing Complete
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        ${v.provider_name} has been fully credentialed and added to the active roster at ${v.practice_name}
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:13px;color:#444;line-height:1.8">
          All credentialing tasks verified<br>
          Provider status: Active<br>
          Ongoing automated monitoring now in effect
        </div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'View Dashboard')}
    `),
  },

  departure_complete: {
    subject: (v) => `Departure monitoring complete — ${v.provider_name}`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#16a34a;margin-bottom:8px">
        Departure Complete
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        90-day phantom monitoring for ${v.provider_name} is complete
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:13px;color:#444;line-height:1.8">
          Provider removed from ${v.directories_cleared || 'all'} directories<br>
          ${v.remaining_issues ? `Remaining: ${v.remaining_issues}` : 'No phantom listings detected'}
        </div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'View Final Report')}
    `),
  },

  phantom_listing: {
    subject: (v) => `Alert: ${v.provider_name} still listed in ${v.payer_name} — action needed`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#d97706;margin-bottom:8px">
        Phantom Listing Detected
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        ${v.days_since || '30'}+ days after departure, ${v.provider_name} still appears in ${v.payer_name}
      </div>
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:13px;color:#444;line-height:1.8">
          Directory: ${v.payer_name}<br>
          Listed address: ${v.listed_address || 'Unknown'}<br>
          Days since departure: ${v.days_since || '30+'}
        </div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'View Details')}
    `),
  },

  phantom_escalation: {
    subject: (v) => `Urgent: ${v.provider_name} still listed in ${v.directory_count} directories after 60 days`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#dc2626;margin-bottom:8px">
        Phantom Listing Escalation
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        60 days after departure, ${v.provider_name} remains listed in ${v.directory_count} directories
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:8px">DIRECTORIES STILL LISTING PROVIDER</div>
        <div style="font-size:13px;color:#444;line-height:1.8">${v.directories || 'See dashboard for details'}</div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'Take Action')}
    `),
  },

  phantom_final: {
    subject: (v) => `Departure monitoring complete — ${v.provider_name}`,
    body: (v) => wrapInLayout(`
      <div style="font-size:20px;font-weight:800;color:#00234E;margin-bottom:8px">
        90-Day Monitoring Complete
      </div>
      <div style="font-size:14px;color:#666;margin-bottom:24px">
        Final departure status for ${v.provider_name} at ${v.practice_name}
      </div>
      <div style="${v.all_clear ? 'background:#f0fdf4;border:1px solid #bbf7d0' : 'background:#fef2f2;border:1px solid #fecaca'};border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:13px;color:#444;line-height:1.8">
          ${v.all_clear ? 'Provider successfully removed from all directories.' : `Provider still appears in ${v.remaining_count || 'some'} directories. Manual follow-up may be needed.`}
        </div>
      </div>
      ${ctaButton(`${DASHBOARD_URL}/practice/${v.practice_id}`, 'View Report')}
    `),
  },
};

// ─── HTML helpers ────────────────────────────────────────────────────────────

function wrapInLayout(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f5f7">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;margin-top:20px;margin-bottom:20px">
  <div style="background:#00234E;padding:24px 32px;text-align:center">
    <div style="color:#C5A059;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:4px">KairoLogic</div>
    <div style="color:white;font-size:13px;opacity:0.7">Provider Compliance Dashboard</div>
  </div>
  <div style="padding:32px">${content}</div>
  <div style="background:#f8f9fa;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb">
    <div style="font-size:11px;color:#999">
      KairoLogic Compliance · <a href="${DASHBOARD_URL}" style="color:#C5A059;text-decoration:none">kairologic.net</a><br>
      <a href="${DASHBOARD_URL}/settings/notifications" style="color:#999;text-decoration:underline;font-size:10px">Manage notification preferences</a>
    </div>
  </div>
</div>
</body></html>`;
}

function ctaButton(url: string, text: string): string {
  return `<div style="text-align:center;margin-top:24px">
    <a href="${url}" style="display:inline-block;background:#00234E;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">${text}</a>
  </div>`;
}

// ─── Send via SES ────────────────────────────────────────────────────────────

async function sendViaSES(to: string, toName: string, subject: string, html: string): Promise<boolean> {
  if (!SES_SMTP_USER || !SES_SMTP_PASS) {
    console.error('[Credentialing Email] SES SMTP credentials not configured');
    return false;
  }
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: SES_SMTP_HOST,
      port: SES_SMTP_PORT,
      secure: false,
      auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
    });
    const info = await transporter.sendMail({
      from: `"${SES_FROM_NAME}" <${SES_FROM_EMAIL}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      html,
    });
    console.log(`[Credentialing Email] Sent OK — ${info.messageId} to ${to}`);
    return true;
  } catch (err) {
    console.error('[Credentialing Email] Send failed:', err);
    return false;
  }
}

// ─── Log to notification_log ─────────────────────────────────────────────────

async function logNotification(
  event: string,
  subject: string,
  sent: boolean,
  details: Record<string, any>,
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/notification_log`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        notification_type: event,
        channel: 'email',
        severity: event.includes('escalation') || event.includes('overdue') ? 'critical' : 'info',
        subject,
        body_preview: `Provider: ${details.provider_npi || 'N/A'}`,
        practice_id: details.practice_id || null,
        provider_npi: details.provider_npi || null,
        email_sent_at: sent ? new Date().toISOString() : null,
      }),
    });
  } catch {
    // Logging failure should not break the flow
  }
}

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event,
      provider_name,
      provider_npi,
      practice_name,
      practice_id,
      recipient_email,
      recipient_name,
      details = {},
    } = body;

    if (!event || !recipient_email) {
      return NextResponse.json({ error: 'event and recipient_email are required' }, { status: 400 });
    }

    const template = TEMPLATES[event];
    if (!template) {
      return NextResponse.json({ error: `Unknown event type: ${event}` }, { status: 400 });
    }

    const vars: Vars = {
      provider_name: provider_name || 'Provider',
      provider_npi: provider_npi || '',
      practice_name: practice_name || 'Practice',
      practice_id: practice_id || '',
      ...details,
    };

    const subject = template.subject(vars);
    const html = template.body(vars);

    const sent = await sendViaSES(
      recipient_email,
      recipient_name || practice_name || 'Practice Manager',
      subject,
      html,
    );

    // Log to notification_log table
    await logNotification(event, subject, sent, {
      provider_npi,
      practice_id,
    });

    return NextResponse.json({ success: true, sent, event });
  } catch (err) {
    console.error('[Credentialing Email] Error:', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
