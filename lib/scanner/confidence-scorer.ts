/**
 * lib/scanner/confidence-scorer.ts
 *
 * Provider-to-Practice confidence scoring engine.
 *
 * Computes a 0–1 confidence score for each practice_provider association
 * based on multi-signal cross-referencing between the website, NPPES,
 * and other providers at the same practice.
 *
 * Tiers:
 *   confirmed  (≥ 0.80) — auto-insert, high confidence
 *   unverified (0.50–0.79) — insert but flagged for review
 *   review     (< 0.50) — queued, not shown on roster until approved
 */

// ── Signal weights ──────────────────────────────────────────────────
const WEIGHTS = {
  NAME_EXACT_MATCH: 0.25,       // Web name ↔ NPPES name exact match
  NAME_FUZZY_MATCH: 0.15,       // Web name ↔ NPPES name fuzzy/partial match
  PHONE_MATCH: 0.20,            // Web phone ↔ NPPES phone
  SAME_STATE: 0.08,             // NPPES state ↔ practice state
  SAME_CITY: 0.07,              // NPPES city ↔ practice city
  TAXONOMY_FITS_PRACTICE: 0.12, // Provider taxonomy ↔ practice specialty
  ORG_CORROBORATION: 0.13,      // Other providers at same practice confirm this org
  ENTITY_TYPE_PENALTY: -0.20,   // Type 2 org NPI in an individual provider roster
  SPECIALTY_MISMATCH: -0.15,    // Taxonomy doesn't fit practice at all
  STALE_DATA_PENALTY: -0.05,    // Provider not seen on website recently
};

// ── Tier thresholds ─────────────────────────────────────────────────
const TIER_CONFIRMED = 0.80;
const TIER_UNVERIFIED = 0.50;

// ── Types ───────────────────────────────────────────────────────────
export interface ConfidenceSignal {
  signal: string;
  value: boolean | string | number;
  weight: number;
  detail?: string;
}

export interface ConfidenceResult {
  score: number;
  tier: 'confirmed' | 'unverified' | 'review';
  signals: ConfidenceSignal[];
}

export interface ProviderData {
  npi: string;
  provider_name: string;        // from practice_providers (web-detected name)
  web_phone?: string | null;
  web_specialty?: string | null;
  association_source?: string;
  last_seen_at?: string | null;
}

export interface NppesData {
  npi: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  entity_type_code: string;     // '1' = individual, '2' = organization
  phone: string;
  city: string;
  state: string;
  primary_taxonomy_code: string;
  taxonomy_desc?: string;
}

export interface PracticeContext {
  practice_name: string;
  practice_state: string;
  practice_city?: string;
  practice_phone?: string;
  practice_specialties?: string[];  // e.g. ['Surgery', 'General Surgery']
  total_providers: number;
  confirmed_provider_count: number; // how many already confirmed at this practice
}

// ── Taxonomy → broad specialty mapping ──────────────────────────────
const TAXONOMY_SPECIALTY_MAP: Record<string, string[]> = {
  '208600000X': ['surgery', 'general surgery', 'surgical'],
  '2086S0120X': ['surgery', 'pediatric surgery'],
  '2086S0122X': ['surgery', 'plastic surgery'],
  '2086S0105X': ['surgery', 'hand surgery'],
  '2086S0102X': ['surgery', 'surgical critical care'],
  '2086X0206X': ['surgery', 'surgical oncology'],
  '208G00000X': ['surgery', 'thoracic surgery'],
  '208C00000X': ['surgery', 'colon and rectal surgery', 'colorectal'],
  '204C00000X': ['surgery', 'vascular surgery'],
  '207X00000X': ['surgery', 'orthopaedic surgery'],
  '208100000X': ['surgery', 'bariatric surgery'],
  '207RG0300X': ['gastroenterology'],
  '208000000X': ['pediatrics'],
  '207Q00000X': ['family medicine', 'family practice'],
  '207R00000X': ['internal medicine'],
  '152W00000X': ['optometry'],
  '111N00000X': ['chiropractic'],
  '207Y00000X': ['ophthalmology'],
  '207V00000X': ['obstetrics', 'gynecology'],
  '1223G0001X': ['dentistry'],
  '363L00000X': ['nurse practitioner'],
  '363A00000X': ['physician assistant'],
};

// ── Main scoring function ───────────────────────────────────────────

