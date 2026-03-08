// lib/trial/trial-manager.ts
// ═══ Reverse Trial Lifecycle Manager ═══
//
// Flow:
//   1. Practice claims dashboard → 14-day Protect-tier trial starts (no CC)
//   2. Day 7  → value summary email
//   3. Day 12 → expiry warning email
//   4. Day 14 → auto-downgrade to free tier, downgrade email
//   5. Day 21 → "mismatches still open" nudge email
//   6. Any time → user upgrades via Stripe → trial ends, paid tier activates
//
// Trial state: ACTIVE → EXPIRING (day 12+) → EXPIRED → CONVERTED | CHURNED

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

// ── Plan Tiers ───────────────────────────────────────────

export type PlanTier = 'free' | 'trial_protect' | 'monitor' | 'protect' | 'command';
export type TrialStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CONVERTED' | 'CHURNED' | 'NONE';

export const TRIAL_DURATION_DAYS = 14;
export const TRIAL_TIER: PlanTier = 'trial_protect'; // full Protect access during trial
export const FREE_TIER: PlanTier = 'free';

export const FOUNDERS_RATE = {
  enabled: true,
  price_monthly: 99,
  label: "Founder's Rate",
  note: 'Locked at $99/mo for 12 months. First 10 customers only.',
  slots_total: 10,
};

// ── Trial Lifecycle ──────────────────────────────────────

export interface TrialState {
  organization_id: string;
  plan_tier: PlanTier;
  trial_status: TrialStatus;
  trial_start: string | null;
  trial_end: string | null;
  days_remaining: number;
  days_elapsed: number;
  is_trial: boolean;
  is_paid: boolean;
  is_free: boolean;
  can_generate_forms: boolean;
  can_bulk_generate: boolean;
  can_receive_alerts: boolean;
  upgrade_reason: string | null;
}

/**
 * Get the current trial/plan state for an organization.
 */
export async function getTrialState(organizationId: string): Promise<TrialState> {
  const orgs = await db(
    `organizations?id=eq.${organizationId}&select=id,plan_tier,trial_start,trial_end,trial_status,stripe_subscription_id`
  );

  if (!orgs?.length) {
    return makeState(organizationId, 'free', 'NONE', null, null, false);
  }

  const org = orgs[0];
  const tier = org.plan_tier as PlanTier || 'free';
  const isPaid = !!org.stripe_subscription_id;

  if (isPaid) {
    return makeState(organizationId, tier, 'CONVERTED', org.trial_start, org.trial_end, true);
  }

  if (tier === 'trial_protect' && org.trial_end) {
    const now = new Date();
    const end = new Date(org.trial_end);
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);

    if (daysRemaining <= 0) {
      return makeState(organizationId, 'free', 'EXPIRED', org.trial_start, org.trial_end, false);
    }
    if (daysRemaining <= 2) {
      return makeState(organizationId, 'trial_protect', 'EXPIRING', org.trial_start, org.trial_end, false);
    }
    return makeState(organizationId, 'trial_protect', 'ACTIVE', org.trial_start, org.trial_end, false);
  }

  return makeState(organizationId, tier, org.trial_status || 'NONE', org.trial_start, org.trial_end, false);
}

function makeState(
  orgId: string, tier: PlanTier, status: TrialStatus,
  trialStart: string | null, trialEnd: string | null, isPaid: boolean,
): TrialState {
  const now = new Date();
  const start = trialStart ? new Date(trialStart) : null;
  const end = trialEnd ? new Date(trialEnd) : null;
  const daysRemaining = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)) : 0;
  const daysElapsed = start ? Math.floor((now.getTime() - start.getTime()) / 86400000) : 0;
  const isTrial = tier === 'trial_protect' && status === 'ACTIVE' || status === 'EXPIRING';
  const isFree = tier === 'free' && !isPaid;

  const gates = getFeatureGates(isTrial ? 'trial_protect' : tier);

  return {
    organization_id: orgId,
    plan_tier: tier,
    trial_status: status,
    trial_start: trialStart,
    trial_end: trialEnd,
    days_remaining: daysRemaining,
    days_elapsed: daysElapsed,
    is_trial: isTrial,
    is_paid: isPaid,
    is_free: isFree,
    can_generate_forms: gates.forms_single,
    can_bulk_generate: gates.forms_bulk,
    can_receive_alerts: gates.alert_emails,
    upgrade_reason: isFree ? 'Trial expired. Upgrade to unlock forms and alerts.' : null,
  };
}

