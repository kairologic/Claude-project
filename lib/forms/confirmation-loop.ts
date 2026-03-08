// lib/forms/confirmation-loop.ts
// ═══ NPPES Submission Confirmation Loop ═══
// Task 2.6: After a practice manager clicks "Mark as Submitted":
//   1. Sets monitoring flag on the NPI + field
//   2. Polls NPPES Live API daily for that specific NPI
//   3. When the updated field matches expected value → confirmation alert
//   4. If not confirmed within 14 days → re-submission reminder
//
// NPPES Live API: https://npiregistry.cms.hhs.gov/api/
// Auth: None. No API key. Free REST API.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const NPPES_API = 'https://npiregistry.cms.hhs.gov/api/';

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

// ── NPPES API Lookup ─────────────────────────────────────

interface NppesApiResult {
  npi: string;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  taxonomy_code: string | null;
  last_updated: string | null;
}

/**
 * Query the NPPES Live API for current provider data.
 * No auth required, free, refreshed daily by CMS.
 */
async function lookupNppes(npi: string): Promise<NppesApiResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${NPPES_API}?number=${npi}&version=2.1`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    const results = data?.results;
    if (!results?.length) return null;

    const r = results[0];
    const pracAddr = r.addresses?.find((a: any) => a.address_purpose === 'LOCATION') || r.addresses?.[0];
    const taxonomy = r.taxonomies?.find((t: any) => t.primary === true) || r.taxonomies?.[0];

    return {
      npi: r.number,
      address_line_1: pracAddr?.address_1 || null,
      city: pracAddr?.city || null,
      state: pracAddr?.state || null,
      zip_code: pracAddr?.postal_code?.slice(0, 5) || null,
      phone: pracAddr?.telephone_number?.replace(/\D/g, '') || null,
      taxonomy_code: taxonomy?.code || null,
      last_updated: r.basic?.last_updated || null,
    };
  } catch {
    return null;
  }
}

// ── Mark as Submitted ────────────────────────────────────

/**
 * Called when a practice manager clicks "Mark as Submitted" in the dashboard.
 * Activates daily NPPES API polling for this update request.
 */
export async function markAsSubmitted(
  updateRequestId: string,
  submittedBy?: string,
): Promise<void> {
  await db(`update_requests?id=eq.${updateRequestId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      submitted_by: submittedBy || null,
      polling_active: true,
      poll_count: 0,
    }),
  });
}

// ── Confirmation Polling ─────────────────────────────────

export interface PollResult {
  total_polled: number;
  confirmed: number;
  still_pending: number;
  expired: number;
  errors: number;
}

/**
 * Poll NPPES API for all submitted update requests with active polling.
 * Run daily via GitHub Actions or cron.
 *
 * For each request:
 *   - Queries NPPES API for the NPI
 *   - Compares the expected_value against current NPPES value
 *   - If match → status = CONFIRMED, send confirmation alert
 *   - If 14+ days since submission → status = EXPIRED, send reminder
 */
