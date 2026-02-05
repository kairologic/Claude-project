import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Amazon SES SMTP Configuration
const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_PORT = parseInt(process.env.SES_SMTP_PORT || '587');
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.com';
const SES_FROM_NAME = process.env.SES_FROM_NAME || 'KairoLogic Compliance';

function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

async function sendViaSES(to: string, toName: string, subject: string, htmlBody: string, textBody?: string): Promise<boolean> {
  if (!SES_SMTP_USER || !SES_SMTP_PASS) {
    console.error('[Email] SES SMTP credentials not configured');
    return false;
  }

  try {
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.default.createTransport({
      host: SES_SMTP_HOST,
      port: SES_SMTP_PORT,
      secure: false, // STARTTLS on port 587
      auth: {
        user: SES_SMTP_USER,
        pass: SES_SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"${SES_FROM_NAME}" <${SES_FROM_EMAIL}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      html: htmlBody,
      ...(textBody ? { text: textBody } : {}),
    });

    console.log(`[Email] SES sent OK — MessageId: ${info.messageId}, to: ${to}`);
    return true;
  } catch (err) {
    console.error('[Email] SES send failed:', err);
    return false;
  }
}

/**
 * Build a rich HTML results summary email when scan data is provided
 */
function buildResultsSummaryHTML(vars: Record<string, string>): string {
  const score = parseInt(vars.score || '0');
  const scoreColor = score >= 67 ? '#16a34a' : score >= 34 ? '#d97706' : '#dc2626';
  const riskLevel = vars.risk_level || (score >= 67 ? 'Low Risk' : score >= 34 ? 'Moderate Risk' : 'High Risk');
  const failCount = vars.fail_count || '0';
  const warnCount = vars.warn_count || '0';
  const passCount = vars.pass_count || '0';
  const findingsCount = vars.findings_count || '0';
  const isAdmin = vars._force_internal === 'true';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f5f7">
<div style="max-width:640px;margin:0 auto;background:white">
  <!-- Header -->
  <div style="background:#00234E;padding:32px 40px;text-align:center">
    <div style="color:#C5A059;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:8px">KairoLogic Sentry</div>
    <div style="color:white;font-size:24px;font-weight:800">${isAdmin ? 'Scan Activity Alert' : 'Your Compliance Scan Results'}</div>
  </div>

  <!-- Score Section -->
  <div style="padding:32px 40px;text-align:center;border-bottom:1px solid #e5e7eb">
    <div style="font-size:14px;color:#666;margin-bottom:8px">${vars.practice_name || 'Healthcare Provider'}</div>
    <div style="font-size:12px;color:#999;margin-bottom:16px">NPI: ${vars.npi || 'N/A'} ${vars.website_url ? '• ' + vars.website_url : ''}</div>
    <div style="display:inline-block;width:120px;height:120px;border-radius:50%;border:6px solid ${scoreColor};line-height:108px;font-size:48px;font-weight:800;color:${scoreColor}">${score}</div>
    <div style="font-size:16px;font-weight:700;color:${scoreColor};margin-top:12px">${riskLevel}</div>
    <div style="font-size:12px;color:#999;margin-top:4px">out of 100</div>
  </div>

  <!-- Stats Row -->
  <div style="padding:20px 40px;display:flex;border-bottom:1px solid #e5e7eb">
    <div style="flex:1;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#dc2626">${failCount}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px">Failures</div>
    </div>
    <div style="flex:1;text-align:center;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
      <div style="font-size:28px;font-weight:800;color:#d97706">${warnCount}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px">Warnings</div>
    </div>
    <div style="flex:1;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#16a34a">${passCount}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px">Passed</div>
    </div>
  </div>

  <!-- Findings Summary -->
  ${vars.findings_summary ? `
  <div style="padding:24px 40px;border-bottom:1px solid #e5e7eb">
    <div style="font-size:13px;font-weight:700;color:#00234E;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Top Findings (${findingsCount} total)</div>
    <div style="font-size:13px;color:#444;line-height:2;white-space:pre-line">${vars.findings_summary}</div>
  </div>` : ''}

  <!-- CTA -->
  <div style="padding:32px 40px;text-align:center">
    ${score < 75 ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:8px">⚠️ Compliance Gaps Detected</div>
      <div style="font-size:13px;color:#666">Your practice infrastructure shows deviations from TX SB 1188 and HB 149 requirements. Professional remediation is recommended.</div>
    </div>` : `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-size:14px;font-weight:700;color:#16a34a;margin-bottom:8px">✅ Strong Compliance Posture</div>
      <div style="font-size:13px;color:#666">Your practice shows good alignment with Texas data sovereignty requirements.</div>
    </div>`}
    <a href="https://kairologic.net/services" style="display:inline-block;background:#C5A059;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
      ${score < 75 ? 'Get Professional Remediation' : 'View Compliance Services'}
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb">
    <div style="font-size:11px;color:#999">
      KairoLogic Compliance • TX SB 1188 & HB 149<br>
      ${vars.date || new Date().toLocaleDateString()}<br>
      <a href="https://kairologic.net" style="color:#C5A059">kairologic.net</a>
    </div>
  </div>
</div>
</body></html>`;
}

/**
 * POST /api/email/send
 * Body: { template_slug, npi, score?, url?, risk_level?, findings_summary?, findings_count?, fail_count?, warn_count?, pass_count?, variables?: {} }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_slug, npi, score, url, risk_level, findings_summary, findings_count, fail_count, warn_count, pass_count, variables = {} } = body;

    if (!template_slug) {
      return NextResponse.json({ error: 'template_slug required' }, { status: 400 });
    }

    // 1. Fetch template from Supabase
    const templateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/email_templates?slug=eq.${template_slug}&is_active=eq.true&limit=1`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const templates = await templateRes.json();

    if (!templates || templates.length === 0) {
      console.log(`[Email] Template "${template_slug}" not found or inactive`);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = templates[0];

    // 2. Fetch provider data from registry if NPI provided
    let providerVars: Record<string, string> = {};
    if (npi) {
      const providerRes = await fetch(
        `${SUPABASE_URL}/rest/v1/registry?npi=eq.${npi}&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const providers = await providerRes.json();
      if (providers && providers.length > 0) {
        const p = providers[0];
        providerVars = {
          practice_name: p.name || '',
          practice_manager_name: [p.contact_first_name, p.contact_last_name].filter(Boolean).join(' ') || 'Practice Manager',
          npi: p.npi || '',
          website_url: p.url || url || '',
          status_label: p.status_label || (score >= 75 ? 'Substantial Compliance' : 'Critical Drift'),
          report_id: `KL-${Math.floor(Math.random() * 900000) + 100000}-TX`,
          score: String(score || p.risk_score || 0),
          risk_level: risk_level || p.risk_level || '',
          top_violation_summary: p.risk_level === 'High'
            ? 'Foreign data endpoints detected handling PHI outside Texas jurisdiction'
            : 'Minor compliance gaps detected in AI transparency disclosures',
          email: p.email || '',
          city: p.city || '',
        };
      }
    }

    // 3. Merge all variables
    const allVars: Record<string, string> = {
      ...providerVars,
      ...variables,
      npi: npi || providerVars.npi || '',
      score: String(score || providerVars.score || 0),
      risk_level: risk_level || providerVars.risk_level || '',
      website_url: url || providerVars.website_url || '',
      findings_summary: findings_summary || '',
      findings_count: String(findings_count || 0),
      fail_count: String(fail_count || 0),
      warn_count: String(warn_count || 0),
      pass_count: String(pass_count || 0),
      year: String(new Date().getFullYear()),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };

    // 4. Determine if we should use the rich results template
    let subject: string;
    let htmlBody: string;

    if (template_slug === 'immediate-summary' && score !== undefined) {
      const scoreNum = parseInt(String(score));
      subject = allVars._force_internal === 'true'
        ? `[Scan Alert] ${allVars.practice_name || 'NPI ' + npi} scored ${scoreNum}/100`
        : `Your Compliance Score: ${scoreNum}/100 — ${allVars.practice_name || 'Scan Results'}`;
      htmlBody = buildResultsSummaryHTML(allVars);
    } else {
      subject = replaceVariables(template.subject, allVars);
      htmlBody = replaceVariables(template.html_body, allVars);
    }

    // 5. Determine recipient
    const isInternal = template.recipient_type === 'internal' || allVars._force_internal === 'true';
    const recipientEmail = isInternal
      ? 'compliance@kairologic.com'
      : (variables.email || allVars.email || '');

    if (!recipientEmail) {
      console.log('[Email] No recipient email for NPI:', npi, '| provider email from form:', variables.email);
      return NextResponse.json({ error: 'No recipient email', sent: false }, { status: 200 });
    }

    console.log(`[Email] Sending "${template_slug}" to ${recipientEmail} (${isInternal ? 'admin' : 'provider'})`);

    // 6. Send via Amazon SES
    const sent = await sendViaSES(
      recipientEmail,
      allVars.practice_manager_name || allVars.practice_name || 'Provider',
      subject,
      htmlBody
    );

    return NextResponse.json({ success: true, sent, template: template_slug, recipient: recipientEmail });

  } catch (err) {
    console.error('[Email] Error:', err);
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }
}
