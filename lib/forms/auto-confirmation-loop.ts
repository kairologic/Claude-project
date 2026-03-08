/**
 * auto-confirmation-loop.ts
 * 
 * Replaces the manual "Mark as Submitted" flow with automatic NPPES monitoring.
 * 
 * PROBLEM:
 *   The old confirmation loop required a Practice Manager to click "Mark as Submitted"
 *   before polling began. If they forgot (and most will), the platform lost visibility
 *   into the outcome, breaking the loop that drives renewal.
 * 
 * SOLUTION:
 *   Start polling the NPPES Live API automatically the moment a form is GENERATED,
 *   not when the user clicks a button. We already know the NPI and expected field
 *   values from the delta event — that's all we need to check.
 * 
 * NEW FLOW:
 *   1. Form generated → update_request created with status FORM_GENERATED
 *   2. Auto-polling begins immediately (daily via GitHub Actions)
 *   3. If NPPES reflects the expected value → status = CONFIRMED, send confirmation email
 *   4. If 30 days pass with no change → status = STALE, send gentle nudge
 *   5. If user manually clicks "Mark as Submitted" → status = SUBMITTED (optional context)
 *   6. If NPPES confirms after SUBMITTED → same CONFIRMED flow but email says
 *      "Your submission was confirmed" instead of "The update was detected"
 * 
 * The "Mark as Submitted" button still exists but is now OPTIONAL enrichment,
 *   not a gate. It adds context ("I submitted this on March 3rd") and changes
 *   the confirmation email copy, but polling runs regardless.
 * 
 * LIFECYCLE:
 *   FORM_GENERATED → [auto-polling starts]
 *                  → SUBMITTED (optional, user clicks button)
 *                  → CONFIRMED (NPPES reflects update)
 *                  → STALE (30 days, no change, gentle nudge)
 *                  → EXPIRED (45 days, final notice, polling stops)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UpdateRequestStatus =
  | 'DETECTED'
  | 'FORM_GENERATED'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'STALE'
  | 'EXPIRED';

export interface UpdateRequest {
  id: string;
  npi: string;
  practice_website_id: string;
  delta_event_id: string;
  status: UpdateRequestStatus;
  field_name: string;
  expected_value: string;
  current_nppes_value: string;
  form_generated_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
  last_polled_at: string | null;
  poll_count: number;
  created_at: string;
}

interface NPPESApiResponse {
  result_count: number;
  results: Array<{
    number: number;
    basic: {
      first_name: string;
      last_name: string;
      credential: string;
      status: string;
    };
    addresses: Array<{
      address_purpose: string;
      address_1: string;
      address_2: string;
      city: string;
      state: string;
      postal_code: string;
      telephone_number: string;
      fax_number: string;
    }>;
    taxonomies: Array<{
      code: string;
      desc: string;
      primary: boolean;
      state: string;
      license: string;
    }>;
  }>;
}

interface PollingResult {
  npi: string;
  updateRequestId: string;
  status: 'CONFIRMED' | 'NO_CHANGE' | 'STALE' | 'EXPIRED' | 'ERROR';
  currentValue: string | null;
  expectedValue: string;
  message: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const NPPES_API_BASE = 'https://npiregistry.cms.hhs.gov/api';
const NPPES_API_VERSION = '2.1';

/** Days after form generation before sending a "gentle nudge" */
const STALE_THRESHOLD_DAYS = 30;

/** Days after form generation before marking as expired and stopping polling */
const EXPIRY_THRESHOLD_DAYS = 45;

/** Max concurrent NPPES API requests to avoid rate concerns */
const MAX_CONCURRENT_POLLS = 5;

/** Delay between batches in ms */
const BATCH_DELAY_MS = 1000;

// ─── NPPES Field Extraction ──────────────────────────────────────────────────

/**
 * Maps our internal field_name values to extractors that pull the
 * corresponding value from an NPPES API response.
 */
const FIELD_EXTRACTORS: Record<string, (result: NPPESApiResponse['results'][0]) => string> = {
  // Practice location address (address_purpose = 'LOCATION')
  address: (r) => {
    const loc = r.addresses.find(a => a.address_purpose === 'LOCATION');
    if (!loc) return '';
    return normalizeAddress(
      `${loc.address_1} ${loc.address_2 || ''}, ${loc.city}, ${loc.state} ${loc.postal_code}`
    );
  },

  // Practice location phone
  phone: (r) => {
    const loc = r.addresses.find(a => a.address_purpose === 'LOCATION');
    return loc ? normalizePhone(loc.telephone_number) : '';
  },

  // Practice location fax
  fax: (r) => {
    const loc = r.addresses.find(a => a.address_purpose === 'LOCATION');
    return loc ? normalizePhone(loc.fax_number) : '';
  },

  // Primary taxonomy description
  taxonomy: (r) => {
    const primary = r.taxonomies.find(t => t.primary);
    return primary ? primary.desc.toLowerCase().trim() : '';
  },

  // Mailing address (address_purpose = 'MAILING')
  mailing_address: (r) => {
    const mail = r.addresses.find(a => a.address_purpose === 'MAILING');
    if (!mail) return '';
    return normalizeAddress(
      `${mail.address_1} ${mail.address_2 || ''}, ${mail.city}, ${mail.state} ${mail.postal_code}`
    );
  },
};