export async function runConfirmationPoll(): Promise<PollResult> {
  const result: PollResult = {
    total_polled: 0, confirmed: 0, still_pending: 0, expired: 0, errors: 0,
  };

  // Fetch all active polling requests
  const requests: any[] = await db(
    'update_requests?polling_active=eq.true&status=eq.SUBMITTED&select=*'
  );

  if (!requests?.length) return result;

  for (const req of requests) {
    result.total_polled++;

    try {
      // Look up current NPPES data
      const nppes = await lookupNppes(req.npi);
      if (!nppes) { result.errors++; continue; }

      // Compare expected value against current NPPES value
      const currentValue = getNppesFieldValue(nppes, req.field_name);
      const isConfirmed = valuesMatch(currentValue, req.expected_value);

      if (isConfirmed) {
        // Update confirmed
        await db(`update_requests?id=eq.${req.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'CONFIRMED',
            confirmed_at: new Date().toISOString(),
            polling_active: false,
            last_polled_at: new Date().toISOString(),
            poll_count: (req.poll_count || 0) + 1,
          }),
        });

        // Send confirmation email (fire and forget)
        try {
          await sendConfirmationEmail(req);
        } catch { /* non-critical */ }

        result.confirmed++;
      } else {
        // Check if expired (14+ days since submission)
        const daysSinceSubmission = req.submitted_at
          ? Math.floor((Date.now() - new Date(req.submitted_at).getTime()) / 86400000)
          : 0;

        if (daysSinceSubmission >= 14) {
          await db(`update_requests?id=eq.${req.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'EXPIRED',
              expired_at: new Date().toISOString(),
              polling_active: false,
              last_polled_at: new Date().toISOString(),
              poll_count: (req.poll_count || 0) + 1,
            }),
          });

          // Send reminder email
          try {
            await sendReminderEmail(req);
          } catch { /* non-critical */ }

          result.expired++;
        } else {
          // Still pending, update poll metadata
          await db(`update_requests?id=eq.${req.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              last_polled_at: new Date().toISOString(),
              poll_count: (req.poll_count || 0) + 1,
            }),
          });
          result.still_pending++;
        }
      }

      // Rate limit: 1 request per second to be respectful of NPPES API
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
      console.error(`[Confirmation] Error polling NPI ${req.npi}:`, err);
      result.errors++;
    }
  }

  return result;
}

// ── Helpers ──────────────────────────────────────────────

function getNppesFieldValue(nppes: NppesApiResult, fieldName: string): string | null {
  const map: Record<string, string | null> = {
    address_line_1: nppes.address_line_1,
    city: nppes.city,
    state: nppes.state,
    zip_code: nppes.zip_code,
    phone: nppes.phone,
    primary_taxonomy_code: nppes.taxonomy_code,
  };
  return map[fieldName] ?? null;
}

function valuesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalize(a) === normalize(b);
}

// ── Email notifications ──────────────────────────────────

const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.com';

async function sendConfirmationEmail(req: any): Promise<void> {
  if (!SES_SMTP_USER || !SES_SMTP_PASS) return;

  // Get org email
  if (!req.organization_id) return;
  const orgs = await db(`organizations?id=eq.${req.organization_id}&select=contact_email`);
  if (!orgs?.length || !orgs[0].contact_email) return;

  // Get provider name
  const providers = await db(`providers?npi=eq.${req.npi}&select=first_name,last_name`);
  const providerName = providers?.length
    ? `${providers[0].first_name} ${providers[0].last_name}`.trim()
    : req.npi;

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: SES_SMTP_HOST, port: 587, secure: false,
    auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
  });

  // Simple confirmation email — no upsell, no CTA, just closure
  await transporter.sendMail({
    from: `"KairoLogic" <${SES_FROM_EMAIL}>`,
    to: orgs[0].contact_email,
    subject: `NPPES update confirmed — ${providerName}`,
    html: `
      <div style="font-family:'Inter',sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:18px;font-weight:800;color:#0B1E3D;">KAIRO</span><span style="font-size:18px;font-weight:800;color:#D4A574;">LOGIC</span>
        </div>
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:24px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">\u2713</div>
          <div style="color:#065f46;font-weight:700;font-size:16px;margin-bottom:4px;">NPPES update confirmed live</div>
          <div style="color:#047857;font-size:13px;">Your update for <strong>${providerName}</strong> (${req.field_name}) was confirmed in the NPPES registry today.</div>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8;">KairoLogic Provider Data Intelligence</div>
      </div>`,
  });
}

async function sendReminderEmail(req: any): Promise<void> {
  if (!SES_SMTP_USER || !SES_SMTP_PASS || !req.organization_id) return;

  const orgs = await db(`organizations?id=eq.${req.organization_id}&select=contact_email`);
  if (!orgs?.length || !orgs[0].contact_email) return;

  const providers = await db(`providers?npi=eq.${req.npi}&select=first_name,last_name`);
  const providerName = providers?.length ? `${providers[0].first_name} ${providers[0].last_name}`.trim() : req.npi;

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: SES_SMTP_HOST, port: 587, secure: false,
    auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"KairoLogic" <${SES_FROM_EMAIL}>`,
    to: orgs[0].contact_email,
    subject: `NPPES update not yet confirmed — ${providerName}`,
    html: `
      <div style="font-family:'Inter',sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:18px;font-weight:800;color:#0B1E3D;">KAIRO</span><span style="font-size:18px;font-weight:800;color:#D4A574;">LOGIC</span>
        </div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;">
          <div style="color:#92400e;font-weight:700;font-size:14px;margin-bottom:8px;">NPPES update not yet reflected</div>
          <div style="color:#78350f;font-size:13px;">
            The NPPES update you submitted for <strong>${providerName}</strong> (${req.field_name}) has not appeared in the registry after 14 days.
            This sometimes happens if the submission didn't process correctly.
          </div>
          <div style="margin-top:16px;padding:12px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e;">
            <strong>Recommended:</strong> Log in to <a href="https://nppes.cms.hhs.gov/" style="color:#b45309;">nppes.cms.hhs.gov</a> and verify the update was saved. If not, re-submit using the form in your dashboard.
          </div>
        </div>
      </div>`,
  });

  // Update reminder sent timestamp
  await db(`update_requests?id=eq.${req.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ reminder_sent_at: new Date().toISOString() }),
  });
}
