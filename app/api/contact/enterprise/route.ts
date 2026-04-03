/**
 * POST /api/contact/enterprise
 *
 * Enterprise sales inquiry endpoint.
 * Sends notification email to the KairoLogic sales team via Resend.
 */

import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';
const SALES_EMAIL = process.env.SALES_EMAIL || 'info@kairologic.net';
const FROM_EMAIL = process.env.EMAIL_FROM || 'KairoLogic <noreply@kairologic.net>';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, practiceName, providerCount, message } = body;

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !practiceName) {
      return NextResponse.json(
        { error: 'Required fields: firstName, lastName, email, practiceName' },
        { status: 400 },
      );
    }
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address required' },
        { status: 400 },
      );
    }

    const contactName = `${firstName} ${lastName}`.trim();
    const normalizedEmail = email.toLowerCase().trim();

    // ── Send notification to sales team ───────────────────────────────────────
    if (RESEND_API_KEY) {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1A1F2B 0%, #2D3340 100%); border-radius: 12px; padding: 32px; color: white; margin-bottom: 24px;">
    <h1 style="margin: 0 0 8px; font-size: 22px; color: #D4A017;">New Enterprise Inquiry</h1>
    <p style="margin: 0; font-size: 14px; color: #B0B8C4;">Submitted from ${BASE_URL}/contact?type=enterprise</p>
  </div>

  <div style="background: #F8F9FA; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
    <h2 style="margin: 0 0 16px; font-size: 16px; color: #1A1F2B;">Contact Details</h2>
    <table style="width: 100%; font-size: 14px; color: #5A6472;">
      <tr><td style="padding: 6px 0; font-weight: 600; width: 140px;">Name</td><td>${contactName}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Email</td><td><a href="mailto:${normalizedEmail}" style="color: #D4A017;">${normalizedEmail}</a></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Organization</td><td>${practiceName}</td></tr>
      ${providerCount ? `<tr><td style="padding: 6px 0; font-weight: 600;">Providers</td><td>${providerCount}</td></tr>` : ''}
    </table>
  </div>

  ${message ? `
  <div style="background: #F8F9FA; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
    <h2 style="margin: 0 0 12px; font-size: 16px; color: #1A1F2B;">Message</h2>
    <p style="margin: 0; font-size: 14px; color: #5A6472; line-height: 1.6; white-space: pre-wrap;">${message}</p>
  </div>
  ` : ''}

  <div style="text-align: center; margin-top: 24px;">
    <a href="mailto:${normalizedEmail}?subject=KairoLogic%20Enterprise%20-%20Follow%20Up&body=Hi%20${encodeURIComponent(firstName)},%0A%0AThank%20you%20for%20your%20interest%20in%20KairoLogic%20Enterprise.%0A%0A"
       style="display: inline-block; background: #D4A017; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Reply to ${firstName}
    </a>
  </div>

  <p style="margin: 24px 0 0; font-size: 12px; color: #9AA3AE; text-align: center;">
    KairoLogic Enterprise Sales Notification
  </p>
</body>
</html>`;

      const plainText = `New Enterprise Inquiry

Name: ${contactName}
Email: ${normalizedEmail}
Organization: ${practiceName}
${providerCount ? `Providers: ${providerCount}` : ''}
${message ? `\nMessage:\n${message}` : ''}

Reply to: ${normalizedEmail}`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [SALES_EMAIL],
          reply_to: normalizedEmail,
          subject: `Enterprise Inquiry: ${practiceName} (${providerCount || 'size unknown'})`,
          html: htmlContent,
          text: plainText,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[Enterprise Inquiry] Resend ${res.status}: ${errBody}`);
        // Don't fail the request — still return success to the user
      }
    } else {
      console.warn('[Enterprise Inquiry] Resend API key not configured, skipping email');
    }

    // ── Send confirmation to the inquirer ────────────────────────────────────
    if (RESEND_API_KEY) {
      const confirmHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="${BASE_URL}/logo.png" alt="KairoLogic" height="32" style="height: 32px;" />
  </div>

  <h1 style="font-size: 22px; color: #1A1F2B; text-align: center; margin-bottom: 8px;">Thanks for reaching out, ${firstName}!</h1>
  <p style="font-size: 14px; color: #5A6472; text-align: center; margin-bottom: 32px; line-height: 1.6;">
    We received your enterprise inquiry and our team will be in touch within 1 business day.
  </p>

  <div style="background: #F8F9FA; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 12px; font-size: 16px; color: #1A1F2B;">What to expect</h2>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #5A6472; line-height: 2;">
      <li>A personalized walkthrough of the KairoLogic platform</li>
      <li>Custom pricing based on your organization's needs</li>
      <li>Discussion of compliance frameworks, integrations, and SLAs</li>
    </ul>
  </div>

  <p style="font-size: 13px; color: #5A6472; text-align: center; line-height: 1.6;">
    Questions in the meantime? Reply to this email or reach us at
    <a href="mailto:info@kairologic.net" style="color: #D4A017;">info@kairologic.net</a>
  </p>

  <div style="border-top: 1px solid #E8EAED; margin-top: 32px; padding-top: 16px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #9AA3AE;">
      &copy; 2026 KairoLogic. All rights reserved.<br />
      <a href="${BASE_URL}" style="color: #9AA3AE;">kairologic.net</a> | Provider Data Intelligence
    </p>
  </div>
</body>
</html>`;

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [normalizedEmail],
            subject: 'KairoLogic Enterprise — We\'ll be in touch!',
            html: confirmHtml,
          }),
        });
      } catch (confirmErr) {
        console.warn('[Enterprise Inquiry] Confirmation email failed:', confirmErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'inquiry_sent',
    });

  } catch (err) {
    console.error('[Enterprise Inquiry]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send inquiry' },
      { status: 500 },
    );
  }
}
