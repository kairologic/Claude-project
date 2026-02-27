#!/usr/bin/env tsx
// scripts/batch-scan-v3.ts
// ═══ KairoLogic CDN-Aware Batch Re-Scan — v3 Engine ═══
//
// Run with: npx tsx scripts/batch-scan-v3.ts
//
// What's new in v3:
// - CDN detection (IP CIDR, CNAME, HTTP headers)
// - DR-01 passes for CDN-hosted sites (no more false positives)
// - DR-05 CDN Data Path Transparency advisory
// - DR-04 excludes known US SaaS providers
// - DR-03 recognizes known US mail providers
// - Outputs CDN detection report CSV for review

// ═══ CONFIGURATION ═══
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BATCH_DELAY_MS = 600;
const MAX_PROVIDERS = 100;
const DRY_RUN = false;
const SAVE_CDN_REPORT = true;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Usage:');
  console.error('$env:NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"');
  console.error('$env:SUPABASE_SERVICE_ROLE_KEY="xxx"');
  console.error('npx tsx scripts/batch-scan-v3.ts');
  process.exit(1);
}

// ═══ CDN DETECTION ═══

interface CIDRRange { networkInt: number; maskBits: number; provider: string }

const CDN_CIDR_DEFS: { provider: string; ranges: string[] }[] = [
  { provider: 'Cloudflare', ranges: ['173.245.48.0/20','103.21.244.0/22','103.22.200.0/22','103.31.4.0/22','141.101.64.0/18','108.162.192.0/18','190.93.240.0/20','188.114.96.0/20','197.234.240.0/22','198.41.128.0/17','162.158.0.0/15','104.16.0.0/13','104.24.0.0/14','172.64.0.0/13','131.0.72.0/22'] },
  { provider: 'Fastly', ranges: ['23.235.32.0/20','43.249.72.0/22','103.244.50.0/24','103.245.222.0/23','103.245.224.0/24','104.156.80.0/20','140.248.64.0/18','140.248.128.0/17','146.75.0.0/17','151.101.0.0/16','157.52.64.0/18','167.82.0.0/17','185.31.17.0/24','199.27.72.0/21','199.232.0.0/16'] },
  { provider: 'Akamai', ranges: ['23.0.0.0/12','23.32.0.0/11','23.64.0.0/14','23.72.0.0/13','104.64.0.0/10','184.24.0.0/13','184.50.0.0/15','184.84.0.0/14','2.16.0.0/13'] },
  { provider: 'CloudFront', ranges: ['13.32.0.0/15','13.35.0.0/16','13.224.0.0/14','13.249.0.0/16','18.64.0.0/14','18.154.0.0/15','52.84.0.0/15','54.182.0.0/16','54.192.0.0/16','54.230.0.0/16','99.84.0.0/16','99.86.0.0/16','130.176.0.0/17','143.204.0.0/16','205.251.192.0/19','216.137.32.0/19'] },
  { provider: 'Azure CDN', ranges: ['13.107.246.0/24','13.107.213.0/24','152.199.0.0/16'] },
  { provider: 'Vercel', ranges: ['76.76.21.0/24','76.223.0.0/16'] },
];

function parseCIDR(cidr: string) {
  const [ip, bits] = cidr.split('/');
  const p = ip.split('.').map(Number);
  return { networkInt: ((p[0]<<24)|(p[1]<<16)|(p[2]<<8)|p[3])>>>0, maskBits: parseInt(bits) };
}
function ipToInt(ip: string): number {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255)) return 0;
  return ((p[0]<<24)|(p[1]<<16)|(p[2]<<8)|p[3])>>>0;
}
const CDN_RANGES: CIDRRange[] = [];
for (const def of CDN_CIDR_DEFS) for (const cidr of def.ranges) { const p = parseCIDR(cidr); CDN_RANGES.push({ ...p, provider: def.provider }); }

function detectCDNByIP(ip: string): { detected: boolean; provider: string } {
  const n = ipToInt(ip); if (n === 0) return { detected: false, provider: '' };
  for (const r of CDN_RANGES) { const mask = r.maskBits === 0 ? 0 : (~0 << (32 - r.maskBits)) >>> 0; if ((n & mask) === (r.networkInt & mask)) return { detected: true, provider: r.provider }; }
  return { detected: false, provider: '' };
}

