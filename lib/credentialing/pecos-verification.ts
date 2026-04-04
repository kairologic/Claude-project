/**
 * lib/credentialing/pecos-verification.ts
 *
 * PECOS enrollment verification for the credentialing pipeline.
 * Checks whether a provider NPI exists in the provider_pecos table
 * (populated monthly from CMS Data API) and determines enrollment status.
 *
 * Used by:
 * - assessment-engine.ts (onboarding: is provider Medicare-enrolled?)
 * - departure-engine.ts  (departure: does PECOS enrollment need termination?)
 * - scan-scheduler.ts    (ongoing: flag providers with PECOS gaps)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SourceStatus } from './assessment-engine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PecosVerificationResult {
  /** Status suitable for assessment/departure engine */
  status: SourceStatus;
  /** Whether the NPI was found in PECOS data at all */
  enrolled: boolean;
  /** State the provider is enrolled in (from PECOS) */
  enrolled_state: string | null;
  /** Whether the enrolled state matches the practice state */
  state_match: boolean;
  /** Specialty from PECOS (for cross-reference) */
  pecos_specialty: string | null;
  /** CMS provider type description */
  practice_type: string | null;
  /** When the PECOS data was last synced */
  last_synced_at: string | null;
  /** Human-readable summary */
  summary: string;
}

export interface PecosEnrollmentRecord {
  npi: string;
  enrollment_id: string | null;
  enrollment_status: string;
  enrollment_type: string | null;
  practice_type: string | null;
  provider_name: string | null;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  specialty: string | null;
  pecos_specialty: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  reassignment_npi: string | null;
  reassignment_name: string | null;
  source_date: string | null;
  last_synced_at: string | null;
}

// ─── State coverage ─────────────────────────────────────────────────────────
// PECOS data is currently synced for these states only.
// Expand as monthly sync adds states.
const SYNCED_STATES = new Set(['TX', 'CA']);

// ─── Core verification ──────────────────────────────────────────────────────

/**
 * Verify a provider's PECOS enrollment status.
 *
 * @param supabase  - Supabase client (admin or server)
 * @param npi       - Provider NPI to check
 * @param practiceState - State the practice is in (for state match check)
 * @returns PecosVerificationResult
 */
export async function verifyPecosEnrollment(
  supabase: SupabaseClient,
  npi: string,
  practiceState?: string | null,
): Promise<PecosVerificationResult> {
  // If practice is in a state we don't sync yet, skip
  const normalizedState = (practiceState || '').toUpperCase().trim();
  if (normalizedState && !SYNCED_STATES.has(normalizedState)) {
    return {
      status: 'not_checked',
      enrolled: false,
      enrolled_state: null,
      state_match: false,
      pecos_specialty: null,
      practice_type: null,
      last_synced_at: null,
      summary: `PECOS data not available for state ${normalizedState} (synced: ${Array.from(SYNCED_STATES).join(', ')})`,
    };
  }

  // Query provider_pecos for this NPI
  const { data: pecosRecords, error } = await supabase
    .from('provider_pecos')
    .select('*')
    .eq('npi', npi);

  if (error) {
    console.error(`[PECOS Verification] DB error for NPI ${npi}:`, error.message);
    return {
      status: 'not_checked',
      enrolled: false,
      enrolled_state: null,
      state_match: false,
      pecos_specialty: null,
      practice_type: null,
      last_synced_at: null,
      summary: `PECOS check failed: ${error.message}`,
    };
  }

  // No records found — provider not in Medicare PECOS
  if (!pecosRecords || pecosRecords.length === 0) {
    return {
      status: 'not_listed',
      enrolled: false,
      enrolled_state: null,
      state_match: false,
      pecos_specialty: null,
      practice_type: null,
      last_synced_at: null,
      summary: 'Provider NPI not found in CMS PECOS enrollment data — may not be Medicare-enrolled',
    };
  }

  // Found — take the first record (deduped by NPI during sync)
  const pecos = pecosRecords[0] as PecosEnrollmentRecord;
  const enrolledState = (pecos.state || '').toUpperCase().trim();
  const stateMatch = !normalizedState || enrolledState === normalizedState;

  // Determine status
  let status: SourceStatus;
  let summary: string;

  if (stateMatch) {
    status = 'enrolled';
    summary =
      `Medicare-enrolled in ${enrolledState}` +
      (pecos.specialty ? ` — ${pecos.specialty}` : '') +
      (pecos.practice_type ? ` (${pecos.practice_type})` : '');
  } else {
    // Provider is enrolled but in a different state than the practice
    status = 'needs_reassignment';
    summary = `Medicare-enrolled in ${enrolledState}, but practice is in ${normalizedState} — may need PECOS reassignment or change of information`;
  }

  return {
    status,
    enrolled: true,
    enrolled_state: enrolledState || null,
    state_match: stateMatch,
    pecos_specialty: pecos.specialty || pecos.pecos_specialty || null,
    practice_type: pecos.practice_type || null,
    last_synced_at: pecos.last_synced_at || null,
    summary,
  };
}

