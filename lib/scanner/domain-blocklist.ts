/**
 * lib/scanner/domain-blocklist.ts
 *
 * Domains that are directory listings, aggregators, social platforms,
 * or government NPI lookup tools — never real provider websites worth scanning.
 *
 * Used as a pre-flight guard in scan-scheduler.ts before any fetch attempt.
 * Blocked URLs are marked scan_status='blocked' in practice_websites.
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
  'superdoctors.com',
  'providerwire.com',
  'medifind.com',
  'doctors.com',
  'npiprofile.com',

  // Provider aggregator platforms (listings, not real practice sites)
  'even28.com',
  'doctorsnetwork.com',
  'patientconnect365.com',
  'getluna.com',

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
  'fb.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',

  // NPI lookup tools (not provider websites)
  'npino.com',
  'npidb.org',
  'npi.io',
  'nppes.cms.hhs.gov',
  'npiregistry.cms.hhs.gov',

  // Government / federal (not scannable for compliance content)
  'medicare.gov',
  'medicaid.gov',
  'cms.gov',
  'hhs.gov',
  'va.gov',

  // Retail chains / pharmacies (not individual practice websites)
  'walgreens.com',
  'cvs.com',
  'walmart.com',
  'costco.com',
  'samsclub.com',
  'kroger.com',
  'heb.com',
  'brookshires.com',
  'target.com',
  'amazon.com',
  'caremark.com',
  'insiderx.com',

  // Additional NPI/provider lookup sites
  'npino.org',
  'opennpi.com',
  'dentistreg.com',
  'idcrawl.com',

  // Health system subdomains (provider directories, not practice sites)
  'doctors.wellmedhealthcare.com',

  // Generic / non-provider
  'google.com',
  'apple.com',
  'bing.com',
  'whitepages.com',
]);

/**
 * Returns true if the URL belongs to a known directory or aggregator domain
 * that will never yield compliance content worth scanning.
 *
 * Strips www. prefix before matching so both
 * www.showmelocal.com and showmelocal.com are caught.
 */
/**
 * Returns the blocklist as a plain array — used by scripts
 * that need the list in JSON form (e.g., Python import scripts).
 */
export function getBlockedDomainsArray(): string[] {
  return [...DIRECTORY_DOMAINS];
}

/**
 * Returns true if the URL belongs to a known directory or aggregator domain
 * that will never yield compliance content worth scanning.
 *
 * Strips www. prefix before matching so both
 * www.showmelocal.com and showmelocal.com are caught.
 */
export function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    // Exact match first
    if (DIRECTORY_DOMAINS.has(hostname)) return true;
    // Subdomain match (e.g., global.showmelocal.com, green.wellness.com)
    for (const blocked of DIRECTORY_DOMAINS) {
      if (hostname.endsWith('.' + blocked)) return true;
    }
    return false;
  } catch {
    // Malformed URL — let the scheduler handle it downstream
    return false;
  }
}