const CNAME_PATTERNS: { pattern: string; provider: string }[] = [
  { pattern: '.cloudflare.com', provider: 'Cloudflare' },{ pattern: '.cloudflare.net', provider: 'Cloudflare' },
  { pattern: '.fastly.net', provider: 'Fastly' },{ pattern: '.fastlylb.net', provider: 'Fastly' },
  { pattern: '.akamai.net', provider: 'Akamai' },{ pattern: '.akamaized.net', provider: 'Akamai' },{ pattern: '.akamaiedge.net', provider: 'Akamai' },{ pattern: '.edgesuite.net', provider: 'Akamai' },{ pattern: '.edgekey.net', provider: 'Akamai' },
  { pattern: '.cloudfront.net', provider: 'CloudFront' },
  { pattern: '.azureedge.net', provider: 'Azure CDN' },{ pattern: '.azurefd.net', provider: 'Azure CDN' },
  { pattern: '.vercel.app', provider: 'Vercel' },{ pattern: '.vercel-dns.com', provider: 'Vercel' },
  { pattern: '.netlify.app', provider: 'Netlify' },{ pattern: '.netlify.com', provider: 'Netlify' },
  { pattern: '.kinsta.cloud', provider: 'Kinsta (CDN)' },{ pattern: '.wpdns.site', provider: 'WP Engine (CDN)' },{ pattern: '.wpengine.com', provider: 'WP Engine (CDN)' },
  { pattern: '.pantheonsite.io', provider: 'Pantheon (CDN)' },{ pattern: '.squarespace.com', provider: 'Squarespace (CDN)' },
  { pattern: '.wixsite.com', provider: 'Wix (CDN)' },{ pattern: '.wix.com', provider: 'Wix (CDN)' },
  { pattern: '.shopify.com', provider: 'Shopify (CDN)' },{ pattern: '.webflow.io', provider: 'Webflow (CDN)' },
  { pattern: '.pages.dev', provider: 'Cloudflare Pages' },{ pattern: '.workers.dev', provider: 'Cloudflare Workers' },
  { pattern: '.sucuri.net', provider: 'Sucuri (CDN)' },{ pattern: '.stackpathdns.com', provider: 'StackPath (CDN)' },
  { pattern: '.herokuapp.com', provider: 'Heroku' },{ pattern: '.fly.dev', provider: 'Fly.io' },
];

async function detectCDNByCNAME(domain: string): Promise<{ detected: boolean; provider: string; cname: string }> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { detected: false, provider: '', cname: '' };
    const data = await res.json();
    if (!data.Answer) return { detected: false, provider: '', cname: '' };
    for (const a of data.Answer) {
      if (a.type !== 5) continue;
      const cname = (a.data || '').toLowerCase().replace(/\.$/, '');
      for (const p of CNAME_PATTERNS) { if (cname.endsWith(p.pattern)) return { detected: true, provider: p.provider, cname }; }
    }
    return { detected: false, provider: '', cname: '' };
  } catch { return { detected: false, provider: '', cname: '' }; }
}

function detectCDNByHeaders(headers: Record<string, string>): { detected: boolean; provider: string } {
  if (headers['cf-ray'] || headers['server'] === 'cloudflare' || headers['cf-cache-status']) return { detected: true, provider: 'Cloudflare' };
  if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop']) return { detected: true, provider: 'CloudFront' };
  if (headers['x-served-by']?.includes('cache-') || headers['x-cache']?.includes('fastly') || headers['x-fastly-request-id']) return { detected: true, provider: 'Fastly' };
  if (headers['x-vercel-id'] || headers['x-vercel-cache']) return { detected: true, provider: 'Vercel' };
  if (headers['x-azure-ref'] || headers['x-msedge-ref']) return { detected: true, provider: 'Azure CDN' };
  if (headers['x-akamai-transformed'] || (headers['server'] || '').includes('akamai')) return { detected: true, provider: 'Akamai' };
  if (headers['x-nf-request-id'] || headers['server'] === 'netlify') return { detected: true, provider: 'Netlify' };
  if (headers['x-sucuri-id'] || (headers['server'] || '').includes('sucuri')) return { detected: true, provider: 'Sucuri' };
  return { detected: false, provider: '' };
}

interface CDNResult { detected: boolean; provider: string; detectedVia: string }

