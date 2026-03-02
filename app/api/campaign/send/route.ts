import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * POST /api/campaign/send
 * 
 * Sends personalized compliance alert emails to providers.
 * Reads from campaign_outreach + registry tables.
 * 
 * Body: { campaign_name: string, batch_size?: number, dry_run?: boolean }
 * 
 * - Pulls unsent records from campaign_outreach
 * - Joins with registry for scan data
 * - Generates personalized HTML email
 * - Sends via SES SMTP
 * - Updates campaign_outreach with sent_at
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const SES_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_PORT = parseInt(process.env.SES_SMTP_PORT || '587');
const SES_USER = process.env.SES_SMTP_USER || '';
const SES_PASS = process.env.SES_SMTP_PASS || '';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.net';
const FROM_NAME = 'KairoLogic Compliance';

interface ScanFinding {
  id?: string;
  name?: string;
  status?: string;
  evidence?: Record<string, unknown>;
}

interface ScanResult {
  score?: number;
  level?: string;
  sb1188_findings?: ScanFinding[];
  hb149_findings?: ScanFinding[];
  npi_checks?: ScanFinding[];
}

async function supabaseQuery(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

async function supabaseUpdate(table: string, matchQuery: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchQuery}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

function parseScanResult(raw: unknown): ScanResult {
  if (!raw) return {};
  let parsed: Record<string, unknown>;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return {}; }
  } else if (typeof raw === 'object') {
    parsed = raw as Record<string, unknown>;
  } else {
    return {};
  }
  return {
    score: parsed.score as number | undefined,
    level: parsed.level as string | undefined,
    sb1188_findings: (parsed.sb1188_findings as ScanFinding[]) || [],
    hb149_findings: (parsed.hb149_findings as ScanFinding[]) || [],
    npi_checks: (parsed.npi_checks as ScanFinding[]) || [],
  };
}

function extractFindingSummary(scan: ScanResult, findingText: string): string {
  // Use the pre-written finding text from the spreadsheet if available
  if (findingText) return findingText;

  // Otherwise generate from scan data
  const sb = scan.sb1188_findings || [];
  const hb = scan.hb149_findings || [];
  const sbFails = sb.filter(f => f.status === 'fail');
  const hbFails = hb.filter(f => f.status === 'fail');

  const parts: string[] = [];

  // Check for foreign data routing
  const dr01 = sb.find(f => f.id === 'DR-01');
  if (dr01?.status === 'fail' && dr01.evidence) {
    const geo = dr01.evidence.geo as string || 'a foreign country';
    const ip = (dr01.evidence.ip as string || '').replace(/\.$/, '');
    parts.push(`Your primary domain (${ip}) resolves to a server geolocated in ${geo}, routing patient data outside the US.`);
  }

  if (hbFails.length > 0) {
    parts.push(`${hbFails.length} AI transparency disclosure${hbFails.length > 1 ? 's are' : ' is'} missing (required by HB 149).`);
  }

  if (parts.length === 0) {
    if (sbFails.length + hbFails.length > 0) {
      parts.push(`We identified ${sbFails.length + hbFails.length} compliance gap${(sbFails.length + hbFails.length) !== 1 ? 's' : ''} on your website that may require remediation under Texas law.`);
    } else {
      parts.push(`Our scan detected areas on your website that may not fully comply with Texas SB 1188 data sovereignty requirements.`);
    }
  }

  return parts.join(' ');
}

