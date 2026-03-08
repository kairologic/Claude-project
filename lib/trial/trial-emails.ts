// lib/trial/trial-emails.ts
// ═══ Reverse Trial Email Sequence ═══
//
// Day 0:  Welcome email (sent by claim API, not here)
// Day 7:  Value summary — "Here's what we found this week"
// Day 12: Expiry warning — "Your premium access expires in 2 days"
// Day 14: Downgrade notice — "Your trial ended, here's what you're missing"
// Day 21: Nudge — "Your 3 unresolved mismatches are still open"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.com';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!SES_SMTP_USER || !SES_SMTP_PASS) return;
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: SES_SMTP_HOST, port: 587, secure: false,
    auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"KairoLogic" <${SES_FROM_EMAIL}>`,
    to, subject, html,
  });
}

// ── Email wrapper ────────────────────────────────────────

function wrap(body: string): string {
  return `<div style="font-family:'Inter',system-ui,sans-serif;max-width:560px;margin:0 auto;background:#fff;">
  <div style="padding:32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:18px;font-weight:800;color:#0B1E3D;">KAIRO</span><span style="font-size:18px;font-weight:800;color:#D4A574;">LOGIC</span>
    </div>
    ${body}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
      KairoLogic Provider Data Intelligence &middot; kairologic.net
    </div>
  </div></div>`;
}

function cta(url: string, text: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:#D4A574;color:#0B1E3D;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:14px;">${text}</a>
  </div>`;
}

// ── Gather practice stats for email personalization ──────

interface PracticeStats {
  practice_name: string;
  practice_url: string;
  dashboard_url: string;
  total_providers: number;
  mismatch_count: number;
  forms_generated: number;
  forms_confirmed: number;
  departed_count: number;
  new_providers: number;
}

async function gatherStats(orgId: string): Promise<PracticeStats | null> {
  const orgs = await db(`organizations?id=eq.${orgId}&select=id,name,primary_practice_group_id`);
  if (!orgs?.length) return null;

  const practices = await db(
    `practice_websites?organization_id=eq.${orgId}&select=id,name,url,provider_count,mismatch_count&limit=1`
  );
  if (!practices?.length) return null;
  const p = practices[0];

  const forms = await db(
    `update_requests?organization_id=eq.${orgId}&select=status`
  );
  const formsGenerated = forms?.length || 0;
  const formsConfirmed = forms?.filter((f: any) => f.status === 'CONFIRMED').length || 0;

  const departed = await db(
    `practice_providers?practice_website_id=eq.${p.id}&status=eq.DEPARTED&select=id`
  );

  return {
    practice_name: p.name || orgs[0].name || 'Your Practice',
    practice_url: p.url || '',
    dashboard_url: `${BASE_URL}/practice/${p.id}`,
    total_providers: p.provider_count || 0,
    mismatch_count: p.mismatch_count || 0,
    forms_generated: formsGenerated,
    forms_confirmed: formsConfirmed,
    departed_count: departed?.length || 0,
    new_providers: 0,
  };
}

// ── Day 7: Value Summary ─────────────────────────────────