// ─── Batch verification ─────────────────────────────────────────────────────

/**
 * Verify PECOS enrollment for multiple NPIs at once.
 * More efficient than calling verifyPecosEnrollment in a loop
 * because it does a single DB query.
 *
 * @param supabase      - Supabase client
 * @param npis          - Array of NPI strings
 * @param practiceState - Practice state for comparison
 * @returns Map of NPI → PecosVerificationResult
 */
export async function verifyPecosBatch(
  supabase: SupabaseClient,
  npis: string[],
  practiceState?: string | null,
): Promise<Map<string, PecosVerificationResult>> {
  const results = new Map<string, PecosVerificationResult>();

  if (npis.length === 0) return results;

  const normalizedState = (practiceState || '').toUpperCase().trim();

  // If state not in sync coverage, return not_checked for all
  if (normalizedState && !SYNCED_STATES.has(normalizedState)) {
    const notChecked: PecosVerificationResult = {
      status: 'not_checked',
      enrolled: false,
      enrolled_state: null,
      state_match: false,
      pecos_specialty: null,
      practice_type: null,
      last_synced_at: null,
      summary: `PECOS data not available for state ${normalizedState}`,
    };
    for (const npi of npis) results.set(npi, notChecked);
    return results;
  }

  // Batch query — Supabase .in() supports up to ~300 values per call
  const batchSize = 250;
  const allRecords: PecosEnrollmentRecord[] = [];

  for (let i = 0; i < npis.length; i += batchSize) {
    const batch = npis.slice(i, i + batchSize);
    const { data, error } = await supabase.from('provider_pecos').select('*').in('npi', batch);

    if (error) {
      console.error(`[PECOS Batch] DB error:`, error.message);
      // Mark this batch as not_checked
      for (const npi of batch) {
        results.set(npi, {
          status: 'not_checked',
          enrolled: false,
          enrolled_state: null,
          state_match: false,
          pecos_specialty: null,
          practice_type: null,
          last_synced_at: null,
          summary: `PECOS batch check failed: ${error.message}`,
        });
      }
      continue;
    }

    if (data) allRecords.push(...(data as PecosEnrollmentRecord[]));
  }

  // Index by NPI
  const byNpi = new Map<string, PecosEnrollmentRecord>();
  for (const rec of allRecords) {
    byNpi.set(rec.npi, rec);
  }

  // Build results for each NPI
  for (const npi of npis) {
    const pecos = byNpi.get(npi);
    if (!pecos) {
      results.set(npi, {
        status: 'not_listed',
        enrolled: false,
        enrolled_state: null,
        state_match: false,
        pecos_specialty: null,
        practice_type: null,
        last_synced_at: null,
        summary: 'Provider NPI not found in CMS PECOS enrollment data',
      });
      continue;
    }

    const enrolledState = (pecos.state || '').toUpperCase().trim();
    const stateMatch = !normalizedState || enrolledState === normalizedState;

    let status: SourceStatus;
    let summary: string;

    if (stateMatch) {
      status = 'enrolled';
      summary =
        `Medicare-enrolled in ${enrolledState}` + (pecos.specialty ? ` — ${pecos.specialty}` : '');
    } else {
      status = 'needs_reassignment';
      summary = `Medicare-enrolled in ${enrolledState}, practice in ${normalizedState} — may need reassignment`;
    }

    results.set(npi, {
      status,
      enrolled: true,
      enrolled_state: enrolledState || null,
      state_match: stateMatch,
      pecos_specialty: pecos.specialty || pecos.pecos_specialty || null,
      practice_type: pecos.practice_type || null,
      last_synced_at: pecos.last_synced_at || null,
      summary,
    });
  }

  return results;
}
