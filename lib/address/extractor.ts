// lib/address/extractor.ts
// ═══ KairoLogic Address Extraction Engine v1.0 ═══
// Task 1.5: Parse addresses from practice website HTML using multiple
// methods in priority order. Each method returns a confidence score.
// Two-method agreement elevates confidence.
//
// Extraction priority (from MVP plan):
//   1. schema.org LocalBusiness / MedicalOrganization JSON-LD
//   2. Google Maps embed URL parameters
//   3. Contact page structured parsing (headings + proximity)
//   4. Footer address block (regex + proximity scoring)
//
// This module is reusable (imported by scan engine, delta engine, CLI tools).

// ── Types ────────────────────────────────────────────────

export interface ExtractedAddress {
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  zip_code: string;
  full_address: string;
}

export interface AddressExtractionResult {
  address: ExtractedAddress | null;
  method: AddressMethod;
  confidence: number; // 0.00 to 1.00
  raw_source: string; // the raw text/data that was parsed
  page_url: string; // which page it was found on
}

export type AddressMethod =
  | 'schema_org'
  | 'google_maps_embed'
  | 'contact_page'
  | 'footer'
  | 'manual';

export interface PhoneExtractionResult {
  phone: string; // normalized digits
  formatted: string; // display format
  source: string; // where found
  confidence: number;
}

export interface ExtractionSummary {
  best_address: AddressExtractionResult | null;
  all_addresses: AddressExtractionResult[];
  phone: PhoneExtractionResult | null;
  specialty: string | null;
  provider_names: string[];
  schema_org_data: any | null;
  corroborated: boolean; // two+ methods agree
  corroboration_count: number;
  extraction_methods_tried: AddressMethod[];
  page_urls_scanned: string[];
}

// ── US State Mapping ─────────────────────────────────────

const US_STATES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
};

const STATE_ABBREVS = new Set(Object.values(US_STATES));

function normalizeState(input: string): string | null {
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  if (STATE_ABBREVS.has(upper)) return upper;
  const mapped = US_STATES[trimmed.toLowerCase()];
  return mapped || null;
}

// ── Method 1: schema.org JSON-LD ─────────────────────────

/**
 * Extract address from schema.org structured data (JSON-LD).
 * Looks for LocalBusiness, MedicalOrganization, MedicalClinic,
 * Physician, Dentist, and other healthcare-relevant types.
 * Highest reliability — this is structured data the site owner explicitly set.
 */
export function extractFromSchemaOrg(
  html: string,
  pageUrl: string,
): AddressExtractionResult | null {
  const jsonLdBlocks = extractJsonLdBlocks(html);

  for (const block of jsonLdBlocks) {
    const address = findAddressInSchemaOrg(block);
    if (address) {
      return {
        address,
        method: 'schema_org',
        confidence: 0.95,
        raw_source: JSON.stringify(block).slice(0, 500),
        page_url: pageUrl,
      };
    }
  }

  return null;
}

function extractJsonLdBlocks(html: string): any[] {
  const blocks: any[] = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      // Handle @graph arrays
      if (data['@graph'] && Array.isArray(data['@graph'])) {
        blocks.push(...data['@graph']);
      } else if (Array.isArray(data)) {
        blocks.push(...data);
      } else {
        blocks.push(data);
      }
    } catch {
      // malformed JSON-LD, skip
    }
  }

  return blocks;
}

const HEALTHCARE_SCHEMA_TYPES = new Set([
  'LocalBusiness',
  'MedicalOrganization',
  'MedicalClinic',
  'Hospital',
  'Physician',
  'Dentist',
  'DiagnosticLab',
  'MedicalBusiness',
  'HealthClub',
  'Pharmacy',
  'Optician',
  'Podiatric',
  'Organization',
  'Place',
  'PostalAddress',
]);

