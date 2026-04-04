/**
 * KairoLogic Campaign Provider Finder + Email Scraper
 *
 * Step 1: Query registry for high-drift providers with confirmed foreign routing
 * Step 2: Scrape their websites for contact emails
 * Step 3: Output a ready-to-import CSV for campaign_outreach
 *
 * Run: npx ts-node scripts/find-campaign-providers.ts
 * Or:  node scripts/find-campaign-providers.js (after compile)
 *
 * Env vars needed: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REPORT_CODE_SECRET
 */

import * as crypto from 'crypto';
import * as fs from 'fs';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REPORT_SECRET = process.env.REPORT_CODE_SECRET || '';
const TARGET_COUNT = 50;
const MAX_SCORE = 79;
const PAGE_SIZE = 200;

// Blocklist: directories, social media, generic sites
const URL_BLOCKLIST = [
  'facebook.com',
  'yelp.com',
  'healthgrades.com',
  'vitals.com',
  'zocdoc.com',
  'yellowpages.com',
  'bbb.org',
  'linkedin.com',
  'instagram.com',
  'twitter.com',
  'npidb.org',
  'npino.com',
  'npiprofile.com',
  'medicare.gov',
  'cms.gov',
  'webmd.com',
  'google.com',
  'maps.google.com',
  'bloomberg.com',
  'indeed.com',
  'glassdoor.com',
  'doximity.com',
  'practo.com',
];

interface Provider {
  npi: string;
  name: string;
  city: string;
  url: string;
  risk_score: number;
  last_scan_result: unknown;
}

interface ScanResult {
  score?: number;
  sb1188_findings?: Array<{
    id?: string;
    status?: string;
    evidence?: { geo?: string; ip?: string; isUS?: boolean };
  }>;
  hb149_findings?: Array<{ id?: string; status?: string }>;
}

interface CampaignCandidate {
  npi: string;
  name: string;
  city: string;
  url: string;
  cleanUrl: string;
  score: number;
  foreignCountry: string;
  foreignHost: string;
  email: string | null;
  emailSource: string;
  hmacCode: string;
  reportUrl: string;
  findingText: string;
}

// ── Supabase helpers ──

async function supabaseGet(table: string, query: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    console.error(`Supabase error: ${res.status} ${res.statusText}`);
    return [];
  }
  return await res.json();
}

// ── URL helpers ──

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isBlockedUrl(url: string): boolean {
  const domain = getDomain(url);
  return URL_BLOCKLIST.some((blocked) => domain.includes(blocked));
}

