// checks/crawler.ts
// ═══ Site Snapshot Crawler ═══
// Fetches a healthcare website and extracts structured data:
// - Street address, city, state, zip
// - Phone number
// - Specialty/service labels
// - Provider names and count
// - Content hash for drift detection

import type { SiteSnapshot } from './types';
import * as crypto from 'crypto';

/**
 * Crawl a website and extract structured data for compliance checks.
 */
export async function crawlSite(url: string): Promise<SiteSnapshot | null> {
  try {
    // Normalize URL
    let fetchUrl = url;
    if (!fetchUrl.startsWith('http')) fetchUrl = 'https://' + fetchUrl;

    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'KairoLogic-Sentry/3.1 (Compliance Scanner)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      console.log(`[Crawler] HTTP ${res.status} for ${url}`);
      return null;
    }

    const html = await res.text();
    if (!html || html.length < 100) return null;

    // Generate content hash for drift detection
    const sourceHash = crypto.createHash('sha256').update(html).digest('hex').slice(0, 16);

    // Extract data
    const address = extractAddress(html);
    const phone = extractPhone(html);
    const specialties = extractSpecialties(html);
    const providers = extractProviders(html);

    return {
      url: fetchUrl,
      scrape_time: new Date().toISOString(),
      addr_line1: address.line1,
      addr_line2: address.line2,
      addr_city: address.city,
      addr_state: address.state,
      addr_zip: address.zip,
      phone,
      specialty_labels: specialties,
      provider_names: providers,
      provider_count: providers.length,
      source_hash: sourceHash,
    };
  } catch (err: any) {
    console.log(`[Crawler] Failed for ${url}: ${err.message}`);
    return null;
  }
}

// ── Address Extraction ──────────────────────────