// ─── Normalization Helpers ───────────────────────────────────────────────────

function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\broad\b/g, 'rd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bsuite\b/g, 'ste')
    .replace(/\bnorth\b/g, 'n')
    .replace(/\bsouth\b/g, 's')
    .replace(/\beast\b/g, 'e')
    .replace(/\bwest\b/g, 'w')
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10); // last 10 digits
}

// ─── Auto-Confirmation Service ───────────────────────────────────────────────

export class AutoConfirmationService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main entry point: poll all active update requests.
   * Called daily by GitHub Actions workflow.
   * 
   * "Active" means status is FORM_GENERATED or SUBMITTED and not yet
   * confirmed or expired.
   */
  async pollAllActive(): Promise<{
    total: number;
    confirmed: number;
    stale: number;
    expired: number;
    noChange: number;
    errors: number;
  }> {
    const stats = { total: 0, confirmed: 0, stale: 0, expired: 0, noChange: 0, errors: 0 };

    // Fetch all active update requests (FORM_GENERATED or SUBMITTED)
    const { data: activeRequests, error } = await this.supabase
      .from('update_requests')
      .select('*')
      .in('status', ['FORM_GENERATED', 'SUBMITTED'])
      .order('created_at', { ascending: true });

    if (error || !activeRequests) {
      console.error('[AutoConfirmation] Failed to fetch active requests:', error);
      return stats;
    }

    stats.total = activeRequests.length;
    console.log(`[AutoConfirmation] Polling ${stats.total} active update requests`);

    // Process in batches to respect NPPES API rate limits
    for (let i = 0; i < activeRequests.length; i += MAX_CONCURRENT_POLLS) {
      const batch = activeRequests.slice(i, i + MAX_CONCURRENT_POLLS);
      const results = await Promise.allSettled(
        batch.map(req => this.pollSingleRequest(req))
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          stats.errors++;
          console.error('[AutoConfirmation] Poll failed:', result.reason);
          continue;
        }
        switch (result.value.status) {
          case 'CONFIRMED': stats.confirmed++; break;
          case 'STALE': stats.stale++; break;
          case 'EXPIRED': stats.expired++; break;
          case 'NO_CHANGE': stats.noChange++; break;
          case 'ERROR': stats.errors++; break;
        }
      }

      // Delay between batches
      if (i + MAX_CONCURRENT_POLLS < activeRequests.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log('[AutoConfirmation] Results:', JSON.stringify(stats));
    return stats;
  }

  /**
   * Poll a single update request against the NPPES Live API.
   */
  async pollSingleRequest(request: UpdateRequest): Promise<PollingResult> {
    const baseResult = {
      npi: request.npi,
      updateRequestId: request.id,
      expectedValue: request.expected_value,
    };

    try {
      // 1. Check age thresholds first
      const formGeneratedAt = new Date(request.form_generated_at);
      const daysSinceGenerated = Math.floor(
        (Date.now() - formGeneratedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Expired: stop polling, send final notice
      if (daysSinceGenerated >= EXPIRY_THRESHOLD_DAYS) {
        await this.updateStatus(request.id, 'EXPIRED');
        await this.sendExpiryEmail(request);
        return {
          ...baseResult,
          status: 'EXPIRED',
          currentValue: null,
          message: `${daysSinceGenerated} days since form generated, marking as expired`,
        };
      }

      // 2. Query NPPES Live API
      const nppes = await this.fetchNPPES(request.npi);
      if (!nppes || nppes.result_count === 0) {
        await this.incrementPollCount(request.id);
        return {
          ...baseResult,
          status: 'ERROR',
          currentValue: null,
          message: `NPI ${request.npi} not found in NPPES`,
        };
      }

      const nppesResult = nppes.results[0];

      // 3. Extract the field value from NPPES response
      const extractor = FIELD_EXTRACTORS[request.field_name];
      if (!extractor) {
        return {
          ...baseResult,
          status: 'ERROR',
          currentValue: null,
          message: `No extractor for field: ${request.field_name}`,
        };
      }

      const currentValue = extractor(nppesResult);
      const expectedNormalized = request.field_name === 'phone' || request.field_name === 'fax'
        ? normalizePhone(request.expected_value)
        : normalizeAddress(request.expected_value);

      // 4. Compare
      const isMatch = currentValue === expectedNormalized;

      if (isMatch) {
        // CONFIRMED: NPPES now reflects the expected value
        await this.updateStatus(request.id, 'CONFIRMED', {
          confirmed_at: new Date().toISOString(),
        });

        // Also resolve the delta event
        await this.resolveDeltaEvent(request.delta_event_id);

        // Send confirmation email
        await this.sendConfirmationEmail(request);

        return {
          ...baseResult,
          status: 'CONFIRMED',
          currentValue,
          message: `NPPES now reflects expected value for ${request.field_name}`,
        };
      }

      // 5. No change yet — check if we should send a stale nudge
      if (daysSinceGenerated >= STALE_THRESHOLD_DAYS && request.status !== 'SUBMITTED') {
        // Only nudge if they haven't manually marked as submitted
        // (if they submitted, they know it's in progress)
        await this.updateStatus(request.id, 'STALE');
        await this.sendStaleNudge(request, daysSinceGenerated);
        return {
          ...baseResult,
          status: 'STALE',
          currentValue,
          message: `${daysSinceGenerated} days with no NPPES change, nudge sent`,
        };
      }

      // 6. No change, keep polling
      await this.incrementPollCount(request.id);
      return {
        ...baseResult,
        status: 'NO_CHANGE',
        currentValue,
        message: `Day ${daysSinceGenerated}: NPPES still shows "${currentValue}"`,
      };

    } catch (err) {
      console.error(`[AutoConfirmation] Error polling NPI ${request.npi}:`, err);
      return {
        ...baseResult,
        status: 'ERROR',
        currentValue: null,
        message: `Poll error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Called when a form is generated. Creates or updates the update_request
   * to start auto-polling immediately.
   * 
   * This replaces the old flow where update_requests were only created
   * at form generation but polling didn't start until "Mark as Submitted".
   */
  async onFormGenerated(params: {
    npi: string;
    practiceWebsiteId: string;
    deltaEventId: string;
    fieldName: string;
    expectedValue: string;
    currentNppesValue: string;
  }): Promise<{ id: string }> {
    // Check for existing active request for same NPI + field
    const { data: existing } = await this.supabase
      .from('update_requests')
      .select('id')
      .eq('npi', params.npi)
      .eq('field_name', params.fieldName)
      .in('status', ['FORM_GENERATED', 'SUBMITTED'])
      .single();

    if (existing) {
      // Already tracking this field for this NPI — update expected value
      const { data, error } = await this.supabase
        .from('update_requests')
        .update({
          expected_value: params.expectedValue,
          current_nppes_value: params.currentNppesValue,
          delta_event_id: params.deltaEventId,
          form_generated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) throw error;
      return { id: data!.id };
    }

    // Create new tracking record — polling starts on next scheduled run
    const { data, error } = await this.supabase
      .from('update_requests')
      .insert({
        npi: params.npi,
        practice_website_id: params.practiceWebsiteId,
        delta_event_id: params.deltaEventId,
        status: 'FORM_GENERATED',
        field_name: params.fieldName,
        expected_value: params.expectedValue,
        current_nppes_value: params.currentNppesValue,
        form_generated_at: new Date().toISOString(),
        poll_count: 0,
      })
      .select('id')
      .single();

    if (error) throw error;
    console.log(`[AutoConfirmation] Tracking started for NPI ${params.npi} / ${params.fieldName}`);
    return { id: data!.id };
  }

  /**
   * Called when user optionally clicks "Mark as Submitted".
   * This is now enrichment, not a gate. It:
   *   - Records the submission date (for confirmation email copy)
   *   - Changes status to SUBMITTED (prevents stale nudge emails)
   *   - Does NOT affect polling (was already running)
   */
  async onManuallyMarkedSubmitted(updateRequestId: string): Promise<void> {
    await this.supabase
      .from('update_requests')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', updateRequestId)
      .in('status', ['FORM_GENERATED', 'STALE']); // allow STALE → SUBMITTED too

    console.log(`[AutoConfirmation] User marked ${updateRequestId} as submitted`);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async fetchNPPES(npi: string): Promise<NPPESApiResponse | null> {
    const url = `${NPPES_API_BASE}/?number=${npi}&version=${NPPES_API_VERSION}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[NPPES API] HTTP ${response.status} for NPI ${npi}`);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error(`[NPPES API] Fetch failed for NPI ${npi}:`, err);
      return null;
    }
  }

  private async updateStatus(
    id: string,
    status: UpdateRequestStatus,
    extra: Record<string, unknown> = {}
  ): Promise<void> {
    const { error } = await this.supabase
      .from('update_requests')
      .update({
        status,
        last_polled_at: new Date().toISOString(),
        ...extra,
      })
      .eq('id', id);

    if (error) console.error(`[AutoConfirmation] Status update failed:`, error);
  }

  private async incrementPollCount(id: string): Promise<void> {
    // Use raw SQL for atomic increment
    const { error } = await this.supabase.rpc('increment_poll_count', {
      request_id: id,
      polled_at: new Date().toISOString(),
    });

    if (error) {
      // Fallback if RPC not available
      const { data } = await this.supabase
        .from('update_requests')
        .select('poll_count')
        .eq('id', id)
        .single();

      await this.supabase
        .from('update_requests')
        .update({
          poll_count: (data?.poll_count || 0) + 1,
          last_polled_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  }

  private async resolveDeltaEvent(deltaEventId: string): Promise<void> {
    await this.supabase
      .from('nppes_delta_events')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', deltaEventId);
  }

  // ─── Email Senders ─────────────────────────────────────────────────────

  private async sendConfirmationEmail(request: UpdateRequest): Promise<void> {
    const wasManuallySubmitted = request.status === 'SUBMITTED';

    // Fetch provider name for the email
    const { data: provider } = await this.supabase
      .from('providers')
      .select('provider_first_name, provider_last_name_legal_name')
      .eq('npi', request.npi)
      .single();

    const providerName = provider
      ? `Dr. ${provider.provider_first_name} ${provider.provider_last_name_legal_name}`
      : `NPI ${request.npi}`;

    const subject = wasManuallySubmitted
      ? `NPPES Update Confirmed: ${providerName}`
      : `NPPES Update Detected: ${providerName}`;

    const bodyIntro = wasManuallySubmitted
      ? `Your NPPES update for ${providerName} was confirmed live today.`
      : `We detected that the NPPES record for ${providerName} has been updated to reflect the correct ${request.field_name}.`;

    console.log(`[AutoConfirmation] Sending confirmation email:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${bodyIntro}`);
    console.log(`  NPI: ${request.npi}, Field: ${request.field_name}`);

    // Integration point: call your SES email sender here
    // await sendEmail({
    //   to: practiceManagerEmail,
    //   subject,
    //   html: buildConfirmationEmailHtml(providerName, request, bodyIntro),
    // });
  }

  private async sendStaleNudge(request: UpdateRequest, daysSince: number): Promise<void> {
    const { data: provider } = await this.supabase
      .from('providers')
      .select('provider_first_name, provider_last_name_legal_name')
      .eq('npi', request.npi)
      .single();

    const providerName = provider
      ? `Dr. ${provider.provider_first_name} ${provider.provider_last_name_legal_name}`
      : `NPI ${request.npi}`;

    // Gentle, non-alarming copy
    const subject = `Quick check: ${providerName} NPPES update`;
    const body =
      `We generated an NPPES update form for ${providerName} ${daysSince} days ago. ` +
      `CMS updates can take several weeks to process. If you've already submitted, ` +
      `no action needed — we'll keep checking and let you know when it goes live. ` +
      `If you haven't submitted yet, the form is still available in your dashboard.`;

    console.log(`[AutoConfirmation] Sending stale nudge:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${body}`);

    // await sendEmail({ to: practiceManagerEmail, subject, html: ... });
  }

  private async sendExpiryEmail(request: UpdateRequest): Promise<void> {
    const { data: provider } = await this.supabase
      .from('providers')
      .select('provider_first_name, provider_last_name_legal_name')
      .eq('npi', request.npi)
      .single();

    const providerName = provider
      ? `Dr. ${provider.provider_first_name} ${provider.provider_last_name_legal_name}`
      : `NPI ${request.npi}`;

    const subject = `Update check ended: ${providerName}`;
    const body =
      `We've been monitoring the NPPES record for ${providerName} for 45 days ` +
      `but haven't detected the expected ${request.field_name} update. This can happen ` +
      `if the form wasn't submitted or if CMS is processing it under a different timeline. ` +
      `You can verify directly at nppes.cms.hhs.gov or generate a new form from your dashboard.`;

    console.log(`[AutoConfirmation] Sending expiry notice:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${body}`);

    // await sendEmail({ to: practiceManagerEmail, subject, html: ... });
  }
}

export default AutoConfirmationService;
