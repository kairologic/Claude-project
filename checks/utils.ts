// checks/utils.ts
// ═══ Normalization & Matching Utilities ═══

/**
 * Normalize a street address for comparison.
 * Expands abbreviations, strips punctuation, lowercases.
 */
export function normalizeAddress(line1: string, city: string, state: string, zip: string): string {
  if (!line1) return '';

  let addr = [line1, city, state, zip].filter(Boolean).join(', ').toLowerCase();

  // Expand common abbreviations
  const abbrevs: Record<string, string> = {
    'ste': 'suite', 'ste.': 'suite', 'apt': 'apartment', 'apt.': 'apartment',
    'blvd': 'boulevard', 'blvd.': 'boulevard', 'ave': 'avenue', 'ave.': 'avenue',
    'st': 'street', 'st.': 'street', 'dr': 'drive', 'dr.': 'drive',
    'rd': 'road', 'rd.': 'road', 'ln': 'lane', 'ln.': 'lane',
    'ct': 'court', 'ct.': 'court', 'pl': 'place', 'pl.': 'place',
    'pkwy': 'parkway', 'hwy': 'highway', 'cir': 'circle',
    'n': 'north', 'n.': 'north', 's': 'south', 's.': 'south',
    'e': 'east', 'e.': 'east', 'w': 'west', 'w.': 'west',
    'fl': 'floor', 'flr': 'floor', 'bldg': 'building',
  };

  // Replace abbreviations (word-boundary aware)
  addr = addr.replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim();
  addr = addr.split(' ').map(word => abbrevs[word] || word).join(' ');

  return addr;
}

/**
 * Compare two normalized addresses with tolerance.
 * Returns true if they match (allowing suite/unit differences).
 */
export function addressesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  // Compare zip5 first — fast rejection
  const zipA = extractZip5(a);
  const zipB = extractZip5(b);
  if (zipA && zipB && zipA !== zipB) return false;

  // Remove suite/unit info and compare the rest
  const coreA = stripSuite(a);
  const coreB = stripSuite(b);

  if (coreA === coreB) return true;

  // Levenshtein distance for minor typos
  return levenshtein(coreA, coreB) <= 3;
}

function extractZip5(addr: string): string {
  const match = addr.match(/\b(\d{5})\b/);
  return match ? match[1] : '';
}

function stripSuite(addr: string): string {
  return addr
    .replace(/\b(suite|apartment|unit|floor|building|room|#)\s*\w*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize phone to digits only (E.164-ish).
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // If starts with 1 and is 11 digits, strip country code
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

/**
 * Compare two phone numbers.
 */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}

/**
 * Normalize a person's name for matching.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(md|do|phd|np|pa|rn|lpn|lcsw|dds|dpm|od|dc)\b/gi, '')
    .replace(/\b(dr|mr|mrs|ms|jr|sr|ii|iii|iv)\b\.?/gi, '')
    .replace(/[.,\-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy name match — surname + first initial minimum.
 */
export function fuzzyNameMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  const partsA = a.split(' ').filter(Boolean);
  const partsB = b.split(' ').filter(Boolean);

  if (partsA.length === 0 || partsB.length === 0) return false;

  // Last names must match (or be very close)
  const lastA = partsA[partsA.length - 1];
  const lastB = partsB[partsB.length - 1];

  if (lastA !== lastB && levenshtein(lastA, lastB) > 1) return false;

  // First initial must match
  const firstA = partsA[0]?.[0];
  const firstB = partsB[0]?.[0];

  return firstA === firstB;
}

/**
 * Specialty synonym mapping — don't flag umbrella terms.
 */
const SPECIALTY_SYNONYMS: Record<string, string[]> = {
  'family medicine': ['family practice', 'primary care', 'family health', 'general practice'],
  'internal medicine': ['primary care', 'general medicine', 'internist'],
  'pediatrics': ['pediatric medicine', 'child health', 'childrens medicine'],
  'obstetrics & gynecology': ['obgyn', 'ob/gyn', 'obstetrics', 'gynecology', 'womens health'],
  'psychiatry': ['mental health', 'behavioral health', 'psychiatric services'],
  'nurse practitioner': ['np', 'advanced practice nurse', 'arnp', 'aprn'],
  'physician assistant': ['pa', 'pa-c', 'physician associate'],
  'clinical psychology': ['psychology', 'psychologist', 'mental health', 'behavioral health'],
  'physical therapy': ['physiotherapy', 'pt', 'physical rehabilitation'],
  'dentist': ['dental', 'dentistry', 'oral health'],
  'optometry': ['eye care', 'vision care', 'optometrist'],
  'chiropractic': ['chiropractor', 'spinal health'],
  'dermatology': ['skin care', 'dermatologist'],
  'cardiology': ['heart health', 'cardiovascular', 'cardiologist'],
  'orthopedic surgery': ['orthopedics', 'orthopaedics', 'bone and joint', 'musculoskeletal'],
};

export function specialtyMatches(npiClassification: string, siteLabels: string[]): boolean {
  const npiLower = npiClassification.toLowerCase();

  for (const siteLabel of siteLabels) {
    const siteLower = siteLabel.toLowerCase();

    // Direct match
    if (npiLower.includes(siteLower) || siteLower.includes(npiLower)) return true;

    // Synonym match
    const synonyms = SPECIALTY_SYNONYMS[npiLower] || [];
    if (synonyms.some(syn => siteLower.includes(syn) || syn.includes(siteLower))) return true;

    // Reverse synonym check (site label is the key)
    for (const [key, syns] of Object.entries(SPECIALTY_SYNONYMS)) {
      if (siteLower.includes(key) || key.includes(siteLower)) {
        if (syns.some(syn => npiLower.includes(syn)) || npiLower.includes(key)) return true;
      }
    }
  }

  // "Primary care" matches many things — don't flag it
  if (siteLabels.some(l => l.toLowerCase().includes('primary care'))) return true;

  return false;
}

/**
 * Levenshtein distance.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
