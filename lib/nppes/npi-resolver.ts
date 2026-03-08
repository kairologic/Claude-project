// lib/nppes/npi-resolver.ts
// ═══ KairoLogic NPI Resolution Engine ═══
// Task 1.6: Resolves state medical board records (no NPI) to verified NPIs.
//
// Resolution path (from MVP plan):
//   1. PECOS exact match: name + state + specialty → NPI (confidence ~97-99%)
//   2. NPPES fuzzy match: Jaro-Winkler name + taxonomy → NPI (confidence ~85-90%)
//   3. DCA API lookup: CA Medical Board license → NPI (confidence ~95%+) [CA only]
//   4. Manual review queue: unresolved records for human review
//
// Every attempt is logged to provider_npi_resolutions for audit.
// Production gate: weighted false positive rate must be < 2%.

// ── Types ────────────────────────────────────────────────

export interface UnresolvedLicense {
  id: string;                  // provider_licenses.id
  license_number: string;
  state: string;
  licensee_name: string;       // full name from board
  first_name?: string;
  last_name?: string;
  specialty?: string;
  city?: string;
  zip_code?: string;
}

export interface ResolutionResult {
  license_id: string;
  resolved_npi: string | null;
  method: 'PECOS_EXACT' | 'NPPES_FUZZY' | 'DCA_API' | 'PROVIDER_CLAIM' | 'MANUAL';
  confidence_score: number;
  name_similarity: number | null;
  specialty_match: boolean;
  state_match: boolean;
  address_similarity: number | null;
  needs_review: boolean;
  input_name: string;
  input_specialty: string | null;
  input_state: string;
  input_address: string | null;
  pecos_npi: string | null;
  pecos_name: string | null;
  pecos_specialty: string | null;
}

export interface ResolutionBatchResult {
  total: number;
  resolved_pecos: number;
  resolved_fuzzy: number;
  unresolved: number;
  needs_review: number;
  duration_ms: number;
}

// ── Supabase Client ──────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function dbRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
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

// ── PECOS Exact Match (Method 1) ─────────────────────────

/**
 * Search provider_pecos for an exact match by name + state + specialty.
 * This is the highest-confidence resolution path (~97-99% accuracy).
 *
 * Match criteria:
 *   - Last name exact match (case-insensitive)
 *   - State exact match
 *   - First name similarity > 0.85 (handles nicknames, initials)
 *   - Specialty overlap (if available)
 */
export async function resolvePecosExact(
  license: UnresolvedLicense,
): Promise<ResolutionResult | null> {
  const lastName = extractLastName(license);
  const firstName = extractFirstName(license);
  if (!lastName) return null;

  // Query PECOS by last_name + state
  const encodedLast = encodeURIComponent(lastName.toLowerCase());
  const candidates: any[] = await dbRequest(
    `provider_pecos?last_name=ilike.${encodedLast}&state=eq.${license.state}&select=npi,first_name,last_name,specialty,city,zip_code`,
  );

  if (!candidates || candidates.length === 0) return null;

  // Score each candidate
  let bestMatch: { candidate: any; score: number; nameSim: number; specMatch: boolean } | null = null;

  for (const candidate of candidates) {
    const nameSim = firstName
      ? jaroWinkler(firstName.toLowerCase(), (candidate.first_name || '').toLowerCase())
      : 0.5; // no first name = partial credit

    const specMatch = license.specialty && candidate.specialty
      ? specialtiesOverlap(license.specialty, candidate.specialty)
      : false;

    // Composite score
    let score = 0;
    score += nameSim * 0.50;                      // first name similarity: 50% weight
    score += 0.25;                                // last name exact match: 25% (already filtered)
    score += (specMatch ? 0.15 : 0);             // specialty match: 15%
    score += 0.10;                                // state match: 10% (already filtered)

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { candidate, score, nameSim, specMatch };
    }
  }

  if (!bestMatch || bestMatch.nameSim < 0.85) return null;

  const confidence = Math.min(0.99, bestMatch.score);

  return {
    license_id: license.id,
    resolved_npi: bestMatch.candidate.npi,
    method: 'PECOS_EXACT',
    confidence_score: parseFloat(confidence.toFixed(2)),
    name_similarity: parseFloat(bestMatch.nameSim.toFixed(2)),
    specialty_match: bestMatch.specMatch,
    state_match: true,
    address_similarity: null,
    needs_review: confidence < 0.90,
    input_name: license.licensee_name,
    input_specialty: license.specialty || null,
    input_state: license.state,
    input_address: license.city || null,
    pecos_npi: bestMatch.candidate.npi,
    pecos_name: `${bestMatch.candidate.last_name}, ${bestMatch.candidate.first_name}`,
    pecos_specialty: bestMatch.candidate.specialty,
  };
}

