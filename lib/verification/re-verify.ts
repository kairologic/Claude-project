/**
 * lib/verification/re-verify.ts
 *
 * Core re-verification comparison logic for KairoLogic Verification Engine.
 * Handles:
 * - Fetching pending verification workflows
 * - Fuzzy value comparison (addresses, phone numbers, taxonomy codes, etc.)
 * - Updating verification status based on match results
 * - Archiving old verified workflows
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReVerificationJob {
  workflow_id: string;
  system: 'NPPES' | 'PECOS' | 'CAQH' | 'PAYER_DIRECTORY' | 'STATE_BOARD';
  field: string; // 'address', 'taxonomy', 'phone', etc.
  expected_value: string; // The correct value we told them to enter
  provider_npi: string;
}

export interface ReVerificationResult {
  workflow_id: string;
  matched: boolean;
  current_value: string | null;
  expected_value: string;
  checked_at: string;
}

// ─── Normalization Helpers ───────────────────────────────────────────────────

/**
 * Normalize phone number: remove formatting, keep only digits.
 */
function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Normalize address: trim, lowercase, remove extra spaces, remove punctuation.
 */
function normalizeAddress(address: string): string {
  return (address || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,'-]/g, '');
}

/**
 * Normalize taxonomy code: uppercase, remove hyphens/spaces.
 */
function normalizeTaxonomy(taxonomy: string): string {
  return (taxonomy || '').toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Calculate Levenshtein distance for fuzzy string matching.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy match score (0-100), where 100 is exact match.
 */
function fuzzyMatchScore(expected: string, actual: string): number {
  if (!expected || !actual) return 0;
  if (expected === actual) return 100;

  const maxLen = Math.max(expected.length, actual.length);
  const distance = levenshteinDistance(expected, actual);
  const similarity = 1 - distance / maxLen;
  return Math.round(similarity * 100);
}

// ─── Comparison Logic ─────────────────────────────────────────────────────────

/**
 * Compare expected vs actual values with fuzzy matching.
 * Returns true if values match within acceptable threshold.
 */
export function compareValues(expected: string, actual: string | null, field: string): boolean {
  if (!expected) return false;
  if (!actual) return false;

  // Field-specific normalization and comparison
  switch (field.toLowerCase()) {
    case 'phone':
    case 'phone_number':
    case 'npi':
    case 'specialty_code': {
      const exp = normalizePhone(expected);
      const act = normalizePhone(actual);
      return exp === act;
    }

    case 'address':
    case 'street_address':
    case 'mailing_address': {
      const exp = normalizeAddress(expected);
      const act = normalizeAddress(actual);
      // Allow fuzzy match on addresses (85% similarity threshold)
      return fuzzyMatchScore(exp, act) >= 85;
    }

    case 'taxonomy':
    case 'specialty':
    case 'taxonomy_code': {
      const exp = normalizeTaxonomy(expected);
      const act = normalizeTaxonomy(actual);
      return exp === act;
    }

    case 'city':
    case 'state':
    case 'zip':
    case 'zipcode':
    case 'zip_code': {
      const exp = (expected || '').toUpperCase().trim();
      const act = (actual || '').toUpperCase().trim();
      return exp === act;
    }

    case 'name':
    case 'last_name':
    case 'first_name':
    case 'middle_name': {
      const exp = (expected || '').toLowerCase().trim();
      const act = (actual || '').toLowerCase().trim();
      // Allow fuzzy match on names (90% similarity threshold)
      return fuzzyMatchScore(exp, act) >= 90;
    }

    default: {
      // Generic case-insensitive comparison with fuzzy matching (85% threshold)
      const exp = (expected || '').toLowerCase().trim();
      const act = (actual || '').toLowerCase().trim();
      return fuzzyMatchScore(exp, act) >= 85;
    }
  }
}

// ─── Database Operations ──────────────────────────────────────────────────────

/**
 * Get all workflows pending verification for a specific system.
 */
export async function getWorkflowsPendingVerification(
  system: 'NPPES' | 'PECOS' | 'CAQH' | 'PAYER_DIRECTORY' | 'STATE_BOARD',
): Promise<ReVerificationJob[]> {
  const admin = createAdminSupabaseClient();

  // Map workflow_type to systems
  const workflowTypeMap: Record<string, string[]> = {
    NPPES: ['nppes_update'],
    PECOS: ['credentialing_onboarding', 'credentialing_departure'],
    CAQH: ['credentialing_onboarding', 'credentialing_departure'],
    PAYER_DIRECTORY: ['payer_directory'],
    STATE_BOARD: ['license_renewal', 'compliance'],
  };

  const workflowTypes = workflowTypeMap[system] || [];

  const { data, error } = await admin
    .from('workflow_instances')
    .select(
      `id,
      workflow_type,
      provider_npi,
      finding_details,
      approved_value`,
    )
    .eq('verification_status', 'submitted')
    .in('workflow_type', workflowTypes);

  if (error) {
    console.error(`[getWorkflowsPendingVerification] Error for ${system}:`, error);
    return [];
  }

  if (!data || data.length === 0) return [];

  return data.map((w: any) => ({
    workflow_id: w.id,
    system,
    field: w.finding_details?.field || 'unknown',
    expected_value: w.approved_value || '',
    provider_npi: w.provider_npi,
  }));
}

/**
 * Process a verification result: update workflow_instances status.
 * - Match: set verified_fixed
 * - No match: increment attempts, check if >= 3 attempts then escalate
 */
export async function processVerificationResult(result: ReVerificationResult): Promise<void> {
  const admin = createAdminSupabaseClient();

  if (result.matched) {
    // Success: mark as verified_fixed
    const { error } = await admin
      .from('workflow_instances')
      .update({
        verification_status: 'verified_fixed',
        verified_fixed_at: new Date().toISOString(),
        last_verification_at: result.checked_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', result.workflow_id);

    if (error) {
      console.error('[processVerificationResult] Error updating verified_fixed:', error);
    }
  } else {
    // No match: increment attempts
    const { data: workflow, error: fetchError } = await admin
      .from('workflow_instances')
      .select('verification_attempts')
      .eq('id', result.workflow_id)
      .single();

    if (fetchError) {
      console.error('[processVerificationResult] Error fetching workflow:', fetchError);
      return;
    }

    const newAttempts = (workflow?.verification_attempts || 0) + 1;
    const newStatus = newAttempts >= 3 ? 'escalated' : 'still_mismatched';

    const { error: updateError } = await admin
      .from('workflow_instances')
      .update({
        verification_status: newStatus,
        verification_attempts: newAttempts,
        last_verification_at: result.checked_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', result.workflow_id);

    if (updateError) {
      console.error('[processVerificationResult] Error updating status:', updateError);
    }
  }
}

/**
 * Archive workflows that were verified_fixed > 30 days ago.
 */
export async function archiveOldVerifiedWorkflows(): Promise<number> {
  const admin = createAdminSupabaseClient();

  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error: fetchError } = await admin
    .from('workflow_instances')
    .select('id')
    .eq('verification_status', 'verified_fixed')
    .lte('verified_fixed_at', thirtyDaysAgo.toISOString());

  if (fetchError) {
    console.error('[archiveOldVerifiedWorkflows] Error fetching:', fetchError);
    return 0;
  }

  if (!data || data.length === 0) return 0;

  const ids = data.map((w: any) => w.id);

  const { error: updateError } = await admin
    .from('workflow_instances')
    .update({
      verification_status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (updateError) {
    console.error('[archiveOldVerifiedWorkflows] Error archiving:', updateError);
    return 0;
  }

  return ids.length;
}
