/**
 * POST /api/trial/signup
 *
 * Self-service free trial signup endpoint.
 * Called from the /contact "Get Free Trial" form.
 *
 * Flow:
 *   1. Validate inputs (name, email, practice name, NPI)
 *   2. Look up NPI in providers table for cross-reference
 *   3. Find or create practice_websites record
 *   4. Create organization with trial_protect tier
 *   5. Start 21-day trial via trial-manager
 *   6. Generate dashboard access token (magic link)
 *   7. Send welcome email with dashboard link
 *   8. Queue initial scan + payer sync
 *   9. Send internal notification to compliance@
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { startTrial, FOUNDERS_RATE, TRIAL_DURATION_DAYS } from '@/lib/trial/trial-manager';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';

// SES config (reused from contact route)
const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_PORT = parseInt(process.env.SES_SMTP_PORT || '587');
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.net';
const SES_FROM_NAME = process.env.SES_FROM_NAME || 'KairoLogic';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB ${options.method || 'GET'} ${path}: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, practiceName, npi } = body;

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !practiceName || !npi) {
      return NextResponse.json(
        { error: 'All fields are required: firstName, lastName, email, practiceName, npi' },
        { status: 400 },
      );
    }
    if (!/^\d{10}$/.test(npi)) {
      return NextResponse.json(
        { error: 'NPI must be a 10-digit number' },
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

    // ── Check for duplicate signup ───────────────────────────────────────────
    const existingOrgs = await db(
      `organizations?contact_email=eq.${encodeURIComponent(normalizedEmail)}&select=id,plan_tier,trial_status,trial_end`
    );
    if (existingOrgs?.length > 0) {
      const org = existingOrgs[0];
      // If they have an active trial, just resend the magic link
      if (org.trial_status === 'ACTIVE' || org.trial_status === 'EXPIRING') {
        // Find their practice
        const practices = await db(
          `practice_websites?organization_id=eq.${org.id}&select=id,name`
        );
        if (practices?.length > 0) {
          await generateAndSendMagicLink(normalizedEmail, practices[0].id, contactName);
          return NextResponse.json({
            success: true,
            message: 'existing_trial',
            trial_days_remaining: Math.max(0, Math.ceil(
              (new Date(org.trial_end).getTime() - Date.now()) / 86400000
            )),
          });
        }
      }
      // If trial expired, allow re-signup (fall through)
      if (org.trial_status !== 'EXPIRED' && org.trial_status !== 'CHURNED') {
        return NextResponse.json({
          success: true,
          message: 'existing_account',
        });
      }
    }

    // ── Look up NPI in providers table ────────────────────────────────────────
    let providerData: any = null;
    try {
      const providers = await db(`providers?npi=eq.${npi}&select=npi,first_name,last_name,address_line_1,city,state,zip_code,taxonomy_desc`);
      if (providers?.length > 0) providerData = providers[0];
    } catch { /* NPI not in our DB yet — that's fine */ }

    // ── Find or create practice_websites record ──────────────────────────────
    let practiceId: string;

    // Check if a practice with this NPI already exists
    const existingPractices = await db(
      `practice_websites?npi=eq.${npi}&select=id,name,organization_id`
    );

    if (existingPractices?.length > 0 && !existingPractices[0].organization_id) {
      // Practice exists but unclaimed — claim it
      practiceId = existingPractices[0].id;
    } else if (existingPractices?.length > 0 && existingPractices[0].organization_id) {
      // Practice already claimed by another org — create a new practice entry
      const newPractice = await db('practice_websites', {
        method: 'POST',
        body: JSON.stringify({
          name: practiceName,
          npi: npi,
          state: providerData?.state || null,
          city: providerData?.city || null,
          address: providerData?.address_line_1 || null,
          admin_tracked: true,
          scan_tier: 'weekly',
        }),
      });
      practiceId = newPractice?.[0]?.id;
    } else {
      // No practice found — create new
      const newPractice = await db('practice_websites', {
        method: 'POST',
        body: JSON.stringify({
          name: practiceName,
          npi: npi,
          state: providerData?.state || null,
          city: providerData?.city || null,
          address: providerData?.address_line_1 || null,
          admin_tracked: true,
          scan_tier: 'weekly',
        }),
      });
      practiceId = newPractice?.[0]?.id;
    }

    if (!practiceId) {
      throw new Error('Failed to create or find practice record');
    }

    // ── Check founders rate availability ─────────────────────────────────────
    const foundersOrgs = await db(`organizations?is_founders_rate=eq.true&select=id`);
    const foundersSlotAvailable = FOUNDERS_RATE.enabled &&
      (!foundersOrgs || foundersOrgs.length < FOUNDERS_RATE.slots_total);

    // ── Create organization ──────────────────────────────────────────────────
    const orgs = await db('organizations', {
      method: 'POST',
      body: JSON.stringify({
        name: practiceName,
        org_type: 'PRACTICE',
        contact_email: normalizedEmail,
        contact_name: contactName,
        plan_tier: 'trial_protect',
        max_practices: 1,
        max_providers: 10,
        is_founders_rate: foundersSlotAvailable,
        founders_rate_locked_until: foundersSlotAvailable
          ? new Date(Date.now() + 365 * 86400000).toISOString()
          : null,
        signup_npi: npi,
      }),
    });
    const orgId = orgs?.[0]?.id;

    if (!orgId) {
      throw new Error('Failed to create organization');
    }

    // ── Start trial ──────────────────────────────────────────────────────────
    await startTrial(orgId);

    // ── Link organization to practice ────────────────────────────────────────
    await db(`practice_websites?id=eq.${practiceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        organization_id: orgId,
        scan_tier: 'weekly',
        admin_tracked: true,
      }),
    });

    // ── Generate dashboard token (magic link) ────────────────────────────────
    await generateAndSendMagicLink(normalizedEmail, practiceId, contactName);

    // ── Queue initial scan + payer sync ──────────────────────────────────────
    try {
      await db(`practice_websites?id=eq.${practiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scan_scheduled_at: new Date().toISOString(),
          scan_status: 'pending',
        }),
      });
      await db('admin_action_queue', {
        method: 'POST',
        body: JSON.stringify({
          action_type: 'payer_sync',
          target_id: practiceId,
          target_type: 'practice',
          status: 'pending',
          requested_at: new Date().toISOString(),
          metadata: { practice_name: practiceName, trigger: 'trial_signup' },
        }),
        headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' } as any,
      });
    } catch (scanErr) {
      console.warn('[Trial Signup] Failed to queue initial scan:', scanErr);
    }

    // ── Send internal notification ───────────────────────────────────────────
    try {
      await sendInternalNotification(contactName, normalizedEmail, practiceName, npi);
    } catch (notifyErr) {
      console.warn('[Trial Signup] Internal notification failed:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: 'trial_created',
      organization_id: orgId,
      practice_id: practiceId,
      trial_days: TRIAL_DURATION_DAYS,
      founders_rate: foundersSlotAvailable,
    });

  } catch (err) {
    console.error('[Trial Signup]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Trial signup failed' },
      { status: 500 },
    );
  }
}

