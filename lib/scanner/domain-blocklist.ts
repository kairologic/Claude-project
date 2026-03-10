/**
 * lib/scanner/domain-blocklist.ts
 *
 * Domains that are directory listings, aggregators, social platforms,
 * or government NPI lookup tools — never real provider websites worth scanning.
 *
 * Used as a pre-flight guard in scan-scheduler.ts before any fetch attempt.
 * Blocked URLs are marked scan_status='unreachable' in practice_websites.
 *
 * To add new domains: lowercase, no leading dot, no www prefix.
 */

export const DIRECTORY_DOMAINS = new Set<string>([
  // Medical directories & aggregators
  'showmelocal.com',
  'healthgrades.com',
  'zocdoc.com',
  'vitals.com',
  'doximity.com',
  'webmd.com',
  'psychologytoday.com',
  'psychology-today.com',
  'ratemds.com',
  'wellness.com',
  'drscore.com',
  'castleconnolly.com',
  'usnews.com',
  'sharecare.com',
  'practicefusion.com',
  'doctorlogic.com',

  // General business directories
  'yelp.com',
  'yellowpages.com',
  'superpages.com',
  'mapquest.com',
  'manta.com',
  'bbb.org',
  'chamberofcommerce.com',
  'angieslist.com',
  'homeadvisor.com',

  // Social / platforms
  'facebook.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'tiktok.com',

  // NPI lookup tools (not provider websites)
  'npino.com',
  'npidb.org',
  'npi.io',
  'nppes.cms.hhs.gov',
  'npiregistry.cms.hhs.gov',

  // Government / federal (not scannable for compliance content)
  'medicare.gov',
  'cms.gov',
  'hhs.gov',
  'va.gov',
]);

/**
 * Returns true if the URL belongs to a known directory or aggregator domain
 * that will never yield compliance content worth scanning.
 *
 * Strips www. prefix before matching so both
 * www.showmelocal.com and showmelocal.com are caught.
 */
export function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    return DIRECTORY_DOMAINS.has(hostname);
  } catch {
    // Malformed URL — let the scheduler handle it downstream
    return false;
  }
}
