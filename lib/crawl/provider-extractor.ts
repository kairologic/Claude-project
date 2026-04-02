// lib/crawl/provider-extractor.ts
// ═══ Phase 1: HTTP-Based Provider Extractor ═══
// Extracts provider names, credentials, and specialties from practice website HTML.
// Works via simple HTTP fetch + HTML parsing — no headless browser needed.
// Handles ~70% of practice websites; JS-rendered sites fall back to Phase 2 (Browserless).
//
// Pipeline tasks: #116-#119

// ── Types ───────────────────────────────────────────────

export interface ExtractedProvider {
  name: string; // Full display name (e.g. "Dr. Jacqueline Champlain")
  rawName: string; // Original text before cleanup
  credential: string | null; // MD, DO, APRN, PA-C, NP, etc.
  specialty: string | null; // Freeform specialty from website
  role: string | null; // "Physician", "Nurse Practitioner", etc.
  confidence: number; // 0-1 extraction confidence
}

export interface ProviderExtractionResult {
  url: string;
  providerPageUrl: string | null; // Which sub-page we found providers on
  providers: ExtractedProvider[];
  method: string; // 'schema_org' | 'html_pattern' | 'structured_list'
  extractedAt: string;
  durationMs: number;
  error: string | null;
}

// ── Constants ───────────────────────────────────────────

/** Common provider page paths to try (ordered by likelihood) */
const PROVIDER_PAGE_PATHS = [
  '/providers',
  '/providers/',
  '/our-providers',
  '/our-providers/',
  '/physicians',
  '/physicians/',
  '/our-team',
  '/our-team/',
  '/doctors',
  '/doctors/',
  '/staff',
  '/staff/',
  '/meet-our-team',
  '/meet-the-team',
  '/about-us',
  '/about',
  '/our-doctors',
  '/our-physicians',
  '/medical-staff',
  '/care-team',
  '/team',
];

/** Known credential patterns */
const CREDENTIALS = [
  'MD',
  'M\\.D\\.',
  'DO',
  'D\\.O\\.',
  'APRN',
  'A\\.P\\.R\\.N\\.',
  'NP',
  'N\\.P\\.',
  'FNP',
  'FNP-C',
  'FNP-BC',
  'CNP',
  'ARNP',
  'CRNP',
  'PA',
  'PA-C',
  'P\\.A\\.',
  'DNP',
  'D\\.N\\.P\\.',
  'PhD',
  'Ph\\.D\\.',
  'DPM',
  'D\\.P\\.M\\.',
  'DC',
  'D\\.C\\.',
  'OD',
  'O\\.D\\.',
  'DDS',
  'D\\.D\\.S\\.',
  'DMD',
  'D\\.M\\.D\\.',
  'FACP',
  'FAAP',
  'FACS',
  'FACOG',
  'FAAFP',
  'MPH',
  'MBA',
  'MS',
  'MSN',
  'BSN',
  'RN',
  'LCSW',
  'LPC',
  'LMFT',
];

const CREDENTIAL_PATTERN = new RegExp(`\\b(${CREDENTIALS.join('|')})\\b`, 'gi');

/** Pattern for "Dr. FirstName LastName" or "FirstName LastName, MD" */
const NAME_WITH_TITLE =
  /(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{2,}(?:-[A-Z][a-z]+)?)/g;

/** Pattern: "Name, Credential" (e.g., "John Smith, MD") */
const NAME_COMMA_CREDENTIAL = new RegExp(
  `([A-Z][a-z]+(?:\\s+[A-Z]\\.?)?\\s+[A-Z][a-z]{2,}(?:-[A-Z][a-z]+)?)\\s*,\\s*((?:${CREDENTIALS.join('|')})(?:\\s*,\\s*(?:${CREDENTIALS.join('|')}))*)`,
  'g',
);

/** Pattern: "Dr. Name" */
const DR_PREFIX = /Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{2,}(?:-[A-Z][a-z]+)?)/g;

