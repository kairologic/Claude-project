// lib/scanner/taxonomy-normalizer.ts
// ═══ Specialty / Taxonomy Normalization Engine ═══
// Maps freeform web specialty strings to NPPES taxonomy codes
// and provides fuzzy matching for specialty comparison across sources.
//
// Four sources to normalize:
//   1. web_specialty   – freeform text from practice websites
//   2. nppes_taxonomy  – NUCC taxonomy code (e.g. "207Q00000X")
//   3. board_specialty – state board classification text
//   4. payer_specialty – from payer directory FHIR snapshots
//
// Pipeline tasks: #128-#135

// ── Canonical Taxonomy Map ──────────────────────────────
// Bidirectional mapping: taxonomy code ↔ normalized specialty name
// Based on target_taxonomies table + common aliases from websites

export interface TaxonomyEntry {
  code: string;
  canonical: string; // normalized display name
  grouping: string; // Primary Care, Specialty, etc.
  aliases: string[]; // all known variations from websites
}

const TAXONOMY_MAP: TaxonomyEntry[] = [
  // ── Primary Care ────────────────────────────────────
  {
    code: '207Q00000X',
    canonical: 'Family Medicine',
    grouping: 'Primary Care',
    aliases: [
      'family medicine',
      'family practice',
      'family physician',
      'family doctor',
      'family med',
      'fp',
      'fm',
      'family nurse practitioner',
      'fnp',
      'family care',
      'general family medicine',
      'family & general practice',
    ],
  },
  {
    code: '207R00000X',
    canonical: 'Internal Medicine',
    grouping: 'Primary Care',
    aliases: [
      'internal medicine',
      'internist',
      'general internal medicine',
      'internal med',
      'im',
      'general internist',
      'adult medicine',
    ],
  },
  {
    code: '208000000X',
    canonical: 'Pediatrics',
    grouping: 'Primary Care',
    aliases: [
      'pediatrics',
      'pediatrician',
      'pediatric medicine',
      'peds',
      'child health',
      'pediatric care',
      "children's medicine",
    ],
  },
  {
    code: '208D00000X',
    canonical: 'General Practice',
    grouping: 'Primary Care',
    aliases: [
      'general practice',
      'general practitioner',
      'gp',
      'primary care',
      'primary care physician',
      'pcp',
    ],
  },
  // ── Combined Specialties (common on websites) ───────
  {
    code: '207RI0200X',
    canonical: 'Internal Medicine/Pediatrics',
    grouping: 'Primary Care',
    aliases: [
      'internal medicine/pediatrics',
      'internal medicine & pediatrics',
      'med-peds',
      'medicine-pediatrics',
      'internal medicine, pediatrics',
      'internal medicine pediatrics',
      'im/peds',
      'med/peds',
    ],
  },
  // ── Specialties ─────────────────────────────────────
  {
    code: '207N00000X',
    canonical: 'Dermatology',
    grouping: 'Specialty',
    aliases: ['dermatology', 'dermatologist', 'skin care', 'derm'],
  },
  {
    code: '207X00000X',
    canonical: 'Orthopedic Surgery',
    grouping: 'Specialty',
    aliases: [
      'orthopedic surgery',
      'orthopaedic surgery',
      'orthopedics',
      'orthopaedics',
      'orthopedic',
      'ortho',
    ],
  },
  {
    code: '207Y00000X',
    canonical: 'Otolaryngology',
    grouping: 'Specialty',
    aliases: [
      'otolaryngology',
      'ent',
      'ear nose throat',
      'ear, nose & throat',
      'ear nose and throat',
      'otorhinolaryngology',
    ],
  },
  {
    code: '207V00000X',
    canonical: 'Obstetrics & Gynecology',
    grouping: 'Specialty',
    aliases: [
      'obstetrics & gynecology',
      'obstetrics and gynecology',
      'ob/gyn',
      'obgyn',
      'ob-gyn',
      'obstetrics',
      'gynecology',
      "women's health",
    ],
  },
  {
    code: '207RC0000X',
    canonical: 'Cardiovascular Disease',
    grouping: 'Specialty',
    aliases: ['cardiovascular disease', 'cardiology', 'cardiologist', 'heart', 'cardiovascular'],
  },
  {
    code: '207RG0100X',
    canonical: 'Gastroenterology',
    grouping: 'Specialty',
    aliases: ['gastroenterology', 'gastroenterologist', 'gi', 'digestive'],
  },
  {
    code: '207RN0300X',
    canonical: 'Nephrology',
    grouping: 'Specialty',
    aliases: ['nephrology', 'nephrologist', 'kidney', 'renal'],
  },
  {
    code: '207RP1001X',
    canonical: 'Pulmonary Disease',
    grouping: 'Specialty',
    aliases: [
      'pulmonary disease',
      'pulmonology',
      'pulmonologist',
      'lung',
      'pulmonary medicine',
      'pulmonary',
    ],
  },
  {
    code: '207RE0101X',
    canonical: 'Endocrinology',
    grouping: 'Specialty',
    aliases: [
      'endocrinology',
      'endocrinologist',
      'diabetes',
      'endocrinology, diabetes & metabolism',
    ],
  },
  {
    code: '207RH0000X',
    canonical: 'Hematology',
    grouping: 'Specialty',
    aliases: [
      'hematology',
      'hematologist',
      'blood disorders',
      'hematology & oncology',
      'hematology/oncology',
    ],
  },
  {
    code: '207RR0500X',
    canonical: 'Rheumatology',
    grouping: 'Specialty',
    aliases: ['rheumatology', 'rheumatologist'],
  },
  {
    code: '2084P0800X',
    canonical: 'Psychiatry',
    grouping: 'Specialty',
    aliases: [
      'psychiatry',
      'psychiatrist',
      'psychiatry & neurology',
      'mental health',
      'behavioral health',
    ],
  },
  {
    code: '2084N0400X',
    canonical: 'Neurology',
    grouping: 'Specialty',
    aliases: ['neurology', 'neurologist', 'neuro'],
  },
  {
    code: '208600000X',
    canonical: 'Plastic Surgery',
    grouping: 'Specialty',
    aliases: [
      'plastic surgery',
      'plastic surgeon',
      'cosmetic surgery',
      'reconstructive surgery',
      'plastic & reconstructive surgery',
    ],
  },
  {
    code: '208200000X',
    canonical: 'Surgery',
    grouping: 'Specialty',
    aliases: ['surgery', 'general surgery', 'surgeon', 'general surgeon'],
  },
  {
    code: '207T00000X',
    canonical: 'Neurological Surgery',
    grouping: 'Specialty',
    aliases: ['neurological surgery', 'neurosurgery', 'neurosurgeon'],
  },
  {
    code: '208C00000X',
    canonical: 'Colon & Rectal Surgery',
    grouping: 'Specialty',
    aliases: ['colon & rectal surgery', 'colorectal surgery', 'proctology'],
  },
  {
    code: '1835P1300X',
    canonical: 'Pharmacist',
    grouping: 'Pharmacy',
    aliases: ['pharmacist', 'pharmacy', 'clinical pharmacist'],
  },
  {
    code: '207L00000X',
    canonical: 'Anesthesiology',
    grouping: 'Specialty',
    aliases: ['anesthesiology', 'anesthesiologist', 'pain management', 'pain medicine'],
  },
  {
    code: '2085R0001X',
    canonical: 'Radiation Oncology',
    grouping: 'Specialty',
    aliases: ['radiation oncology', 'radiation oncologist'],
  },
  {
    code: '207RX0202X',
    canonical: 'Medical Oncology',
    grouping: 'Specialty',
    aliases: ['medical oncology', 'oncology', 'oncologist', 'cancer'],
  },
  {
    code: '207W00000X',
    canonical: 'Ophthalmology',
    grouping: 'Specialty',
    aliases: ['ophthalmology', 'ophthalmologist', 'eye doctor', 'eye care'],
  },
  {
    code: '152W00000X',
    canonical: 'Optometry',
    grouping: 'Specialty',
    aliases: ['optometry', 'optometrist'],
  },
  {
    code: '207RU0202X',
    canonical: 'Urology',
    grouping: 'Specialty',
    aliases: ['urology', 'urologist', 'urological'],
  },
  {
    code: '111N00000X',
    canonical: 'Chiropractor',
    grouping: 'Rehab',
    aliases: ['chiropractor', 'chiropractic', 'chiropractic medicine'],
  },
  {
    code: '225100000X',
    canonical: 'Physical Therapy',
    grouping: 'Rehab',
    aliases: ['physical therapy', 'physical therapist', 'pt', 'physiotherapy'],
  },
  {
    code: '101Y00000X',
    canonical: 'Counselor',
    grouping: 'Mental Health',
    aliases: [
      'counselor',
      'counseling',
      'licensed professional counselor',
      'lpc',
      'mental health counselor',
    ],
  },
  // ── Nurse Practitioners / PAs ───────────────────────
  {
    code: '363L00000X',
    canonical: 'Nurse Practitioner',
    grouping: 'Primary Care',
    aliases: [
      'nurse practitioner',
      'np',
      'aprn',
      'fnp',
      'fnp-c',
      'fnp-bc',
      'family nurse practitioner',
      'adult nurse practitioner',
      'advanced practice registered nurse',
      'arnp',
      'certified nurse practitioner',
      'cnp',
    ],
  },
  {
    code: '363A00000X',
    canonical: 'Physician Assistant',
    grouping: 'Primary Care',
    aliases: ['physician assistant', 'pa', 'pa-c', "physician's assistant"],
  },
  // ── Urgent Care / Clinics ───────────────────────────
  {
    code: '261QU0200X',
    canonical: 'Urgent Care',
    grouping: 'Primary Care',
    aliases: ['urgent care', 'walk-in clinic', 'immediate care'],
  },
];