function findAddressInSchemaOrg(obj: any): ExtractedAddress | null {
  if (!obj || typeof obj !== 'object') return null;

  // Check if this object itself has an address
  const type = obj['@type'];
  const types = Array.isArray(type) ? type : [type];
  const isRelevantType = types.some((t: string) => HEALTHCARE_SCHEMA_TYPES.has(t));

  if (isRelevantType || obj.address) {
    const addr = obj.address;
    if (addr) {
      const resolved =
        typeof addr === 'string' ? parseAddressString(addr) : parseSchemaAddress(addr);
      if (resolved) return resolved;
    }
  }

  // Recurse into nested objects
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const found = findAddressInSchemaOrg(obj[key]);
      if (found) return found;
    }
  }

  return null;
}

function parseSchemaAddress(addr: any): ExtractedAddress | null {
  if (!addr || typeof addr !== 'object') return null;

  const street = addr.streetAddress || addr.street_address || '';
  const city = addr.addressLocality || addr.address_locality || '';
  const state = addr.addressRegion || addr.address_region || '';
  const zip = addr.postalCode || addr.postal_code || '';

  const normalizedState = normalizeState(state);
  if (!street || !city || !normalizedState) return null;

  // Split street into line 1 and line 2 (suite/unit)
  const { line1, line2 } = splitAddressLines(street);

  return {
    address_line_1: line1,
    address_line_2: line2,
    city: city.trim(),
    state: normalizedState,
    zip_code: cleanZip(zip),
    full_address: buildFullAddress(line1, line2, city.trim(), normalizedState, cleanZip(zip)),
  };
}

// ── Method 2: Google Maps Embed ──────────────────────────

/**
 * Extract address from Google Maps iframe embed URLs.
 * Practices often embed a map on their contact/location page.
 * The embed URL contains the address as a query parameter.
 */
export function extractFromGoogleMapsEmbed(
  html: string,
  pageUrl: string,
): AddressExtractionResult | null {
  // Pattern 1: Google Maps embed iframe with q= parameter
  const iframeRegex = /<iframe[^>]*src\s*=\s*["']([^"']*google\.com\/maps[^"']*)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = iframeRegex.exec(html)) !== null) {
    const src = match[1];

    // Extract query parameter (the address)
    const qMatch = src.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const addressStr = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
      const parsed = parseAddressString(addressStr);
      if (parsed) {
        return {
          address: parsed,
          method: 'google_maps_embed',
          confidence: 0.9,
          raw_source: addressStr,
          page_url: pageUrl,
        };
      }
    }

    // Pattern 2: pb= parameter (newer embed format, contains lat/lng + place name)
    const pbMatch = src.match(/[?&]pb=([^&]+)/);
    if (pbMatch) {
      // pb parameter is complex, extract place name if present
      const pbDecoded = decodeURIComponent(pbMatch[1]);
      const placeMatch = pbDecoded.match(/!2s([^!]+)/);
      if (placeMatch) {
        const placeName = placeMatch[1].replace(/\+/g, ' ');
        const parsed = parseAddressString(placeName);
        if (parsed) {
          return {
            address: parsed,
            method: 'google_maps_embed',
            confidence: 0.8,
            raw_source: placeName,
            page_url: pageUrl,
          };
        }
      }
    }
  }

  // Pattern 3: Google Maps link (not iframe)
  const linkRegex = /href\s*=\s*["'](https?:\/\/(www\.)?google\.com\/maps[^"']*)["']/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const qMatch = href.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const addressStr = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
      const parsed = parseAddressString(addressStr);
      if (parsed) {
        return {
          address: parsed,
          method: 'google_maps_embed',
          confidence: 0.85,
          raw_source: addressStr,
          page_url: pageUrl,
        };
      }
    }
  }

  return null;
}

// ── Method 3: Contact Page Structured Parsing ────────────

/**
 * Look for address patterns near "Contact", "Location", "Office",
 * "Address", "Visit Us" headings. Uses proximity scoring.
 */