export async function sendDay7Email(orgId: string, email: string): Promise<void> {
  const stats = await gatherStats(orgId);
  if (!stats) return;

  const subject = `Your first week: ${stats.mismatch_count} mismatches found \u2014 ${stats.practice_name}`;

  const findings: string[] = [];
  if (stats.mismatch_count > 0) findings.push(`<strong>${stats.mismatch_count}</strong> NPPES mismatches detected`);
  if (stats.forms_generated > 0) findings.push(`<strong>${stats.forms_generated}</strong> correction form${stats.forms_generated > 1 ? 's' : ''} generated`);
  if (stats.forms_confirmed > 0) findings.push(`<strong>${stats.forms_confirmed}</strong> update${stats.forms_confirmed > 1 ? 's' : ''} confirmed live in NPPES`);
  if (stats.departed_count > 0) findings.push(`<strong>${stats.departed_count}</strong> departed provider${stats.departed_count > 1 ? 's' : ''} detected`);

  const findingsHtml = findings.length > 0
    ? findings.map(f => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">\u2713 ${f}</div>`).join('')
    : '<p style="color:#64748b;font-size:14px;">No new findings this week. Your records look clean.</p>';

  const html = wrap(`
    <div style="background:#0B1E3D;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="color:#D4A574;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Week 1 Summary</div>
      <div style="color:#fff;font-size:18px;font-weight:700;margin-top:8px;">${stats.practice_name}</div>
      <div style="color:#94a3b8;font-size:13px;margin-top:4px;">${stats.total_providers} providers monitored \u00B7 7 days remaining on trial</div>
    </div>
    <div style="margin-bottom:24px;">${findingsHtml}</div>
    <p style="color:#64748b;font-size:13px;">Your premium access includes unlimited form generation, real-time alerts, and auto-confirmation monitoring. These features are active for 7 more days.</p>
    ${cta(stats.dashboard_url, 'View Your Dashboard')}
  `);

  await sendEmail(email, subject, html);
  await db(`organizations?id=eq.${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify({ trial_email_day7_sent: true }),
  });
}

// ── Day 12: Expiry Warning ───────────────────────────────

export async function sendDay12Email(orgId: string, email: string): Promise<void> {
  const stats = await gatherStats(orgId);
  if (!stats) return;

  const subject = `Your premium access expires in 2 days \u2014 ${stats.practice_name}`;

  const html = wrap(`
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="color:#92400e;font-size:16px;font-weight:700;margin-bottom:8px;">Premium access expires in 2 days</div>
      <div style="color:#78350f;font-size:14px;line-height:1.6;">
        After your trial ends, you'll still see your dashboard and mismatch findings. But these features will be locked:
      </div>
    </div>
    <div style="margin:20px 0;">
      <div style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">\u274C NPPES correction form generation</div>
      <div style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">\u274C Bulk form downloads</div>
      <div style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">\u274C Real-time mismatch alerts</div>
      <div style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">\u274C Auto-confirmation monitoring</div>
      <div style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">\u274C Roster surveillance (departed provider alerts)</div>
    </div>
    ${stats.mismatch_count > 0 ? `<p style="color:#ef4444;font-size:14px;font-weight:600;">You currently have ${stats.mismatch_count} unresolved mismatches.</p>` : ''}
    ${cta(stats.dashboard_url + '?upgrade=true', 'Keep Premium Access \u2192 $99/mo')}
    <p style="color:#94a3b8;font-size:12px;text-align:center;">Founder's rate. Locked for 12 months. First 10 customers only.</p>
  `);

  await sendEmail(email, subject, html);
  await db(`organizations?id=eq.${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify({ trial_email_day12_sent: true }),
  });
}

// ── Day 14: Downgrade Notice ─────────────────────────────

export async function sendDay14Email(orgId: string, email: string): Promise<void> {
  const stats = await gatherStats(orgId);
  if (!stats) return;

  const subject = `Trial ended \u2014 ${stats.mismatch_count} mismatches still unresolved`;

  const html = wrap(`
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="color:#991b1b;font-size:16px;font-weight:700;margin-bottom:8px;">Your premium trial has ended</div>
      <div style="color:#7f1d1d;font-size:14px;">Your dashboard is still active, but form generation and alerts are now locked.</div>
    </div>
    ${stats.mismatch_count > 0 ? `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <div style="font-size:36px;font-weight:800;color:#ef4444;text-align:center;">${stats.mismatch_count}</div>
      <div style="font-size:13px;color:#64748b;text-align:center;">provider record mismatches remain unresolved</div>
      <div style="font-size:12px;color:#94a3b8;text-align:center;margin-top:8px;">Estimated monthly claim risk: $${(stats.mismatch_count * 118 * 3).toLocaleString()}</div>
    </div>` : ''}
    <p style="color:#334155;font-size:14px;line-height:1.6;">
      During your trial, we monitored ${stats.total_providers} providers${stats.forms_generated > 0 ? `, generated ${stats.forms_generated} correction forms` : ''}${stats.forms_confirmed > 0 ? `, and confirmed ${stats.forms_confirmed} NPPES updates` : ''}. That monitoring is now paused.
    </p>
    ${cta(stats.dashboard_url + '?upgrade=true', 'Reactivate for $99/mo')}
    <p style="color:#94a3b8;font-size:12px;text-align:center;">Founder's rate. Cancel anytime. No long-term commitment.</p>
  `);

  await sendEmail(email, subject, html);
  await db(`organizations?id=eq.${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify({ trial_email_day14_sent: true }),
  });
}

// ── Day 21: Final Nudge ──────────────────────────────────

export async function sendDay21Email(orgId: string, email: string): Promise<void> {
  const stats = await gatherStats(orgId);
  if (!stats) return;
  if (stats.mismatch_count === 0) return; // no nudge if no mismatches

  const subject = `${stats.mismatch_count} mismatches still open \u2014 ${stats.practice_name}`;

  const html = wrap(`
    <p style="color:#334155;font-size:14px;line-height:1.6;">
      It's been a week since your trial ended. Your dashboard at <strong>${stats.practice_name}</strong> still shows <strong style="color:#ef4444;">${stats.mismatch_count} unresolved NPPES mismatches</strong>.
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;">
      Each unresolved mismatch increases the risk of pended claims, delayed credentialing, and audit findings. The correction forms we generated during your trial are still available \u2014 you just need to reactivate access to download them.
    </p>
    ${cta(stats.dashboard_url + '?upgrade=true', 'Fix These Mismatches \u2192 $99/mo')}
    <p style="color:#94a3b8;font-size:12px;text-align:center;">This is the last email about your trial. Your dashboard stays accessible.</p>
  `);

  await sendEmail(email, subject, html);
  await db(`organizations?id=eq.${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify({ trial_email_day21_sent: true }),
  });
}

// ── Sequence Runner ──────────────────────────────────────

export interface SequenceResult {
  day7_sent: number;
  day12_sent: number;
  day14_sent: number;
  day21_sent: number;
  errors: number;
}

/**
 * Run all pending trial email sequences.
 * Called daily by GitHub Actions.
 */
export async function runTrialEmailSequence(): Promise<SequenceResult> {
  const result: SequenceResult = { day7_sent: 0, day12_sent: 0, day14_sent: 0, day21_sent: 0, errors: 0 };
  const now = Date.now();

  // Fetch all orgs with trials (active or recently expired)
  const orgs = await db(
    `organizations?trial_start=not.is.null&trial_status=in.(ACTIVE,EXPIRING,EXPIRED)&select=id,contact_email,trial_start,trial_end,trial_status,trial_email_day7_sent,trial_email_day12_sent,trial_email_day14_sent,trial_email_day21_sent`
  );

  if (!orgs?.length) return result;

  for (const org of orgs) {
    if (!org.contact_email || !org.trial_start) continue;

    const elapsed = Math.floor((now - new Date(org.trial_start).getTime()) / 86400000);

    try {
      if (elapsed >= 7 && !org.trial_email_day7_sent) {
        await sendDay7Email(org.id, org.contact_email);
        result.day7_sent++;
      }
      if (elapsed >= 12 && !org.trial_email_day12_sent) {
        await sendDay12Email(org.id, org.contact_email);
        result.day12_sent++;
      }
      if (elapsed >= 14 && !org.trial_email_day14_sent) {
        await sendDay14Email(org.id, org.contact_email);
        result.day14_sent++;
      }
      if (elapsed >= 21 && !org.trial_email_day21_sent) {
        await sendDay21Email(org.id, org.contact_email);
        result.day21_sent++;
      }
    } catch (err) {
      console.error(`[Trial Email] Error for org ${org.id}:`, err);
      result.errors++;
    }
  }

  return result;
}
