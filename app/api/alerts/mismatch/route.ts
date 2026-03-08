import { NextRequest, NextResponse } from 'next/server';

/**
 * Mismatch Alert Email API
 * POST /api/alerts/mismatch
 *
 * Sends alert emails to practice managers when new delta events are detected.
 * Called by the scan scheduler after delta detection completes.
 *
 * Body: { practice_website_id: string }
 *
 * Finds unsent delta events for the practice, composes a summary email,
 * sends via SES, and marks events as alert_sent = true.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
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
      Prefer: options.method === 'GET' || !options.method ? 'return=representation' : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB error: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

export async function POST(request: NextRequest) {
  try {
    const { practice_website_id } = await request.json();
    if (!practice_website_id) {
      return NextResponse.json({ error: 'practice_website_id required' }, { status: 400 });
    }

    // 1. Get practice info
    const practices = await db(
      `practice_websites?id=eq.${practice_website_id}&select=id,name,url,organization_id`
    );
    if (!practices?.length) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }
    const practice = practices[0];

    // 2. Check if practice has a claimed organization (with email)
    if (!practice.organization_id) {
      return NextResponse.json({ sent: false, reason: 'Practice not claimed, no org to alert' });
    }

    const orgs = await db(
      `organizations?id=eq.${practice.organization_id}&select=contact_email,name`
    );
    if (!orgs?.length || !orgs[0].contact_email) {
      return NextResponse.json({ sent: false, reason: 'No contact email for organization' });
    }
    const orgEmail = orgs[0].contact_email;

    // 3. Fetch unsent delta events
    const events = await db(
      `nppes_delta_events?practice_website_id=eq.${practice_website_id}&alert_sent=eq.false&order=detected_at.desc&limit=50`
    );
    if (!events?.length) {
      return NextResponse.json({ sent: false, reason: 'No new delta events to alert on' });
    }

    // 4. Fetch provider names for the NPIs
    const npis = [...new Set(events.map((e: any) => e.npi))] as string[];
    const npiList = npis.map((n: string) => `"${n}"`).join(',');
    const providers = await db(
      `providers?npi=in.(${npiList})&select=npi,first_name,last_name`
    );
    const nameMap = new Map(
      providers.map((p: any) => [p.npi, `${p.first_name || ''} ${p.last_name || ''}`.trim()])
    );

    // 5. Build email content
    const mismatchSummary = events.map((e: any) => {
      const name = nameMap.get(e.npi) || e.npi;
      return {
        name,
        npi: e.npi,
        field: e.field_name,
        oldValue: e.old_value || '—',
        newValue: e.new_value || '—',
        confidence: e.confidence,
        corroborated: e.corroboration_count >= 2,
      };
    });

    // Group by provider
    const byProvider = new Map<string, typeof mismatchSummary>();
    for (const m of mismatchSummary) {
      const key = m.npi;
      if (!byProvider.has(key)) byProvider.set(key, []);
      byProvider.get(key)!.push(m);
    }

    const providerCount = byProvider.size;
    const mismatchCount = events.length;
    const practiceName = practice.name || 'Your Practice';

    const providerRows = [...byProvider.entries()].map(([npi, mismatches]) => {
      const name = mismatches[0].name;
      const fields = mismatches.map((m: any) =>
        `<li style="margin-bottom:4px;"><strong>${m.field}</strong>: <span style="color:#ef4444;text-decoration:line-through;">${m.oldValue}</span> → <span style="color:#10b981;">${m.newValue}</span>${m.corroborated ? ' <span style="color:#10b981;font-size:11px;">(corroborated)</span>' : ''}</li>`
      ).join('');
      return `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:8px;">${name} <span style="color:#94a3b8;font-weight:400;font-size:12px;">(${npi})</span></div>
          <ul style="margin:0;padding-left:20px;font-size:13px;color:#475569;">${fields}</ul>
        </div>`;
    }).join('');

    const dashboardUrl = `${BASE_URL}/practice/${practice_website_id}`;

    const htmlBody = `
      <div style="font-family:'Inter',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#ffffff;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:20px;font-weight:800;color:#0B1E3D;">KAIRO</span><span style="font-size:20px;font-weight:800;color:#D4A574;">LOGIC</span>
        </div>
        <div style="background:#0B1E3D;border-radius:12px;padding:24px;margin-bottom:24px;">
          <div style="color:#D4A574;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Provider Data Alert</div>
          <div style="color:#ffffff;font-size:18px;font-weight:700;margin-bottom:4px;">${mismatchCount} mismatch${mismatchCount > 1 ? 'es' : ''} detected — ${practiceName}</div>
          <div style="color:#94a3b8;font-size:13px;">${providerCount} provider${providerCount > 1 ? 's' : ''} with NPPES record discrepancies</div>
        </div>
        ${providerRows}
        <div style="text-align:center;margin-top:24px;">
          <a href="${dashboardUrl}" style="display:inline-block;background:#D4A574;color:#0B1E3D;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;">
            View Practice Dashboard
          </a>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
          KairoLogic Provider Data Intelligence · kairologic.net
        </div>
      </div>`;

    // 6. Send email
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: SES_SMTP_HOST,
      port: 587,
      secure: false,
      auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"KairoLogic Alerts" <${SES_FROM_EMAIL}>`,
      to: orgEmail,
      subject: `${mismatchCount} provider record mismatch${mismatchCount > 1 ? 'es' : ''} detected — ${practiceName}`,
      html: htmlBody,
    });

    // 7. Mark events as alert_sent
    const eventIds = events.map((e: any) => `"${e.id}"`).join(',');
    await db(`nppes_delta_events?id=in.(${eventIds})`, {
      method: 'PATCH',
      body: JSON.stringify({
        alert_sent: true,
        alert_sent_at: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      sent: true,
      to: orgEmail,
      mismatches: mismatchCount,
      providers: providerCount,
    });

  } catch (err) {
    console.error('[Alert API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Alert failed' },
      { status: 500 },
    );
  }
}
