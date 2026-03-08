/**
 * validation-gate-status.ts
 * 
 * Decouples the validation gate from the display layer.
 * 
 * Previously, when the validation gate failed (weighted FP > 2%), ALL state board
 * findings were blocked from production — meaning the dashboard went stale and
 * customers saw no new insights until an engineer manually tuned the algorithm.
 * 
 * This module introduces a verification_status field on delta events that controls
 * HOW findings are displayed, not WHETHER they are displayed.
 * 
 * Gate Status → Display Behavior:
 *   PASSED  → findings show as "verified" (green badge, full actions available)
 *   FAILED  → findings show as "pending_verification" (yellow badge, actions gated per config)
 *   UNKNOWN → findings show as "pending_verification" (same as failed, safe default)
 * 
 * The gate still controls:
 *   - Whether alert EMAILS fire (only on PASSED)
 *   - Whether NPPES update forms can be generated (configurable, see DisplayMode)
 * 
 * The gate no longer controls:
 *   - Whether findings appear on the dashboard (always visible)
 *   - Whether delta events are written to nppes_delta_events (always written)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type GateStatus = 'PASSED' | 'FAILED' | 'UNKNOWN';

export type VerificationStatus = 'verified' | 'pending_verification' | 'unverified';

/**
 * Controls how "pending_verification" findings behave in the UI.
 * 
 * OPTION A: INFO_ONLY
 *   - Findings visible on dashboard with yellow "Pending Verification" badge
 *   - No "Generate Form" button
 *   - No alert emails
 *   - Tooltip: "This finding is awaiting verification and may change"
 * 
 * OPTION B: ACTIONABLE_WITH_WARNING  
 *   - Findings visible on dashboard with yellow "Pending Verification" badge
 *   - "Generate Form" button present but shows confirmation modal first
 *   - Modal text: "This finding has not been fully verified. Generating a form 
 *     based on unverified data may result in incorrect NPPES submissions."
 *   - No alert emails (still gated)
 *   - ROI calculations excluded from pending findings
 */
export type DisplayMode = 'INFO_ONLY' | 'ACTIONABLE_WITH_WARNING';

export interface GateStatusResult {
  status: GateStatus;
  pecos_fp_rate: number | null;
  fuzzy_fp_rate: number | null;
  weighted_fp_rate: number | null;
  last_checked: string | null;
  sample_size: number;
  thresholds: {
    pecos_max: number;
    fuzzy_max: number;
    weighted_max: number;
  };
}

export interface DeltaEventVerification {
  delta_event_id: string;
  verification_status: VerificationStatus;
  source_method: 'PECOS_EXACT' | 'NPPES_FUZZY' | 'DIRECT_DETECTION' | null;
  gate_status_at_creation: GateStatus;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const GATE_THRESHOLDS = {
  pecos_max: 0.01,    // 1% false positive rate
  fuzzy_max: 0.03,    // 3% false positive rate
  weighted_max: 0.02, // 2% weighted false positive rate
};

/**
 * CHANGE THIS VALUE TO SWITCH BETWEEN OPTION A AND OPTION B.
 * 
 * After reviewing both approaches in the dashboard, set this to your preference.
 * This can also be moved to an environment variable or Supabase config table
 * for runtime toggling without a deploy.
 */
export const PENDING_DISPLAY_MODE: DisplayMode = 'INFO_ONLY';

// ─── Gate Status Service ─────────────────────────────────────────────────────

export class ValidationGateStatusService {
  private supabase: SupabaseClient;
  private cachedStatus: GateStatusResult | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Check the current validation gate status.
   * Results are cached for 5 minutes to avoid hammering the DB on every request.
   */
  async getGateStatus(forceRefresh = false): Promise<GateStatusResult> {
    const now = Date.now();

    if (!forceRefresh && this.cachedStatus && now < this.cacheExpiry) {
      return this.cachedStatus;
    }

    // Query validated sample records
    const { data: validatedRecords, error } = await this.supabase
      .from('provider_npi_resolutions')
      .select('resolution_method, is_validated, is_false_positive')
      .eq('is_validated', true);

    if (error || !validatedRecords) {
      console.error('[ValidationGate] Failed to query validated records:', error);
      return {
        status: 'UNKNOWN',
        pecos_fp_rate: null,
        fuzzy_fp_rate: null,
        weighted_fp_rate: null,
        last_checked: new Date().toISOString(),
        sample_size: 0,
        thresholds: GATE_THRESHOLDS,
      };
    }

    // Separate by method
    const pecosRecords = validatedRecords.filter(
      (r) => r.resolution_method === 'PECOS_EXACT'
    );
    const fuzzyRecords = validatedRecords.filter(
      (r) => r.resolution_method === 'NPPES_FUZZY'
    );

    const pecosFP = pecosRecords.filter((r) => r.is_false_positive).length;
    const fuzzyFP = fuzzyRecords.filter((r) => r.is_false_positive).length;

    const pecos_fp_rate = pecosRecords.length > 0 
      ? pecosFP / pecosRecords.length 
      : 0;
    const fuzzy_fp_rate = fuzzyRecords.length > 0 
      ? fuzzyFP / fuzzyRecords.length 
      : 0;

    // Weighted: proportional to total validated records per method
    const totalValidated = validatedRecords.length;
    const weighted_fp_rate = totalValidated > 0
      ? (pecosFP + fuzzyFP) / totalValidated
      : 0;

    const passed =
      pecos_fp_rate < GATE_THRESHOLDS.pecos_max &&
      fuzzy_fp_rate < GATE_THRESHOLDS.fuzzy_max &&
      weighted_fp_rate < GATE_THRESHOLDS.weighted_max;

    const result: GateStatusResult = {
      status: passed ? 'PASSED' : 'FAILED',
      pecos_fp_rate,
      fuzzy_fp_rate,
      weighted_fp_rate,
      last_checked: new Date().toISOString(),
      sample_size: totalValidated,
      thresholds: GATE_THRESHOLDS,
    };

    // Cache result
    this.cachedStatus = result;
    this.cacheExpiry = now + this.CACHE_TTL_MS;

    return result;
  }

