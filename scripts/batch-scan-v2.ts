#!/usr/bin/env tsx
// scripts/batch-scan-v2.ts
// ═══ KairoLogic Full Batch Re-Scan — v2 Engine ═══
//
// Run with: npx tsx scripts/batch-scan-v2.ts

// ═══ CONFIGURATION ═══
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BATCH_DELAY_MS = 500;
const MAX_PROVIDERS = 0;  // 0 = all, set a number to limit for testing
const DRY_RUN = false;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Usage:');
  console.error('$env:NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"');
  console.error('$env:SUPABASE_SERVICE_ROLE_KEY="xxx"');
  console.error('npx tsx scripts/batch-scan-v2.ts');
  process.exit(1);
}

// ═══ SUPABASE CLIENT ═══
async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...(options.headers as any || {}),
    },
  });
  const raw = await res.text();
  if (!res.ok && options.method !== 'PATCH' && options.method !== 'DELETE') {
    console.error(`  DB error (${res.status}): ${raw.slice(0, 200)}`);
    return null;
  }
  if (options.method === 'PATCH' || options.method === 'DELETE') return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ═══ NPI FETCHER ═══
async function fetchNpi(npi: string): Promise<any> {
  try {
    const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`, {
      signal: AbortSignal.timeout(10000),
    });
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
      enumeration_date: basic.enumeration_date || null,
      last_update_date: basic.last_updated || null,
      addresses_secondary: secondaries,
    };
  } catch (err: any) {
    console.log(`  ⚠ NPPES: ${err.message}`);
    return null;
  }
}

// ═══ SITE CRAWLER ═══
async function crawl(url: string): Promise<any> {
  try {
    let u = url;
    if (!u.startsWith('http')) u = 'https://' + u;

    const res = await fetch(u, {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'KairoLogic-Sentry/3.1', 'Accept': 'text/html' },
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const html = await res.text();
    if (!html || html.length < 100) return null;

    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(html).digest('hex').slice(0, 16);
    const text = strip(html);

    const addr = getAddress(html, text);
    const phone = getPhone(html, text);
    const specs = getSpecialties(text);
    const provs = getProviders(text);

    return { ...addr, phone, specialty_labels: specs, provider_names: provs, provider_count: provs.length, source_hash: hash };
  } catch (err: any) {
    console.log(`  ⚠ Crawl: ${err.message}`);
    return null;
  }
}

function strip(h: string): string {
  return h.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function getAddress(html: string, text: string) {
  const e = { addr_line1: '', addr_line2: '', addr_city: '', addr_state: '', addr_zip: '' };
  // JSON-LD
  const ld = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (ld) {
    for (const b of ld) {
      try {
        const d = JSON.parse(b.replace(/<script[^>]*>|<\/script>/gi, '').trim());
        const a = d.address || d.location?.address;
        if (a?.streetAddress) return { addr_line1: a.streetAddress, addr_line2: '', addr_city: a.addressLocality || '', addr_state: a.addressRegion || '', addr_zip: (a.postalCode || '').slice(0, 5) };
      } catch {}
    }
  }
  // General pattern
  const m = text.match(/(\d{1,5}\s+[A-Za-z0-9\s.,#\-]+?)[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*,\s*([A-Z]{2})\s+(\d{5})/);
  if (m) { const p = m[1].trim().split(/[,\n]+/); return { addr_line1: p[0]?.trim() || '', addr_line2: p[1]?.trim() || '', addr_city: m[2], addr_state: m[3], addr_zip: m[4].slice(0, 5) }; }
  // TX pattern
  const tx = text.match(/(\d{1,5}\s+[A-Za-z0-9\s.,#\-]{5,40})\s*[\n,]\s*([A-Za-z\s]+),?\s*TX\s+(\d{5})/i);
  if (tx) return { addr_line1: tx[1].trim(), addr_line2: '', addr_city: tx[2].trim(), addr_state: 'TX', addr_zip: tx[3] };
  return e;
}

function getPhone(html: string, text: string): string {
  const tel = html.match(/href\s*=\s*["']tel:([^"']+)/i);
  if (tel) { const d = tel[1].replace(/\D/g, '').slice(-10); if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; }
  const jld = html.match(/"telephone"\s*:\s*"([^"]+)"/i);
  if (jld) { const d = jld[1].replace(/\D/g, '').slice(-10); if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; }
  const any = text.match(/\(?(\d{3})\)?[\s.\-](\d{3})[\s.\-](\d{4})/);
  if (any) return `(${any[1]}) ${any[2]}-${any[3]}`;
  return '';
}

const SPECS = ['family medicine','family practice','internal medicine','pediatrics','obstetrics','gynecology','psychiatry','psychology','dermatology','cardiology','orthopedics','neurology','oncology','mental health','behavioral health','counseling','primary care','urgent care','nurse practitioner','physical therapy','wellness','pain management','chiropractic','dentistry','dental','optometry','podiatry','allergy','gastroenterology','endocrinology','pulmonology','urology'];

function getSpecialties(text: string): string[] {
  const t = text.toLowerCase();
  return SPECS.filter(s => t.includes(s));
}

function getProviders(text: string): string[] {
  const names = new Set<string>();
  const cred = text.matchAll(/(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{2,})(?:\s*,\s*(?:MD|DO|NP|PA|PA-C|APRN|DNP|PhD|DPM|DC|DDS|DMD|OD|RN|LPC|LCSW|LMFT))/g);
  for (const m of cred) { const n = m[1].trim(); if (n.length >= 5 && n.length <= 40) names.add(n); }
  return [...names].slice(0, 50);
}

// ═══ CHECK LOGIC ═══
function norm(l1: string, city: string, st: string, zip: string): string {
  const ab: Record<string, string> = { 'ste':'suite','blvd':'boulevard','ave':'avenue','st':'street','dr':'drive','rd':'road','ln':'lane','ct':'court','pkwy':'parkway','hwy':'highway','n':'north','s':'south','e':'east','w':'west' };
  let a = [l1, city, st, zip].filter(Boolean).join(', ').toLowerCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim();
  return a.split(' ').map(w => ab[w] || w).join(' ');
}

function addrEq(a: string, b: string): boolean {
  if (!a || !b) return false; if (a === b) return true;
  const za = a.match(/\b(\d{5})\b/)?.[1], zb = b.match(/\b(\d{5})\b/)?.[1];
  if (za && zb && za !== zb) return false;
  const sa = a.replace(/\b(suite|apartment|unit|floor|building|room|#)\s*\w*/gi, '').replace(/\s+/g, ' ').trim();
  const sb = b.replace(/\b(suite|apartment|unit|floor|building|room|#)\s*\w*/gi, '').replace(/\s+/g, ' ').trim();
  return sa === sb;
}

function phoneNorm(p: string): string { const d = p.replace(/\D/g, ''); return d.length === 11 && d.startsWith('1') ? d.slice(1) : d; }

function specMatch(npiClass: string, siteLabels: string[]): boolean {
  const n = npiClass.toLowerCase();
  for (const s of siteLabels) { if (n.includes(s) || s.includes(n)) return true; }
  if (siteLabels.some(l => l.includes('primary care'))) return true;
  const syn: Record<string, string[]> = { 'family medicine': ['family practice', 'primary care'], 'internal medicine': ['primary care', 'internist'], 'psychiatry': ['mental health', 'behavioral health'], 'nurse practitioner': ['primary care'], 'clinical social worker': ['counseling', 'mental health', 'behavioral health'] };
  return (syn[n] || []).some(s => siteLabels.includes(s));
}

interface CResult { check_id: string; category: string; tier: string; status: string; score: number; title: string; detail: string; severity: string; evidence?: any; }

function runChecks(npi: any, site: any): CResult[] {
  const r: CResult[] = [];

  // NPI-01 Address
  if (npi && site?.addr_line1) {
    const nA = norm(npi.prac_line1, npi.prac_city, npi.prac_state, npi.prac_zip);
    const sA = norm(site.addr_line1, site.addr_city, site.addr_state, site.addr_zip);
    const ok = addrEq(nA, sA) || (npi.addresses_secondary || []).some((s: any) => addrEq(norm(s.line1, s.city, s.state, s.zip), sA));
    r.push({ check_id: 'NPI-01', category: 'npi-integrity', tier: 'free', severity: 'high', status: ok ? 'pass' : 'fail', score: ok ? 100 : 25,
      title: ok ? 'Address matches NPI' : 'Address mismatch', detail: ok ? `Verified: ${npi.prac_city}, ${npi.prac_state}` : `Site: "${site.addr_line1}, ${site.addr_city}" vs NPI: "${npi.prac_line1}, ${npi.prac_city}"`,
      evidence: { npi_address: `${npi.prac_line1}, ${npi.prac_city}, ${npi.prac_state} ${npi.prac_zip}`, site_address: `${site.addr_line1}, ${site.addr_city}, ${site.addr_state} ${site.addr_zip}` } });
  } else {
    r.push({ check_id: 'NPI-01', category: 'npi-integrity', tier: 'free', severity: 'high', status: 'inconclusive', score: 0, title: 'Address check incomplete', detail: npi ? 'No address on website' : 'NPI data unavailable' });
  }

  // NPI-02 Phone
  if (npi?.prac_phone && site?.phone) {
    const ok = phoneNorm(npi.prac_phone) === phoneNorm(site.phone);
    r.push({ check_id: 'NPI-02', category: 'npi-integrity', tier: 'free', severity: 'medium', status: ok ? 'pass' : 'fail', score: ok ? 100 : 40,
      title: ok ? 'Phone matches NPI' : 'Phone mismatch', detail: ok ? `Verified: ${npi.prac_phone}` : `Site: ${site.phone} vs NPI: ${npi.prac_phone}`,
      evidence: { npi_phone: npi.prac_phone, site_phone: site.phone } });
  } else {
    r.push({ check_id: 'NPI-02', category: 'npi-integrity', tier: 'free', severity: 'medium', status: 'inconclusive', score: 0, title: 'Phone check incomplete', detail: 'Phone not available' });
  }

  // NPI-03 Taxonomy
  if (npi?.tax_classification && site?.specialty_labels?.length) {
    const ok = specMatch(npi.tax_classification, site.specialty_labels);
    r.push({ check_id: 'NPI-03', category: 'npi-integrity', tier: 'report', severity: 'medium', status: ok ? 'pass' : 'warn', score: ok ? 100 : 60,
      title: ok ? 'Specialty matches NPI' : 'Specialty discrepancy', detail: ok ? `Verified: ${npi.tax_classification}` : `NPI: "${npi.tax_classification}" vs Site: "${site.specialty_labels.join(', ')}"`,
      evidence: { npi_classification: npi.tax_classification, site_specialties: site.specialty_labels } });
  } else {
    r.push({ check_id: 'NPI-03', category: 'npi-integrity', tier: 'report', severity: 'medium', status: 'inconclusive', score: 0, title: 'Specialty check incomplete', detail: 'Taxonomy or specialty data unavailable' });
  }

  // RST-01 Roster
  if (site?.provider_names?.length > 0) {
    r.push({ check_id: 'RST-01', category: 'npi-integrity', tier: 'report', severity: 'medium', status: 'pass', score: 80,
      title: `${site.provider_names.length} providers detected`, detail: `Found ${site.provider_names.length} provider(s) on website`,
      evidence: { site_count: site.provider_names.length, names: site.provider_names.slice(0, 10) } });
  } else {
    r.push({ check_id: 'RST-01', category: 'npi-integrity', tier: 'report', severity: 'medium', status: 'inconclusive', score: 0, title: 'Provider roster not detected', detail: 'No provider names found on website' });
  }

  return r;
}

// ═══ MAIN ═══
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  KairoLogic Batch Re-Scan v2');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL.slice(0, 40)}...`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('');

  // 1. Pull all providers with URLs
  const providers = await db(
    'registry?url=not.is.null&url=neq.&select=npi,name,url,city,zip,email,risk_score,risk_level'
  );

  if (!providers?.length) {
    console.log('❌ No providers found');
    return;
  }

  const total = MAX_PROVIDERS > 0 ? Math.min(providers.length, MAX_PROVIDERS) : providers.length;
  console.log(`📋 ${providers.length} providers found. Scanning ${total}.\n`);

  let scanned = 0, crawled = 0, npiFound = 0;
  let cPass = 0, cFail = 0, cWarn = 0, cInc = 0;
  const errors: string[] = [];

  for (let i = 0; i < total; i++) {
    const p = providers[i];
    console.log(`[${i + 1}/${total}] ${p.name} (${p.npi}) — ${p.url}`);

    try {
      // a. Fetch NPI
      const npi = await fetchNpi(p.npi);
      if (npi) npiFound++;

      // b. Crawl site
      const site = await crawl(p.url);
      if (site) crawled++;

      // c. Run checks
      const results = runChecks(npi, site);

      // d. Score
      const scoreable = results.filter(r => r.status !== 'inconclusive');
      const score = scoreable.length > 0
        ? Math.round(scoreable.reduce((s, r) => s + r.score, 0) / scoreable.length)
        : 0;
      const level = score >= 75 ? 'Sovereign' : score >= 50 ? 'Drift' : score > 0 ? 'Violation' : 'Inconclusive';

      for (const r of results) {
        if (r.status === 'pass') cPass++;
        else if (r.status === 'fail') cFail++;
        else if (r.status === 'warn') cWarn++;
        else cInc++;
      }

      const icons = results.map(r => r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : r.status === 'warn' ? '⚠' : '?').join('');
      console.log(`  → ${score}/100 (${level}) [${icons}] site:${site ? '✓' : '✗'} npi:${npi ? '✓' : '✗'}`);

      if (!DRY_RUN) {
        // e. Store NPI data
        if (npi) {
          await db(`org_npi_footprint?npi=eq.${p.npi}`, { method: 'DELETE' });
          await db('org_npi_footprint', { method: 'POST', body: JSON.stringify({
            npi: npi.npi, org_name: npi.org_name,
            prac_line1: npi.prac_line1, prac_line2: npi.prac_line2,
            prac_city: npi.prac_city, prac_state: npi.prac_state, prac_zip: npi.prac_zip,
            prac_phone: npi.prac_phone, tax_code: npi.tax_code, tax_classification: npi.tax_classification,
            enumeration_date: npi.enumeration_date, last_update_date: npi.last_update_date,
            addresses_secondary: npi.addresses_secondary, fetched_at: new Date().toISOString(),
          })});
        }

        // f. Store site snapshot
        if (site) {
          await db('site_snapshots', { method: 'POST', body: JSON.stringify({
            npi: p.npi, url: p.url,
            addr_line1: site.addr_line1, addr_line2: site.addr_line2,
            addr_city: site.addr_city, addr_state: site.addr_state, addr_zip: site.addr_zip,
            phone: site.phone, specialty_labels: site.specialty_labels,
            provider_names: site.provider_names, provider_count: site.provider_count,
            source_hash: site.source_hash,
          })});
        }

        // g. Scan session
        const sess = await db('scan_sessions', { method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            npi: p.npi, url: p.url, tier: 'free',
            composite_score: score, risk_level: level,
            checks_total: results.length,
            checks_passed: results.filter(r => r.status === 'pass').length,
            checks_failed: results.filter(r => r.status === 'fail').length,
            checks_warned: results.filter(r => r.status === 'warn').length,
            triggered_by: 'batch_v2',
            started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
          })
        });
        const scanId = sess?.[0]?.id;

        // h. Check results
        for (const r of results) {
          await db('check_results', { method: 'POST', body: JSON.stringify({
            scan_id: scanId, npi: p.npi, check_id: r.check_id,
            category: r.category, tier: r.tier, status: r.status,
            score: r.score, title: r.title, detail: r.detail,
            evidence: r.evidence || null, severity: r.severity,
          })});
        }

        // i. Mismatch alerts
        const dimMap: Record<string, string> = { 'NPI-01': 'address', 'NPI-02': 'phone', 'NPI-03': 'taxonomy', 'RST-01': 'roster_count' };
        for (const r of results) {
          if (r.status === 'fail' || r.status === 'warn') {
            await db('mismatch_alerts', { method: 'POST', body: JSON.stringify({
              npi: p.npi, check_id: r.check_id,
              dimension: dimMap[r.check_id] || 'unknown', severity: r.severity,
              npi_value: r.evidence?.npi_address || r.evidence?.npi_phone || r.evidence?.npi_classification || '',
              site_value: r.evidence?.site_address || r.evidence?.site_phone || r.evidence?.site_specialties?.join(', ') || '',
              delta_detail: r.detail, risk_score: r.score, status: 'open',
            })});
          }
        }

        // j. Update registry
        await db(`registry?npi=eq.${p.npi}`, { method: 'PATCH', body: JSON.stringify({
          risk_score: score, risk_level: level, last_scan_timestamp: new Date().toISOString(),
        })});
      }

      scanned++;
    } catch (err: any) {
      console.log(`  ❌ ${err.message}`);
      errors.push(`${p.npi}: ${err.message}`);
    }

    if (i < total - 1) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Scanned:     ${scanned}/${total}`);
  console.log(`  NPI found:   ${npiFound}`);
  console.log(`  Sites crawled: ${crawled}`);
  console.log(`  Passed: ${cPass}  Failed: ${cFail}  Warned: ${cWarn}  Inconclusive: ${cInc}`);
  console.log(`  Errors: ${errors.length}`);
  if (errors.length) errors.slice(0, 5).forEach(e => console.log(`    • ${e}`));
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