export function scoreProviderConfidence(
  provider: ProviderData,
  nppes: NppesData | null,
  practice: PracticeContext,
): ConfidenceResult {
  const signals: ConfidenceSignal[] = [];
  let score = 0;

  // If no NPPES record found, very low confidence
  if (!nppes) {
    signals.push({
      signal: 'NO_NPPES_RECORD',
      value: true,
      weight: -0.40,
      detail: `NPI ${provider.npi} not found in NPPES`,
    });
    return { score: 0.10, tier: 'review', signals };
  }

  // ── 1. Name matching ─────────────────────────────────────────────
  const webName = normalizeName(provider.provider_name);
  const nppesName = nppes.entity_type_code === '2'
    ? normalizeName(nppes.organization_name)
    : normalizeName(`${nppes.first_name} ${nppes.last_name}`);

  if (webName === nppesName) {
    signals.push({
      signal: 'NAME_EXACT_MATCH',
      value: true,
      weight: WEIGHTS.NAME_EXACT_MATCH,
      detail: `"${provider.provider_name}" matches NPPES exactly`,
    });
    score += WEIGHTS.NAME_EXACT_MATCH;
  } else if (fuzzyNameMatch(webName, nppesName)) {
    signals.push({
      signal: 'NAME_FUZZY_MATCH',
      value: true,
      weight: WEIGHTS.NAME_FUZZY_MATCH,
      detail: `"${provider.provider_name}" ≈ NPPES "${nppes.first_name} ${nppes.last_name}"`,
    });
    score += WEIGHTS.NAME_FUZZY_MATCH;
  } else {
    signals.push({
      signal: 'NAME_NO_MATCH',
      value: false,
      weight: 0,
      detail: `"${provider.provider_name}" ≠ NPPES "${nppes.entity_type_code === '2' ? nppes.organization_name : `${nppes.first_name} ${nppes.last_name}`}"`,
    });
  }

  // ── 2. Phone matching ────────────────────────────────────────────
  const webPhone = normalizePhone(provider.web_phone);
  const nppesPhone = normalizePhone(nppes.phone);

  if (webPhone && nppesPhone && webPhone === nppesPhone) {
    signals.push({
      signal: 'PHONE_MATCH',
      value: true,
      weight: WEIGHTS.PHONE_MATCH,
      detail: `Phone ${webPhone} matches NPPES`,
    });
    score += WEIGHTS.PHONE_MATCH;
  } else if (webPhone && nppesPhone) {
    signals.push({
      signal: 'PHONE_MISMATCH',
      value: false,
      weight: 0,
      detail: `Web phone ${webPhone} ≠ NPPES phone ${nppesPhone}`,
    });
  }

  // ── 3. Geographic matching ───────────────────────────────────────
  if (nppes.state && practice.practice_state &&
      nppes.state.toUpperCase() === practice.practice_state.toUpperCase()) {
    signals.push({
      signal: 'SAME_STATE',
      value: true,
      weight: WEIGHTS.SAME_STATE,
      detail: `NPPES state ${nppes.state} matches practice`,
    });
    score += WEIGHTS.SAME_STATE;
  }

  if (nppes.city && practice.practice_city &&
      nppes.city.toUpperCase() === practice.practice_city.toUpperCase()) {
    signals.push({
      signal: 'SAME_CITY',
      value: true,
      weight: WEIGHTS.SAME_CITY,
      detail: `NPPES city ${nppes.city} matches practice`,
    });
    score += WEIGHTS.SAME_CITY;
  }

  // ── 4. Taxonomy vs. practice specialty ───────────────────────────
  const taxonomySpecialties = TAXONOMY_SPECIALTY_MAP[nppes.primary_taxonomy_code] || [];
  const practiceSpecs = (practice.practice_specialties || []).map(s => s.toLowerCase());

  if (taxonomySpecialties.length > 0 && practiceSpecs.length > 0) {
    const fits = taxonomySpecialties.some(ts =>
      practiceSpecs.some(ps => ps.includes(ts) || ts.includes(ps))
    );
    if (fits) {
      signals.push({
        signal: 'TAXONOMY_FITS_PRACTICE',
        value: true,
        weight: WEIGHTS.TAXONOMY_FITS_PRACTICE,
        detail: `${nppes.primary_taxonomy_code} (${taxonomySpecialties[0]}) fits practice specialties`,
      });
      score += WEIGHTS.TAXONOMY_FITS_PRACTICE;
    } else {
      signals.push({
        signal: 'SPECIALTY_MISMATCH',
        value: true,
        weight: WEIGHTS.SPECIALTY_MISMATCH,
        detail: `${nppes.primary_taxonomy_code} (${taxonomySpecialties[0]}) doesn't match practice (${practiceSpecs.join(', ')})`,
      });
      score += WEIGHTS.SPECIALTY_MISMATCH;
    }
  }

  // ── 5. Entity type check ─────────────────────────────────────────
  if (nppes.entity_type_code === '2') {
    // Org NPI in a provider roster — needs special handling
    // Check if this is THE practice org NPI vs. an unrelated org
    const orgNameSimilar = fuzzyNameMatch(
      normalizeName(nppes.organization_name),
      normalizeName(practice.practice_name),
    );

    if (orgNameSimilar) {
      signals.push({
        signal: 'ORG_NPI_MATCHES_PRACTICE',
        value: true,
        weight: 0.10,
        detail: `Org name "${nppes.organization_name}" ≈ practice name "${practice.practice_name}"`,
      });
      score += 0.10;
    } else {
      signals.push({
        signal: 'ENTITY_TYPE_PENALTY',
        value: true,
        weight: WEIGHTS.ENTITY_TYPE_PENALTY,
        detail: `Type 2 org NPI "${nppes.organization_name}" in individual roster — may be wrong entity`,
      });
      score += WEIGHTS.ENTITY_TYPE_PENALTY;
    }
  }

  // ── 6. Org corroboration (provider overlap) ──────────────────────
  if (practice.confirmed_provider_count >= 3) {
    // If many other providers are already confirmed at this practice,
    // a new detection on the same website gets a corroboration boost
    signals.push({
      signal: 'ORG_CORROBORATION',
      value: practice.confirmed_provider_count,
      weight: WEIGHTS.ORG_CORROBORATION,
      detail: `${practice.confirmed_provider_count} other providers already confirmed at this practice`,
    });
    score += WEIGHTS.ORG_CORROBORATION;
  }

  // ── 7. Staleness check ───────────────────────────────────────────
  if (provider.last_seen_at) {
    const daysSince = (Date.now() - new Date(provider.last_seen_at).getTime()) / 86400000;
    if (daysSince > 90) {
      signals.push({
        signal: 'STALE_DATA',
        value: daysSince,
        weight: WEIGHTS.STALE_DATA_PENALTY,
        detail: `Last seen ${Math.floor(daysSince)} days ago`,
      });
      score += WEIGHTS.STALE_DATA_PENALTY;
    }
  }

  // ── Clamp and tier ───────────────────────────────────────────────
  score = Math.max(0, Math.min(1, score));

  const tier: ConfidenceResult['tier'] =
    score >= TIER_CONFIRMED ? 'confirmed' :
    score >= TIER_UNVERIFIED ? 'unverified' :
    'review';

  return { score: Math.round(score * 100) / 100, tier, signals };
}

