import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/email/purchase-confirmation
 *
 * Sends a post-purchase confirmation email to the provider with:
 * 1. Purchase confirmation + receipt
 * 2. Direct link to download their report (success page with auto-download)
 * 3. Dashboard access link (with token)
 * 4. Widget embed code + installation guide
 * 5. Support contact info
 *
 * Called from Stripe webhook after checkout.session.completed
 *
 * Body: { npi, email, product, practiceName, score, dashboardToken }
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'ravi@kairologic.net';
const FROM_NAME = process.env.SES_FROM_NAME || 'KairoLogic Compliance';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';
const AUTH_KEY = process.env.ADMIN_API_KEY || process.env.CRON_SECRET || '';

function titleCase(str: string): string {
  return str.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function buildConfirmationEmail(params: {
  practiceName: string;
  npi: string;
  email: string;
  product: string;
  score: number;
  dashboardToken: string;
}): string {
  const { practiceName, npi, product, score, dashboardToken } = params;

  const productLabel = product === 'safe-harbor' ? 'Safe Harbor Compliance Bundle' : 'Sovereignty Audit Report';
  const price = product === 'safe-harbor' ? '$249' : '$149';
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const successUrl = `${BASE_URL}/payment/success?npi=${npi}&product=${product}`;
  const dashboardUrl = `${BASE_URL}/dashboard/${npi}?token=${dashboardToken}`;
  const widgetCode = `&lt;script src="${BASE_URL}/sentry.js" data-npi="${npi}" data-mode="shield" data-theme="light" async&gt;&lt;/script&gt;`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="padding:16px 24px;background:#0a1628;border-radius:12px 12px 0 0;">
<span style="font-size:18px;font-weight:800;color:#fff;">Kairo</span><span style="font-size:18px;font-weight:800;color:#c9a84c;">Logic</span>
<span style="float:right;font-size:11px;color:#64748b;line-height:24px;">Texas Healthcare Compliance</span>
</td></tr>

<!-- Body -->
<tr><td style="background:#fff;padding:32px 28px;">

<!-- Confirmation -->
<div style="text-align:center;margin-bottom:24px;">
<div style="width:48px;height:48px;background:#dcfce7;border-radius:50%;margin:0 auto 12px;line-height:48px;font-size:24px;">&#10003;</div>
<h1 style="margin:0 0 6px;font-size:22px;color:#0a1628;">Purchase Confirmed</h1>
<p style="margin:0;font-size:14px;color:#64748b;">${productLabel} &middot; ${price}</p>
</div>

<p style="margin:0 0 20px;font-size:15px;color:#1e293b;line-height:1.6;">
Hi there, thank you for investing in your practice's compliance. Your report and monitoring tools are ready for <strong>${titleCase(practiceName)}</strong>.
</p>

<!-- 1. Report Download -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin-bottom:16px;">
<tr><td style="padding:16px 20px;">
<div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:6px;">&#128196; Your Compliance Report</div>
<p style="margin:0 0 12px;font-size:13px;color:#78350f;line-height:1.5;">
Your full Sovereignty Audit Report with compliance score (${score}/100), findings breakdown, data border map, and remediation roadmap is ready to download.
</p>
<a href="${successUrl}" style="display:inline-block;background:#0a1628;color:#fff;font-size:13px;font-weight:700;padding:10px 20px;border-radius:6px;text-decoration:none;">
Download Your Report &rarr;
</a>
</td></tr>
</table>

${product === 'safe-harbor' ? `
<!-- 1b. Safe Harbor Materials -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-bottom:16px;">
<tr><td style="padding:16px 20px;">
<div style="font-size:14px;font-weight:700;color:#9a3412;margin-bottom:6px;">&#128221; Safe Harbor Compliance Kit</div>
<p style="margin:0 0 12px;font-size:13px;color:#c2410c;line-height:1.5;">
Your complete remediation kit with ready-to-use documents aligned to Texas SB 1188 and HB 149. Customize with your practice details for best results.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
<tr><td style="padding:6px 0;"><a href="${BASE_URL}/downloads/safe-harbor/sb1188-policy-pack.pdf" style="color:#9a3412;font-size:13px;font-weight:600;text-decoration:none;">&#128203; SB 1188 Data Sovereignty Policy</a></td></tr>
<tr><td style="padding:6px 0;border-top:1px solid #fde8d8;"><a href="${BASE_URL}/downloads/safe-harbor/ai-disclosure-kit.zip" style="color:#9a3412;font-size:13px;font-weight:600;text-decoration:none;">&#129302; HB 149 AI Disclosure Kit</a></td></tr>
<tr><td style="padding:6px 0;border-top:1px solid #fde8d8;"><a href="${BASE_URL}/downloads/safe-harbor/evidence-ledger.xlsx" style="color:#9a3412;font-size:13px;font-weight:600;text-decoration:none;">&#128193; Audit Evidence Ledger Templates</a></td></tr>
<tr><td style="padding:6px 0;border-top:1px solid #fde8d8;"><a href="${BASE_URL}/downloads/safe-harbor/staff-training-guide.pdf" style="color:#9a3412;font-size:13px;font-weight:600;text-decoration:none;">&#128101; Staff Training Guide</a></td></tr>
<tr><td style="padding:6px 0;border-top:1px solid #fde8d8;"><a href="${BASE_URL}/downloads/safe-harbor/compliance-roadmap.pdf" style="color:#9a3412;font-size:13px;font-weight:600;text-decoration:none;">&#128197; Annual Compliance Roadmap</a></td></tr>
<tr><td style="padding:6px 0;border-top:1px solid #fde8d8;"><a href="${BASE_URL}/downloads/safe-harbor/implementation-blueprint.pdf" style="color:#9a3412;font-size:13px;font-weight:600;text-decoration:none;">&#128295; Implementation Blueprint</a></td></tr>
</table>
<a href="${successUrl}" style="display:inline-block;background:#ea580c;color:#fff;font-size:13px;font-weight:700;padding:10px 20px;border-radius:6px;text-decoration:none;">
Download All Materials &rarr;
</a>
</td></tr>
</table>
` : ''}

<!-- 2. Dashboard -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:16px;">
<tr><td style="padding:16px 20px;">
<div style="font-size:14px;font-weight:700;color:#166534;margin-bottom:6px;">&#128737; Live Compliance Dashboard</div>
<p style="margin:0 0 12px;font-size:13px;color:#15803d;line-height:1.5;">
Your Sentry Shield is active for 90 days. Monitor your compliance score, review findings, and track drift in real time.
</p>
<a href="${dashboardUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-size:13px;font-weight:700;padding:10px 20px;border-radius:6px;text-decoration:none;">
Open Dashboard &rarr;
</a>
<p style="margin:8px 0 0;font-size:11px;color:#86efac;">Bookmark this link for easy access. Your dashboard token is unique to your practice.</p>
</td></tr>
</table>

<!-- 3. Widget -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:20px;">
<tr><td style="padding:16px 20px;">
<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:6px;">&#128305; Website Compliance Widget</div>
<p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.5;">
Add this code to your website footer to display your verified compliance badge. Patients can click it to see your compliance status.
</p>
<div style="background:#0f172a;color:#22c55e;padding:12px 14px;border-radius:6px;font-family:monospace;font-size:11px;line-height:1.5;overflow-x:auto;">
${widgetCode}
</div>
<p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">Works with WordPress, Squarespace, Wix, and any HTML site. Paste before the closing &lt;/body&gt; tag.</p>
</td></tr>
</table>

<!-- Divider -->
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />

<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
<strong>What happens next?</strong> Your Sentry Shield monitors your website continuously. If compliance issues are detected, you will receive drift alerts via email. After 90 days, you can continue Shield at $79/mo, switch to Watch at $39/mo, or cancel anytime.
</p>

</td></tr>

<!-- Footer -->
<tr><td style="background:#f8fafc;padding:20px 28px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;">
<p style="margin:0 0 8px;font-size:12px;color:#64748b;">
<span style="font-weight:700;color:#1e293b;">Kairo</span><span style="font-weight:700;color:#c9a84c;">Logic</span> &middot; Texas Healthcare Compliance Platform
</p>
<p style="margin:0 0 6px;font-size:11px;color:#94a3b8;">
1320 Arrow Point Dr, Cedar Park, TX 78613
</p>
<p style="margin:0;font-size:11px;color:#94a3b8;">
Questions? Reply to this email or reach us at compliance@kairologic.net
</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token || (AUTH_KEY && token !== AUTH_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { npi, email, product, practiceName, score, dashboardToken } = body;

    if (!email || !npi) {
      return NextResponse.json({ error: 'Missing npi or email' }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const html = buildConfirmationEmail({
      practiceName: practiceName || 'Healthcare Provider',
      npi,
      email,
      product: product || 'report',
      score: score || 0,
      dashboardToken: dashboardToken || '',
    });

    const productLabel = product === 'safe-harbor' ? 'Safe Harbor Bundle' : 'Audit Report';
    const subject = `Your KairoLogic ${productLabel} is ready, ${titleCase(practiceName || 'Healthcare Provider')}`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html,
        tags: [
          { name: 'type', value: 'purchase-confirmation' },
          { name: 'npi', value: npi },
          { name: 'product', value: product || 'report' },
        ],
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      throw new Error(`Resend ${resendRes.status}: ${errBody}`);
    }

    return NextResponse.json({ success: true, to: email, subject });
  } catch (err) {
    console.error('Purchase confirmation email failed:', err);
    return NextResponse.json({ error: 'Failed to send email', detail: String(err) }, { status: 500 });
  }
}