export function extractFromContactPage(
  html: string,
  text: string,
  pageUrl: string,
): AddressExtractionResult | null {
  // Find sections near address-related headings
  const headingRegex = /<(h[1-6]|div|p|span|strong|b)[^>]*>([\s\S]*?)<\/\1>/gi;
  const addressHeadingKeywords =
    /\b(address|location|office|visit\s+us|find\s+us|our\s+location|contact\s+(us|info)|directions?|where\s+we\s+are|get\s+in\s+touch)\b/i;

  let match: RegExpExecArray | null;
  const addressZones: Array<{ start: number; end: number }> = [];

  while ((match = headingRegex.exec(html)) !== null) {
    const headingText = match[2].replace(/<[^>]+>/g, '').trim();
    if (addressHeadingKeywords.test(headingText)) {
      // Define a zone: 2000 chars after this heading
      addressZones.push({
        start: match.index + match[0].length,
        end: match.index + match[0].length + 2000,
      });
    }
  }

  // Search for address patterns within zones first, then full text
  for (const zone of addressZones) {
    const zoneHtml = html.slice(zone.start, Math.min(zone.end, html.length));
    const zoneText = zoneHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const address = findAddressInText(zoneText);
    if (address) {
      return {
        address,
        method: 'contact_page',
        confidence: 0.8,
        raw_source: zoneText.slice(0, 300),
        page_url: pageUrl,
      };
    }
  }

  // Fallback: search full page text (lower confidence)
  const address = findAddressInText(text);
  if (address) {
    return {
      address,
      method: 'contact_page',
      confidence: 0.6,
      raw_source: text.slice(0, 300),
      page_url: pageUrl,
    };
  }

  return null;
}

// ── Method 4: Footer Address Block ───────────────────────

/**
 * Extract address from the page footer. Most practice websites
 * include their address in the footer across all pages.
 */
export function extractFromFooter(html: string, pageUrl: string): AddressExtractionResult | null {
  // Find footer element
  const footerRegex = /<footer[^>]*>([\s\S]*?)<\/footer>/gi;
  let footerHtml = '';

  let match: RegExpExecArray | null;
  while ((match = footerRegex.exec(html)) !== null) {
    footerHtml += match[1] + ' ';
  }

  // Fallback: look at last 20% of HTML if no <footer> tag
  if (!footerHtml) {
    const cutoff = Math.floor(html.length * 0.8);
    footerHtml = html.slice(cutoff);
  }

  const footerText = footerHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const address = findAddressInText(footerText);
  if (address) {
    return {
      address,
      method: 'footer',
      confidence: 0.7,
      raw_source: footerText.slice(0, 300),
      page_url: pageUrl,
    };
  }

  return null;
}

// ── Phone Extraction ─────────────────────────────────────

/**
 * Extract phone numbers from HTML. Prioritizes:
 * 1. schema.org telephone field
 * 2. tel: links
 * 3. Phone patterns near "phone", "call", "tel" text
 */
export function extractPhone(html: string, text: string): PhoneExtractionResult | null {
  // Method 1: schema.org
  const jsonLdBlocks = extractJsonLdBlocks(html);
  for (const block of jsonLdBlocks) {
    const phone = findPhoneInSchemaOrg(block);
    if (phone) {
      return {
        phone: phone.digits,
        formatted: phone.formatted,
        source: 'schema_org',
        confidence: 0.95,
      };
    }
  }

  // Method 2: tel: links
  const telRegex = /<a[^>]*href\s*=\s*["']tel:([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = telRegex.exec(html)) !== null) {
    const digits = match[1].replace(/\D/g, '');
    if (digits.length >= 10) {
      return { phone: digits, formatted: formatPhone(digits), source: 'tel_link', confidence: 0.9 };
    }
  }

  // Method 3: Phone patterns in text
  const phoneRegex = /(?:phone|tel|call|fax)?[:\s]*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/gi;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) {
    for (const pm of phoneMatches) {
      const digits = pm.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 11) {
        const clean = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
        return {
          phone: clean,
          formatted: formatPhone(clean),
          source: 'text_pattern',
          confidence: 0.7,
        };
      }
    }
  }

  return null;
}