function extractAddress(html: string): { line1: string; line2: string; city: string; state: string; zip: string } {
  const empty = { line1: '', line2: '', city: '', state: '', zip: '' };

  // 1. Try schema.org structured data
  const schemaAddr = extractSchemaAddress(html);
  if (schemaAddr.line1) return schemaAddr;

  // 2. Try common address patterns in text
  const text = stripHtml(html);

  // Pattern: "123 Main St, Suite 100, Austin, TX 78701"
  // or "123 Main St\nAustin, TX 78701"
  const addrRegex = /(\d{1,5}\s+[A-Za-z0-9\s.,#\-]+?)[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*,\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/g;
  const match = addrRegex.exec(text);

  if (match) {
    const streetParts = match[1].trim().split(/[,\n]+/).map(s => s.trim());
    return {
      line1: streetParts[0] || '',
      line2: streetParts[1] || '',
      city: match[2] || '',
      state: match[3] || '',
      zip: match[4]?.slice(0, 5) || '',
    };
  }

  // 3. Try just finding a Texas ZIP code pattern near a street number
  const txPattern = /(\d{1,5}\s+[A-Za-z0-9\s.,#\-]{5,40})\s*[\n,]\s*([A-Za-z\s]+),?\s*TX\s+(\d{5})/i;
  const txMatch = txPattern.exec(text);
  if (txMatch) {
    return {
      line1: txMatch[1].trim(),
      line2: '',
      city: txMatch[2].trim(),
      state: 'TX',
      zip: txMatch[3],
    };
  }

  return empty;
}

function extractSchemaAddress(html: string): { line1: string; line2: string; city: string; state: string; zip: string } {
  const empty = { line1: '', line2: '', city: '', state: '', zip: '' };

  try {
    // Look for JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const block of jsonLdMatch) {
        const jsonStr = block.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        try {
          const data = JSON.parse(jsonStr);
          const addr = data.address || data.location?.address;
          if (addr) {
            return {
              line1: addr.streetAddress || '',
              line2: '',
              city: addr.addressLocality || '',
              state: addr.addressRegion || '',
              zip: (addr.postalCode || '').slice(0, 5),
            };
          }
        } catch { /* not valid JSON, skip */ }
      }
    }

    // Look for microdata
    const streetMatch = html.match(/itemprop\s*=\s*["']streetAddress["'][^>]*>([^<]+)/i);
    const cityMatch = html.match(/itemprop\s*=\s*["']addressLocality["'][^>]*>([^<]+)/i);
    const stateMatch = html.match(/itemprop\s*=\s*["']addressRegion["'][^>]*>([^<]+)/i);
    const zipMatch = html.match(/itemprop\s*=\s*["']postalCode["'][^>]*>([^<]+)/i);

    if (streetMatch) {
      return {
        line1: streetMatch[1].trim(),
        line2: '',
        city: cityMatch?.[1]?.trim() || '',
        state: stateMatch?.[1]?.trim() || '',
        zip: (zipMatch?.[1]?.trim() || '').slice(0, 5),
      };
    }
  } catch { /* parsing failed */ }

  return empty;
}

// ── Phone Extraction ──────────────────────────

function extractPhone(html: string): string {
  // 1. Try tel: links first (most reliable)
  const telMatch = html.match(/href\s*=\s*["']tel:([^"']+)["']/i);
  if (telMatch) {
    return cleanPhone(telMatch[1]);
  }

  // 2. Try schema.org telephone
  const schemaTel = html.match(/itemprop\s*=\s*["']telephone["'][^>]*>([^<]+)/i);
  if (schemaTel) {
    return cleanPhone(schemaTel[1]);
  }

  // 3. Try JSON-LD telephone
  const jsonLdTel = html.match(/"telephone"\s*:\s*"([^"]+)"/i);
  if (jsonLdTel) {
    return cleanPhone(jsonLdTel[1]);
  }

  // 4. Try common phone patterns in text
  const text = stripHtml(html);
  const phoneRegex = /(?:phone|tel|call|office|main)\s*[:.]?\s*\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/i;
  const phoneMatch = phoneRegex.exec(text);
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/\D/g, '').slice(-10);
    if (digits.length === 10) return formatPhone(digits);
  }

  // 5. Just find any phone number pattern
  const anyPhone = /\(?(\d{3})\)?[\s.\-](\d{3})[\s.\-](\d{4})/;
  const anyMatch = anyPhone.exec(text);
  if (anyMatch) {
    return `(${anyMatch[1]}) ${anyMatch[2]}-${anyMatch[3]}`;
  }

  return '';
}

function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length === 10) return formatPhone(d);
  return raw.trim();
}

function formatPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ── Specialty Extraction ──────────────────────

const HEALTHCARE_SPECIALTIES = [
  'family medicine', 'family practice', 'internal medicine', 'pediatrics',
  'obstetrics', 'gynecology', 'ob/gyn', 'obgyn', 'psychiatry', 'psychology',
  'dermatology', 'cardiology', 'orthopedics', 'neurology', 'oncology',
  'gastroenterology', 'endocrinology', 'pulmonology', 'nephrology',
  'urology', 'ophthalmology', 'optometry', 'dentistry', 'dental',
  'chiropractic', 'physical therapy', 'occupational therapy',
  'mental health', 'behavioral health', 'counseling', 'therapy',
  'primary care', 'urgent care', 'emergency medicine',
  'nurse practitioner', 'physician assistant', 'wellness',
  'pain management', 'sports medicine', 'allergy', 'immunology',
  'rheumatology', 'hematology', 'infectious disease',
  'plastic surgery', 'general surgery', 'vascular surgery',
  'podiatry', 'audiology', 'speech therapy',
  'acupuncture', 'naturopathic', 'functional medicine',
];

function extractSpecialties(html: string): string[] {
  const text = stripHtml(html).toLowerCase();
  const found = new Set<string>();

  for (const specialty of HEALTHCARE_SPECIALTIES) {
    if (text.includes(specialty)) {
      found.add(specialty);
    }
  }

  // Also check meta description and title
  const titleMatch = html.match(/<title[^>]*>([^<]+)/i);
  const metaMatch = html.match(/name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)/i);
  const metaText = ((titleMatch?.[1] || '') + ' ' + (metaMatch?.[1] || '')).toLowerCase();

  for (const specialty of HEALTHCARE_SPECIALTIES) {
    if (metaText.includes(specialty)) {
      found.add(specialty);
    }
  }

  return [...found];
}

// ── Provider Name Extraction ──────────────────

function extractProviders(html: string): string[] {
  const names = new Set<string>();

  // 1. Schema.org physician/person names
  const schemaNames = html.matchAll(/itemprop\s*=\s*["']name["'][^>]*>([^<]+)/gi);
  for (const m of schemaNames) {
    const name = m[1].trim();
    if (looksLikeProviderName(name)) names.add(name);
  }

  // 2. JSON-LD physician/MedicalBusiness
  const jsonLdBlocks = html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1].trim());
      extractNamesFromJsonLd(data, names);
    } catch { /* skip */ }
  }

  // 3. Common HTML patterns for provider listings
  // "Dr. John Smith, MD" / "Jane Doe, NP" / "Bob Jones, PA-C"
  const text = stripHtml(html);
  const credentialPattern = /(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{2,})(?:\s*,\s*(?:MD|DO|NP|PA|PA-C|APRN|ARNP|DNP|PhD|DPM|DC|DDS|DMD|OD|RN|LPC|LCSW|LMFT))/g;
  const credMatches = text.matchAll(credentialPattern);
  for (const m of credMatches) {
    const name = m[1].trim();
    if (name.length >= 5 && name.length <= 40) names.add(name);
  }

  return [...names].slice(0, 50); // Cap at 50 providers
}

function looksLikeProviderName(text: string): boolean {
  if (!text || text.length < 4 || text.length > 50) return false;
  // Must have at least 2 words, first letter capitalized
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return false;
  if (!/^[A-Z]/.test(words[0])) return false;
  // Exclude common non-name strings
  const exclude = ['read more', 'learn more', 'click here', 'view all', 'our team', 'our providers', 'meet our', 'contact us'];
  if (exclude.some(e => text.toLowerCase().includes(e))) return false;
  return true;
}

function extractNamesFromJsonLd(data: any, names: Set<string>) {
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) extractNamesFromJsonLd(item, names);
    return;
  }
  if (typeof data === 'object') {
    const type = data['@type'];
    if (type === 'Physician' || type === 'Person' || type === 'MedicalBusiness') {
      const name = data.name || `${data.givenName || ''} ${data.familyName || ''}`.trim();
      if (name && looksLikeProviderName(name)) names.add(name);
    }
    // Check nested
    if (data.employee) extractNamesFromJsonLd(data.employee, names);
    if (data.member) extractNamesFromJsonLd(data.member, names);
    if (data.physicians) extractNamesFromJsonLd(data.physicians, names);
  }
}

// ── Helpers ──────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
