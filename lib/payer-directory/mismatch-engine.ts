// ═══════════════════════════════════════════════════════════════
// KairoLogic: Cross-Source Mismatch Engine
// Compares NPPES data vs payer directory snapshots per provider
// ═══════════════════════════════════════════════════════════════

import type {
  DirectorySnapshot,
  NppesProviderData,
  DirectoryMismatch,
  CorrectionAction,
} from './types';

// Payers known to pull directory data from CAQH
const CAQH_CONNECTED_PAYERS = ['uhc', 'aetna', 'bcbs_tx', 'bcbs_ca', 'cigna', 'humana'];

/**
 * Compare a single payer snapshot against NPPES data.
 * Returns an array of mismatches found.
 */
export function detectMismatches(
  nppes: NppesProviderData,
  snapshot: DirectorySnapshot,
  practiceWebsiteId?: string
): DirectoryMismatch[] {
  const mismatches: DirectoryMismatch[] = [];
  const payerPullsFromCaqh = CAQH_CONNECTED_PAYERS.includes(snapshot.payer_code);

  // Check if provider is listed at all
  const isListed =
    snapshot.listed_name_full ||
    snapshot.listed_name_last ||
    snapshot.listed_address_line1;

  if (!isListed) {
    mismatches.push({
      npi: nppes.npi,
      payer_code: snapshot.payer_code,
      practice_website_id: practiceWebsiteId || null,
      snapshot_id: null,
      field_name: 'listing',
      mismatch_type: 'not_listed',
      nppes_value: nppes.provider_name || `${nppes.first_name} ${nppes.last_name}`,
      website_value: null,
      payer_value: null,
      recommended_value: null,
      fix_via_caqh: payerPullsFromCaqh,
      fix_instructions: payerPullsFromCaqh
        ? 'Verify your CAQH profile includes this practice location and ensure the health plan is authorized to access your data.'
        : `Contact ${snapshot.payer_code.toUpperCase()} provider relations to confirm network participation.`,
      priority: 1,
    });
    return mismatches;
  }

  // ── Address comparison ──
  const nppesAddr = normalizeAddress(
    nppes.address_line_1,
    nppes.city,
    nppes.state,
    nppes.zip
  );
  const payerAddr = normalizeAddress(
    snapshot.listed_address_line1,
    snapshot.listed_city,
    snapshot.listed_state,
    snapshot.listed_zip
  );

  if (nppesAddr && payerAddr && !addressesMatch(nppesAddr, payerAddr)) {
    mismatches.push({
      npi: nppes.npi,
      payer_code: snapshot.payer_code,
      practice_website_id: practiceWebsiteId || null,
      snapshot_id: null,
      field_name: 'address',
      mismatch_type: nppesAddr.zip !== payerAddr.zip ? 'wrong_location' : 'value_differs',
      nppes_value: formatAddress(nppesAddr),
      website_value: null,
      payer_value: formatAddress(payerAddr),
      recommended_value: formatAddress(nppesAddr), // NPPES is source of truth
      fix_via_caqh: payerPullsFromCaqh,
      fix_instructions: payerPullsFromCaqh
        ? 'Update practice address in CAQH ProView (proview.caqh.org). Changes propagate to connected health plans within 30 days.'
        : `Contact ${snapshot.payer_code.toUpperCase()} to update your practice address.`,
      priority: 2,
    });
  }

  // ── Phone comparison ──
  const nppesPhone = normalizePhone(nppes.phone);
  const payerPhone = normalizePhone(snapshot.listed_phone);

  if (nppesPhone && payerPhone && nppesPhone !== payerPhone) {
    mismatches.push({
      npi: nppes.npi,
      payer_code: snapshot.payer_code,
      practice_website_id: practiceWebsiteId || null,
      snapshot_id: null,
      field_name: 'phone',
      mismatch_type: 'value_differs',
      nppes_value: nppesPhone,
      website_value: null,
      payer_value: payerPhone,
      recommended_value: nppesPhone,
      fix_via_caqh: payerPullsFromCaqh,
      fix_instructions: payerPullsFromCaqh
        ? 'Update phone number in CAQH ProView under Practice Locations.'
        : `Contact ${snapshot.payer_code.toUpperCase()} to update your phone number.`,
      priority: 3,
    });
  }

  // ── Specialty comparison ──
  const nppesSpec = nppes.taxonomy_code?.toUpperCase()?.trim();
  const payerSpec = snapshot.listed_specialty_code?.toUpperCase()?.trim();

  if (nppesSpec && payerSpec && nppesSpec !== payerSpec) {
    mismatches.push({
      npi: nppes.npi,
      payer_code: snapshot.payer_code,
      practice_website_id: practiceWebsiteId || null,
      snapshot_id: null,
      field_name: 'specialty',
      mismatch_type: 'specialty_mismatch',
      nppes_value: `${nppesSpec} (${nppes.taxonomy_desc || 'unknown'})`,
      website_value: null,
      payer_value: `${payerSpec} (${snapshot.listed_specialty_display || 'unknown'})`,
      recommended_value: nppesSpec,
      fix_via_caqh: payerPullsFromCaqh,
      fix_instructions: payerPullsFromCaqh
        ? 'Update specialty in CAQH ProView under the Specialties section.'
        : `Contact ${snapshot.payer_code.toUpperCase()} to correct specialty listing.`,
      priority: 3,
    });
  }

  // ── Name comparison ──
  const nppesName = normalizeName(nppes.last_name);
  const payerName = normalizeName(snapshot.listed_name_last);

  if (nppesName && payerName && nppesName !== payerName) {
    mismatches.push({
      npi: nppes.npi,
      payer_code: snapshot.payer_code,
      practice_website_id: practiceWebsiteId || null,
      snapshot_id: null,
      field_name: 'name',
      mismatch_type: 'value_differs',
      nppes_value: `${nppes.first_name} ${nppes.last_name}`,
      website_value: null,
      payer_value: `${snapshot.listed_name_first} ${snapshot.listed_name_last}`,
      recommended_value: `${nppes.first_name} ${nppes.last_name}`,
      fix_via_caqh: payerPullsFromCaqh,
      fix_instructions: 'Update name in CAQH ProView under Personal Information.',
      priority: 4,
    });
  }

  return mismatches;
}