function generateEmailHtml(
  practiceName: string,
  score: number,
  findingSummary: string,
  reportUrl: string,
  contactName: string,
  npi: string,
): string {
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const riskLabel = score >= 80 ? 'Sovereign' : score >= 60 ? 'Drift' : 'At Risk';

  const scoreContext = score < 60
    ? 'Scores below 60 indicate immediate compliance risk under Texas law.'
    : score < 80
    ? 'Scores between 60-79 indicate compliance drift that should be addressed promptly.'
    : 'Your practice is largely compliant, but some areas may need attention.';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Compliance Alert - ${practiceName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="padding:16px 24px;background:#0a1628;border-radius:12px 12px 0 0;">
    <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Kairo</span><span style="font-size:18px;font-weight:800;color:#c9a84c;letter-spacing:-0.3px;">Logic</span>
    <span style="float:right;font-size:11px;color:#64748b;line-height:24px;">Texas Healthcare Compliance</span>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:36px 32px;">

    <!-- Greeting -->
    <p style="margin:0 0 24px;font-size:15px;color:#1e293b;line-height:1.7;">
      ${contactName ? `Hi ${contactName},` : `Dear Practice Administrator,`}
    </p>

    <!-- KairoLogic intro + findings -->
    <p style="margin:0 0 24px;font-size:15px;color:#1e293b;line-height:1.7;">
      KairoLogic monitors over 39,000 Texas healthcare provider websites for violations of state data privacy laws. During a recent assessment under <strong>SB 1188</strong> (data sovereignty) and <strong>HB 149</strong> (AI transparency), your practice, <strong>${practiceName}</strong>, was flagged for review.
    </p>

    <!-- Score Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${scoreColor};border-radius:8px;">
    <tr><td style="padding:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:76px;vertical-align:top;">
          <div style="width:60px;height:60px;border-radius:50%;border:3px solid ${scoreColor};text-align:center;line-height:54px;font-size:24px;font-weight:800;color:${scoreColor};">${score}</div>
          <div style="font-size:9px;color:#94a3b8;text-align:center;margin-top:4px;">out of 100</div>
        </td>
        <td style="vertical-align:top;padding-left:16px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:4px;">Compliance Score</div>
          <div style="font-size:15px;font-weight:700;color:${scoreColor};margin-bottom:8px;">${riskLabel}</div>
          <div style="font-size:13px;color:#475569;line-height:1.6;">${findingSummary}</div>
        </td>
      </tr>
      </table>
    </td></tr>
    </table>

    <!-- Score context -->
    <p style="margin:0 0 28px;font-size:13px;color:#64748b;line-height:1.6;font-style:italic;">
      ${scoreContext}
    </p>

    <!-- Main message -->
    <p style="margin:0 0 20px;font-size:15px;color:#1e293b;line-height:1.7;">
      Under SB 1188, healthcare providers that route patient data through foreign servers face fines of up to <strong>$50,000 per violation</strong>. Most practices we've assessed are unaware these issues exist, often caused by common tools like Google Fonts, analytics scripts, or scheduling widgets.
    </p>

    <p style="margin:0 0 32px;font-size:15px;color:#1e293b;line-height:1.7;">
      We've prepared a personalized compliance snapshot for your practice. You can review the full details of your findings and explore options to get your complete remediation report with step-by-step fixes.
    </p>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
    <tr><td align="center">
      <a href="${reportUrl}" style="display:inline-block;background:#c9a84c;color:#0a1628;font-size:15px;font-weight:700;padding:16px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
        View Your Compliance Findings &rarr;
      </a>
    </td></tr>
    </table>

    <!-- PS -->
    <p style="margin:0 0 28px;font-size:13px;color:#64748b;line-height:1.6;border-top:1px solid #e2e8f0;padding-top:20px;">
      <strong>P.S.</strong> Patient awareness of SB 1188 is growing. We recommend reviewing your compliance status before questions arise from patients or regulatory bodies. The link above is unique to your practice and expires in 30 days.
    </p>

    <!-- Signature -->
    <table cellpadding="0" cellspacing="0" style="margin:0;">
    <tr>
      <td style="border-left:3px solid #c9a84c;padding-left:14px;">
        <div style="font-size:14px;font-weight:700;color:#0a1628;">KairoLogic Compliance Team</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">Texas Healthcare Data Sovereignty</div>
        <div style="font-size:12px;margin-top:2px;"><a href="mailto:compliance@kairologic.net" style="color:#c9a84c;text-decoration:none;">compliance@kairologic.net</a></div>
      </td>
    </tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:24px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;">
    <p style="margin:0 0 10px;font-size:12px;color:#64748b;">
      <span style="font-weight:700;color:#1e293b;">Kairo</span><span style="font-weight:700;color:#c9a84c;">Logic</span> &middot; Texas Healthcare Compliance Platform
    </p>
    <p style="margin:0 0 10px;font-size:11px;color:#94a3b8;line-height:1.5;">
      This email was sent because your practice is registered with the National Provider Identifier (NPI) registry and your website was included in a statewide compliance assessment.
    </p>
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      <a href="mailto:compliance@kairologic.net" style="color:#64748b;">compliance@kairologic.net</a> &middot;
      <a href="https://kairologic.net" style="color:#64748b;">kairologic.net</a> &middot;
      <a href="https://kairologic.net/unsubscribe?npi=${npi}" style="color:#64748b;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const password = authHeader?.replace('Bearer ', '') || '';
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const campaignName = body.campaign_name || 'sb1188-foreign-v1';
  const batchSize = Math.min(body.batch_size || 15, 15); // Max 15 per batch
  const dryRun = body.dry_run === true;

  // Fetch unsent outreach records with email
  const outreach = await supabaseQuery(
    'campaign_outreach',
    `campaign_name=eq.${encodeURIComponent(campaignName)}&sent_at=is.null&email_sent_to=neq.null&email_sent_to=neq.&limit=${batchSize}&order=created_at.asc`
  );

  if (!outreach || outreach.length === 0) {
    return NextResponse.json({ message: 'No unsent emails in this campaign', sent: 0 });
  }

  // Set up SMTP transport
  const transporter = nodemailer.createTransport({
    host: SES_HOST,
    port: SES_PORT,
    secure: false,
    auth: { user: SES_USER, pass: SES_PASS },
  });

  const results: Array<{ npi: string; email: string; status: string; error?: string; subject?: string; html?: string }> = [];

  for (const record of outreach) {
    const npi = record.npi as string;
    const email = record.email_sent_to as string;
    const reportCode = record.report_code as string;

    // Skip empty emails
    if (!email || email === 'NULL') {
      results.push({ npi, email: '', status: 'skipped', error: 'No email' });
      continue;
    }

    try {
      // Fetch provider + scan data
      const providers = await supabaseQuery('registry', `npi=eq.${npi}&limit=1`);
      const provider = providers?.[0];
      if (!provider) {
        results.push({ npi, email, status: 'skipped', error: 'Provider not found' });
        continue;
      }

      const practiceNameRaw = (provider.name as string) || 'Healthcare Provider';
      // Title-case: "EMERALD PEDIATRIC CLINIC PA" → "Emerald Pediatric Clinic PA"
      const practiceName = practiceNameRaw.replace(/\b\w+/g, (word) => {
        // Keep short words like PA, LLC, PLLC, INC, DBA uppercase
        if (['PA', 'LLC', 'PLLC', 'INC', 'PC', 'DBA', 'MD', 'DO', 'DC', 'DDS', 'DMD', 'OD', 'DPM'].includes(word.toUpperCase())) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
      const scan = parseScanResult(provider.last_scan_result);
      const score = scan.score ?? (provider.risk_score as number) ?? 50;
      const reportUrl = `https://kairologic.net/report/${reportCode}`;

      // Try to get contact name from spreadsheet data or use generic
      const contactName = ''; // Will use generic greeting

      // Get finding text - check if there's a custom one or generate
      const findingSummary = extractFindingSummary(scan, '');

      const html = generateEmailHtml(practiceName, score, findingSummary, reportUrl, contactName, npi);

      const subject = `We scanned ${practiceName}, here's what we found`;

      if (dryRun) {
        results.push({ npi, email, status: 'dry_run', subject, html });
        continue;
      }

      // Send email
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: email,
        subject,
        html,
        headers: {
          'X-Campaign': campaignName,
          'X-NPI': npi,
        },
      });

      // Update campaign_outreach
      await supabaseUpdate(
        'campaign_outreach',
        `npi=eq.${npi}&campaign_name=eq.${encodeURIComponent(campaignName)}`,
        { sent_at: new Date().toISOString() }
      );

      results.push({ npi, email, status: 'sent' });

      // Small delay between sends (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ npi, email, status: 'error', error: errorMsg });
    }
  }

  const sentCount = results.filter(r => r.status === 'sent').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    campaign: campaignName,
    batch_size: batchSize,
    dry_run: dryRun,
    sent: sentCount,
    errors: errorCount,
    skipped: results.filter(r => r.status === 'skipped').length,
    results,
  });
}