// ── Build Lookup Indexes ────────────────────────────────

// Map: normalized alias → TaxonomyEntry
const aliasIndex = new Map<string, TaxonomyEntry>();
for (const entry of TAXONOMY_MAP) {
  for (const alias of entry.aliases) {
    aliasIndex.set(alias.toLowerCase().trim(), entry);
  }
  // Also index by canonical name
  aliasIndex.set(entry.canonical.toLowerCase().trim(), entry);
}

// Map: taxonomy code → TaxonomyEntry
const codeIndex = new Map<string, TaxonomyEntry>();
for (const entry of TAXONOMY_MAP) {
  codeIndex.set(entry.code, entry);
}

// ── Public API ──────────────────────────────────────────

/**
 * Normalize a freeform specialty string to a canonical taxonomy entry.
 * Returns null if no match found.
 */
export function normalizeSpecialty(rawSpecialty: string | null): TaxonomyEntry | null {
  if (!rawSpecialty) return null;

  const cleaned = rawSpecialty
    .toLowerCase()
    .trim()
    .replace(/[,\/&]+/g, (match) => (match === '/' ? '/' : match))
    .replace(/\s+/g, ' ');

  // Direct alias match
  const direct = aliasIndex.get(cleaned);
  if (direct) return direct;

  // Try stripping common prefixes/suffixes
  const stripped = cleaned
    .replace(/^(dr\.?\s+|board certified in\s+|specializing in\s+)/i, '')
    .replace(/\s*(medicine|specialist|physician|doctor|md|do|np|pa)$/i, '')
    .trim();
  const strippedMatch = aliasIndex.get(stripped);
  if (strippedMatch) return strippedMatch;

  // Try each alias as a substring match (for "Internal Medicine/Pediatrics" style)
  for (const [alias, entry] of aliasIndex) {
    if (cleaned.includes(alias) && alias.length >= 5) {
      return entry;
    }
  }

  return null;
}