// ── NPPES Fuzzy Match (Method 2) ─────────────────────────

/**
 * Fallback: search providers table using fuzzy name matching.
 * For providers not in PECOS (Medicare opt-outs, newer licensees).
 * Lower confidence (~85-90%), conservative threshold.
 */
export async function resolveNppesFuzzy(
  license: UnresolvedLicense,
): Promise<ResolutionResult | null> {
  const lastName = extractLastName(license);
  const firstName = extractFirstName(license);
  if (!lastName) return null;

  // Query providers by last_name + state + entity_type = individual
  const encodedLast = encodeURIComponent(lastName.toLowerCase());
  const candidates: any[] = await dbRequest(
    `providers?last_name=ilike.${encodedLast}&state=eq.${license.state}&entity_type_code=eq.1&deactivation_date=is.null&select=npi,first_name,last_name,primary_taxonomy_code,city,zip_code&limit=50`,
  );

  if (!candidates || candidates.length === 0) return null;

  let bestMatch: { candidate: any; score: number; nameSim: number; specMatch: boolean; addrSim: number } | null = null;

  for (const candidate of candidates) {
    const nameSim = firstName
      ? jaroWinkler(firstName.toLowerCase(), (candidate.first_name || '').toLowerCase())
      : 0.5;

    // Taxonomy-to-specialty comparison
    const specMatch = license.specialty && candidate.primary_taxonomy_code
      ? taxonomyMatchesSpecialty(candidate.primary_taxonomy_code, license.specialty)
      : false;

    // City comparison (soft signal)
    const addrSim = license.city && candidate.city
      ? jaroWinkler(license.city.toLowerCase(), candidate.city.toLowerCase())
      : 0;

    let score = 0;
    score += nameSim * 0.45;
    score += 0.20;                                // last name match (filtered)
    score += (specMatch ? 0.20 : 0);
    score += addrSim * 0.15;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { candidate, score, nameSim, specMatch, addrSim };
    }
  }

  // Conservative threshold: prefer no match over wrong match
  if (!bestMatch || bestMatch.nameSim < 0.90 || bestMatch.score < 0.75) return null;

  const confidence = Math.min(0.90, bestMatch.score);

  return {
    license_id: license.id,
    resolved_npi: bestMatch.candidate.npi,
    method: 'NPPES_FUZZY',
    confidence_score: parseFloat(confidence.toFixed(2)),
    name_similarity: parseFloat(bestMatch.nameSim.toFixed(2)),
    specialty_match: bestMatch.specMatch,
    state_match: true,
    address_similarity: parseFloat(bestMatch.addrSim.toFixed(2)),
    needs_review: true,  // fuzzy matches always flagged for review
    input_name: license.licensee_name,
    input_specialty: license.specialty || null,
    input_state: license.state,
    input_address: license.city || null,
    pecos_npi: null,
    pecos_name: null,
    pecos_specialty: null,
  };
}

// ── Batch Resolution ─────────────────────────────────────

/**
 * Resolve a batch of unresolved provider_licenses records.
 * Tries PECOS first, then NPPES fuzzy fallback.
 * Logs every attempt to provider_npi_resolutions.
 *
 * @param licenses - Records with npi = null from provider_licenses
 */
export async function resolveNpiBatch(
  licenses: UnresolvedLicense[],
): Promise<ResolutionBatchResult> {
  const startTime = Date.now();
  let resolvedPecos = 0;
  let resolvedFuzzy = 0;
  let unresolved = 0;
  let needsReview = 0;

  for (const license of licenses) {
    // Try PECOS first
    let result = await resolvePecosExact(license);

    // Fallback to NPPES fuzzy if PECOS didn't match
    if (!result) {
      result = await resolveNppesFuzzy(license);
    }

    if (result) {
      // Log to audit table
      await logResolution(result);

      // Update provider_licenses with resolved NPI (if confident enough)
      if (result.resolved_npi && result.confidence_score >= 0.85 && !result.needs_review) {
        await updateLicenseNpi(license.id, result.resolved_npi);

        if (result.method === 'PECOS_EXACT') resolvedPecos++;
        else resolvedFuzzy++;
      } else {
        needsReview++;
      }
    } else {
      // Log unresolved attempt
      await logResolution({
        license_id: license.id,
        resolved_npi: null,
        method: 'PECOS_EXACT',
        confidence_score: 0,
        name_similarity: null,
        specialty_match: false,
        state_match: true,
        address_similarity: null,
        needs_review: true,
        input_name: license.licensee_name,
        input_specialty: license.specialty || null,
        input_state: license.state,
        input_address: license.city || null,
        pecos_npi: null,
        pecos_name: null,
        pecos_specialty: null,
      });
      unresolved++;
    }
  }

  return {
    total: licenses.length,
    resolved_pecos: resolvedPecos,
    resolved_fuzzy: resolvedFuzzy,
    unresolved,
    needs_review: needsReview,
    duration_ms: Date.now() - startTime,
  };
}

