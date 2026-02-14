#!/usr/bin/env tsx
// scripts/batch-scan-v2.ts
// ═══ KairoLogic Full Batch Re-Scan — v2 Engine ═══
//
// Run with: npx tsx scripts/batch-scan-v2.ts
// Or:       SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/batch-scan-v2.ts
//
// What it does:
// 1. Pulls all providers with URLs from registry
// 2. For each provider:
//    a. Fetches NPI org data from NLM + NPPES APIs
//    b. Crawls their website (extracts address, phone, specialties, providers)
//    c. Runs all v2 check modules (NPI address, phone, taxonomy, roster)
//    d. Stores results in scan_sessions, check_results, org_npi_footprint, site_snapshots, mismatch_alerts
//    e. Updates registry with new score + risk_level (Sovereign/Drift/Violation)
// 3. Throttled at 2 providers/second to respect API rate limits
// 4. Logs progress and summary

// ═══ CONFIGURATION ═══
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BATCH_DELAY_MS = 500;  // 500ms between providers = 2/sec
const MAX_PROVIDERS = 0;      // 0 = all, set a number to limit for testing
const DRY_RUN = false;        // Set true to fetch data without writing to DB

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  console.log('Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/batch-scan-v2.ts');
  process.exit(1);
}

// ═══ SUPABASE CLIENT ═══
async function supabaseFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...options.headers as any,
    },
  });
  const text = await res.text();
  if (!res.ok && options.method !== 'PATCH' && options.method !== 'DELETE') {
    console.error(`  Supabase error (${res.status}): ${text.slice(0, 200)}`);
  }
  if (options.method === 'PATCH' || options.method === 'DELETE') return null;
  try { return JSON.parse(text); } catch { return null; }
}

// ═══ NPI DATA FETCHERS ═══

interface NpiOrgData {
  npi: string; org_name: string;
  prac_line1: string; prac_line2: string; prac_city: string; prac_state: string; prac_zip: string;
  prac_phone: string; tax_code: string; tax_classification: string;
  enumeration_date: string; last_update_date: string;
  addresses_secondary: any[];
}