/**
 * Generate a prioritized correction packet from a set of mismatches.
 * Groups by fix target (CAQH, NPPES, direct payer) and orders by impact.
 */
export function buildCorrectionActions(
  mismatches: DirectoryMismatch[]
): CorrectionAction[] {
  const actions: CorrectionAction[] = [];
  let step = 0;

  // ── Step 1: CAQH fixes (highest ripple effect) ──
  const caqhFixes = mismatches.filter((m) => m.fix_via_caqh);
  if (caqhFixes.length > 0) {
    // Group by field
    const byField = new Map<string, DirectoryMismatch[]>();
    for (const m of caqhFixes) {
      const existing = byField.get(m.field_name) || [];
      existing.push(m);
      byField.set(m.field_name, existing);
    }

    for (const [field, fieldMismatches] of byField) {
      step++;
      const payerList = fieldMismatches.map((m) => `${m.payer_code}_${m.field_name}`);
      const payerNames = [...new Set(fieldMismatches.map((m) => m.payer_code.toUpperCase()))].join(', ');

      actions.push({
        step,
        action: `Update ${field} in CAQH ProView`,
        target: 'caqh',
        fixes: payerList,
        effort: '5 min',
        details: `Fixes ${field} mismatch across ${payerNames}. Log in at proview.caqh.org, navigate to Practice Locations, and update the ${field}.`,
      });
    }
  }

  // ── Step 2: NPPES fixes ──
  const nppesNeeded = mismatches.filter(
    (m) => m.nppes_value && m.recommended_value && m.nppes_value !== m.recommended_value
  );
  if (nppesNeeded.length > 0) {
    step++;
    actions.push({
      step,
      action: 'Update NPPES record',
      target: 'nppes',
      fixes: nppesNeeded.map((m) => `nppes_${m.field_name}`),
      effort: '10 min',
      details: 'Submit update at nppes.cms.hhs.gov or use the KairoLogic pre-filled NPPES update form.',
    });
  }

  // ── Step 3: Direct payer contact (remainder) ──
  const directFixes = mismatches.filter((m) => !m.fix_via_caqh);
  if (directFixes.length > 0) {
    const byPayer = new Map<string, DirectoryMismatch[]>();
    for (const m of directFixes) {
      const existing = byPayer.get(m.payer_code) || [];
      existing.push(m);
      byPayer.set(m.payer_code, existing);
    }

    for (const [payer, payerMismatches] of byPayer) {
      step++;
      actions.push({
        step,
        action: `Contact ${payer.toUpperCase()} provider relations`,
        target: 'payer_direct',
        fixes: payerMismatches.map((m) => `${payer}_${m.field_name}`),
        effort: '15-30 min',
        details: `${payerMismatches.length} field(s) need direct update: ${payerMismatches.map((m) => m.field_name).join(', ')}.`,
      });
    }
  }

  return actions;
}

// ── Normalization helpers ────────────────────────────────────

interface NormalizedAddress {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

function normalizeAddress(
  line1: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined
): NormalizedAddress | null {
  if (!line1 && !city) return null;

  return {
    line1: (line1 || '')
      .toUpperCase()
      .replace(/\bSTE\b/g, 'SUITE')
      .replace(/\bST\b/g, 'STREET')
      .replace(/\bAVE\b/g, 'AVENUE')
      .replace(/\bBLVD\b/g, 'BOULEVARD')
      .replace(/\bDR\b/g, 'DRIVE')
      .replace(/\bRD\b/g, 'ROAD')
      .replace(/\bLN\b/g, 'LANE')
      .replace(/\bPKWY\b/g, 'PARKWAY')
      .replace(/\bCT\b/g, 'COURT')
      .replace(/\bPL\b/g, 'PLACE')
      .replace(/[.,#]/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
    city: (city || '').toUpperCase().trim(),
    state: (state || '').toUpperCase().trim(),
    zip: (zip || '').replace(/\D/g, '').substring(0, 5),
  };
}

function addressesMatch(a: NormalizedAddress, b: NormalizedAddress): boolean {
  // ZIP must match (different ZIP = different location)
  if (a.zip !== b.zip) return false;

  // City must match
  if (a.city !== b.city) return false;

  // State must match
  if (a.state !== b.state) return false;

  // Street address: allow minor differences (suite number variations)
  // Strip suite/unit info for comparison
  const stripSuite = (s: string) =>
    s
      .replace(/\bSUITE\s*\S+/g, '')
      .replace(/\bUNIT\s*\S+/g, '')
      .replace(/\bAPT\s*\S+/g, '')
      .replace(/\bBLDG\s*\S+/g, '')
      .replace(/\b#\s*\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  return stripSuite(a.line1) === stripSuite(b.line1);
}

function formatAddress(addr: NormalizedAddress): string {
  return `${addr.line1}, ${addr.city}, ${addr.state} ${addr.zip}`;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.substring(1);
  if (digits.length === 10) return digits;
  return null;
}

function normalizeName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.toUpperCase().replace(/[^A-Z]/g, '').trim() || null;
}
