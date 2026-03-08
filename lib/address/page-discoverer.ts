// lib/address/page-discoverer.ts
// ═══ Sub-Page Discovery for Address Extraction ═══
// Practice website addresses rarely appear on the homepage alone.
// They're on /contact, /locations, /about, /our-offices, etc.
// This module discovers those pages from the main URL's HTML.

import { crawlPage, type CrawlResult } from '../crawler';

export interface DiscoveredPage {
  url: string;
  type: 'contact' | 'about' | 'locations' | 'providers' | 'footer_link';
  priority: number;    // 1 = highest (contact/locations), 3 = lowest (generic about)
  crawlResult?: CrawlResult;
}

/**
 * Patterns that indicate a page likely contains address information.
 * Ordered by signal strength. Checked against href and link text.
 */
const PAGE_PATTERNS: Array<{
  regex: RegExp;
  textRegex?: RegExp;
  type: DiscoveredPage['type'];
  priority: number;
}> = [
  // Contact pages — highest priority
  { regex: /\/(contact|contact-us|get-in-touch|reach-us)(\/|$|\?|#)/i, type: 'contact', priority: 1 },
  { regex: /\/kontakt/i, type: 'contact', priority: 1 },
  { textRegex: /^contact(\s+us)?$/i, regex: /./,  type: 'contact', priority: 1 },

  // Location pages — highest priority
  { regex: /\/(locations?|offices?|our-locations?|find-us|directions?)(\/|$|\?|#)/i, type: 'locations', priority: 1 },
  { regex: /\/(clinics?|centers?|facilities?|campuses?|sites?)(\/|$|\?|#)/i, type: 'locations', priority: 2 },
  { textRegex: /^(locations?|our\s+offices?|find\s+(us|a\s+location))$/i, regex: /./, type: 'locations', priority: 1 },

  // About pages — medium priority (often have address in sidebar/footer)
  { regex: /\/(about|about-us|who-we-are)(\/|$|\?|#)/i, type: 'about', priority: 3 },
  { textRegex: /^about(\s+us)?$/i, regex: /./, type: 'about', priority: 3 },

  // Provider/team pages — lower priority but sometimes have practice addresses
  { regex: /\/(providers?|doctors?|physicians?|our-team|staff|meet-)(\/|$|\?|#)/i, type: 'providers', priority: 3 },
];

/**
 * Extract internal links from HTML and find pages likely to contain
 * address information.
 *
 * @param html - Raw HTML of the main page
 * @param baseUrl - The practice website URL (for resolving relative links)
 * @param maxPages - Maximum sub-pages to return (default 4)
 */
export function discoverAddressPages(
  html: string,
  baseUrl: string,
  maxPages: number = 4,
): DiscoveredPage[] {
  const discovered: DiscoveredPage[] = [];
  const seen = new Set<string>();

  // Parse base URL for same-origin checks
  let origin: string;
  try {
    const parsed = new URL(baseUrl);
    origin = parsed.origin;
  } catch {
    return [];
  }

  // Extract all <a> tags with href
  const linkRegex = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const linkText = match[2].replace(/<[^>]+>/g, '').trim();

    // Resolve relative URLs
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(rawHref, baseUrl).href;
    } catch {
      continue;
    }

    // Same-origin only
    try {
      if (new URL(absoluteUrl).origin !== origin) continue;
    } catch {
      continue;
    }

    // Skip anchors, assets, mailto, tel
    if (rawHref.startsWith('#')) continue;
    if (/\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|doc)(\?|$)/i.test(absoluteUrl)) continue;
    if (/^(mailto|tel|fax|sms):/i.test(rawHref)) continue;

    // Normalize: strip trailing slash and hash for dedup
    const normalized = absoluteUrl.replace(/[/#]+$/, '').toLowerCase();
    if (seen.has(normalized)) continue;

    // Check against patterns
    for (const pattern of PAGE_PATTERNS) {
      const hrefMatch = pattern.regex.test(absoluteUrl);
      const textMatch = pattern.textRegex ? pattern.textRegex.test(linkText) : false;

      if (hrefMatch || textMatch) {
        seen.add(normalized);
        discovered.push({
          url: absoluteUrl,
          type: pattern.type,
          priority: pattern.priority,
        });
        break;
      }
    }
  }

  // Sort by priority (1 first) and deduplicate by type
  discovered.sort((a, b) => a.priority - b.priority);

  // Keep best per type, up to maxPages
  const byType = new Map<string, DiscoveredPage>();
  const result: DiscoveredPage[] = [];

  for (const page of discovered) {
    if (result.length >= maxPages) break;
    const key = `${page.type}-${page.priority}`;
    if (!byType.has(page.type) || page.priority < (byType.get(page.type)!.priority)) {
      byType.set(page.type, page);
      result.push(page);
    }
  }

  return result;
}

/**
 * Discover and crawl sub-pages that likely contain address data.
 * Returns the main page + discovered sub-pages, all crawled.
 *
 * @param mainUrl - Practice website URL
 * @param mainHtml - Already-fetched HTML of the main page
 * @param maxSubPages - Max additional pages to crawl (default 3)
 */
export async function discoverAndCrawlAddressPages(
  mainUrl: string,
  mainHtml: string,
  maxSubPages: number = 3,
): Promise<DiscoveredPage[]> {
  const subPages = discoverAddressPages(mainHtml, mainUrl, maxSubPages);

  // Crawl discovered pages in parallel (with concurrency limit)
  const crawlPromises = subPages.map(async (page) => {
    try {
      const result = await crawlPage(page.url);
      page.crawlResult = result;
    } catch (err) {
      console.warn(`[PageDiscoverer] Failed to crawl ${page.url}:`, err);
    }
    return page;
  });

  await Promise.all(crawlPromises);

  return subPages.filter((p) => p.crawlResult?.success);
}