/**
 * Start a reverse trial for a newly claimed practice.
 * Called from the claim API.
 */
export async function startTrial(organizationId: string): Promise<void> {
  const now = new Date();
  const end = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86400000);

  await db(`organizations?id=eq.${organizationId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      plan_tier: TRIAL_TIER,
      trial_start: now.toISOString(),
      trial_end: end.toISOString(),
      trial_status: 'ACTIVE',
    }),
  });
}

/**
 * Downgrade expired trials to free tier.
 * Called daily by GitHub Actions.
 */
export async function downgradeExpiredTrials(): Promise<{
  downgraded: number;
  already_converted: number;
  still_active: number;
}> {
  const now = new Date().toISOString();
  const result = { downgraded: 0, already_converted: 0, still_active: 0 };

  // Fetch all trial_protect orgs where trial_end has passed
  const expired = await db(
    `organizations?plan_tier=eq.trial_protect&trial_end=lte.${now}&trial_status=in.(ACTIVE,EXPIRING)&select=id,stripe_subscription_id,contact_email,name`
  );

  if (!expired?.length) return result;

  for (const org of expired) {
    // Skip if they already paid (converted during trial)
    if (org.stripe_subscription_id) {
      await db(`organizations?id=eq.${org.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ trial_status: 'CONVERTED' }),
      });
      result.already_converted++;
      continue;
    }

    // Downgrade to free
    await db(`organizations?id=eq.${org.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        plan_tier: FREE_TIER,
        trial_status: 'EXPIRED',
      }),
    });

    // Downgrade scan tier for their practices
    await db(`practice_websites?organization_id=eq.${org.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ scan_tier: 'monthly' }),
    });

    result.downgraded++;
  }

  return result;
}

/**
 * Record an upgrade (called after Stripe webhook confirms payment).
 */
export async function recordUpgrade(
  organizationId: string,
  planTier: PlanTier,
  stripeSubscriptionId: string,
): Promise<void> {
  await db(`organizations?id=eq.${organizationId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      plan_tier: planTier,
      trial_status: 'CONVERTED',
      stripe_subscription_id: stripeSubscriptionId,
      upgraded_at: new Date().toISOString(),
    }),
  });

  // Upgrade scan tier
  const scanTier = planTier === 'command' ? 'daily' : 'weekly';
  await db(`practice_websites?organization_id=eq.${organizationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ scan_tier: scanTier }),
  });
}

// ── Feature Gates ────────────────────────────────────────

export interface FeatureGates {
  dashboard_view: boolean;        // can see dashboard at all
  findings_visible: boolean;      // can see mismatch details
  field_diffs: boolean;           // can see field-level diffs (red/green)
  forms_single: boolean;          // can generate single NPPES form
  forms_bulk: boolean;            // can generate bulk forms
  forms_first_free: boolean;      // first form is free (then locked)
  auto_confirmation: boolean;     // NPPES polling active
  alert_emails: boolean;          // real-time mismatch alerts
  roster_surveillance: boolean;   // departed/new provider detection
  state_regulatory: boolean;      // SB 1188, AB 3030 scanning
  license_monitoring: boolean;    // TMB, CA MB license checks
  sanctions_screening: boolean;   // LEIE, SAM.gov
  multi_location: boolean;        // multiple practice sites
  api_access: boolean;            // REST API for integrations
  max_locations: number;          // location limit
}

