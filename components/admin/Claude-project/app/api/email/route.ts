import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '80e5ddfcab46ef75a9b8d2bf51a5541b';
const MAILJET_SECRET = process.env.MAILJET_SECRET_KEY || '';

/**
 * Replace {{handlebar}} variables in a template string
 */
function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

/**
 * Send email via Mailjet API v3.1
 */
async function sendMailjet(to: string, toName: string, subject: string, htmlBody: string): Promise<boolean> {
  if (!MAILJET_SECRET) {
    console.error('[Email] Mailjet secret not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET}`).toString('base64')
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: 'compliance@kairologic.com', Name: 'KairoLogic Compliance' },
          To: [{ Email: to, Name: toName }],
          Subject: subject,
          HTMLPart: htmlBody
        }]
      })
    });

    const result = await response.json();
    console.log('[Email] Mailjet response:', JSON.stringify(result).substring(0, 200));
    return response.ok;
  } catch (err) {
    console.error('[Email] Mailjet send failed:', err);
    return false;
  }
}

/**
 * POST /api/email/send
 * Body: { template_slug, npi, score?, variables?: {} }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_slug, npi, score, variables = {} } = body;

    if (!template_slug) {
      return NextResponse.json({ error: 'template_slug required' }, { status: 400 });
    }

    // 1. Fetch template from Supabase
    const templateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/email_templates?slug=eq.${template_slug}&is_active=eq.true&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
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
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      const providers = await providerRes.json();
      if (providers && providers.length > 0) {
        const p = providers[0];
        providerVars = {
          practice_name: p.name || '',
          practice_manager_name: [p.contact_first_name, p.contact_last_name].filter(Boolean).join(' ') || 'Practice Manager',
          npi: p.npi || '',
          website_url: p.url || '',
          status_label: p.status_label || (score >= 75 ? 'Substantial Compliance' : 'Critical Drift'),
          report_id: `KL-${Math.floor(Math.random() * 900000) + 100000}-TX`,
          score: String(score || p.risk_score || 0),
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
      year: String(new Date().getFullYear()),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };

    // 4. Replace variables in subject and body
    const subject = replaceVariables(template.subject, allVars);
    const htmlBody = replaceVariables(template.html_body, allVars);

    // 5. Determine recipient
    const recipientEmail = template.recipient_type === 'internal'
      ? 'compliance@kairologic.com'
      : (allVars.email || variables.email || '');

    if (!recipientEmail) {
      console.log('[Email] No recipient email available');
      return NextResponse.json({ error: 'No recipient email', sent: false }, { status: 200 });
    }

    // 6. Send via Mailjet
    const sent = await sendMailjet(
      recipientEmail,
      allVars.practice_manager_name || allVars.practice_name || 'Provider',
      subject,
      htmlBody
    );

    return NextResponse.json({ success: true, sent, template: template_slug });

  } catch (err) {
    console.error('[Email] Error:', err);
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }
}