// ─── Magic link generation + welcome email ──────────────────────────────────

async function generateAndSendMagicLink(
  email: string,
  practiceId: string,
  contactName: string,
): Promise<void> {
  // Create dashboard token
  const dashToken = crypto.randomBytes(32).toString('hex');
  await db('dashboard_tokens', {
    method: 'POST',
    body: JSON.stringify({
      token: dashToken,
      email: email,
      npi: practiceId, // used as identifier for token lookup
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days
    }),
  });

  const dashboardUrl = `${BASE_URL}/practice/${practiceId}?token=${dashToken}`;

  // Send welcome email with magic link
  if (!SES_SMTP_USER || !SES_SMTP_PASS) {
    console.warn('[Trial Signup] SES not configured, skipping welcome email');
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: SES_SMTP_HOST,
    port: SES_SMTP_PORT,
    secure: false,
    auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"${SES_FROM_NAME}" <${SES_FROM_EMAIL}>`,
    to: email,
    subject: 'Your KairoLogic dashboard is ready',
    text: `
Hi ${contactName},

Your KairoLogic dashboard is ready. Click below to access it:

${dashboardUrl}

Your ${TRIAL_DURATION_DAYS}-day free trial includes full platform access:
- Provider data monitoring across NPPES, payer directories, and state boards
- Compliance scanning (SB 1188, HB 149)
- Credentialing workflow automation
- Payer directory tracking across UHC, Aetna, Cigna, and Humana

We're running your first scan now — you should see results within a few minutes.

After ${TRIAL_DURATION_DAYS} days, your dashboard switches to read-only for 7 additional days. Upgrade anytime to keep full access.

Questions? Reply to this email — we read everything.

— The KairoLogic Team
    `,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 20px; font-weight: 700; color: #0B1E3D; }
    .logo span { color: #D4A843; }
    h1 { font-size: 24px; color: #0B1E3D; margin: 0 0 16px; }
    p { margin: 0 0 16px; color: #4A5568; }
    .btn { display: inline-block; background: #D4A843; color: #0B1E3D !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .features { background: #F7FAFC; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .features ul { margin: 8px 0 0; padding-left: 20px; }
    .features li { color: #4A5568; margin-bottom: 6px; }
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #E2E8F0; color: #A0AEC0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Kairo<span>Logic</span></div>
    </div>

    <h1>Your dashboard is ready, ${contactName}.</h1>
    <p>We&rsquo;ve set up your ${TRIAL_DURATION_DAYS}-day free trial with full platform access. Your first provider data scan is running now.</p>

    <div style="text-align: center;">
      <a href="${dashboardUrl}" class="btn">Open Your Dashboard &rarr;</a>
    </div>

    <div class="features">
      <strong style="color: #0B1E3D;">What you get:</strong>
      <ul>
        <li>Provider data monitoring across NPPES, payer directories, and state boards</li>
        <li>Compliance scanning (SB 1188, HB 149)</li>
        <li>Credentialing workflow automation</li>
        <li>Payer directory tracking (UHC, Aetna, Cigna, Humana)</li>
      </ul>
    </div>

    <p>After ${TRIAL_DURATION_DAYS} days your dashboard switches to read-only for 7 more days. Upgrade anytime to keep full access.</p>

    <p style="color: #718096;">Questions? Just reply to this email &mdash; we read everything.</p>

    <div class="footer">
      KairoLogic &middot; Provider Data Intelligence<br>
      <a href="${BASE_URL}" style="color: #D4A843;">kairologic.net</a>
    </div>
  </div>
</body>
</html>
    `,
  });
}

// ─── Internal notification ──────────────────────────────────────────────────

async function sendInternalNotification(
  contactName: string,
  email: string,
  practiceName: string,
  npi: string,
): Promise<void> {
  if (!SES_SMTP_USER || !SES_SMTP_PASS) return;

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: SES_SMTP_HOST,
    port: SES_SMTP_PORT,
    secure: false,
    auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"${SES_FROM_NAME}" <${SES_FROM_EMAIL}>`,
    to: 'compliance@kairologic.net',
    replyTo: email,
    subject: `[New Trial Signup] ${practiceName} — ${contactName}`,
    text: `
New Free Trial Signup
=====================

Name: ${contactName}
Email: ${email}
Practice: ${practiceName}
NPI: ${npi}
Time: ${new Date().toISOString()}

Trial auto-created. Dashboard access link sent to user.
Initial scan + payer sync queued.
    `,
  });
}