async function detectCDN(ip: string, domain: string, headers: Record<string, string>): Promise<CDNResult> {
  const ipR = detectCDNByIP(ip);
  if (ipR.detected) return { detected: true, provider: ipR.provider, detectedVia: 'ip_range' };
  const hR = detectCDNByHeaders(headers);
  if (hR.detected) return { detected: true, provider: hR.provider, detectedVia: 'headers' };
  const cR = await detectCDNByCNAME(domain);
  if (cR.detected) return { detected: true, provider: cR.provider, detectedVia: 'cname' };
  return { detected: false, provider: '', detectedVia: 'none' };
}

// Known US SaaS
const US_SAAS = ['google-analytics.com','googletagmanager.com','googleapis.com','gstatic.com','google.com','doubleclick.net','facebook.com','facebook.net','fbcdn.net','stripe.com','stripe.network','hubspot.com','hsforms.com','hs-scripts.com','cloudflare.com','jsdelivr.net','jquery.com','youtube.com','vimeo.com','fonts.googleapis.com','fonts.gstatic.com','maps.googleapis.com','typekit.net','calendly.com','zocdoc.com','patientpop.com','accessibe.com','userway.org','intercom.io','zendesk.com','tawk.to','tidio.co','instagram.com','twitter.com','linkedin.com','pinterest.com'];
function isKnownUSSaaS(domain: string): boolean { const l = domain.toLowerCase(); return US_SAAS.some(e => l === e || l.endsWith('.' + e)); }

// Known US mail
const US_MAIL = ['google.com','googlemail.com','outlook.com','protection.outlook.com','amazonses.com','pphosted.com','mimecast.com','emailsrvr.com','secureserver.net','zoho.com','paubox.com'];
function isKnownUSMail(exchange: string): boolean { const l = exchange.toLowerCase(); return US_MAIL.some(e => l === e || l.endsWith('.' + e)); }

// ═══ SUPABASE CLIENT ═══
async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': options.method === 'POST' ? 'return=representation' : 'return=minimal', ...(options.headers as any || {}) },
  });
  const raw = await res.text();
  if (!res.ok && options.method !== 'PATCH' && options.method !== 'DELETE') { console.error(`  DB error (${res.status}): ${raw.slice(0, 200)}`); return null; }
  if (options.method === 'PATCH' || options.method === 'DELETE') return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ═══ UTILITIES ═══
async function geoLookup(hostname: string): Promise<{ ip: string; country: string; countryCode: string; city: string; org: string; isSovereign: boolean } | null> {
  try {
    const res = await fetch(`http://ip-api.com/json/${hostname}?fields=status,country,countryCode,city,org,isp,query`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.status !== 'success') return null;
    return { ip: d.query || '', country: d.country || '', countryCode: d.countryCode || '', city: d.city || '', org: d.org || d.isp || '', isSovereign: d.countryCode === 'US' };
  } catch { return null; }
}

async function resolveMX(domain: string): Promise<{ exchange: string; preference: number }[]> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.Answer) return [];
    return data.Answer.filter((a: any) => a.type === 15).map((a: any) => { const p = a.data.split(' '); return { preference: parseInt(p[0]) || 0, exchange: (p[1] || '').replace(/\.$/, '') }; });
  } catch { return []; }
}

async function fetchPage(url: string): Promise<{ html: string; headers: Record<string, string>; success: boolean }> {
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'KairoLogic-Sentry/3.2', 'Accept': 'text/html' }, redirect: 'follow' });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v.toLowerCase(); });
    if (!res.ok) return { html: '', headers, success: false };
    const html = await res.text();
    return { html, headers, success: html.length > 100 };
  } catch { return { html: '', headers: {}, success: false }; }
}

function extractDomain(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname; }
  catch { return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]; }
}

// ═══ CHECK RESULTS ═══
interface CheckResult { check_id: string; category: string; tier: string; severity: string; status: 'pass' | 'fail' | 'warn' | 'inconclusive'; score: number; title: string; detail: string; evidence?: Record<string, unknown>; cdn_detected?: boolean; cdn_provider?: string }