// ── Fetch Unresolved Licenses ────────────────────────────

/**
 * Fetch all provider_licenses records that need NPI resolution.
 */
export async function fetchUnresolvedLicenses(
  states?: string[],
  limit: number = 1000,
): Promise<UnresolvedLicense[]> {
  let query = `provider_licenses?npi=is.null&select=id,license_number,state,licensee_name,specialty,city,zip_code&limit=${limit}`;
  if (states && states.length > 0) {
    const stateList = states.map(s => `"${s}"`).join(',');
    query += `&state=in.(${stateList})`;
  }

  const rows: any[] = await dbRequest(query);
  return rows.map(r => ({
    id: r.id,
    license_number: r.license_number,
    state: r.state,
    licensee_name: r.licensee_name || '',
    specialty: r.specialty || undefined,
    city: r.city || undefined,
    zip_code: r.zip_code || undefined,
  }));
}

// ── Validation Gate ──────────────────────────────────────

export interface ValidationResult {
  total_sample: number;
  pecos_matches: number;
  pecos_false_positives: number;
  pecos_fp_rate: number;
  fuzzy_matches: number;
  fuzzy_false_positives: number;
  fuzzy_fp_rate: number;
  weighted_fp_rate: number;
  gate_passed: boolean;
}

/**
 * Run the accuracy validation gate on a sample of resolved records.
 * Checks that false positive rate is under 2% (MVP plan requirement).
 *
 * This is run on initial deployment and after any algorithm changes.
 * If the gate fails, state board findings are blocked from production.
 */
export async function runValidationGate(
  sampleSize: number = 500,
): Promise<ValidationResult> {
  // Fetch validated resolution records
  const validated: any[] = await dbRequest(
    `provider_npi_resolutions?is_validated=eq.true&select=method,is_false_positive&limit=${sampleSize}`,
  );

  if (validated.length === 0) {
    return {
      total_sample: 0,
      pecos_matches: 0, pecos_false_positives: 0, pecos_fp_rate: 0,
      fuzzy_matches: 0, fuzzy_false_positives: 0, fuzzy_fp_rate: 0,
      weighted_fp_rate: 0,
      gate_passed: false, // can't pass with no data
    };
  }

  const pecos = validated.filter(r => r.method === 'PECOS_EXACT');
  const fuzzy = validated.filter(r => r.method === 'NPPES_FUZZY');

  const pecosFp = pecos.filter(r => r.is_false_positive === true).length;
  const fuzzyFp = fuzzy.filter(r => r.is_false_positive === true).length;

  const pecosFpRate = pecos.length > 0 ? pecosFp / pecos.length : 0;
  const fuzzyFpRate = fuzzy.length > 0 ? fuzzyFp / fuzzy.length : 0;

  // Weighted FP rate (PECOS has higher volume, so weighted by count)
  const totalMatches = pecos.length + fuzzy.length;
  const totalFp = pecosFp + fuzzyFp;
  const weightedFpRate = totalMatches > 0 ? totalFp / totalMatches : 0;

  return {
    total_sample: validated.length,
    pecos_matches: pecos.length,
    pecos_false_positives: pecosFp,
    pecos_fp_rate: parseFloat(pecosFpRate.toFixed(4)),
    fuzzy_matches: fuzzy.length,
    fuzzy_false_positives: fuzzyFp,
    fuzzy_fp_rate: parseFloat(fuzzyFpRate.toFixed(4)),
    weighted_fp_rate: parseFloat(weightedFpRate.toFixed(4)),
    gate_passed: weightedFpRate < 0.02 && pecosFpRate < 0.01 && fuzzyFpRate < 0.03,
  };
}

// ── DB Operations ────────────────────────────────────────

async function logResolution(result: ResolutionResult): Promise<void> {
  await dbRequest('provider_npi_resolutions', {
    method: 'POST',
    body: JSON.stringify({
      license_id: result.license_id,
      resolved_npi: result.resolved_npi,
      method: result.method,
      confidence_score: result.confidence_score,
      name_similarity: result.name_similarity,
      specialty_match: result.specialty_match,
      state_match: result.state_match,
      address_similarity: result.address_similarity,
      needs_review: result.needs_review,
      input_name: result.input_name,
      input_specialty: result.input_specialty,
      input_state: result.input_state,
      input_address: result.input_address,
      pecos_npi: result.pecos_npi,
      pecos_name: result.pecos_name,
      pecos_specialty: result.pecos_specialty,
    }),
    headers: { Prefer: 'return=minimal' },
  });
}