/**
 * Resolve an NPPES taxonomy code to a canonical taxonomy entry.
 */
export function resolveCode(taxonomyCode: string | null): TaxonomyEntry | null {
  if (!taxonomyCode) return null;
  return codeIndex.get(taxonomyCode) || null;
}

/**
 * Compare two specialty values and determine if they match.
 * Returns a match result with confidence.
 *
 * Handles sub-specialty nuances:
 *   - "Internal Medicine/Pediatrics" vs "Internal Medicine" → soft match (0.7)
 *   - "Family Medicine" vs "Family Practice" → exact match (1.0)
 *   - "Dermatology" vs "Family Medicine" → mismatch (0.0)
 */
export interface SpecialtyMatchResult {
  match: boolean;
  confidence: number; // 0.0 = definite mismatch, 0.5 = soft match, 1.0 = exact
  sourceACanonical: string | null;
  sourceBCanonical: string | null;
  sourceACode: string | null;
  sourceBCode: string | null;
  reason: string;
}

export function compareSpecialties(
  specialtyA: string | null,
  specialtyB: string | null,
  options: { aIsCode?: boolean; bIsCode?: boolean } = {},
): SpecialtyMatchResult {
  const result: SpecialtyMatchResult = {
    match: true,
    confidence: 0,
    sourceACanonical: null,
    sourceBCanonical: null,
    sourceACode: null,
    sourceBCode: null,
    reason: 'both_null',
  };

  // If both null, treat as no-data (not a mismatch)
  if (!specialtyA && !specialtyB) {
    result.confidence = 0;
    result.reason = 'both_null';
    return result;
  }

  // If only one is null, we can't compare
  if (!specialtyA || !specialtyB) {
    result.match = false;
    result.confidence = 0.3;
    result.reason = 'one_null';
    return result;
  }

  // Resolve both to taxonomy entries
  const entryA = options.aIsCode ? resolveCode(specialtyA) : normalizeSpecialty(specialtyA);
  const entryB = options.bIsCode ? resolveCode(specialtyB) : normalizeSpecialty(specialtyB);

  result.sourceACanonical = entryA?.canonical || specialtyA;
  result.sourceBCanonical = entryB?.canonical || specialtyB;
  result.sourceACode = entryA?.code || null;
  result.sourceBCode = entryB?.code || null;

  // Both resolved to same code → exact match
  if (entryA && entryB && entryA.code === entryB.code) {
    result.match = true;
    result.confidence = 1.0;
    result.reason = 'exact_code_match';
    return result;
  }

  // One or both couldn't be resolved
  if (!entryA || !entryB) {
    // Try raw string comparison as fallback
    const rawA = specialtyA.toLowerCase().trim();
    const rawB = specialtyB.toLowerCase().trim();
    if (rawA === rawB) {
      result.match = true;
      result.confidence = 0.8;
      result.reason = 'raw_string_match';
      return result;
    }
    result.match = false;
    result.confidence = 0.4;
    result.reason = 'unresolvable';
    return result;
  }

  // Both resolved but different codes — check for sub-specialty overlap
  // e.g. "Internal Medicine/Pediatrics" (207RI0200X) vs "Internal Medicine" (207R00000X)
  const aIsSubOf = entryA.code.startsWith(entryB.code.substring(0, 4));
  const bIsSubOf = entryB.code.startsWith(entryA.code.substring(0, 4));

  if (aIsSubOf || bIsSubOf) {
    // Same specialty family — soft match
    result.match = true;
    result.confidence = 0.7;
    result.reason = 'sub_specialty_match';
    return result;
  }

  // Same grouping (e.g. both Primary Care) — weak match
  if (entryA.grouping === entryB.grouping) {
    result.match = false;
    result.confidence = 0.3;
    result.reason = 'same_grouping_different_specialty';
    return result;
  }

  // Completely different
  result.match = false;
  result.confidence = 0.0;
  result.reason = 'different_specialty';
  return result;
}