function findPhoneInSchemaOrg(obj: any): { digits: string; formatted: string } | null {
  if (!obj || typeof obj !== 'object') return null;
  const tel = obj.telephone || obj.phone;
  if (tel && typeof tel === 'string') {
    const digits = tel.replace(/\D/g, '');
    if (digits.length >= 10) {
      const clean = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
      return { digits: clean, formatted: formatPhone(clean) };
    }
  }
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const found = findPhoneInSchemaOrg(obj[key]);
      if (found) return found;
    }
  }
  return null;
}

function formatPhone(digits: string): string {
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

// ── Address Pattern Matching ─────────────────────────────

/**
 * US street address regex. Matches patterns like:
 *   "1200 W 38th St, Suite 400, Austin, TX 78705"
 *   "4821 Westover Dr Suite 200 Austin TX 78731"
 *   "123 Main Street, Ste 100, Dallas, Texas 78201"
 *
 * Captures: full match, street, city, state, zip
 */
const US_ADDRESS_REGEX = new RegExp(
  // Street number + street name (required)
  '(\\d{1,6}\\s+' +
    // Street name (1-6 words, including directionals and suffixes)
    '(?:[NSEW]\\.?\\s+)?' +
    '[A-Za-z0-9\\.]+(?:\\s+[A-Za-z0-9\\.]+){0,5}' +
    // Optional suite/unit/bldg
    '(?:[,\\s]+(?:(?:Ste|Suite|Unit|Apt|Bldg|Building|Floor|Fl|Room|Rm)\\.?\\s*#?\\s*[A-Za-z0-9-]+))?' +
    ')' +
    // Separator
    '[,\\s]+' +
    // City (1-3 words)
    '([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,2})' +
    // Separator
    '[,\\s]+' +
    // State (2-letter code or full name)
    '(' +
    Object.values(US_STATES).join('|') +
    '|' +
    Object.keys(US_STATES)
      .map((s) => s.replace(/\b\w/g, (l) => l.toUpperCase()))
      .join('|') +
    ')' +
    // Zip (required 5 digits, optional +4)
    '[,\\s]+' +
    '(\\d{5}(?:-\\d{4})?)',
  'gi',
);

function findAddressInText(text: string): ExtractedAddress | null {
  // Reset regex lastIndex
  US_ADDRESS_REGEX.lastIndex = 0;

  const match = US_ADDRESS_REGEX.exec(text);
  if (!match) return null;

  const street = match[1].trim();
  const city = match[2].trim();
  const stateRaw = match[3].trim();
  const zip = match[4].trim();

  const state = normalizeState(stateRaw);
  if (!state) return null;

  const { line1, line2 } = splitAddressLines(street);

  return {
    address_line_1: line1,
    address_line_2: line2,
    city,
    state,
    zip_code: cleanZip(zip),
    full_address: buildFullAddress(line1, line2, city, state, cleanZip(zip)),
  };
}

/**
 * Parse a freeform address string (from Google Maps embed or plain text).
 * Handles various formats:
 *   "1200 W 38th St, Suite 400, Austin, TX 78705"
 *   "1200 W 38th St Suite 400 Austin TX 78705"
 *   "1200 W 38th St, Austin, TX"
 */
function parseAddressString(str: string): ExtractedAddress | null {
  return findAddressInText(str);
}

// ── Helpers ──────────────────────────────────────────────

const SUITE_REGEX =
  /[,\s]+(?:Ste|Suite|Unit|Apt|Bldg|Building|Floor|Fl|Room|Rm)\.?\s*#?\s*[A-Za-z0-9-]+$/i;

function splitAddressLines(street: string): { line1: string; line2: string | null } {
  const suiteMatch = street.match(SUITE_REGEX);
  if (suiteMatch) {
    const line1 = street.slice(0, suiteMatch.index!).trim();
    const line2 = suiteMatch[0].replace(/^[,\s]+/, '').trim();
    return { line1, line2 };
  }
  return { line1: street, line2: null };
}

function cleanZip(zip: string): string {
  const trimmed = zip.trim();
  // Keep 5 or 5+4 format
  const match = trimmed.match(/^(\d{5})(-\d{4})?/);
  return match ? match[0] : trimmed;
}

function buildFullAddress(
  line1: string,
  line2: string | null,
  city: string,
  state: string,
  zip: string,
): string {
  const parts = [line1];
  if (line2) parts.push(line2);
  parts.push(`${city}, ${state} ${zip}`);
  return parts.join(', ');
}

// ── Provider Name Extraction ─────────────────────────────

/**
 * Extract provider names from HTML. Looks for schema.org Person
 * objects with medical credentials, and common bio page patterns.
 */
export function extractProviderNames(html: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  // Method 1: schema.org Person/Physician
  const jsonLdBlocks = extractJsonLdBlocks(html);
  for (const block of jsonLdBlocks) {
    findNamesInSchemaOrg(block, names, seen);
  }

  // Method 2: Common patterns like "Dr. First Last, MD"
  const drRegex =
    /\b(?:Dr\.?\s+)?([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,?\s*(?:MD|DO|NP|PA|DPM|DDS|DMD|OD|PhD|APRN|FNP|DNP)\b/g;
  let match: RegExpExecArray | null;
  while ((match = drRegex.exec(html.replace(/<[^>]+>/g, ' '))) !== null) {
    const name = `${match[1]} ${match[2]}`.trim();
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      names.push(name);
    }
  }

  return names;
}

function findNamesInSchemaOrg(obj: any, names: string[], seen: Set<string>): void {
  if (!obj || typeof obj !== 'object') return;
  const type = obj['@type'];
  const types = Array.isArray(type) ? type : [type];
  const isPersonType = types.some((t: string) => ['Person', 'Physician', 'Dentist'].includes(t));

  if (isPersonType && obj.name) {
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      names.push(name);
    }
  }

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      findNamesInSchemaOrg(obj[key], names, seen);
    }
  }
}

