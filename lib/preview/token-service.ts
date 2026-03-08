// lib/preview/token-service.ts
// ═══ Preview URL Token System ═══
// Task 2.1: Generate time-limited tokens for practice preview URLs.
// Token → read-only dashboard at /preview/[token] → claim flow → paying customer.

import * as crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

export interface PreviewToken {
  id: string;
  token: string;
  practice_website_id: string;
  expires_at: string;
  is_claimed: boolean;
  claimed_at: string | null;
  claimed_by: string | null;
  view_count: number;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  campaign_id: string | null;
  mismatch_summary: any;
}

/**
 * Generate a preview token for a practice website.
 * Creates a cryptographically random token, snapshots current findings,
 * and stores in preview_tokens with 7-day expiry.
 */
export async function generatePreviewToken(
  practiceWebsiteId: string,
  campaignId?: string,
): Promise<PreviewToken> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Snapshot current mismatch state for the preview
  const providers: any[] = await db(
    `practice_providers?practice_website_id=eq.${practiceWebsiteId}&active_mismatch_count=gt.0&select=npi,provider_name,has_address_mismatch,has_phone_mismatch,has_taxonomy_mismatch,active_mismatch_count`
  );

  // Get practice info for the snapshot
  const practice: any[] = await db(
    `practice_websites?id=eq.${practiceWebsiteId}&select=name,url,state,provider_count,mismatch_count`
  );

  const mismatchSummary = {
    practice_name: practice[0]?.name || null,
    practice_url: practice[0]?.url || null,
    practice_state: practice[0]?.state || null,
    total_providers: practice[0]?.provider_count || 0,
    total_mismatches: practice[0]?.mismatch_count || 0,
    providers_with_mismatches: providers.map(p => ({
      npi: p.npi,
      name: p.provider_name,
      address_mismatch: p.has_address_mismatch,
      phone_mismatch: p.has_phone_mismatch,
      taxonomy_mismatch: p.has_taxonomy_mismatch,
      mismatch_count: p.active_mismatch_count,
    })),
    snapshot_at: new Date().toISOString(),
  };

  const rows: PreviewToken[] = await db('preview_tokens', {
    method: 'POST',
    body: JSON.stringify({
      token,
      practice_website_id: practiceWebsiteId,
      expires_at: expiresAt,
      campaign_id: campaignId || null,
      mismatch_summary: mismatchSummary,
    }),
  });

  return rows[0];
}

/**
 * Look up a preview token and validate it.
 */
export async function getPreviewToken(token: string): Promise<{
  valid: boolean;
  expired: boolean;
  claimed: boolean;
  data: PreviewToken | null;
}> {
  const rows: PreviewToken[] = await db(
    `preview_tokens?token=eq.${encodeURIComponent(token)}&select=*`
  );

  if (!rows?.length) return { valid: false, expired: false, claimed: false, data: null };

  const t = rows[0];
  const now = new Date();
  const expired = new Date(t.expires_at) < now;

  return {
    valid: !expired && !t.is_claimed,
    expired,
    claimed: t.is_claimed,
    data: t,
  };
}

/**
 * Record a preview view (increment view_count, set first/last viewed).
 */
export async function recordPreviewView(tokenId: string, currentViewCount: number): Promise<void> {
  const now = new Date().toISOString();
  const updates: any = {
    view_count: currentViewCount + 1,
    last_viewed_at: now,
  };
  if (currentViewCount === 0) {
    updates.first_viewed_at = now;
  }

  await db(`preview_tokens?id=eq.${tokenId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Claim a preview token (convert to full account).
 */
export async function claimPreviewToken(
  tokenId: string,
  userId: string,
): Promise<void> {
  await db(`preview_tokens?id=eq.${tokenId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      is_claimed: true,
      claimed_at: new Date().toISOString(),
      claimed_by: userId,
    }),
  });
}

/**
 * Get tokens due for follow-up emails.
 */
export async function getTokensForFollowup(
  followupDay: 1 | 2 | 3, // followup_1_sent, followup_2_sent, followup_3_sent
): Promise<PreviewToken[]> {
  const field = `followup_${followupDay}_sent`;
  const daysSinceCreation = followupDay === 1 ? 3 : followupDay === 2 ? 6 : 14;
  const cutoff = new Date(Date.now() - daysSinceCreation * 24 * 60 * 60 * 1000).toISOString();

  return db(
    `preview_tokens?is_claimed=eq.false&${field}=eq.false&created_at=lte.${cutoff}&expires_at=gt.${new Date().toISOString()}&select=*`
  );
}

/**
 * Mark a follow-up as sent.
 */
export async function markFollowupSent(
  tokenId: string,
  followupDay: 1 | 2 | 3,
): Promise<void> {
  await db(`preview_tokens?id=eq.${tokenId}`, {
    method: 'PATCH',
    body: JSON.stringify({ [`followup_${followupDay}_sent`]: true }),
  });
}