  /**
   * Determine the verification status for a delta event based on:
   *   1. The source method (direct detection vs NPI resolution)
   *   2. The current gate status
   * 
   * Direct detections (web scan found address/phone mismatch with NPPES)
   * are ALWAYS "verified" because they don't go through NPI resolution.
   * 
   * NPI-resolution-derived findings (state board → NPI → comparison)
   * are "verified" only when the gate passes, otherwise "pending_verification".
   */
  async getVerificationStatus(
    sourceMethod: string | null,
    confidence: number
  ): Promise<VerificationStatus> {
    // Direct web scan detections bypass the gate entirely
    // These compare website content directly against NPPES — no NPI resolution involved
    if (!sourceMethod || sourceMethod === 'DIRECT_DETECTION') {
      return 'verified';
    }

    // High-confidence PECOS matches (>= 0.95) are treated as verified
    // even when the gate fails — the gate primarily protects against fuzzy match FPs
    if (sourceMethod === 'PECOS_EXACT' && confidence >= 0.95) {
      return 'verified';
    }

    // Everything else depends on gate status
    const gateStatus = await this.getGateStatus();

    if (gateStatus.status === 'PASSED') {
      return 'verified';
    }

    return 'pending_verification';
  }

  /**
   * Determine what UI actions are available for a finding based on its
   * verification status and the configured display mode.
   */
  getAvailableActions(
    verificationStatus: VerificationStatus,
    displayMode: DisplayMode = PENDING_DISPLAY_MODE
  ): {
    canGenerateForm: boolean;
    canSendAlert: boolean;
    requiresConfirmation: boolean;
    badgeColor: string;
    badgeText: string;
    tooltipText: string;
  } {
    if (verificationStatus === 'verified') {
      return {
        canGenerateForm: true,
        canSendAlert: true,
        requiresConfirmation: false,
        badgeColor: 'red',     // standard mismatch badge
        badgeText: 'Mismatch',
        tooltipText: 'Verified mismatch detected between sources',
      };
    }

    if (verificationStatus === 'pending_verification') {
      if (displayMode === 'INFO_ONLY') {
        return {
          canGenerateForm: false,
          canSendAlert: false,
          requiresConfirmation: false,
          badgeColor: 'amber',
          badgeText: 'Pending Verification',
          tooltipText:
            'This finding is awaiting verification and may change. ' +
            'It will become actionable once our verification process completes.',
        };
      }

      // ACTIONABLE_WITH_WARNING
      return {
        canGenerateForm: true,
        canSendAlert: false,    // emails still gated
        requiresConfirmation: true,
        badgeColor: 'amber',
        badgeText: 'Pending Verification',
        tooltipText:
          'This finding has not been fully verified. You can generate a form, ' +
          'but please review the data carefully before submitting to NPPES.',
      };
    }

    // UNVERIFIED — should not normally appear on dashboard
    return {
      canGenerateForm: false,
      canSendAlert: false,
      requiresConfirmation: false,
      badgeColor: 'gray',
      badgeText: 'Unverified',
      tooltipText: 'This record has not been verified',
    };
  }
}

// ─── Delta Engine Integration ────────────────────────────────────────────────

/**
 * Call this from delta-engine.ts when writing new delta events.
 * 
 * Instead of checking the gate and blocking writes, we ALWAYS write the event
 * but stamp it with a verification_status that controls display behavior.
 * 
 * Usage in delta-engine.ts:
 * 
 *   import { stampDeltaEventVerification } from './validation-gate-status';
 *   
 *   // Before: gate check blocked the entire write
 *   // if (!gateResult.passed) return; // ← REMOVE THIS
 *   
 *   // After: always write, stamp with verification status
 *   const verification = await stampDeltaEventVerification(
 *     deltaEvent.id,
 *     deltaEvent.source_method,
 *     deltaEvent.confidence
 *   );
 *   deltaEvent.verification_status = verification.verification_status;
 */
const gateService = new ValidationGateStatusService();

export async function stampDeltaEventVerification(
  deltaEventId: string,
  sourceMethod: string | null,
  confidence: number
): Promise<DeltaEventVerification> {
  const verificationStatus = await gateService.getVerificationStatus(
    sourceMethod,
    confidence
  );
  const gateStatus = await gateService.getGateStatus();

  return {
    delta_event_id: deltaEventId,
    verification_status: verificationStatus,
    source_method: sourceMethod as DeltaEventVerification['source_method'],
    gate_status_at_creation: gateStatus.status,
  };
}

// ─── Alert Email Guard ───────────────────────────────────────────────────────

/**
 * Call this from app/api/alerts/mismatch/route.ts before sending emails.
 * 
 * Only delta events with verification_status === 'verified' should trigger
 * alert emails. Pending findings are visible on the dashboard but silent.
 * 
 * Usage:
 *   import { shouldSendAlert } from '@/lib/scanner/validation-gate-status';
 *   
 *   const events = await fetchUnsentDeltaEvents(practiceId);
 *   const alertableEvents = events.filter(e => shouldSendAlert(e));
 */
export function shouldSendAlert(deltaEvent: {
  verification_status?: VerificationStatus;
}): boolean {
  // Legacy events without verification_status are treated as verified
  // (they were written before the gate decoupling, so they passed the old gate)
  if (!deltaEvent.verification_status) {
    return true;
  }
  return deltaEvent.verification_status === 'verified';
}

// ─── Form Generation Guard ───────────────────────────────────────────────────

/**
 * Call this from lib/forms/nppes-form-generator.ts before generating PDFs.
 * 
 * Usage:
 *   import { canGenerateForm } from '@/lib/scanner/validation-gate-status';
 *   
 *   const { allowed, requiresConfirmation, warningMessage } = canGenerateForm(deltaEvent);
 *   if (!allowed) return { error: 'Finding pending verification' };
 *   if (requiresConfirmation && !userConfirmed) return { requiresConfirmation: true, warningMessage };
 */
export function canGenerateForm(deltaEvent: {
  verification_status?: VerificationStatus;
}): {
  allowed: boolean;
  requiresConfirmation: boolean;
  warningMessage: string | null;
} {
  if (!deltaEvent.verification_status || deltaEvent.verification_status === 'verified') {
    return { allowed: true, requiresConfirmation: false, warningMessage: null };
  }

  const actions = gateService.getAvailableActions(
    deltaEvent.verification_status,
    PENDING_DISPLAY_MODE
  );

  return {
    allowed: actions.canGenerateForm,
    requiresConfirmation: actions.requiresConfirmation,
    warningMessage: actions.requiresConfirmation
      ? 'This finding has not been fully verified. Generating a form based on ' +
        'unverified data may result in incorrect NPPES submissions. Do you want to proceed?'
      : null,
  };
}

export default ValidationGateStatusService;
