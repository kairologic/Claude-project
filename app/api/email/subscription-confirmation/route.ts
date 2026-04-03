import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/email/subscription-confirmation
 *
 * Sends a branded subscription confirmation email via Resend.
 * Called from the Stripe webhook when a trial subscription starts.
 *
 * Request body:
 *   - email: string (customer email)
 *   - practiceName: string
 *   - planName: string (Small Practice, Medium Practice, Large Practice)
 *   - planPrice: number (monthly price in dollars)
 *   - billingInterval: 'month' | 'year'
 *   - trialEndDate: string (ISO date or formatted date)
 *   - features: string[] (list of plan features)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';

interface EmailRequest {
  email: string;
  practiceName: string;
  planName: string;
  planPrice: number;
  billingInterval: 'month' | 'year';
  trialEndDate: string;
  features?: string[];
}

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      console.warn('[Email] Resend API key not configured');
      return NextResponse.json({ success: true, skipped: true });
    }

    const body: EmailRequest = await request.json();
    const {
      email,
      practiceName,
      planName,
      planPrice,
      billingInterval,
      trialEndDate,
      features = [],
    } = body;

    if (!email || !practiceName || !planName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, practiceName, planName' },
        { status: 400 },
      );
    }

    // Format trial end date
    let formattedTrialEnd = trialEndDate;
    try {
      const date = new Date(trialEndDate);
      formattedTrialEnd = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      // Keep original if parsing fails
    }

    const billingText = billingInterval === 'month' ? 'month' : 'year';
    const contactName = practiceName.split(' ')[0] || 'there';

    // Build feature list HTML
    const featureListHtml = features.length
      ? `<ul style="margin: 12px 0; padding-left: 20px; color: #5A6472;">
           ${features.map((f) => `<li style="margin-bottom: 8px;">${f}</li>`).join('')}
         </ul>`
      : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background: #FAFAFA;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .email-wrapper {
      background: #FFFFFF;
      border-radius: 8px;
      padding: 40px 24px;
      box-shadow: 0 1px 3px rgba(15, 30, 46, 0.08);
    }
    .header {
      margin-bottom: 32px;
      border-bottom: 3px solid #D4A017;
      padding-bottom: 16px;
    }
    .logo {
      font-size: 20px;
      font-weight: 700;
      color: #0F1E2E;
    }
    .logo span {
      color: #D4A017;
    }
    h1 {
      font-size: 24px;
      color: #0F1E2E;
      margin: 24px 0 8px;
      line-height: 1.3;
    }
    .subtitle {
      font-size: 14px;
      color: #5A6472;
      margin: 0 0 24px;
    }
    .plan-box {
      background: #FDF6E3;
      border-left: 4px solid #D4A017;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .plan-box-title {
      font-size: 12px;
      color: #9AA3AE;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 8px;
      font-weight: 600;
    }
    .plan-name {
      font-size: 18px;
      font-weight: 700;
      color: #0F1E2E;
      margin: 0 0 8px;
    }
    .plan-details {
      font-size: 14px;
      color: #5A6472;
      margin: 0;
    }
    .trial-banner {
      background: #E6F7F2;
      border: 1px solid #1A9E6D;
      padding: 16px;
      border-radius: 6px;
      margin: 24px 0;
      font-size: 14px;
      color: #1A9E6D;
      font-weight: 500;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0F1E2E;
      margin: 24px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .cta-button {
      display: inline-block;
      background: #D4A017;
      color: #0F1E2E;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      margin: 24px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #E8EAED;
      font-size: 12px;
      color: #9AA3AE;
    }
    .footer a {
      color: #D4A017;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <div class="logo">Kairo<span>Logic</span></div>
      </div>

      <h1>Welcome, ${contactName}!</h1>
      <p class="subtitle">Your ${planName} plan is now active. Here's what you need to know.</p>

      <div class="plan-box">
        <div class="plan-box-title">Your Subscription</div>
        <div class="plan-name">${planName}</div>
        <div class="plan-details">
          \$${planPrice}/${billingText} after your 21-day free trial
        </div>
      </div>

      <div class="trial-banner">
        ✓ Your 21-day free trial starts today. No charges during this period.
      </div>

      <div>
        <div class="section-title">Trial Period</div>
        <p style="margin: 0 0 8px; font-size: 14px; color: #5A6472;">
          <strong>Trial Ends:</strong> ${formattedTrialEnd}
        </p>
        <p style="margin: 0; font-size: 13px; color: #5A6472;">
          After your trial, your subscription will automatically renew at \$${planPrice}/${billingText}.
          You can cancel anytime before the trial ends from your dashboard — no questions asked.
        </p>
      </div>

      ${features.length > 0 ? `
      <div>
        <div class="section-title">What's Included</div>
        ${featureListHtml}
      </div>
      ` : ''}

      <a href="${BASE_URL}/dashboard" class="cta-button">Go to Your Dashboard</a>

      <div>
        <div class="section-title">Next Steps</div>
        <ol style="margin: 0; padding-left: 20px; color: #5A6472; font-size: 14px;">
          <li style="margin-bottom: 8px;">
            Complete your practice profile in the dashboard
          </li>
          <li style="margin-bottom: 8px;">
            Add your providers (we'll scan them across NPPES, payer directories, and state boards)
          </li>
          <li style="margin-bottom: 8px;">
            Review compliance status and start using your team workflows
          </li>
          <li>
            Upgrade or downgrade anytime from your dashboard settings
          </li>
        </ol>
      </div>

      <p style="margin: 24px 0 0; font-size: 13px; color: #5A6472; line-height: 1.6;">
        <strong>Questions?</strong> We're here to help. Reply to this email or contact us at
        <a href="mailto:info@kairologic.net" style="color: #D4A017; text-decoration: none;">info@kairologic.net</a>
      </p>

      <div class="footer">
        <p style="margin: 0 0 8px;">
          © 2026 KairoLogic. All rights reserved.
        </p>
        <p style="margin: 0;">
          <a href="${BASE_URL}">kairologic.net</a> | Provider Data Intelligence
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const plainTextContent = `
Welcome, ${contactName}!

Your ${planName} plan is now active.

TRIAL PERIOD
============
Your 21-day free trial starts today. No charges during this period.
Trial Ends: ${formattedTrialEnd}

After your trial, your subscription will automatically renew at $${planPrice}/${billingText}.
Cancel anytime before the trial ends to avoid charges.

${features.length > 0 ? `
WHAT'S INCLUDED
===============
${features.map((f) => `• ${f}`).join('\n')}
` : ''}

NEXT STEPS
==========
1. Complete your practice profile in the dashboard
2. Add your providers (we'll scan them across NPPES, payer directories, and state boards)
3. Review compliance status and start using your team workflows
4. Upgrade or downgrade anytime from your dashboard settings

Go to Your Dashboard: ${BASE_URL}/dashboard

Questions? Contact us at info@kairologic.net

© 2026 KairoLogic. All rights reserved.
kairologic.net | Provider Data Intelligence
    `;

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'KairoLogic <noreply@kairologic.net>',
        to: email,
        subject: `Welcome to KairoLogic — Your ${planName} Trial is Ready`,
        html: htmlContent,
        text: plainTextContent,
        reply_to: 'info@kairologic.net',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend API error: ${err}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Subscription Confirmation Email]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Email send failed' },
      { status: 500 },
    );
  }
}
