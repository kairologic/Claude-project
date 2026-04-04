// checks/registry.ts
// ═══ KairoLogic Check Engine v2 — Check Registry ═══
//
// To add a new check:
// 1. Create a CheckModule in the appropriate folder
// 2. Import it here
// 3. Add it to the CHECK_REGISTRY array
// That's it. It automatically appears in scans, dashboard, PDFs, and drift monitoring.

import type { CheckModule } from './types';
import { npiAddressCheck, npiPhoneCheck, npiTaxonomyCheck } from './npi-checks';
import { rosterCountCheck, rosterNameCheck } from './roster-checks';

// ═══ Check Registry ═══
// Order matters — checks run in this order, and shared cache is populated progressively.

export const CHECK_REGISTRY: CheckModule[] = [
  // ── Data Residency (SB 1188) ──────────────
  // DR-01 through DR-04 — existing checks, to be migrated to this format
  // (Placeholder entries — replace with actual modules when ready)

  // ── AI Transparency (HB 149) ──────────────
  // AI-01 through AI-04 — existing checks

  // ── Clinical Integrity ─────────────────────
  // ER-01 through ER-04 — existing checks

  // ── NPI Integrity (NEW) ────────────────────
  npiAddressCheck, // NPI-01: Address mismatch      (free)
  npiPhoneCheck, // NPI-02: Phone mismatch        (free)
  npiTaxonomyCheck, // NPI-03: Taxonomy mismatch     (report)

  // ── Provider Roster (NEW) ──────────────────
  rosterCountCheck, // RST-01: Roster count          (report)
  rosterNameCheck, // RST-02: Roster name matching  (shield)

  // ── Future Checks ─────────────────────────
  // BRK-01: Broken link validation            (report)
  // ADR-01: Google Places address validation  (shield)
  // ADA-01: WCAG accessibility score          (shield)
  // SPD-01: Page speed / Core Web Vitals      (report)
  // SSL-01: SSL cert expiry warning           (free)
];

/**
 * Get checks available for a specific tier.
 */
export function getChecksForTier(tier: 'free' | 'report' | 'shield'): CheckModule[] {
  const tierOrder: Record<string, number> = { free: 0, report: 1, shield: 2 };
  const userLevel = tierOrder[tier] ?? 0;
  return CHECK_REGISTRY.filter((c) => tierOrder[c.tier] <= userLevel);
}

/**
 * Get all checks grouped by category.
 */
export function getChecksByCategory(): Record<string, CheckModule[]> {
  const grouped: Record<string, CheckModule[]> = {};
  for (const check of CHECK_REGISTRY) {
    if (!grouped[check.category]) grouped[check.category] = [];
    grouped[check.category].push(check);
  }
  return grouped;
}

/**
 * Get a single check by ID.
 */
export function getCheckById(id: string): CheckModule | undefined {
  return CHECK_REGISTRY.find((c) => c.id === id);
}

/**
 * Category metadata for display.
 */
export const CATEGORY_META: Record<string, { name: string; icon: string; color: string }> = {
  'data-residency': { name: 'Data Residency', icon: '🗺️', color: 'blue' },
  'ai-transparency': { name: 'AI Transparency', icon: '🤖', color: 'purple' },
  'clinical-integrity': { name: 'Clinical Integrity', icon: '🏥', color: 'green' },
  'npi-integrity': { name: 'NPI Integrity', icon: '🔍', color: 'amber' },
};
