/**
 * lib/scanner/address-density-filter.ts
 *
 * #10a — Address density filter for co-location buildings.
 * Medical buildings often house 20+ practices at the same address.
 * When the same address appears for many practices, mismatches
 * at that address are lower confidence (it's a shared building,
 * not necessarily wrong data).
 *
 * This filter reduces confidence scores for providers at addresses
 * that have high practice density.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────

export interface AddressDensity {
  normalized_address: string;
  practice_count: number;
  provider_count: number;
  is_medical_building: boolean;
}

export interface DensityAdjustment {
  npi: string;
  address: string;
  original_confidence: number;
  adjusted_confidence: number;
  reason: string;
  practice_count: number;
}

// ── Normalization ────────────────────────────────────────────

/**
 * Normalize an address for density comparison.
 * Strips suite/unit numbers, standardizes abbreviations.
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    // Remove suite/unit/apt/ste numbers
    .replace(/\b(suite|ste|unit|apt|#|room|rm|floor|fl)\s*[a-z0-9#-]+/gi, '')
    // Standardize common abbreviations
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\broad\b/g, 'rd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bnorth\b/g, 'n')
    .replace(/\bsouth\b/g, 's')
    .replace(/\beast\b/g, 'e')
    .replace(/\bwest\b/g, 'w')
    // Remove extra whitespace and punctuation
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Density detection ────────────────────────────────────────

/** Threshold: if N+ practices share the same address, it's a medical building */
const DENSITY_THRESHOLD = 5;

/** Confidence reduction factor for dense addresses */
const DENSITY_DISCOUNT = 0.3;

/**
 * Query the database for address density and identify medical buildings.
 * Returns a map of normalized_address → density info.
 */
export async function getAddressDensityMap(
  supabase: SupabaseClient,
  state?: string
): Promise<Map<string, AddressDensity>> {
  // Query provider_sites for address groupings
  let query = supabase
    .from('provider_sites')
    .select('practice_website_id, address_line_1, city, state, zip');

  if (state) {
    query = query.eq('state', state);
  }

  const { data: sites, error } = await query;

  if (error || !sites) {
    console.error('Address density query failed:', error?.message);
    return new Map();
  }

  // Group by normalized address
  const groups = new Map<string, Set<string>>();

  for (const site of sites) {
    if (!site.address_line_1) continue;
    const normalized = normalizeAddress(
      `${site.address_line_1} ${site.city || ''} ${site.state || ''} ${site.zip || ''}`
    );
    if (!groups.has(normalized)) {
      groups.set(normalized, new Set());
    }
    groups.get(normalized)!.add(site.practice_website_id);
  }

  // Build density map
  const densityMap = new Map<string, AddressDensity>();
  for (const [addr, practiceIds] of groups) {
    const practiceCount = practiceIds.size;
    densityMap.set(addr, {
      normalized_address: addr,
      practice_count: practiceCount,
      provider_count: 0, // Would need a join to count providers
      is_medical_building: practiceCount >= DENSITY_THRESHOLD,
    });
  }

  return densityMap;
}

/**
 * Adjust confidence scores for delta events based on address density.
 * Returns adjustments that should be applied.
 */
export function applyDensityFilter(
  events: Array<{
    npi: string;
    field_name: string;
    new_value: string;
    confidence_score: number;
  }>,
  densityMap: Map<string, AddressDensity>
): DensityAdjustment[] {
  const adjustments: DensityAdjustment[] = [];

  for (const event of events) {
    // Only filter address-related mismatches
    if (!event.field_name.includes('address')) continue;

    const normalized = normalizeAddress(event.new_value);
    const density = densityMap.get(normalized);

    if (density && density.is_medical_building) {
      const adjusted = event.confidence_score * (1 - DENSITY_DISCOUNT);

      adjustments.push({
        npi: event.npi,
        address: event.new_value,
        original_confidence: event.confidence_score,
        adjusted_confidence: Math.round(adjusted * 100) / 100,
        reason: `Co-location building: ${density.practice_count} practices at same address`,
        practice_count: density.practice_count,
      });
    }
  }

  return adjustments;
}