// ── Specialty Extraction ─────────────────────────────────

/**
 * Known medical/dental/behavioral specialties for visible-text matching.
 * Each entry: [regex pattern, canonical specialty name].
 */
const SPECIALTY_PATTERNS: [RegExp, string][] = [
  // Dental
  [/\bgeneral\s+dentistry\b/i, 'General Dentistry'],
  [/\bfamily\s+dentistry\b/i, 'Family Dentistry'],
  [/\bcosmetic\s+dentistry\b/i, 'Cosmetic Dentistry'],
  [/\bpediatric\s+dentistry\b/i, 'Pediatric Dentistry'],
  [/\borthodontics?\b/i, 'Orthodontics'],
  [/\bperiodontics?\b/i, 'Periodontics'],
  [/\bendodontics?\b/i, 'Endodontics'],
  [/\boral\s+surgery\b/i, 'Oral Surgery'],
  [/\bprosthodontics?\b/i, 'Prosthodontics'],
  [/\bimplant\s+dentistry\b/i, 'Implant Dentistry'],
  [/\brestorative\s+dentistry\b/i, 'Restorative Dentistry'],
  // Primary care
  [/\bfamily\s+medicine\b/i, 'Family Medicine'],
  [/\bfamily\s+practice\b/i, 'Family Practice'],
  [/\binternal\s+medicine\b/i, 'Internal Medicine'],
  [/\bgeneral\s+practice\b/i, 'General Practice'],
  [/\bprimary\s+care\b/i, 'Primary Care'],
  // Pediatrics
  [/\bpediatrics?\b/i, 'Pediatrics'],
  [/\bpediatric\s+medicine\b/i, 'Pediatric Medicine'],
  // Women's health / OB-GYN
  [/\bob(?:\s*[-\/]\s*)?gyn\b/i, 'OB/GYN'],
  [/\bobstetrics?\s+(?:and|&)\s+gynecology\b/i, 'OB/GYN'],
  [/\bgynecology\b/i, 'Gynecology'],
  [/\bwomen'?s\s+health\b/i, "Women's Health"],
  [/\bmaternal\s+(?:fetal|health)\b/i, 'Maternal Health'],
  // Behavioral / Mental health
  [/\bbehavioral\s+health\b/i, 'Behavioral Health'],
  [/\bpsychiatry\b/i, 'Psychiatry'],
  [/\bpsychology\b/i, 'Psychology'],
  [/\bmental\s+health\b/i, 'Mental Health'],
  [/\bcounseling\b/i, 'Counseling'],
  // Medical specialties
  [/\bcardiology\b/i, 'Cardiology'],
  [/\bdermatology\b/i, 'Dermatology'],
  [/\bendocrinology\b/i, 'Endocrinology'],
  [/\bgastroenterology\b/i, 'Gastroenterology'],
  [/\bnephrology\b/i, 'Nephrology'],
  [/\bneurology\b/i, 'Neurology'],
  [/\boncology\b/i, 'Oncology'],
  [/\bophthalmology\b/i, 'Ophthalmology'],
  [/\borthopedics?\b/i, 'Orthopedics'],
  [/\botolaryngology\b/i, 'Otolaryngology'],
  [/\bent\b(?:\s+(?:specialist|doctor|physician|clinic))/i, 'Otolaryngology'],
  [/\bpulmonology\b/i, 'Pulmonology'],
  [/\brheumatology\b/i, 'Rheumatology'],
  [/\burology\b/i, 'Urology'],
  [/\ballergy\s+(?:and|&)\s+immunology\b/i, 'Allergy & Immunology'],
  [/\bphysical\s+(?:medicine|therapy)\b/i, 'Physical Medicine'],
  [/\brehabilitation\b/i, 'Rehabilitation'],
  [/\bsports\s+medicine\b/i, 'Sports Medicine'],
  [/\bpain\s+management\b/i, 'Pain Management'],
  [/\bgeriatrics?\b/i, 'Geriatrics'],
  [/\binfectious\s+disease/i, 'Infectious Disease'],
  [/\bhematology\b/i, 'Hematology'],
  // Surgical
  [/\bgeneral\s+surgery\b/i, 'General Surgery'],
  [/\bplastic\s+surgery\b/i, 'Plastic Surgery'],
  [/\bvascular\s+surgery\b/i, 'Vascular Surgery'],
  // Chiropractic / Alternative
  [/\bchiropractic\b/i, 'Chiropractic'],
  [/\bacupuncture\b/i, 'Acupuncture'],
  // Optometry / Vision
  [/\boptometry\b/i, 'Optometry'],
  [/\bvision\s+care\b/i, 'Vision Care'],
  // Urgent / Emergency
  [/\burgent\s+care\b/i, 'Urgent Care'],
  [/\bemergency\s+medicine\b/i, 'Emergency Medicine'],
  // Pharmacy
  [/\bpharmacy\b/i, 'Pharmacy'],
  [/\bcompounding\s+pharmacy\b/i, 'Compounding Pharmacy'],
  // Substance abuse / Recovery
  [/\bsubstance\s+(?:abuse|use)\s+(?:treatment|disorder|program)/i, 'Substance Abuse Treatment'],
  [/\baddiction\s+(?:treatment|medicine|recovery)/i, 'Addiction Medicine'],
  [/\brecovery\s+(?:support|services|program)/i, 'Recovery Services'],
  // Podiatry
  [/\bpodiatry\b/i, 'Podiatry'],
  [/\bpodiatric\s+medicine\b/i, 'Podiatric Medicine'],
  // Audiology / Speech
  [/\baudiology\b/i, 'Audiology'],
  [/\bspeech\s+(?:therapy|pathology|language)/i, 'Speech Therapy'],
  // Occupational therapy
  [/\boccupational\s+therapy\b/i, 'Occupational Therapy'],
  // Wound care
  [/\bwound\s+care\b/i, 'Wound Care'],
  // Sleep medicine
  [/\bsleep\s+medicine\b/i, 'Sleep Medicine'],
  // Hospice / Palliative
  [/\bhospice\b/i, 'Hospice'],
  [/\bpalliative\s+care\b/i, 'Palliative Care'],
  // Radiology
  [/\bradiology\b/i, 'Radiology'],
  [/\bdiagnostic\s+imaging\b/i, 'Diagnostic Imaging'],
  // Anesthesiology
  [/\banesthesiology\b/i, 'Anesthesiology'],
  // Pathology
  [/\bpathology\b/i, 'Pathology'],
];

/**
 * Extract medical specialties from structured data, meta tags, or visible text.
 * Returns the single best specialty (structured > meta > text) for backward compat.
 */
export function extractSpecialty(html: string): string | null {
  // Method 1: schema.org medicalSpecialty (highest confidence)
  const jsonLdBlocks = extractJsonLdBlocks(html);
  for (const block of jsonLdBlocks) {
    const specialty = findSpecialtyInSchemaOrg(block);
    if (specialty) return specialty;
  }

  // Method 2: meta tags
  const metaRegex =
    /<meta[^>]*(?:name|property)\s*=\s*["'](?:specialty|medical.specialty|og:specialty)["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const match = metaRegex.exec(html);
  if (match) return match[1].trim();

  // Method 3: visible text pattern matching
  const allSpecialties = extractSpecialtiesFromText(html);
  if (allSpecialties.length > 0) return allSpecialties[0];

  return null;
}

/**
 * Extract ALL specialties found in visible page text.
 * Returns deduplicated array of canonical specialty names.
 */
export function extractSpecialtiesFromText(html: string): string[] {
  // Strip tags to get visible text
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  const found = new Set<string>();
  for (const [pattern, canonical] of SPECIALTY_PATTERNS) {
    if (pattern.test(text)) {
      found.add(canonical);
    }
  }
  return [...found];
}

function findSpecialtyInSchemaOrg(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.medicalSpecialty) {
    const spec = obj.medicalSpecialty;
    return typeof spec === 'string' ? spec : spec.name || spec['@id'] || null;
  }
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const found = findSpecialtyInSchemaOrg(obj[key]);
      if (found) return found;
    }
  }
  return null;
}

