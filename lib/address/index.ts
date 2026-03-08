// lib/address/index.ts
// ═══ Address Extraction Engine — Orchestrator ═══
// Task 1.5: Coordinates page discovery + multi-method address extraction.
//
// This is the main entry point. Import and call extractAddressFromSite()
// from the scan engine, delta engine, or CLI tools.
//
// Pipeline:
//   1. Take main page HTML (already crawled by crawler.ts)
//   2. Discover sub-pages (contact, locations, about)
//   3. Run all four extraction methods against each page
//   4. Select best result with corroboration logic
//   5. Return ExtractionSummary with confidence scores

import { discoverAndCrawlAddressPages, discoverAddressPages } from './page-discoverer';
import {
  extractFromSchemaOrg,
  extractFromGoogleMapsEmbed,
  extractFromContactPage,
  extractFromFooter,
  extractPhone,
  extractProviderNames,
  extractSpecialty,
  selectBestAddress,
  type AddressExtractionResult,
  type ExtractionSummary,
  type AddressMethod,
} from './extractor';

export type { ExtractedAddress, AddressExtractionResult, ExtractionSummary, PhoneExtractionResult, AddressMethod } from './extractor';
export { addressesMatch, selectBestAddress } from './extractor';
export { discoverAddressPages } from './page-discoverer';

/**
 * Run the full address extraction pipeline against a practice website.
 *
 * @param mainUrl - The practice website URL
 * @param mainHtml - Already-crawled HTML of the main page
 * @param mainText - Stripped text of the main page (from crawler)
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * import { crawlPage } from '@/lib/crawler';
 * import { extractAddressFromSite } from '@/lib/address';
 *
 * const crawl = await crawlPage('https://www.austinregionalclinic.com');
 * const extraction = await extractAddressFromSite(
 *   'https://www.austinregionalclinic.com',
 *   crawl.html,
 *   crawl.text,
 * );
 *
 * if (extraction.best_address) {
 *   console.log(extraction.best_address.address);
 *   console.log(`Confidence: ${extraction.best_address.confidence}`);
 *   console.log(`Corroborated: ${extraction.corroborated}`);
 * }
 * ```
 */
export async function extractAddressFromSite(
  mainUrl: string,
  mainHtml: string,
  mainText: string,
  options: {
    /** Maximum sub-pages to crawl for address data (default 3) */
    maxSubPages?: number;
    /** Skip sub-page crawling (only analyze main page) */
    mainPageOnly?: boolean;
    /** Skip specific extraction methods */
    skipMethods?: AddressMethod[];
  } = {},
): Promise<ExtractionSummary> {
  const {
    maxSubPages = 3,
    mainPageOnly = false,
    skipMethods = [],
  } = options;

  const allAddresses: AddressExtractionResult[] = [];
  const methodsTried: AddressMethod[] = [];
  const pagesScanned: string[] = [mainUrl];
  let schemaOrgData: any = null;

  // ── Step 1: Extract from main page ────────────────────

  // Method 1: schema.org JSON-LD (highest confidence)
  if (!skipMethods.includes('schema_org')) {
    methodsTried.push('schema_org');
    const schemaResult = extractFromSchemaOrg(mainHtml, mainUrl);
    if (schemaResult) {
      allAddresses.push(schemaResult);
      // Save raw schema.org for metadata
      try {
        const blocks = extractJsonLdBlocksFromHtml(mainHtml);
        schemaOrgData = blocks.length > 0 ? blocks[0] : null;
      } catch {}
    }
  }

  // Method 2: Google Maps embed
  if (!skipMethods.includes('google_maps_embed')) {
    methodsTried.push('google_maps_embed');
    const mapsResult = extractFromGoogleMapsEmbed(mainHtml, mainUrl);
    if (mapsResult) allAddresses.push(mapsResult);
  }

  // Method 3: Contact page structured parsing
  if (!skipMethods.includes('contact_page')) {
    methodsTried.push('contact_page');
    const contactResult = extractFromContactPage(mainHtml, mainText, mainUrl);
    if (contactResult) allAddresses.push(contactResult);
  }

  // Method 4: Footer
  if (!skipMethods.includes('footer')) {
    methodsTried.push('footer');
    const footerResult = extractFromFooter(mainHtml, mainUrl);
    if (footerResult) allAddresses.push(footerResult);
  }

  // ── Step 2: Discover and crawl sub-pages ──────────────

  if (!mainPageOnly) {
    try {
      const subPages = await discoverAndCrawlAddressPages(mainUrl, mainHtml, maxSubPages);

      for (const page of subPages) {
        if (!page.crawlResult?.success) continue;
        pagesScanned.push(page.url);

        const subHtml = page.crawlResult.html;
        const subText = page.crawlResult.text;

        // Run all methods on sub-page
        if (!skipMethods.includes('schema_org')) {
          const result = extractFromSchemaOrg(subHtml, page.url);
          if (result) {
            allAddresses.push(result);
            if (!schemaOrgData) {
              try {
                const blocks = extractJsonLdBlocksFromHtml(subHtml);
                schemaOrgData = blocks.length > 0 ? blocks[0] : null;
              } catch {}
            }
          }
        }

        if (!skipMethods.includes('google_maps_embed')) {
          const result = extractFromGoogleMapsEmbed(subHtml, page.url);
          if (result) allAddresses.push(result);
        }

        if (!skipMethods.includes('contact_page')) {
          // Contact/locations pages get higher confidence for structured parsing
          const result = extractFromContactPage(subHtml, subText, page.url);
          if (result) {
            if (page.type === 'contact' || page.type === 'locations') {
              result.confidence = Math.min(0.90, result.confidence + 0.10);
            }
            allAddresses.push(result);
          }
        }

        if (!skipMethods.includes('footer')) {
          const result = extractFromFooter(subHtml, page.url);
          if (result) allAddresses.push(result);
        }
      }
    } catch (err) {
      console.warn('[AddressEngine] Sub-page discovery failed:', err);
    }
  }

  // ── Step 3: Deduplicate (same method + same page = keep best) ──

  const deduped = deduplicateResults(allAddresses);

  // ── Step 4: Select best with corroboration ────────────

  const { best, corroborated, corroboration_count } = selectBestAddress(deduped);

  // ── Step 5: Extract phone, specialty, provider names ──

  const phone = extractPhone(mainHtml, mainText);
  const specialty = extractSpecialty(mainHtml);
  const providerNames = extractProviderNames(mainHtml);

  // ── Step 6: Build summary ─────────────────────────────

  return {
    best_address: best,
    all_addresses: deduped,
    phone,
    specialty,
    provider_names: providerNames,
    schema_org_data: schemaOrgData,
    corroborated,
    corroboration_count,
    extraction_methods_tried: methodsTried,
    page_urls_scanned: pagesScanned,
  };
}