function isHighFidelityUrl(url: string): boolean {
  if (!url || url === '__NOT_FOUND__' || url === 'null' || url === '') return false;
  if (isBlockedUrl(url)) return false;
  try {
    const u = new URL(url);
    // Must be http or https
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    // Domain should have at least one dot
    if (!u.hostname.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

// ── Scan result parser ──

function parseScan(raw: unknown): ScanResult {
  if (!raw) return {};
  let parsed: Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  } else {
    parsed = raw as Record<string, unknown>;
  }
  return {
    score: parsed.score as number | undefined,
    sb1188_findings: parsed.sb1188_findings as ScanResult['sb1188_findings'],
    hb149_findings: parsed.hb149_findings as ScanResult['hb149_findings'],
  };
}

function getForeignRouting(scan: ScanResult): { country: string; host: string } | null {
  const dr01 = scan.sb1188_findings?.find((f) => f.id === 'DR-01');
  if (dr01?.status === 'fail' && dr01.evidence) {
    const geo = dr01.evidence.geo || '';
    const ip = (dr01.evidence.ip || '').replace(/\.$/, '');
    const isUS = dr01.evidence.isUS;
    if (!isUS && geo) {
      return { country: geo, host: ip };
    }
  }
  return null;
}

// ── Country code to name mapping ──

const COUNTRY_NAMES: Record<string, string> = {
  GB: 'Great Britain',
  IE: 'Ireland',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  BE: 'Belgium',
  DK: 'Denmark',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  CA: 'Canada',
  AU: 'Australia',
  SG: 'Singapore',
  JP: 'Japan',
  IN: 'India',
  BR: 'Brazil',
  HK: 'Hong Kong',
  KR: 'South Korea',
  IT: 'Italy',
  ES: 'Spain',
};

// ── Email scraper ──

async function scrapeEmailFromUrl(
  url: string,
  timeoutMs = 8000,
): Promise<{ email: string | null; source: string }> {
  const domain = getDomain(url);
  if (!domain) return { email: null, source: 'invalid_url' };

  // Try multiple pages: homepage, contact, about
  const pagesToTry = [
    url,
    `https://${domain}/contact`,
    `https://${domain}/contact-us`,
    `https://${domain}/about`,
    `https://${domain}/about-us`,
  ];

  for (const pageUrl of pagesToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KairoLogic/1.0; compliance-scanner)',
          Accept: 'text/html',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const html = await res.text();

      // Extract emails from mailto: links and text
      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const allEmails = [...new Set(html.match(emailRegex) || [])];

      // Filter out junk emails
      const filtered = allEmails.filter((e) => {
        const lower = e.toLowerCase();
        // Skip image files, CSS, JS references that look like emails
        if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif'))
          return false;
        if (lower.endsWith('.css') || lower.endsWith('.js')) return false;
        // Skip common no-reply / system emails
        if (lower.includes('noreply') || lower.includes('no-reply')) return false;
        if (lower.includes('example.com') || lower.includes('test.com')) return false;
        if (lower.includes('sentry.io') || lower.includes('wordpress')) return false;
        if (lower.includes('wixpress') || lower.includes('squarespace')) return false;
        // Prefer emails on the same domain
        return true;
      });

      if (filtered.length === 0) continue;

      // Prioritize: same-domain emails first, then info@, contact@, office@
      const sameDomain = filtered.filter((e) => e.toLowerCase().includes(domain.toLowerCase()));
      const prioritized = sameDomain.length > 0 ? sameDomain : filtered;

      // Sort by preference
      const scored = prioritized.map((e) => {
        const lower = e.toLowerCase();
        let score = 0;
        if (lower.startsWith('info@')) score += 10;
        if (lower.startsWith('contact@')) score += 9;
        if (lower.startsWith('office@')) score += 8;
        if (lower.startsWith('admin@')) score += 7;
        if (lower.startsWith('reception@') || lower.startsWith('frontdesk@')) score += 6;
        if (lower.startsWith('hello@')) score += 5;
        if (lower.includes(domain)) score += 20; // Same domain is huge
        return { email: e, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      if (best) {
        const source = pageUrl === url ? 'homepage' : new URL(pageUrl).pathname.replace(/^\//, '');
        return { email: best.email, source };
      }
    } catch {
      continue; // Timeout or fetch error, try next page
    }
  }

  return { email: null, source: 'not_found' };
}

// ── HMAC code generator ──

function generateCode(npi: string): string {
  return crypto.createHmac('sha256', REPORT_SECRET).update(npi).digest('hex').slice(0, 12);
}

// ── Main ──

async function main() {
  console.log('=== KairoLogic Campaign Provider Finder ===\n');

  if (!SUPABASE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }
  if (!REPORT_SECRET) {
    console.error('ERROR: REPORT_CODE_SECRET not set');
    process.exit(1);
  }

  // Step 1: Get existing campaign NPIs to exclude
  console.log('Step 1: Fetching existing campaign records...');
  const existing = await supabaseGet('campaign_outreach', 'select=npi&limit=1000');
  const existingNpis = new Set((existing as Array<{ npi: string }>).map((r) => r.npi));
  console.log(`  Found ${existingNpis.size} existing campaign records to exclude\n`);

  // Step 2: Query providers with scans, paginate
  console.log(`Step 2: Finding providers with score < ${MAX_SCORE} and real URLs...`);
  const candidates: CampaignCandidate[] = [];
  let offset = 0;
  let totalScanned = 0;

  while (candidates.length < TARGET_COUNT * 3) {
    // Fetch extra since many won't have foreign routing
    const providers = (await supabaseGet(
      'registry',
      `select=npi,name,city,url,risk_score,last_scan_result&url=neq.__NOT_FOUND__&url=neq.&risk_score=lt.${MAX_SCORE}&risk_score=gt.0&order=risk_score.asc&offset=${offset}&limit=${PAGE_SIZE}`,
    )) as Provider[];

    if (providers.length === 0) break;
    totalScanned += providers.length;

    for (const p of providers) {
      if (candidates.length >= TARGET_COUNT * 2) break; // Get 2x target for email scraping attrition
      if (existingNpis.has(p.npi)) continue;
      if (!isHighFidelityUrl(p.url)) continue;

      const scan = parseScan(p.last_scan_result);
      const foreign = getForeignRouting(scan);
      if (!foreign) continue; // Must have confirmed foreign routing

      const countryName = COUNTRY_NAMES[foreign.country] || foreign.country;

      candidates.push({
        npi: p.npi,
        name: p.name,
        city: p.city,
        url: p.url,
        cleanUrl: cleanUrl(p.url),
        score: scan.score ?? p.risk_score,
        foreignCountry: countryName,
        foreignHost: foreign.host,
        email: null,
        emailSource: '',
        hmacCode: generateCode(p.npi),
        reportUrl: `https://kairologic.net/report/${generateCode(p.npi)}`,
        findingText: `Your website is hosted on a server with IP ${foreign.host} geolocated to ${countryName}, routing patient data outside the US.`,
      });
    }

    offset += PAGE_SIZE;
    console.log(
      `  Scanned ${totalScanned} providers, found ${candidates.length} candidates so far...`,
    );
  }

  console.log(`\n  Total candidates with foreign routing + good URL: ${candidates.length}\n`);

  // Step 3: Scrape emails
  console.log('Step 3: Scraping emails from provider websites...');
  let emailsFound = 0;
  let processed = 0;

  for (const c of candidates) {
    processed++;
    if (processed % 10 === 0) {
      console.log(`  Progress: ${processed}/${candidates.length} (${emailsFound} emails found)`);
    }

    const result = await scrapeEmailFromUrl(c.url);
    c.email = result.email;
    c.emailSource = result.source;
    if (result.email) emailsFound++;

    // Rate limit: 500ms between requests
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Stop early if we have enough with emails
    if (emailsFound >= TARGET_COUNT) {
      console.log(`  Reached ${TARGET_COUNT} emails, stopping early.`);
      break;
    }
  }

  console.log(`\n  Emails found: ${emailsFound} out of ${processed} scraped\n`);

  // Step 4: Sort and output
  // Prioritize: has email first, then by score (lowest = most compelling)
  const withEmail = candidates.filter((c) => c.email).sort((a, b) => a.score - b.score);
  const withoutEmail = candidates.filter((c) => !c.email).sort((a, b) => a.score - b.score);
  const final = [...withEmail.slice(0, TARGET_COUNT), ...withoutEmail].slice(0, TARGET_COUNT);

  // Generate SQL
  console.log('Step 4: Generating outputs...\n');

  const sqlLines = final
    .filter((c) => c.email) // Only insert ones with emails
    .map((c) => `  ('${c.npi}', '${c.hmacCode}', '${c.email}', 'sb1188-foreign-v1')`);

  const sql = `-- Campaign Round 1 Expansion: ${sqlLines.length} providers with emails
-- Generated: ${new Date().toISOString()}
INSERT INTO campaign_outreach (npi, report_code, email_sent_to, campaign_name) VALUES
${sqlLines.join(',\n')}
ON CONFLICT DO NOTHING;`;

  fs.writeFileSync('campaign-expansion-insert.sql', sql);
  console.log(`  SQL written: campaign-expansion-insert.sql (${sqlLines.length} records)`);

  // Generate CSV
  const csvHeader =
    'NPI,Practice Name,Contact,City,Score,Country,IP/Host,URL,Email,Email Source,HMAC Code,Landing Page URL,Finding Text,Campaign Status';
  const csvRows = final.map(
    (c) =>
      `"${c.npi}","${c.name}","","${c.city}",${c.score},"${c.foreignCountry}","${c.foreignHost}","${c.cleanUrl}","${c.email || ''}","${c.emailSource}","${c.hmacCode}","${c.reportUrl}","${c.findingText}","Not sent"`,
  );
  fs.writeFileSync('campaign-expansion-providers.csv', [csvHeader, ...csvRows].join('\n'));
  console.log(`  CSV written: campaign-expansion-providers.csv (${final.length} records)`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  Total providers scanned: ${totalScanned}`);
  console.log(`  Foreign routing confirmed: ${candidates.length}`);
  console.log(`  Emails found: ${withEmail.length}`);
  console.log(`  Ready to send: ${withEmail.length}`);
  console.log(`  Need emails: ${final.length - withEmail.length}`);
  console.log('\n  Score distribution:');
  const ranges = [
    { label: '< 40 (Critical)', min: 0, max: 40 },
    { label: '40-59 (At Risk)', min: 40, max: 60 },
    { label: '60-79 (Drift)', min: 60, max: 80 },
  ];
  for (const r of ranges) {
    const count = final.filter((c) => c.score >= r.min && c.score < r.max).length;
    console.log(`    ${r.label}: ${count}`);
  }

  console.log('\n  Country distribution:');
  const countries: Record<string, number> = {};
  for (const c of final) {
    countries[c.foreignCountry] = (countries[c.foreignCountry] || 0) + 1;
  }
  for (const [country, count] of Object.entries(countries).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${country}: ${count}`);
  }

  console.log('\nDone! Review the CSV, then run the SQL in Supabase.');
}

main().catch(console.error);