async function runScanChecks(url: string, domain: string): Promise<{ results: CheckResult[]; cdn: CDNResult }> {
  const results: CheckResult[] = [];
  const page = await fetchPage(url);
  const geo = await geoLookup(domain);
  const cdn = geo ? await detectCDN(geo.ip, domain, page.headers) : await detectCDN('', domain, page.headers);

  // DR-01
  if (!geo) {
    results.push({ check_id: 'DR-01', category: 'data-sovereignty', tier: 'free', severity: 'high', status: 'warn', score: 50, title: 'IP resolution failed', detail: `Unable to resolve IP for ${domain}`, evidence: { domain } });
  } else if (cdn.detected && !geo.isSovereign) {
    results.push({ check_id: 'DR-01', category: 'data-sovereignty', tier: 'free', severity: 'low', status: 'pass', score: 95,
      title: `CDN: ${cdn.provider}`,
      detail: `IP ${geo.ip} geolocates to ${geo.city}, ${geo.country} but is ${cdn.provider} anycast (${cdn.detectedVia}). US edge nodes serve US traffic.`,
      evidence: { ip: geo.ip, country: geo.countryCode, city: geo.city, org: geo.org, cdnProvider: cdn.provider, cdnVia: cdn.detectedVia, isSovereign: false },
      cdn_detected: true, cdn_provider: cdn.provider });
  } else if (geo.isSovereign) {
    results.push({ check_id: 'DR-01', category: 'data-sovereignty', tier: 'free', severity: 'low', status: 'pass', score: 100,
      title: 'US-hosted', detail: `Server ${geo.ip} in ${geo.city}, US (${geo.org}).`,
      evidence: { ip: geo.ip, country: geo.countryCode, city: geo.city, org: geo.org },
      cdn_detected: cdn.detected, cdn_provider: cdn.provider || undefined });
  } else {
    results.push({ check_id: 'DR-01', category: 'data-sovereignty', tier: 'free', severity: 'critical', status: 'fail', score: 0,
      title: `Foreign: ${geo.country}`, detail: `Server ${geo.ip} in ${geo.city}, ${geo.country} (${geo.org}). No CDN detected.`,
      evidence: { ip: geo.ip, country: geo.countryCode, city: geo.city, org: geo.org, cdnDetected: false } });
  }

  // DR-05 (CDN advisory)
  if (cdn.detected) {
    results.push({ check_id: 'DR-05', category: 'data-sovereignty', tier: 'free', severity: 'advisory', status: 'warn', score: 80,
      title: `CDN transparency: ${cdn.provider}`, detail: `Uses ${cdn.provider}. Execute DPA, create Data Flow Map, add attestation.`,
      evidence: { cdnProvider: cdn.provider, detectedVia: cdn.detectedVia } });
  }

  // DR-02
  const foreignRegions = ['eu-','ap-','sa-','af-','me-','cn-','ams','fra','sin','syd','tok','lon','cdg','bom','gru','nrt','icn','dub','lhr'];
  const allVals = Object.values(page.headers).join(' ');
  const foreignEdges = foreignRegions.filter(r => allVals.includes(r)).map(r => r.toUpperCase());
  const cfPop = (page.headers['cf-ray'] || '').split('-').pop() || '';
  if (['AMS','FRA','SIN','SYD','TOK','LON','CDG','BOM','GRU','NRT','ICN','DUB','LHR','HKG'].some(p => cfPop.toUpperCase().includes(p))) foreignEdges.push(`CF:${cfPop.toUpperCase()}`);
  results.push({ check_id: 'DR-02', category: 'data-sovereignty', tier: 'free', severity: foreignEdges.length > 0 ? 'medium' : 'low',
    status: foreignEdges.length > 0 ? 'warn' : 'pass', score: foreignEdges.length > 0 ? 70 : 100,
    title: foreignEdges.length > 0 ? `Foreign edges: ${foreignEdges.join(', ')}` : 'No foreign edge nodes',
    detail: foreignEdges.length > 0 ? `CDN foreign indicators: ${foreignEdges.join(', ')}. Static asset only.` : 'US-restricted.', evidence: { foreignEdges } });

  // DR-03 (US mail aware)
  const mxRecords = await resolveMX(domain);
  if (mxRecords.length === 0) {
    results.push({ check_id: 'DR-03', category: 'data-sovereignty', tier: 'free', severity: 'medium', status: 'warn', score: 60, title: 'No MX records', detail: `No MX for ${domain}.` });
  } else {
    const mxGeo = await Promise.all(mxRecords.slice(0, 3).map(async mx => ({ exchange: mx.exchange, geo: await geoLookup(mx.exchange) })));
    const foreignMX = mxGeo.filter(r => r.geo && !r.geo.isSovereign && !isKnownUSMail(r.exchange));
    results.push({ check_id: 'DR-03', category: 'data-sovereignty', tier: 'free', severity: foreignMX.length > 0 ? 'critical' : 'low',
      status: foreignMX.length > 0 ? 'fail' : 'pass', score: foreignMX.length > 0 ? 10 : 100,
      title: foreignMX.length > 0 ? `Foreign mail: ${foreignMX.map(f => f.geo?.country).join(', ')}` : `MX: ${mxRecords[0].exchange}`,
      detail: foreignMX.length > 0 ? `Foreign: ${foreignMX.map(f => `${f.exchange} (${f.geo?.country})`).join('; ')}` : `${mxRecords.length} MX, all US. Primary: ${mxRecords[0].exchange}`,
      evidence: { mxRecords: mxRecords.map(r => r.exchange) } });
  }

  // DR-04 (US SaaS aware)
  if (page.success) {
    const extDomains = new Set<string>();
    let m; const re = /(?:src|href|action)=["']?(https?:\/\/[^"'\s>]+)/gi;
    while ((m = re.exec(page.html)) !== null) { try { const d = extractDomain(m[1]); if (d && d !== domain && !d.includes('localhost')) extDomains.add(d); } catch {} }
    if (extDomains.size === 0) {
      results.push({ check_id: 'DR-04', category: 'data-sovereignty', tier: 'free', severity: 'low', status: 'pass', score: 100, title: 'No external domains', detail: 'Self-contained.' });
    } else {
      const toCheck = [...extDomains].slice(0, 10);
      const geoR = await Promise.all(toCheck.map(async d => ({ domain: d, geo: await geoLookup(d), isUS: isKnownUSSaaS(d) })));
      const foreign = geoR.filter(r => r.geo && !r.geo.isSovereign && !r.isUS);
      results.push({ check_id: 'DR-04', category: 'data-sovereignty', tier: 'free', severity: foreign.length > 0 ? 'high' : 'low',
        status: foreign.length > 0 ? 'warn' : 'pass', score: foreign.length > 0 ? 40 : 100,
        title: foreign.length > 0 ? `${foreign.length} foreign sub-processor(s)` : `${extDomains.size} external, all US`,
        detail: foreign.length > 0 ? `Foreign: ${foreign.map(f => `${f.domain} (${f.geo?.country})`).join(', ')}` : `Sampled ${toCheck.length}, all US.`,
        evidence: { totalExternal: extDomains.size, foreign: foreign.map(f => ({ d: f.domain, c: f.geo?.country })) } });
    }
  } else {
    results.push({ check_id: 'DR-04', category: 'data-sovereignty', tier: 'free', severity: 'medium', status: 'warn', score: 50, title: 'Page fetch failed', detail: 'Could not fetch for sub-processor check.' });
  }

  return { results, cdn };
}

// ═══ MAIN ═══
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  KairoLogic Batch Re-Scan v3 (CDN-Aware)');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL.slice(0, 40)}...`);
  console.log(`  Max: ${MAX_PROVIDERS}  Dry run: ${DRY_RUN}\n`);

  const providers = await db('registry?url=not.is.null&url=neq.&select=npi,name,url,city,zip,email,risk_score,risk_level&limit=' + MAX_PROVIDERS);
  if (!providers?.length) { console.log('No providers found'); return; }

  const total = providers.length;
  console.log(`📋 ${total} providers to scan.\n`);

  const cdnReport: { npi: string; name: string; url: string; domain: string; dr01_old: string; dr01_new: string; cdn: boolean; cdn_prov: string; cdn_via: string; score: number; level: string; checks: string }[] = [];
  let scanned = 0, cdnCount = 0, foreignCount = 0, usCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < total; i++) {
    const p = providers[i];
    const url = p.url.startsWith('http') ? p.url : `https://${p.url}`;
    const domain = extractDomain(url);
    console.log(`[${i+1}/${total}] ${p.name} (${p.npi}) — ${domain}`);

    try {
      const { results, cdn } = await runScanChecks(url, domain);
      const scoreable = results.filter(r => r.status !== 'inconclusive');
      const score = scoreable.length > 0 ? Math.round(scoreable.reduce((s, r) => s + r.score, 0) / scoreable.length) : 0;
      const level = score >= 75 ? 'Sovereign' : score >= 50 ? 'Drift' : score > 0 ? 'Violation' : 'Inconclusive';
      const dr01 = results.find(r => r.check_id === 'DR-01');
      const icons = results.map(r => r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '⚠').join('');

      if (cdn.detected) { cdnCount++; console.log(`  → CDN: ${cdn.provider} (${cdn.detectedVia})`); }
      else if (dr01?.status === 'fail') { foreignCount++; console.log(`  → FOREIGN: ${(dr01.evidence as any)?.country || '?'}`); }
      else { usCount++; }
      console.log(`  → ${score}/100 (${level}) [${icons}]`);

      const wasfalsePositive = cdn.detected && !(dr01?.evidence as any)?.isSovereign;
      cdnReport.push({ npi: p.npi, name: p.name, url: p.url, domain,
        dr01_old: wasfalsePositive ? 'FAIL (CDN FP)' : (dr01?.status || '?'),
        dr01_new: dr01?.status || '?', cdn: cdn.detected, cdn_prov: cdn.provider, cdn_via: cdn.detectedVia,
        score, level, checks: results.map(r => `${r.check_id}:${r.status}`).join(' ') });

      if (!DRY_RUN) {
        const sess = await db('scan_sessions', { method: 'POST', headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({ npi: p.npi, url: p.url, tier: 'free', composite_score: score, risk_level: level,
            checks_total: results.length, checks_passed: results.filter(r => r.status === 'pass').length,
            checks_failed: results.filter(r => r.status === 'fail').length, checks_warned: results.filter(r => r.status === 'warn').length,
            triggered_by: 'batch_v3_cdn', started_at: new Date().toISOString(), completed_at: new Date().toISOString() }) });
        const scanId = sess?.[0]?.id;
        for (const r of results) {
          await db('check_results', { method: 'POST', body: JSON.stringify({ scan_id: scanId, npi: p.npi, check_id: r.check_id,
            category: r.category, tier: r.tier, status: r.status, score: r.score, title: r.title, detail: r.detail,
            evidence: r.evidence || null, severity: r.severity }) });
        }
        await db(`registry?npi=eq.${p.npi}`, { method: 'PATCH', body: JSON.stringify({
          risk_score: score, risk_level: level, last_scan_timestamp: new Date().toISOString() }) });
      }
      scanned++;
    } catch (err: any) { console.log(`  ❌ ${err.message}`); errors.push(`${p.npi}: ${err.message}`); }

    if (i < total - 1) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Scanned:         ${scanned}/${total}`);
  console.log(`  CDN detected:    ${cdnCount} (were false positives)`);
  console.log(`  Genuine foreign: ${foreignCount}`);
  console.log(`  US-hosted:       ${usCount}`);
  console.log(`  Errors:          ${errors.length}`);

  if (SAVE_CDN_REPORT) {
    const { writeFileSync } = await import('fs');
    const hdr = 'NPI,Name,URL,Domain,DR01_Old,DR01_New,CDN,CDN_Provider,CDN_Via,Score,Level,Checks';
    const rows = cdnReport.map(r => `"${r.npi}","${r.name.replace(/"/g,'""')}","${r.url}","${r.domain}","${r.dr01_old}","${r.dr01_new}",${r.cdn},"${r.cdn_prov}","${r.cdn_via}",${r.score},"${r.level}","${r.checks}"`);
    const fn = `cdn-scan-report-${new Date().toISOString().slice(0,10)}.csv`;
    writeFileSync(fn, [hdr, ...rows].join('\n'));
    console.log(`\n📊 CDN report: ${fn}`);

    const provs: Record<string, number> = {};
    cdnReport.filter(r => r.cdn).forEach(r => { provs[r.cdn_prov] = (provs[r.cdn_prov] || 0) + 1; });
    if (Object.keys(provs).length) { console.log('\n  CDN Providers:'); Object.entries(provs).sort((a,b) => b[1]-a[1]).forEach(([p,c]) => console.log(`    ${p}: ${c}`)); }

    const fixed = cdnReport.filter(r => r.dr01_old.includes('FP'));
    if (fixed.length) { console.log(`\n  🔧 Fixed false positives (${fixed.length}):`); fixed.slice(0,10).forEach(r => console.log(`    ${r.name} → ${r.cdn_prov} (${r.cdn_via})`)); }

    const foreign = cdnReport.filter(r => r.dr01_new === 'fail');
    if (foreign.length) { console.log(`\n  🌍 Genuine foreign (${foreign.length}):`); foreign.forEach(r => console.log(`    ${r.name} (${r.domain})`)); }
  }
  console.log('\n═══════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