async function updateLicenseNpi(licenseId: string, npi: string): Promise<void> {
  await dbRequest(`provider_licenses?id=eq.${licenseId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      npi,
      updated_at: new Date().toISOString(),
    }),
    headers: { Prefer: 'return=minimal' },
  });
}

// ── Name Parsing ─────────────────────────────────────────

function extractLastName(license: UnresolvedLicense): string | null {
  if (license.last_name) return license.last_name.trim();
  // Parse from full name: "Last, First" or "First Last"
  const name = license.licensee_name?.trim();
  if (!name) return null;
  if (name.includes(',')) {
    return name.split(',')[0].trim();
  }
  const parts = name.split(/\s+/);
  return parts[parts.length - 1] || null;
}

function extractFirstName(license: UnresolvedLicense): string | null {
  if (license.first_name) return license.first_name.trim();
  const name = license.licensee_name?.trim();
  if (!name) return null;
  if (name.includes(',')) {
    const after = name.split(',')[1]?.trim();
    return after?.split(/\s+/)[0] || null;
  }
  const parts = name.split(/\s+/);
  return parts.length > 1 ? parts[0] : null;
}

// ── Jaro-Winkler String Similarity ───────────────────────

/**
 * Jaro-Winkler distance: 0.0 (no similarity) to 1.0 (identical).
 * Preferred over Levenshtein for name matching because it gives
 * higher scores to strings that match from the beginning (common
 * for first names: "William" vs "Will", "Robert" vs "Rob").
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const matchWindow = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3;

  // Winkler bonus for common prefix (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  const winklerBoost = 0.1;
  return jaro + prefix * winklerBoost * (1 - jaro);
}

// ── Specialty Matching ───────────────────────────────────

/**
 * Check if a specialty string from a state board matches a specialty
 * string from PECOS. Handles common variations:
 *   "Internal Medicine" ↔ "INTERNAL MEDICINE"
 *   "Family Medicine" ↔ "FAMILY PRACTICE"
 *   "Orthopedic Surgery" ↔ "ORTHOPAEDIC SURGERY"
 */
function specialtiesOverlap(spec1: string, spec2: string): boolean {
  const n1 = normalizeSpecialty(spec1);
  const n2 = normalizeSpecialty(spec2);

  // Exact match after normalization
  if (n1 === n2) return true;

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Known equivalences
  const equivalences: [string, string][] = [
    ['family medicine', 'family practice'],
    ['internal medicine', 'internist'],
    ['orthopedic surgery', 'orthopaedic surgery'],
    ['ob/gyn', 'obstetrics gynecology'],
    ['obgyn', 'obstetrics gynecology'],
    ['er', 'emergency medicine'],
    ['ent', 'otolaryngology'],
    ['gastro', 'gastroenterology'],
    ['cardio', 'cardiovascular disease'],
    ['derm', 'dermatology'],
    ['psych', 'psychiatry'],
    ['peds', 'pediatrics'],
    ['uro', 'urology'],
    ['nephro', 'nephrology'],
    ['neuro', 'neurology'],
    ['pulm', 'pulmonary disease'],
    ['rheum', 'rheumatology'],
    ['onc', 'oncology'],
    ['endo', 'endocrinology'],
    ['ophthal', 'ophthalmology'],
  ];

  for (const [a, b] of equivalences) {
    if ((n1.includes(a) && n2.includes(b)) || (n1.includes(b) && n2.includes(a))) {
      return true;
    }
  }

  // Jaro-Winkler similarity > 0.85
  return jaroWinkler(n1, n2) > 0.85;
}

function normalizeSpecialty(spec: string): string {
  return spec
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if an NPPES taxonomy code maps to a given specialty string.
 * Uses the first few characters of the taxonomy description for matching.
 */
function taxonomyMatchesSpecialty(taxonomyCode: string, specialty: string): boolean {
  // Common taxonomy prefix → specialty mappings
  const TAXONOMY_PREFIXES: Record<string, string[]> = {
    '207Q': ['family medicine', 'family practice'],
    '207R': ['internal medicine', 'internist'],
    '207X': ['orthopedic', 'orthopaedic'],
    '207V': ['obstetrics', 'gynecology', 'ob/gyn'],
    '207P': ['emergency medicine'],
    '207Y': ['ophthalmology'],
    '208D': ['general practice'],
    '208': ['pediatrics'],
    '207N': ['dermatology'],
    '2084': ['psychiatry'],
    '207L': ['anesthesiology'],
    '207T': ['neurology'],
    '207U': ['nuclear medicine'],
    '207K': ['gastroenterology'],
    '207S': ['surgery'],
  };

  const normSpec = normalizeSpecialty(specialty);

  for (const [prefix, specs] of Object.entries(TAXONOMY_PREFIXES)) {
    if (taxonomyCode.startsWith(prefix)) {
      return specs.some(s => normSpec.includes(s));
    }
  }

  return false;
}