// ── Corroboration Logic ──────────────────────────────────

/**
 * Compare two extracted addresses for agreement.
 * Returns true if street, city, and state match (zip optional).
 */
export function addressesMatch(a: ExtractedAddress, b: ExtractedAddress): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    normalize(a.address_line_1) === normalize(b.address_line_1) &&
    normalize(a.city) === normalize(b.city) &&
    a.state === b.state
  );
}

/**
 * Pick the best address from multiple extractions.
 * Prioritizes by method confidence, then boosts if corroborated.
 */
export function selectBestAddress(results: AddressExtractionResult[]): {
  best: AddressExtractionResult | null;
  corroborated: boolean;
  corroboration_count: number;
} {
  if (results.length === 0) {
    return { best: null, corroborated: false, corroboration_count: 0 };
  }

  if (results.length === 1) {
    return { best: results[0], corroborated: false, corroboration_count: 1 };
  }

  // Sort by confidence descending
  const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];

  // Check corroboration: how many other methods agree with the best?
  let corroborationCount = 1;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i].address;
    const b = best.address;
    if (a && b && addressesMatch(a, b)) {
      corroborationCount++;
    }
  }

  // Boost confidence if corroborated
  if (corroborationCount >= 2 && best.confidence < 0.98) {
    best.confidence = Math.min(0.98, best.confidence + 0.1);
  }

  return {
    best,
    corroborated: corroborationCount >= 2,
    corroboration_count: corroborationCount,
  };
}