// ── Utility functions ───────────────────────────────────────────────

function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/[.,\-'"]/g, '')
    .replace(/\b(MD|DO|FACS|FASMBS|MBA|MHA|PA|NP|RN|JR|SR|II|III|IV)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Strip everything except digits, take last 10
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function fuzzyNameMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  // Check if one contains the other (handles "JOHN PAEK" vs "JOHN S PAEK")
  const aParts = a.split(' ').filter(Boolean);
  const bParts = b.split(' ').filter(Boolean);

  // First + last name match (ignoring middle names/suffixes)
  if (aParts.length >= 2 && bParts.length >= 2) {
    const aFirst = aParts[0];
    const aLast = aParts[aParts.length - 1];
    const bFirst = bParts[0];
    const bLast = bParts[bParts.length - 1];

    if (aFirst === bFirst && aLast === bLast) return true;
  }

  // For org names: check if key words overlap (≥60% of shorter name's words)
  const aSet = new Set(aParts);
  const bSet = new Set(bParts);
  const overlap = [...aSet].filter(w => bSet.has(w) && w.length > 2).length;
  const shorter = Math.min(aParts.length, bParts.length);
  if (shorter > 0 && overlap / shorter >= 0.6) return true;

  return false;
}

// ── Export taxonomy map for use in backfill ─────────────────────────
export { TAXONOMY_SPECIALTY_MAP, WEIGHTS, TIER_CONFIRMED, TIER_UNVERIFIED };