/** Common specialty strings found on practice websites */
const SPECIALTY_KEYWORDS = [
  'family medicine',
  'family practice',
  'internal medicine',
  'pediatrics',
  'dermatology',
  'cardiology',
  'orthopedics',
  'obstetrics',
  'gynecology',
  'ob/gyn',
  'neurology',
  'psychiatry',
  'urology',
  'ophthalmology',
  'gastroenterology',
  'endocrinology',
  'rheumatology',
  'pulmonology',
  'nephrology',
  'oncology',
  'hematology',
  'surgery',
  'plastic surgery',
  'urgent care',
  'physical therapy',
  'chiropractic',
  'optometry',
  'podiatry',
  'pain management',
  'allergy',
  'immunology',
  'infectious disease',
  'sports medicine',
  'geriatrics',
  'nurse practitioner',
  'physician assistant',
  'anesthesiology',
  'radiology',
  'pathology',
  'emergency medicine',
  'med-peds',
  'internal medicine/pediatrics',
];

// ── User-Agent ──────────────────────────────────────────

const USER_AGENT =
  'KairoLogic-ProviderCrawler/1.0 (+https://kairologic.net; provider-data-verification)';

// ── Main Extraction Function ────────────────────────────

/**
 * Extract providers from a practice website.
 * Tries the homepage first (for schema.org data), then common provider sub-pages.
 */
export async function extractProvidersFromWebsite(
  baseUrl: string,
  options: {
    timeout?: number;
    maxPages?: number;
  } = {},
): Promise<ProviderExtractionResult> {
  const { timeout = 15000, maxPages = 5 } = options;
  const startTime = Date.now();

  const result: ProviderExtractionResult = {
    url: baseUrl,
    providerPageUrl: null,
    providers: [],
    method: 'none',
    extractedAt: new Date().toISOString(),
    durationMs: 0,
    error: null,
  };

  try {
    // Normalize base URL
    const base = baseUrl.replace(/\/$/, '');

    // Step 1: Try homepage for schema.org structured data
    const homepageHtml = await fetchPage(base, timeout);
    if (homepageHtml) {
      const schemaProviders = extractFromSchemaOrg(homepageHtml);
      if (schemaProviders.length > 0) {
        result.providers = schemaProviders;
        result.providerPageUrl = base;
        result.method = 'schema_org';
        result.durationMs = Date.now() - startTime;
        return result;
      }
    }

    // Step 2: Try common provider page paths
    let pagesChecked = 0;
    for (const path of PROVIDER_PAGE_PATHS) {
      if (pagesChecked >= maxPages) break;

      const url = `${base}${path}`;
      const html = await fetchPage(url, timeout);
      pagesChecked++;

      if (!html) continue;

      // Try structured list extraction first (more reliable)
      let providers = extractFromStructuredList(html);
      if (providers.length >= 2) {
        result.providers = providers;
        result.providerPageUrl = url;
        result.method = 'structured_list';
        result.durationMs = Date.now() - startTime;
        return result;
      }

      // Fall back to HTML pattern matching
      providers = extractFromHtmlPatterns(html);
      if (providers.length >= 2) {
        result.providers = providers;
        result.providerPageUrl = url;
        result.method = 'html_pattern';
        result.durationMs = Date.now() - startTime;
        return result;
      }
    }

    // Step 3: If homepage had HTML, try pattern matching on it too
    if (homepageHtml) {
      const providers = extractFromHtmlPatterns(homepageHtml);
      if (providers.length >= 2) {
        result.providers = providers;
        result.providerPageUrl = base;
        result.method = 'html_pattern';
      }
    }

    result.durationMs = Date.now() - startTime;
    return result;
  } catch (err: any) {
    result.error = err.message || String(err);
    result.durationMs = Date.now() - startTime;
    return result;
  }
}

// ── HTTP Fetch ──────────────────────────────────────────

async function fetchPage(url: string, timeout: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
      return null;
    }

    const html = await res.text();

    // Skip pages that are too small (likely error pages) or too large
    if (html.length < 500 || html.length > 5_000_000) return null;

    return html;
  } catch {
    return null;
  }
}

// ── Extraction Method 1: Schema.org JSON-LD ─────────────