async function fetchNpiData(npi: string): Promise<NpiOrgData | null> {
  try {
    const url = `https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results?.length) return null;

    const r = data.results[0];
    const basic = r.basic || {};
    const addr = r.addresses?.find((a: any) => a.address_purpose === 'LOCATION') || r.addresses?.[0] || {};
    const tax = r.taxonomies?.find((t: any) => t.primary) || r.taxonomies?.[0] || {};

    const secondaries = (r.practiceLocations || []).map((loc: any) => ({
      line1: loc.address_1 || '', city: loc.city || '',
      state: loc.state || '', zip: (loc.postal_code || '').slice(0, 5),
    }));

    return {
      npi: r.number || npi,
      org_name: basic.organization_name || `${basic.first_name || ''} ${basic.last_name || ''}`.trim(),
      prac_line1: addr.address_1 || '', prac_line2: addr.address_2 || '',
      prac_city: addr.city || '', prac_state: addr.state || '',
      prac_zip: (addr.postal_code || '').slice(0, 5),
      prac_phone: addr.telephone_number || '',
      tax_code: tax.code || '', tax_classification: tax.desc || '',
      enumeration_date: basic.enumeration_date || '',
      last_update_date: basic.last_updated || '',
      addresses_secondary: secondaries,
    };
  } catch (err: any) {
    console.log(`  ⚠ NPPES fetch failed: ${err.message}`);
    return null;
  }
}

// ═══ SITE CRAWLER ═══

interface SiteData {
  addr_line1: string; addr_line2: string; addr_city: string; addr_state: string; addr_zip: string;
  phone: string; specialty_labels: string[]; provider_names: string[];
  provider_count: number; source_hash: string;
}

async function crawlSite(url: string): Promise<SiteData | null> {
  try {
    let fetchUrl = url;
    if (!fetchUrl.startsWith('http')) fetchUrl = 'https://' + fetchUrl;

    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'KairoLogic-Sentry/3.1 (Compliance Scanner)', 'Accept': 'text/html' },
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const html = await res.text();
    if (!html || html.length < 100) return null;

    const { createHash } = await import('crypto');
    const sourceHash = createHash('sha256').update(html).digest('hex').slice(0, 16);
    const text = stripHtml(html);

    return {
      ...extractAddress(html, text),
      phone: extractPhone(html, text),
      specialty_labels: extractSpecialties(html, text),
      provider_names: extractProviders(html, text),
      provider_count: 0, // set after
      source_hash: sourceHash,
    };
  } catch (err: any) {
    console.log(`  ⚠ Crawl failed: ${err.message}`);
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractAddress(html: string, text: string) {
  let line1 = '', line2 = '', city = '', state = '', zip = '';

  // JSON-LD
  const jsonLd = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLd) {
    for (const block of jsonLd) {
      try {
        const data = JSON.parse(block.replace(/<script[^>]*>|<\/script>/gi, '').trim());
        const addr = data.address || data.location?.address;
        if (addr?.streetAddress) {
          return { addr_line1: addr.streetAddress, addr_line2: '', addr_city: addr.addressLocality || '', addr_state: addr.addressRegion || '', addr_zip: (addr.postalCode || '').slice(0, 5) };
        }
      } catch {}
    }
  }

  // Regex pattern
  const m = text.match(/(\d{1,5}\s+[A-Za-z0-9\s.,#\-]+?)[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*,\s*([A-Z]{2})\s+(\d{5})/);
  if (m) {
    const parts = m[1].trim().split(/[,\n]+/);
    return { addr_line1: parts[0]?.trim() || '', addr_line2: parts[1]?.trim() || '', addr_city: m[2], addr_state: m[3], addr_zip: m[4].slice(0, 5) };
  }

  // TX-specific
  const tx = text.match(/(\d{1,5}\s+[A-Za-z0-9\s.,#\-]{5,40})\s*[\n,]\s*([A-Za-z\s]+),?\s*TX\s+(\d{5})/i);
  if (tx) {
    return { addr_line1: tx[1].trim(), addr_line2: '', addr_city: tx[2].trim(), addr_state: 'TX', addr_zip: tx[3] };
  }

  return { addr_line1: line1, addr_line2: line2, addr_city: city, addr_state: state, addr_zip: zip };
}

function extractPhone(html: string, text: string): string {
  const tel = html.match(/href\s*=\s*["']tel:([^"']+)/i);
  if (tel) { const d = tel[1].replace(/\D/g, '').slice(-10); if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; }

  const schema = html.match(/"telephone"\s*:\s*"([^"]+)"/i);
  if (schema) { const d = schema[1].replace(/\D/g, '').slice(-10); if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; }

  const any = text.match(/\(?(\d{3})\)?[\s.\-](\d{3})[\s.\-](\d{4})/);
  if (any) return `(${any[1]}) ${any[2]}-${any[3]}`;

  return '';
}

const SPECIALTIES = ['family medicine','family practice','internal medicine','pediatrics','obstetrics','gynecology','psychiatry','psychology','dermatology','cardiology','orthopedics','neurology','oncology','mental health','behavioral health','counseling','primary care','urgent care','nurse practitioner','physical therapy','wellness','pain management','chiropractic','dentistry','dental','optometry','podiatry','allergy','rheumatology','gastroenterology','endocrinology','pulmonology','urology'];

function extractSpecialties(html: string, text: string): string[] {
  const lower = text.toLowerCase();
  const title = (html.match(/<title[^>]*>([^<]+)/i)?.[1] || '').toLowerCase();
  const combined = lower + ' ' + title;
  return SPECIALTIES.filter(s => combined.includes(s));
}

function extractProviders(html: string, text: string): string[] {
  const names = new Set<string>();
  const cred = text.matchAll(/(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{2,})(?:\s*,\s*(?:MD|DO|NP|PA|PA-C|APRN|DNP|PhD|DPM|DC|DDS|DMD|OD|RN|LPC|LCSW|LMFT))/g);
  for (const m of cred) {
    const n = m[1].trim();
    if (n.length >= 5 && n.length <= 40) names.add(n);
  }
  return [...names].slice(0, 50);
}

// ═══ CHECK LOGIC (inline for script portability) ═══

function normalizeAddr(l1: string, city: string, state: string, zip: string): string {
  const abbrevs: Record<string, string> = { 'ste':'suite','blvd':'boulevard','ave':'avenue','st':'street','dr':'drive','rd':'road','ln':'lane','ct':'court','pkwy':'parkway','hwy':'highway','n':'north','s':'south','e':'east','w':'west' };
  let a = [l1, city, state, zip].filter(Boolean).join(', ').toLowerCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim();
  a = a.split(' ').map(w => abbrevs[w] || w).join(' ');
  return a;
}

function addrMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const za = a.match(/\b(\d{5})\b/)?.[1], zb = b.match(/\b(\d{5})\b/)?.[1];
  if (za && zb && za !== zb) return false;
  const sa = a.replace(/\b(suite|apartment|unit|floor|building|room|#)\s*\w*/gi, '').replace(/\s+/g, ' ').trim();
  const sb = b.replace(/\b(suite|apartment|unit|floor|building|room|#)\s*\w*/gi, '').replace(/\s+/g, ' ').trim();
  return sa === sb;
}

function phoneNorm(p: string): string {
  const d = p.replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
}

function specMatch(npiClass: string, siteLabels: string[]): boolean {
  const n = npiClass.toLowerCase();
  for (const s of siteLabels) {
    if (n.includes(s) || s.includes(n)) return true;
  }
  if (siteLabels.some(l => l.includes('primary care'))) return true;
  const syns: Record<string, string[]> = {
    'family medicine': ['family practice', 'primary care'],
    'internal medicine': ['primary care', 'internist'],
    'psychiatry': ['mental health', 'behavioral health'],
  };
  const mapped = syns[n] || [];
  return siteLabels.some(s => mapped.includes(s));
}

interface CheckResult {
  check_id: string; category: string; tier: string; status: string;
  score: number; title: string; detail: string; severity: string;
  evidence?: any; remediation_steps?: string[];
}

function runChecks(npiData: NpiOrgData | null, siteData: SiteData | null): CheckResult[] {
  const results: CheckResult[] = [];

  // NPI-01: Address
  if (npiData && siteData?.addr_line1) {
    const nA = normalizeAddr(npiData.prac_line1, npiData.prac_city, npiData.prac_state, npiData.prac_zip);
    const sA = normalizeAddr(siteData.addr_line1, siteData.addr_city, siteData.addr_state, siteData.addr_zip);
    const match = addrMatch(nA, sA) || (npiData.addresses_secondary || []).some((sec: any) => addrMatch(normalizeAddr(sec.line1, sec.city, sec.state, sec.zip), sA));
    results.push({
      check_id: 'NPI-01', category: 'npi-integrity', tier: 'free', severity: 'high',
      status: match ? 'pass' : 'fail', score: match ? 100 : 25,
      title: match ? 'Address matches NPI record' : 'Address mismatch detected',
      detail: match ? `Verified: ${npiData.prac_city}, ${npiData.prac_state}` : `Site: "${siteData.addr_line1}, ${siteData.addr_city}" vs NPI: "${npiData.prac_line1}, ${npiData.prac_city}"`,
      evidence: { npi_address: `${npiData.prac_line1}, ${npiData.prac_city}, ${npiData.prac_state} ${npiData.prac_zip}`, site_address: `${siteData.addr_line1}, ${siteData.addr_city}, ${siteData.addr_state} ${siteData.addr_zip}` },
    });
  } else {
    results.push({ check_id: 'NPI-01', category: 'npi-integrity', tier: 'free', severity: 'high', status: 'inconclusive', score: 0, title: 'Address check incomplete', detail: npiData ? 'No address found on website' : 'NPI data unavailable' });
  }

  // NPI-02: Phone
  if (npiData?.prac_phone && siteData?.phone) {
    const match = phoneNorm(npiData.prac_phone) === phoneNorm(siteData.phone);
    results.push({
      check_id: 'NPI-02', category: 'npi-integrity', tier: 'free', severity: 'medium',
      status: match ? 'pass' : 'fail', score: match ? 100 : 40,
      title: match ? 'Phone matches NPI record' : 'Phone number mismatch',
      detail: match ? `Verified: ${npiData.prac_phone}` : `Site: ${siteData.phone} vs NPI: ${npiData.prac_phone}`,
      evidence: { npi_phone: npiData.prac_phone, site_phone: siteData.phone },
    });
  } else {
    results.push({ check_id: 'NPI-02', category: 'npi-integrity', tier: 'free', severity: 'medium', status: 'inconclusive', score: 0, title: 'Phone check incomplete', detail: 'Phone not available from NPI or website' });
  }

  // NPI-03: Taxonomy
  if (npiData?.tax_classification && siteData?.specialty_labels?.length) {
    const match = specMatch(npiData.tax_classification, siteData.specialty_labels);
    results.push({
      check_id: 'NPI-03', category: 'npi-integrity', tier: 'report', severity: 'medium',
      status: match ? 'pass' : 'warn', score: match ? 100 : 60,
      title: match ? 'Specialty matches NPI taxonomy' : 'Specialty discrepancy',
      detail: match ? `Verified: ${npiData.tax_classification}` : `NPI: "${npiData.tax_classification}" vs Site: "${siteData.specialty_labels.join(', ')}"`,
      evidence: { npi_classification: npiData.tax_classification, site_specialties: siteData.specialty_labels },
    });
  } else {
    results.push({ check_id: 'NPI-03', category: 'npi-integrity', tier: 'report', severity: 'medium', status: 'inconclusive', score: 0, title: 'Specialty check incomplete', detail: 'Taxonomy or specialty data unavailable' });
  }

  // RST-01: Roster count (only if we found providers on site)
  if (siteData && siteData.provider_names.length > 0) {
    results.push({
      check_id: 'RST-01', category: 'npi-integrity', tier: 'report', severity: 'medium',
      status: 'pass', score: 80,
      title: `${siteData.provider_names.length} providers detected on website`,
      detail: `Found ${siteData.provider_names.length} provider name(s) on website`,
      evidence: { site_count: siteData.provider_names.length, names: siteData.provider_names.slice(0, 10) },
    });
  } else {
    results.push({ check_id: 'RST-01', category: 'npi-integrity', tier: 'report', severity: 'medium', status: 'inconclusive', score: 0, title: 'Provider roster not detected', detail: 'Could not extract provider names from website' });
  }

  return results;
}

// ═══ MAIN BATCH PROCESS ═══

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  KairoLogic Batch Re-Scan v2');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL.slice(0, 40)}...`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('');

  // 1. Pull all providers with URLs
  const providers = await supabaseFetch(
    `registry?url=neq.&url=not.is.null&select=npi,name,url,city,zip,email,risk_score,risk_level&order=city,name&limit=1000`
  );

  if (!providers?.length) {
    console.log('❌ No providers found in registry');
    return;
  }

  const total = MAX_PROVIDERS > 0 ? Math.min(providers.length, MAX_PROVIDERS) : providers.length;
  console.log(`📋 Found ${providers.length} providers with URLs. Scanning ${total}.\n`);

  // Stats
  let scanned = 0, crawled = 0, npiFound = 0;
  let passed = 0, failed = 0, warned = 0, inconclusive = 0;
  const errors: string[] = [];

  for (let i = 0; i < total; i++) {
    const prov = providers[i];
    const progress = `[${i + 1}/${total}]`;

    console.log(`${progress} ${prov.name} (${prov.npi}) — ${prov.url}`);

    try {
      // a. Fetch NPI data
      const npiData = await fetchNpiData(prov.npi);
      if (npiData) npiFound++;

      // b. Crawl website
      const siteData = await crawlSite(prov.url);
      if (siteData) {
        siteData.provider_count = siteData.provider_names.length;
        crawled++;
      }

      // c. Run checks
      const results = runChecks(npiData, siteData);

      // d. Calculate composite score
      const scoreable = results.filter(r => r.status !== 'inconclusive');
      const compositeScore = scoreable.length > 0
        ? Math.round(scoreable.reduce((s, r) => s + r.score, 0) / scoreable.length)
        : 0;
      const riskLevel = compositeScore >= 75 ? 'Sovereign' : compositeScore >= 50 ? 'Drift' : compositeScore > 0 ? 'Violation' : 'Inconclusive';

      // Count
      for (const r of results) {
        if (r.status === 'pass') passed++;
        else if (r.status === 'fail') failed++;
        else if (r.status === 'warn') warned++;
        else inconclusive++;
      }

      const statusIcons = results.map(r => r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : r.status === 'warn' ? '⚠' : '?').join('');
      console.log(`  → Score: ${compositeScore}/100 (${riskLevel}) [${statusIcons}] site:${siteData ? '✓' : '✗'} npi:${npiData ? '✓' : '✗'}`);

      if (!DRY_RUN) {
        // e. Store NPI org data
        if (npiData) {
          await supabaseFetch(`org_npi_footprint?npi=eq.${prov.npi}`, { method: 'DELETE' });
          await supabaseFetch('org_npi_footprint', {
            method: 'POST',
            body: JSON.stringify({
              npi: npiData.npi,
              org_name: npiData.org_name,
              prac_line1: npiData.prac_line1,
              prac_line2: npiData.prac_line2,
              prac_city: npiData.prac_city,
              prac_state: npiData.prac_state,
              prac_zip: npiData.prac_zip,
              prac_phone: npiData.prac_phone,
              tax_code: npiData.tax_code,
              tax_classification: npiData.tax_classification,
              enumeration_date: npiData.enumeration_date || null,
              last_update_date: npiData.last_update_date || null,
              addresses_secondary: npiData.addresses_secondary || [],
              fetched_at: new Date().toISOString(),
            }),
          });
        }

        // f. Store site snapshot
        if (siteData) {
          await supabaseFetch('site_snapshots', {
            method: 'POST',
            body: JSON.stringify({
              npi: prov.npi, url: prov.url,
              addr_line1: siteData.addr_line1,
              addr_line2: siteData.addr_line2,
              addr_city: siteData.addr_city,
              addr_state: siteData.addr_state,
              addr_zip: siteData.addr_zip,
              phone: siteData.phone,
              specialty_labels: siteData.specialty_labels,
              provider_names: siteData.provider_names,
              provider_count: siteData.provider_count,
              source_hash: siteData.source_hash,
            }),
          });
        }

        // g. Create scan session
        const sessionRes = await supabaseFetch('scan_sessions', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            npi: prov.npi, url: prov.url, tier: 'free',
            composite_score: compositeScore, risk_level: riskLevel,
            checks_total: results.length,
            checks_passed: results.filter(r => r.status === 'pass').length,
            checks_failed: results.filter(r => r.status === 'fail').length,
            checks_warned: results.filter(r => r.status === 'warn').length,
            triggered_by: 'batch_v2',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          }),
        });
        const scanId = sessionRes?.[0]?.id;

        // h. Store check results
        for (const r of results) {
          await supabaseFetch('check_results', {
            method: 'POST',
            body: JSON.stringify({
              scan_id: scanId, npi: prov.npi, check_id: r.check_id,
              category: r.category, tier: r.tier, status: r.status,
              score: r.score, title: r.title, detail: r.detail,
              evidence: r.evidence || null,
              remediation_steps: r.remediation_steps || null,
              severity: r.severity,
            }),
          });
        }

        // i. Create mismatch alerts for failures
        for (const r of results) {
          if (r.status === 'fail' || r.status === 'warn') {
            const dimMap: Record<string, string> = { 'NPI-01': 'address', 'NPI-02': 'phone', 'NPI-03': 'taxonomy', 'RST-01': 'roster_count' };
            await supabaseFetch('mismatch_alerts', {
              method: 'POST',
              body: JSON.stringify({
                npi: prov.npi, check_id: r.check_id,
                dimension: dimMap[r.check_id] || 'unknown',
                severity: r.severity,
                npi_value: r.evidence?.npi_address || r.evidence?.npi_phone || r.evidence?.npi_classification || '',
                site_value: r.evidence?.site_address || r.evidence?.site_phone || r.evidence?.site_specialties?.join(', ') || '',
                delta_detail: r.detail, risk_score: r.score, status: 'open',
              }),
            });
          }
        }

        // j. Update registry
        await supabaseFetch(`registry?npi=eq.${prov.npi}`, {
          method: 'PATCH',
          body: JSON.stringify({
            risk_score: compositeScore,
            risk_level: riskLevel,
            last_scan_timestamp: new Date().toISOString(),
          }),
        });
      }

      scanned++;

    } catch (err: any) {
      console.log(`  ❌ ERROR: ${err.message}`);
      errors.push(`${prov.npi} (${prov.name}): ${err.message}`);
    }

    // Throttle
    if (i < total - 1) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // ═══ SUMMARY ═══
  console.log('\n═══════════════════════════════════════════════');
  console.log('  BATCH SCAN COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total providers:  ${total}`);
  console.log(`  Scanned:          ${scanned}`);
  console.log(`  NPI data found:   ${npiFound}`);
  console.log(`  Sites crawled:    ${crawled}`);
  console.log(`  ─────────────────────────`);
  console.log(`  Checks passed:    ${passed}`);
  console.log(`  Checks failed:    ${failed}`);
  console.log(`  Checks warned:    ${warned}`);
  console.log(`  Inconclusive:     ${inconclusive}`);
  console.log(`  ─────────────────────────`);
  console.log(`  Errors:           ${errors.length}`);
  if (errors.length > 0) {
    console.log(`\n  Error details:`);
    errors.slice(0, 10).forEach(e => console.log(`    • ${e}`));
    if (errors.length > 10) console.log(`    ... and ${errors.length - 10} more`);
  }
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