const TIER_GATES: Record<PlanTier, FeatureGates> = {
  free: {
    dashboard_view: true,
    findings_visible: true,        // they can SEE the fire
    field_diffs: true,             // they can SEE the diffs (loss aversion)
    forms_single: false,           // but can't download the extinguisher
    forms_bulk: false,
    forms_first_free: true,        // EXCEPT: first form is free (aha moment)
    auto_confirmation: false,
    alert_emails: false,           // no alerts on free
    roster_surveillance: false,
    state_regulatory: false,
    license_monitoring: false,
    sanctions_screening: false,
    multi_location: false,
    api_access: false,
    max_locations: 1,
  },
  trial_protect: {
    dashboard_view: true,
    findings_visible: true,
    field_diffs: true,
    forms_single: true,
    forms_bulk: true,
    forms_first_free: true,
    auto_confirmation: true,
    alert_emails: true,
    roster_surveillance: true,
    state_regulatory: true,
    license_monitoring: false,     // Command only
    sanctions_screening: false,    // Command only
    multi_location: true,
    api_access: false,
    max_locations: 5,
  },
  monitor: {
    dashboard_view: true,
    findings_visible: true,
    field_diffs: true,
    forms_single: true,
    forms_bulk: false,
    forms_first_free: true,
    auto_confirmation: false,
    alert_emails: true,            // weekly digest only (enforced in email logic)
    roster_surveillance: false,
    state_regulatory: false,
    license_monitoring: false,
    sanctions_screening: false,
    multi_location: false,
    api_access: false,
    max_locations: 1,
  },
  protect: {
    dashboard_view: true,
    findings_visible: true,
    field_diffs: true,
    forms_single: true,
    forms_bulk: true,
    forms_first_free: true,
    auto_confirmation: true,
    alert_emails: true,
    roster_surveillance: true,
    state_regulatory: true,
    license_monitoring: false,
    sanctions_screening: false,
    multi_location: true,
    api_access: false,
    max_locations: 5,
  },
  command: {
    dashboard_view: true,
    findings_visible: true,
    field_diffs: true,
    forms_single: true,
    forms_bulk: true,
    forms_first_free: true,
    auto_confirmation: true,
    alert_emails: true,
    roster_surveillance: true,
    state_regulatory: true,
    license_monitoring: true,
    sanctions_screening: true,
    multi_location: true,
    api_access: true,
    max_locations: 999,
  },
};

export function getFeatureGates(tier: PlanTier): FeatureGates {
  return TIER_GATES[tier] || TIER_GATES.free;
}

/**
 * Check if a specific feature is available, accounting for "first form free" logic.
 */
export async function checkFeatureAccess(
  organizationId: string,
  feature: keyof FeatureGates,
): Promise<{ allowed: boolean; reason?: string; upgrade_tier?: PlanTier }> {
  const state = await getTrialState(organizationId);
  const gates = getFeatureGates(state.plan_tier);

  // Special case: first form free on free tier
  if (feature === 'forms_single' && !gates.forms_single && gates.forms_first_free) {
    // Check if they've already used their free form
    const requests = await db(
      `update_requests?organization_id=eq.${organizationId}&select=id&limit=2`
    );
    if (!requests?.length || requests.length === 0) {
      return { allowed: true }; // first form is free
    }
    return {
      allowed: false,
      reason: "You've used your free form. Upgrade to generate unlimited NPPES update forms.",
      upgrade_tier: 'monitor',
    };
  }

  if ((gates as any)[feature]) {
    return { allowed: true };
  }

  // Determine minimum tier needed
  const tierOrder: PlanTier[] = ['monitor', 'protect', 'command'];
  for (const tier of tierOrder) {
    if ((TIER_GATES[tier] as any)[feature]) {
      return {
        allowed: false,
        reason: `This feature requires the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.`,
        upgrade_tier: tier,
      };
    }
  }

  return { allowed: false, reason: 'Feature not available', upgrade_tier: 'protect' };
}