function extractFromSchemaOrg(html: string): ExtractedProvider[] {
  const providers: ExtractedProvider[] = [];

  // Find all JSON-LD script blocks
  const jsonLdPattern =
    /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Direct Physician/Person schema
        if (item['@type'] === 'Physician' || item['@type'] === 'Person') {
          const provider = parseSchemaOrgPerson(item);
          if (provider) providers.push(provider);
        }

        // MedicalOrganization with members
        if (item.member) {
          const members = Array.isArray(item.member) ? item.member : [item.member];
          for (const member of members) {
            const provider = parseSchemaOrgPerson(member);
            if (provider) providers.push(provider);
          }
        }

        // ItemList of physicians
        if (item['@type'] === 'ItemList' && item.itemListElement) {
          for (const elem of item.itemListElement) {
            const provider = parseSchemaOrgPerson(elem.item || elem);
            if (provider) providers.push(provider);
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  return deduplicateProviders(providers);
}

function parseSchemaOrgPerson(data: any): ExtractedProvider | null {
  if (!data) return null;

  const name = data.name || `${data.givenName || ''} ${data.familyName || ''}`.trim();
  if (!name || name.length < 3) return null;

  // Extract credential from name or honorificSuffix
  const credential = data.honorificSuffix || extractCredentialFromName(name) || null;

  const specialty =
    data.medicalSpecialty || (data.specialization ? String(data.specialization) : null) || null;

  return {
    name: cleanProviderName(name),
    rawName: name,
    credential,
    specialty,
    role: data.jobTitle || null,
    confidence: 0.9,
  };
}

// ── Extraction Method 2: Structured HTML List ───────────

/**
 * Look for repeated HTML patterns that indicate a provider listing.
 * Common patterns:
 *   - Cards in a grid (.provider-card, .doctor-card, .team-member)
 *   - H2/H3 headers with names followed by specialty text
 *   - Definition lists or tables with provider info
 */
function extractFromStructuredList(html: string): ExtractedProvider[] {
  const providers: ExtractedProvider[] = [];

  // Pattern: repeated blocks with heading + credential/specialty
  // Look for <h2>/<h3>/<h4> tags containing names with credentials
  const headingPattern =
    /<h[2-4][^>]*>\s*((?:Dr\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{2,}(?:-[A-Z][a-z]+)?(?:\s*,\s*[A-Z.]+(?:\s*,\s*[A-Z.]+)*)?)\s*<\/h[2-4]>/gi;

  let match;
  while ((match = headingPattern.exec(html)) !== null) {
    const rawText = match[1].trim();
    const provider = parseProviderText(rawText, html, match.index);
    if (provider) {
      provider.confidence = 0.85;
      providers.push(provider);
    }
  }

  // Pattern: <a> tags with provider names (common in directory-style pages)
  const linkPattern =
    /<a[^>]*>\s*((?:Dr\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{2,}(?:-[A-Z][a-z]+)?(?:\s*,\s*[A-Z.]+(?:\s*,\s*[A-Z.]+)*)?)\s*<\/a>/gi;

  while ((match = linkPattern.exec(html)) !== null) {
    const rawText = match[1].trim();
    // Skip if it's a nav link or footer link (typically shorter context)
    const surroundingHtml = html
      .substring(
        Math.max(0, match.index - 200),
        Math.min(html.length, match.index + match[0].length + 200),
      )
      .toLowerCase();

    if (surroundingHtml.includes('nav') || surroundingHtml.includes('footer')) continue;

    const provider = parseProviderText(rawText, html, match.index);
    if (provider) {
      provider.confidence = 0.75;
      providers.push(provider);
    }
  }

  return deduplicateProviders(providers);
}

// ── Extraction Method 3: Freeform HTML Patterns ─────────

function extractFromHtmlPatterns(html: string): ExtractedProvider[] {
  const providers: ExtractedProvider[] = [];

  // Strip HTML tags but preserve line breaks
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:div|p|li|td|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ');

  // Method A: "Name, Credential" pattern
  let match;
  NAME_COMMA_CREDENTIAL.lastIndex = 0;
  while ((match = NAME_COMMA_CREDENTIAL.exec(text)) !== null) {
    const name = match[1].trim();
    const credentials = match[2].trim();

    if (isLikelyProviderName(name)) {
      const specialty = findNearbySpecialty(text, match.index + match[0].length);
      providers.push({
        name: cleanProviderName(`${name}`),
        rawName: `${name}, ${credentials}`,
        credential: normalizeCredential(credentials),
        specialty,
        role: null,
        confidence: 0.8,
      });
    }
  }

  // Method B: "Dr. FirstName LastName" pattern
  DR_PREFIX.lastIndex = 0;
  while ((match = DR_PREFIX.exec(text)) !== null) {
    const name = match[1].trim();

    // Check we haven't already captured this person
    const alreadyFound = providers.some(
      (p) => p.name.includes(name) || name.includes(p.name.replace(/^Dr\.?\s+/, '')),
    );

    if (!alreadyFound && isLikelyProviderName(name)) {
      const specialty = findNearbySpecialty(text, match.index + match[0].length);
      // Check for trailing credential
      const afterMatch = text.substring(
        match.index + match[0].length,
        match.index + match[0].length + 30,
      );
      const credMatch = afterMatch.match(/^\s*,?\s*([A-Z]{2,5}(?:\s*,\s*[A-Z]{2,5})*)/);
      const credential = credMatch ? normalizeCredential(credMatch[1]) : null;

      providers.push({
        name: cleanProviderName(`Dr. ${name}`),
        rawName: match[0],
        credential,
        specialty,
        role: null,
        confidence: 0.7,
      });
    }
  }

  return deduplicateProviders(providers);
}

// ── Helper Functions ────────────────────────────────────

function parseProviderText(
  rawText: string,
  _fullHtml: string,
  _position: number,
): ExtractedProvider | null {
  // Split on comma to separate name from credentials
  const parts = rawText.split(',').map((p) => p.trim());
  const namePart = parts[0];
  const credentialParts = parts.slice(1).join(', ');

  // Extract credential
  const credential = credentialParts
    ? normalizeCredential(credentialParts)
    : extractCredentialFromName(namePart);

  // Clean the name
  const cleanName = cleanProviderName(namePart);

  if (!isLikelyProviderName(cleanName.replace(/^Dr\.?\s+/, ''))) return null;

  return {
    name: cleanName,
    rawName: rawText,
    credential,
    specialty: null,
    role: null,
    confidence: 0.8,
  };
}

function extractCredentialFromName(name: string): string | null {
  const matches: string[] = [];
  let match;
  CREDENTIAL_PATTERN.lastIndex = 0;
  while ((match = CREDENTIAL_PATTERN.exec(name)) !== null) {
    matches.push(match[1].toUpperCase().replace(/\./g, ''));
  }
  return matches.length > 0 ? matches.join(', ') : null;
}

function normalizeCredential(raw: string): string {
  return raw
    .split(/[\s,]+/)
    .filter((p) => p.match(/^[A-Z.]{2,}[-]?[A-Z.]*$/i))
    .map((p) => p.toUpperCase().replace(/\./g, ''))
    .filter((p) => CREDENTIALS.some((c) => c.replace(/\\/g, '').replace(/\./g, '') === p))
    .join(', ');
}

function cleanProviderName(name: string): string {
  return name
    .replace(CREDENTIAL_PATTERN, '') // Remove credentials
    .replace(/,\s*$/, '') // Trailing comma
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();
}

function isLikelyProviderName(name: string): boolean {
  // Must have at least 2 words
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return false;

  // Must not be too long (likely a sentence, not a name)
  if (words.length > 5) return false;

  // Must start with capital letter
  if (!/^[A-Z]/.test(name)) return false;

  // Must not contain common non-name patterns
  const lower = name.toLowerCase();
  const skipPatterns = [
    'click here',
    'read more',
    'learn more',
    'view all',
    'see all',
    'our office',
    'our practice',
    'contact us',
    'book now',
    'schedule',
    'patient portal',
    'new patient',
    'office hours',
    'insurance',
    'copyright',
    'privacy policy',
    'all rights',
  ];
  if (skipPatterns.some((p) => lower.includes(p))) return false;

  return true;
}

function findNearbySpecialty(text: string, position: number): string | null {
  // Look at the next 200 chars for a specialty keyword
  const nearby = text.substring(position, position + 200).toLowerCase();

  for (const specialty of SPECIALTY_KEYWORDS) {
    if (nearby.includes(specialty)) {
      // Capitalize the first letter of each word
      return specialty
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  return null;
}

function deduplicateProviders(providers: ExtractedProvider[]): ExtractedProvider[] {
  const seen = new Map<string, ExtractedProvider>();

  for (const p of providers) {
    // Normalize key: lowercase name without "Dr." prefix
    const key = p.name
      .toLowerCase()
      .replace(/^dr\.?\s+/, '')
      .replace(/\s+/g, ' ')
      .trim();

    const existing = seen.get(key);
    if (!existing || p.confidence > existing.confidence) {
      seen.set(key, p);
    }
  }

  return Array.from(seen.values());
}

// ── NPPES Cross-Reference ───────────────────────────────

export interface NppesCrossRefResult {
  extractedName: string;
  matchedNpi: string | null;
  matchedName: string | null;
  matchConfidence: number;
  matchMethod: string; // 'exact_name' | 'fuzzy_name' | 'name_plus_phone' | 'not_found'
}

/**
 * Cross-reference extracted provider names against the providers (NPPES) table
 * using practice address/phone as additional matching signals.
 *
 * This function generates SQL queries to be run against Supabase.
 * Returns match candidates for each extracted provider.
 */
export function buildNppesCrossRefQueries(
  extracted: ExtractedProvider[],
  practicePhone: string | null,
  practiceCity: string | null,
  practiceState: string | null,
): { name: string; query: string; credential: string | null }[] {
  const queries: { name: string; query: string; credential: string | null }[] = [];

  for (const provider of extracted) {
    // Parse first and last name
    const nameParts = provider.name
      .replace(/^Dr\.?\s+/i, '')
      .trim()
      .split(/\s+/);

    if (nameParts.length < 2) continue;

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    // Build query: match by name + state, optionally phone/city
    const conditions: string[] = [
      `last_name=ilike.${encodeURIComponent(lastName)}`,
      `first_name=ilike.${encodeURIComponent(firstName)}%`,
    ];

    if (practiceState) {
      conditions.push(`state=eq.${practiceState}`);
    }

    // Query with all conditions
    const query = `providers?${conditions.join('&')}&select=npi,first_name,last_name,credential,taxonomy_desc,city,state,phone&limit=10`;

    queries.push({
      name: provider.name,
      query,
      credential: provider.credential,
    });
  }

  return queries;
}

/**
 * Score a potential NPPES match against the extracted provider info.
 */
export function scoreNppesMatch(
  extracted: ExtractedProvider,
  nppesRecord: {
    npi: string;
    first_name: string;
    last_name: string;
    credential?: string;
    taxonomy_desc?: string;
    city?: string;
    state?: string;
    phone?: string;
  },
  practicePhone: string | null,
  practiceCity: string | null,
): { score: number; method: string } {
  let score = 0;
  const methods: string[] = [];

  // Name match (required baseline)
  const extractedParts = extracted.name
    .replace(/^Dr\.?\s+/i, '')
    .trim()
    .split(/\s+/);
  const extractedFirst = extractedParts[0]?.toLowerCase();
  const extractedLast = extractedParts[extractedParts.length - 1]?.toLowerCase();

  const nppesFirst = nppesRecord.first_name?.toLowerCase();
  const nppesLast = nppesRecord.last_name?.toLowerCase();

  if (nppesLast === extractedLast) {
    score += 0.4;
    methods.push('last_name_exact');
  } else {
    return { score: 0, method: 'no_last_name_match' };
  }

  if (nppesFirst === extractedFirst) {
    score += 0.2;
    methods.push('first_name_exact');
  } else if (nppesFirst?.startsWith(extractedFirst?.substring(0, 3) || '')) {
    score += 0.1;
    methods.push('first_name_partial');
  }

  // Credential match
  if (extracted.credential && nppesRecord.credential) {
    const extCred = extracted.credential.toUpperCase().replace(/[.\s,]/g, '');
    const nppesCred = nppesRecord.credential.toUpperCase().replace(/[.\s,]/g, '');
    if (extCred.includes(nppesCred) || nppesCred.includes(extCred)) {
      score += 0.15;
      methods.push('credential_match');
    }
  }

  // Phone match (strong signal)
  if (practicePhone && nppesRecord.phone) {
    const normalizedPractice = practicePhone.replace(/\D/g, '').slice(-10);
    const normalizedNppes = nppesRecord.phone.replace(/\D/g, '').slice(-10);
    if (normalizedPractice === normalizedNppes) {
      score += 0.2;
      methods.push('phone_match');
    }
  }

  // City match
  if (practiceCity && nppesRecord.city) {
    if (practiceCity.toLowerCase() === nppesRecord.city.toLowerCase()) {
      score += 0.05;
      methods.push('city_match');
    }
  }

  return {
    score: Math.min(score, 1.0),
    method: methods.join('+'),
  };
}