/**
 * Compare a provider's specialty across all 4 sources.
 * Returns mismatches suitable for delta event creation.
 */
export interface FourWaySpecialtyResult {
  webCanonical: string | null;
  nppesCanonical: string | null;
  boardCanonical: string | null;
  payerCanonical: string | null;
  hasMismatch: boolean;
  mismatches: {
    sourceA: string;
    sourceB: string;
    specialtyA: string;
    specialtyB: string;
    confidence: number;
    reason: string;
  }[];
  consensusSpecialty: string | null; // what 2+ sources agree on
  consensusSources: string[];
}

export function compareFourWaySpecialty(params: {
  webSpecialty: string | null;
  nppesCode: string | null;
  boardSpecialty: string | null;
  payerSpecialty: string | null;
}): FourWaySpecialtyResult {
  const { webSpecialty, nppesCode, boardSpecialty, payerSpecialty } = params;

  // Resolve all to canonical entries
  const webEntry = normalizeSpecialty(webSpecialty);
  const nppesEntry = resolveCode(nppesCode);
  const boardEntry = normalizeSpecialty(boardSpecialty);
  const payerEntry = normalizeSpecialty(payerSpecialty);

  const result: FourWaySpecialtyResult = {
    webCanonical: webEntry?.canonical || webSpecialty,
    nppesCanonical: nppesEntry?.canonical || null,
    boardCanonical: boardEntry?.canonical || boardSpecialty,
    payerCanonical: payerEntry?.canonical || payerSpecialty,
    hasMismatch: false,
    mismatches: [],
    consensusSpecialty: null,
    consensusSources: [],
  };

  // Build pairs to compare (only when both values exist)
  const sources: { name: string; entry: TaxonomyEntry | null; raw: string | null }[] = [
    { name: 'website', entry: webEntry, raw: webSpecialty },
    { name: 'nppes', entry: nppesEntry, raw: nppesCode },
    { name: 'state_board', entry: boardEntry, raw: boardSpecialty },
    { name: 'payer_directory', entry: payerEntry, raw: payerSpecialty },
  ];

  // Pairwise comparison
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];

      if (!a.raw || !b.raw) continue; // skip null sources

      const comparison = compareSpecialties(a.raw, b.raw, {
        aIsCode: a.name === 'nppes',
        bIsCode: b.name === 'nppes',
      });

      if (!comparison.match && comparison.confidence < 0.7) {
        result.hasMismatch = true;
        result.mismatches.push({
          sourceA: a.name,
          sourceB: b.name,
          specialtyA: comparison.sourceACanonical || a.raw,
          specialtyB: comparison.sourceBCanonical || b.raw,
          confidence: comparison.confidence,
          reason: comparison.reason,
        });
      }
    }
  }

  // Determine consensus (code that appears in 2+ sources)
  const codeCounts = new Map<string, string[]>();
  for (const s of sources) {
    if (s.entry) {
      const existing = codeCounts.get(s.entry.code) || [];
      existing.push(s.name);
      codeCounts.set(s.entry.code, existing);
    }
  }

  for (const [code, srcNames] of codeCounts) {
    if (srcNames.length >= 2) {
      const entry = codeIndex.get(code);
      result.consensusSpecialty = entry?.canonical || code;
      result.consensusSources = srcNames;
      break;
    }
  }

  return result;
}

// ── Exports for testing ─────────────────────────────────
export { TAXONOMY_MAP, aliasIndex, codeIndex };