/**
 * Lightweight extraction — main page only, no sub-page crawling.
 * Use for quick scans or when you already have the right page.
 */
export function extractAddressFromHtml(
  html: string,
  text: string,
  pageUrl: string,
): ExtractionSummary {
  const allAddresses: AddressExtractionResult[] = [];
  const methodsTried: AddressMethod[] = [];

  const schemaResult = extractFromSchemaOrg(html, pageUrl);
  methodsTried.push('schema_org');
  if (schemaResult) allAddresses.push(schemaResult);

  const mapsResult = extractFromGoogleMapsEmbed(html, pageUrl);
  methodsTried.push('google_maps_embed');
  if (mapsResult) allAddresses.push(mapsResult);

  const contactResult = extractFromContactPage(html, text, pageUrl);
  methodsTried.push('contact_page');
  if (contactResult) allAddresses.push(contactResult);

  const footerResult = extractFromFooter(html, pageUrl);
  methodsTried.push('footer');
  if (footerResult) allAddresses.push(footerResult);

  const { best, corroborated, corroboration_count } = selectBestAddress(allAddresses);

  return {
    best_address: best,
    all_addresses: allAddresses,
    phone: extractPhone(html, text),
    specialty: extractSpecialty(html),
    provider_names: extractProviderNames(html),
    schema_org_data: null,
    corroborated,
    corroboration_count,
    extraction_methods_tried: methodsTried,
    page_urls_scanned: [pageUrl],
  };
}

// ── Helpers ──────────────────────────────────────────────

function extractJsonLdBlocksFromHtml(html: string): any[] {
  const blocks: any[] = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {}
  }
  return blocks;
}

/**
 * Remove duplicate extraction results (same address from same method on same page).
 * Keeps the highest-confidence result per method+page combination.
 */
function deduplicateResults(results: AddressExtractionResult[]): AddressExtractionResult[] {
  const map = new Map<string, AddressExtractionResult>();

  for (const r of results) {
    if (!r.address) continue;
    const key = `${r.method}:${r.page_url}:${r.address.full_address.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || r.confidence > existing.confidence) {
      map.set(key, r);
    }
  }

  return Array.from(map.values());
}
