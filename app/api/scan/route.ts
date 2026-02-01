import { NextRequest, NextResponse } from 'next/server';

/**
 * KairoLogic Sentry Scanner API v3.0
 * ===================================
 * REAL compliance scans with intelligent risk weighting.
 * 
 * v3.0 IMPROVEMENTS:
 * 1. Priority Matrix scoring (not all failures equal)
 * 2. PHI context classification (static asset vs form handler)
 * 3. Page context detection (contact page vs patient intake)
 * 4. Category-level scores (Data Residency, AI Transparency, Clinical Integrity)
 * 5. Data Border Map (geo evidence for visualization)
 * 
 * Scan Categories:
 * - DR-01..04: Data Sovereignty & Residency (SB 1188)
 * - AI-01..04: AI Transparency & Disclosure (HB 149)
 * - ER-01..04: EHR System Integrity
 * 
 * Scoring: Weighted category scores → composite.
 * Thresholds: Sovereign (67-100), Drift (34-66), Violation (0-33)
 */

// ─── TYPES ──────────────────────────────────────────────

type RiskTier = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface ScanFinding {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
  clause: string;
  severity: RiskTier;
  category: 'data_sovereignty' | 'ai_transparency' | 'clinical_integrity';
  /** PHI context: does this finding involve actual protected health info transit? */
  phiRisk: 'direct' | 'indirect' | 'none';
  /** Page context where finding was detected */
  pageContext?: string;
  evidence?: Record<string, unknown>;
}

interface CategoryScore {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  level: string;
  findings: number;
  passed: number;
  failed: number;
  warnings: number;
}

interface DataBorderNode {
  domain: string;
  ip?: string;
  country: string;
  countryCode: string;
  city: string;
  type: 'primary' | 'cdn' | 'mail' | 'sub-processor';
  isSovereign: boolean;
  phiRisk: 'direct' | 'indirect' | 'none';
  purpose?: string;
}

// ─── CONSTANTS ──────────────────────────────────────────

const ENGINE_VERSION = 'SENTRY-3.0.0';

// Category weights for composite score (must sum to 1.0)
const CATEGORY_WEIGHTS = {
  data_sovereignty: 0.45,   // Highest weight — immediate fine risk
  ai_transparency: 0.30,    // Required disclosure
  clinical_integrity: 0.25,  // Portal-specific, may not apply
};

// Severity deductions within each category (percentage points)
const SEVERITY_DEDUCTIONS: Record<RiskTier, number> = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
  info: 0,
};

// AI transparency keywords required by HB 149
const AI_DISCLOSURE_KEYWORDS = [
  'artificial intelligence', 'ai disclosure', 'machine learning',
  'algorithm', 'ai-assisted', 'ai assisted', 'automated decision',
  'clinical ai', 'ai tool', 'ai system', 'ai-powered', 'ai powered',
  'computer-aided', 'computer aided', 'predictive model',
  'deep learning', 'neural network', 'intelligent system'
];

// Dark pattern CSS indicators
const DARK_PATTERN_INDICATORS = [
  'display:none', 'display: none', 'visibility:hidden', 'visibility: hidden',
  'opacity:0', 'opacity: 0', 'font-size:0', 'font-size: 0',
  'height:0', 'height: 0', 'width:0', 'width: 0',
  'text-indent:-9999', 'position:absolute;left:-9999',
  'clip:rect(0,0,0,0)', 'overflow:hidden;height:0'
];

// Chatbot platform signatures
const CHATBOT_SIGNATURES = [
  'intercom', 'drift', 'zendesk', 'tidio', 'livechat', 'tawk',
  'crisp', 'freshchat', 'hubspot-messages', 'olark', 'chatra',
  'comm100', 'happyfox', 'chatbot', 'dialogflow', 'botpress',
  'manychat', 'mobilemonkey', 'chatfuel', 'landbot'
];

// EHR platform signatures
const EHR_SIGNATURES = [
  'nextgen', 'epic', 'cerner', 'athena', 'allscripts', 'eclinicalworks',
  'drchrono', 'kareo', 'practice fusion', 'elation', 'greenway',
  'meditech', 'modernizing medicine', 'advancedmd', 'patientpop',
  'patient portal', 'myhealth', 'my chart', 'mychart', 'followmyhealth'
];

// Known non-US CDN/hosting indicators
const NON_US_INDICATORS = {
  cdnHeaders: ['cf-ray', 'x-served-by', 'x-cache', 'x-amz-cf-id', 'via'],
  foreignRegions: ['eu-', 'ap-', 'sa-', 'af-', 'me-', 'cn-', 'ams', 'fra', 'sin', 'syd', 'tok', 'lon', 'cdg', 'bom', 'gru', 'nrt', 'icn', 'dub', 'lhr'],
};

// Static asset extensions (lower PHI risk)
const STATIC_ASSET_EXTENSIONS = [
  '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.webp',
  '.pdf', '.map', '.json'
];

// PHI-capable endpoints (higher risk)
const PHI_ENDPOINT_PATTERNS = [
  'api', 'submit', 'form', 'login', 'auth', 'patient', 'portal',
  'intake', 'registration', 'appointment', 'booking', 'schedule',
  'payment', 'billing', 'insurance', 'record', 'chart', 'health',
  'prescription', 'referral', 'message', 'secure'
];

// ─── UTILITY FUNCTIONS ──────────────────────────────────

async function safeFetch(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers,
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return response;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function resolveIPGeo(hostname: string): Promise<{
  ip: string; country: string; countryCode: string;
  region: string; city: string; org: string; isSovereign: boolean;
} | null> {
  try {
    const response = await safeFetch(
      `http://ip-api.com/json/${hostname}?fields=status,country,countryCode,regionName,city,isp,org,query`,
      {}, 5000
    );
    if (!response || !response.ok) return null;
    const data = await response.json();
    if (data.status !== 'success') return null;
    const countryCode = data.countryCode || '';
    return {
      ip: data.query || '', country: data.country || '',
      countryCode, region: `${countryCode}-${data.regionName || ''}`,
      city: data.city || '', org: data.org || data.isp || '',
      isSovereign: countryCode === 'US',
    };
  } catch { return null; }
}

async function resolveMX(domain: string): Promise<Array<{ exchange: string; preference: number }>> {
  try {
    const response = await safeFetch(`https://dns.google/resolve?name=${domain}&type=MX`, {}, 5000);
    if (!response || !response.ok) return [];
    const data = await response.json();
    if (!data.Answer) return [];
    return data.Answer
      .filter((a: { type: number }) => a.type === 15)
      .map((a: { data: string }) => {
        const parts = a.data.split(' ');
        return { preference: parseInt(parts[0]) || 0, exchange: (parts[1] || '').replace(/\.$/, '') };
      });
  } catch { return []; }
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname;
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Classify the PHI risk of an external domain based on its URL context
 */
function classifyPHIRisk(urlStr: string, pageHtml: string): 'direct' | 'indirect' | 'none' {
  const lowerUrl = urlStr.toLowerCase();

  // Static assets = no PHI risk
  if (STATIC_ASSET_EXTENSIONS.some(ext => lowerUrl.includes(ext))) {
    return 'none';
  }

  // Form actions or fetch calls = direct PHI handler
  const domain = extractDomain(urlStr);
  const lowerHtml = pageHtml.toLowerCase();
  const formActionPattern = new RegExp(`action=["'][^"']*${domain.replace(/\./g, '\\.')}[^"']*["']`, 'i');
  const fetchPattern = new RegExp(`fetch\\s*\\(\\s*["'][^"']*${domain.replace(/\./g, '\\.')}`, 'i');

  if (formActionPattern.test(lowerHtml) || fetchPattern.test(lowerHtml)) {
    return 'direct';
  }

  // URL path contains PHI-capable patterns
  if (PHI_ENDPOINT_PATTERNS.some(p => lowerUrl.includes(p))) {
    return 'direct';
  }

  return 'indirect';
}

/**
 * Detect the type of page being scanned
 */
function detectPageContext(pageHtml: string, pageText: string): {
  type: string;
  hasPatientPortal: boolean;
  hasIntakeForms: boolean;
  hasDiagnosticTools: boolean;
  hasChatbot: boolean;
  pageTitle: string;
} {
  const lowerText = pageText.toLowerCase();
  const lowerHtml = pageHtml.toLowerCase();

  const titleMatch = pageHtml.match(/<title[^>]*>(.*?)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : 'Unknown';

  const isContactPage = ['contact us', 'get in touch', 'contact form', 'send us a message'].some(k => lowerText.includes(k));
  const isHomepage = lowerHtml.includes('<meta property="og:type" content="website"') || lowerText.includes('welcome to');
  const isAboutPage = ['about us', 'our team', 'our mission', 'our doctors', 'our providers'].some(k => lowerText.includes(k));
  const isServicesPage = ['our services', 'services we offer', 'treatments', 'procedures'].some(k => lowerText.includes(k));
  const isPortalPage = ['patient portal', 'login', 'sign in', 'my account', 'my chart'].some(k => lowerText.includes(k));
  const isIntakePage = ['intake form', 'registration form', 'new patient form', 'patient information'].some(k => lowerText.includes(k));

  let type = 'general';
  if (isIntakePage) type = 'patient_intake';
  else if (isPortalPage) type = 'patient_portal';
  else if (isContactPage) type = 'contact';
  else if (isServicesPage) type = 'services';
  else if (isAboutPage) type = 'about';
  else if (isHomepage) type = 'homepage';

  return {
    type,
    hasPatientPortal: EHR_SIGNATURES.some(s => lowerHtml.includes(s)) || lowerText.includes('patient portal') || lowerText.includes('my chart'),
    hasIntakeForms: ['intake form', 'registration', 'new patient', 'patient form', 'patient registration', 'patient information'].some(k => lowerText.includes(k)),
    hasDiagnosticTools: ['symptom checker', 'risk calculator', 'health assessment', 'self-assessment', 'screening tool'].some(k => lowerText.includes(k)),
    hasChatbot: CHATBOT_SIGNATURES.some(s => lowerHtml.includes(s)),
    pageTitle,
  };
}

// ─── SCAN MODULES ───────────────────────────────────────

async function scanDR01(domain: string, borderMap: DataBorderNode[]): Promise<ScanFinding> {
  const geo = await resolveIPGeo(domain);
  if (!geo) {
    return {
      id: 'DR-01', name: 'Primary Domain IP Geo-Location',
      status: 'warn', severity: 'high', category: 'data_sovereignty', phiRisk: 'direct',
      detail: `Unable to resolve IP geolocation for ${domain}. Manual verification recommended.`,
      clause: 'SB 1188 Sec. 183.002(a)', evidence: { domain, resolution: 'failed' },
    };
  }
  borderMap.push({
    domain, ip: geo.ip, country: geo.country, countryCode: geo.countryCode,
    city: geo.city, type: 'primary', isSovereign: geo.isSovereign, phiRisk: 'direct',
    purpose: 'Primary website hosting',
  });
  return {
    id: 'DR-01', name: 'Primary Domain IP Geo-Location',
    status: geo.isSovereign ? 'pass' : 'fail', severity: 'critical',
    category: 'data_sovereignty', phiRisk: 'direct',
    detail: geo.isSovereign
      ? `Server resolved to ${geo.ip} in ${geo.city}, ${geo.country} (${geo.org}). Data residency confirmed within US borders.`
      : `Server resolved to ${geo.ip} in ${geo.city}, ${geo.country} (${geo.org}). PHI may transit non-sovereign infrastructure.`,
    clause: 'SB 1188 Sec. 183.002(a)',
    evidence: { ip: geo.ip, country: geo.countryCode, city: geo.city, org: geo.org, isSovereign: geo.isSovereign },
  };
}

async function scanDR02(targetUrl: string, borderMap: DataBorderNode[]): Promise<ScanFinding> {
  const response = await safeFetch(targetUrl, { method: 'HEAD' });
  if (!response) {
    return {
      id: 'DR-02', name: 'CDN & Edge Cache Analysis',
      status: 'warn', severity: 'medium', category: 'data_sovereignty', phiRisk: 'indirect',
      detail: 'Unable to connect to target URL.', clause: 'SB 1188 Sec. 183.002(a)(2)',
      evidence: { url: targetUrl, connection: 'failed' },
    };
  }

  const headers: Record<string, string> = {};
  response.headers.forEach((v, k) => { headers[k.toLowerCase()] = v.toLowerCase(); });

  let cdnProvider = 'None detected';
  if (headers['cf-ray']) cdnProvider = 'Cloudflare';
  else if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop']) cdnProvider = 'Amazon CloudFront';
  else if (headers['x-cache']?.includes('fastly')) cdnProvider = 'Fastly';
  else if (headers['x-served-by']?.includes('cache-')) cdnProvider = 'Fastly/Varnish';
  else if (headers['server'] === 'cloudflare') cdnProvider = 'Cloudflare';
  else if (headers['x-vercel-id']) cdnProvider = 'Vercel Edge';
  else if (headers['x-azure-ref']) cdnProvider = 'Azure CDN';

  const foreignEdges: string[] = [];
  const allVals = Object.values(headers).join(' ');
  for (const r of NON_US_INDICATORS.foreignRegions) {
    if (allVals.includes(r)) foreignEdges.push(r.toUpperCase());
  }
  const cfPop = (headers['cf-ray'] || '').split('-').pop() || '';
  const foreignPops = ['AMS','FRA','SIN','SYD','TOK','LON','CDG','BOM','GRU','NRT','ICN','DUB','LHR','HKG'];
  if (foreignPops.some(p => cfPop.toUpperCase().includes(p))) foreignEdges.push(`CF-POP:${cfPop.toUpperCase()}`);

  if (cdnProvider !== 'None detected') {
    borderMap.push({
      domain: `CDN: ${cdnProvider}`, country: foreignEdges.length > 0 ? 'Mixed' : 'United States',
      countryCode: foreignEdges.length > 0 ? 'MIXED' : 'US', city: cfPop || 'Edge',
      type: 'cdn', isSovereign: foreignEdges.length === 0, phiRisk: 'indirect',
      purpose: `Content delivery via ${cdnProvider}`,
    });
  }

  const pass = foreignEdges.length === 0;
  return {
    id: 'DR-02', name: 'CDN & Edge Cache Analysis',
    status: pass ? 'pass' : 'warn', severity: pass ? 'low' : 'medium',
    category: 'data_sovereignty', phiRisk: 'indirect',
    detail: pass
      ? `CDN detected: ${cdnProvider}. No foreign edge nodes found. Edge caching appears US-restricted.`
      : `CDN detected: ${cdnProvider}. Foreign edge indicators: ${foreignEdges.join(', ')}. CDN edges typically serve static assets (HTML, images) and do not process PHI directly — lower compliance risk than direct data handlers.`,
    clause: 'SB 1188 Sec. 183.002(a)(2)',
    evidence: { cdnProvider, foreignEdges },
  };
}

async function scanDR03(domain: string, borderMap: DataBorderNode[]): Promise<ScanFinding> {
  const mxRecords = await resolveMX(domain);
  if (mxRecords.length === 0) {
    return {
      id: 'DR-03', name: 'Mail Exchange (MX) Pathing',
      status: 'warn', severity: 'medium', category: 'data_sovereignty', phiRisk: 'direct',
      detail: `No MX records found for ${domain}. Domain may not handle email. If practice sends PHI via email from this domain, manual verification required.`,
      clause: 'SB 1188 Sec. 183.002(a)', evidence: { domain, mxRecords: [] },
    };
  }

  const mxGeo = await Promise.all(
    mxRecords.slice(0, 3).map(async (mx) => {
      const geo = await resolveIPGeo(mx.exchange);
      return { exchange: mx.exchange, preference: mx.preference, geo };
    })
  );
  for (const mx of mxGeo) {
    if (mx.geo) {
      borderMap.push({
        domain: mx.exchange, ip: mx.geo.ip, country: mx.geo.country,
        countryCode: mx.geo.countryCode, city: mx.geo.city,
        type: 'mail', isSovereign: mx.geo.isSovereign, phiRisk: 'direct',
        purpose: `Mail server (priority ${mx.preference})`,
      });
    }
  }

  const foreignMX = mxGeo.filter(r => r.geo && !r.geo.isSovereign);
  const pass = foreignMX.length === 0;
  return {
    id: 'DR-03', name: 'Mail Exchange (MX) Pathing',
    status: pass ? 'pass' : 'fail', severity: pass ? 'low' : 'critical',
    category: 'data_sovereignty', phiRisk: 'direct',
    detail: pass
      ? `${mxRecords.length} MX record(s). All US-based. Primary: ${mxRecords[0].exchange}. Email is a direct PHI channel — US residency confirmed.`
      : `${foreignMX.length} mail server(s) in non-US locations: ${foreignMX.map(f => `${f.exchange} → ${f.geo?.city}, ${f.geo?.country}`).join('; ')}. HIGH RISK — email carrying PHI may transit foreign infrastructure.`,
    clause: 'SB 1188 Sec. 183.002(a)',
    evidence: {
      mxRecords: mxRecords.map(r => r.exchange),
      geoResults: mxGeo.map(r => ({ exchange: r.exchange, country: r.geo?.countryCode || 'UNRESOLVED', isSovereign: r.geo?.isSovereign })),
    },
  };
}

async function scanDR04(targetUrl: string, pageHtml: string, borderMap: DataBorderNode[]): Promise<ScanFinding> {
  const externalDomains = new Map<string, { urls: string[]; phiRisk: 'direct' | 'indirect' | 'none' }>();
  const targetDomain = extractDomain(targetUrl);

  const urlPattern = /(?:src|href|action|data-src)=["']?(https?:\/\/[^"'\s>]+)/gi;
  let match;
  while ((match = urlPattern.exec(pageHtml)) !== null) {
    try {
      const fullUrl = match[1];
      const domain = extractDomain(fullUrl);
      if (domain && domain !== targetDomain && !domain.includes('localhost')) {
        const risk = classifyPHIRisk(fullUrl, pageHtml);
        const existing = externalDomains.get(domain);
        if (existing) {
          existing.urls.push(fullUrl);
          if (risk === 'direct' || (risk === 'indirect' && existing.phiRisk === 'none')) existing.phiRisk = risk;
        } else {
          externalDomains.set(domain, { urls: [fullUrl], phiRisk: risk });
        }
      }
    } catch { /* skip */ }
  }

  const apiPattern = /(?:fetch|XMLHttpRequest|axios)\s*\(\s*["'](https?:\/\/[^"']+)/gi;
  while ((match = apiPattern.exec(pageHtml)) !== null) {
    try {
      const fullUrl = match[1];
      const domain = extractDomain(fullUrl);
      if (domain && domain !== targetDomain) {
        const existing = externalDomains.get(domain);
        if (existing) { existing.phiRisk = 'direct'; }
        else { externalDomains.set(domain, { urls: [fullUrl], phiRisk: 'direct' }); }
      }
    } catch { /* skip */ }
  }

  if (externalDomains.size === 0) {
    return {
      id: 'DR-04', name: 'Sub-Processor Domain Audit', status: 'pass', severity: 'low',
      category: 'data_sovereignty', phiRisk: 'none',
      detail: 'No external third-party domains detected. Site appears self-contained.',
      clause: 'SB 1188 Sec. 183.002(a)(1)', evidence: { externalDomains: [], foreignDomains: [] },
    };
  }

  const sorted = Array.from(externalDomains.entries()).sort((a, b) => {
    const order = { direct: 0, indirect: 1, none: 2 };
    return (order[a[1].phiRisk] || 2) - (order[b[1].phiRisk] || 2);
  });
  const toCheck = sorted.slice(0, 10);
  const geoResults = await Promise.all(toCheck.map(async ([domain, info]) => {
    const geo = await resolveIPGeo(domain);
    return { domain, geo, phiRisk: info.phiRisk, urls: info.urls };
  }));

  const foreignAll = geoResults.filter(r => r.geo && !r.geo.isSovereign);
  const foreignPHI = foreignAll.filter(r => r.phiRisk === 'direct');
  const foreignStatic = foreignAll.filter(r => r.phiRisk !== 'direct');

  for (const r of geoResults) {
    if (r.geo) {
      borderMap.push({
        domain: r.domain, ip: r.geo.ip, country: r.geo.country,
        countryCode: r.geo.countryCode, city: r.geo.city,
        type: 'sub-processor', isSovereign: r.geo.isSovereign, phiRisk: r.phiRisk,
        purpose: r.phiRisk === 'direct' ? 'Form handler / API endpoint'
          : r.phiRisk === 'indirect' ? 'Analytics / tracking' : 'Static asset (CSS/images/fonts)',
      });
    }
  }

  let status: 'pass' | 'fail' | 'warn' = 'pass';
  let severity: RiskTier = 'low';
  let phiRisk: 'direct' | 'indirect' | 'none' = 'none';

  if (foreignPHI.length > 0) { status = 'fail'; severity = 'critical'; phiRisk = 'direct'; }
  else if (foreignStatic.length > 0) { status = 'warn'; severity = 'low'; phiRisk = 'indirect'; }

  let detail = `${externalDomains.size} external domain(s) detected. `;
  if (foreignAll.length === 0) {
    detail += `Sampled ${toCheck.length} — all US-based.`;
  } else {
    if (foreignPHI.length > 0) {
      detail += `⚠ HIGH RISK: ${foreignPHI.length} foreign domain(s) handle PHI-capable endpoints: ${foreignPHI.map(f => `${f.domain} (${f.geo?.country})`).join(', ')}. `;
    }
    if (foreignStatic.length > 0) {
      detail += `${foreignStatic.length} foreign domain(s) serve static assets only: ${foreignStatic.map(f => `${f.domain} (${f.geo?.country})`).join(', ')}. Static assets (CSS/images/fonts) do not transmit PHI — lower risk.`;
    }
  }

  return {
    id: 'DR-04', name: 'Sub-Processor Domain Audit', status, severity,
    category: 'data_sovereignty', phiRisk, detail,
    clause: 'SB 1188 Sec. 183.002(a)(1)',
    evidence: {
      totalExternal: externalDomains.size, checked: toCheck.map(([d]) => d),
      foreignPHI: foreignPHI.map(f => ({ domain: f.domain, country: f.geo?.country })),
      foreignStatic: foreignStatic.map(f => ({ domain: f.domain, country: f.geo?.country })),
    },
  };
}

function scanAI01(pageHtml: string, pageText: string): ScanFinding {
  const lowerText = pageText.toLowerCase();
  const found: string[] = [];
  for (const kw of AI_DISCLOSURE_KEYWORDS) { if (lowerText.includes(kw)) found.push(kw); }
  const pass = found.length >= 2;
  return {
    id: 'AI-01', name: 'Conspicuous AI Disclosure Text',
    status: pass ? 'pass' : 'fail', severity: 'high',
    category: 'ai_transparency', phiRisk: 'none',
    detail: pass
      ? `AI disclosure detected. Found ${found.length} keyword(s): "${found.slice(0, 3).join('", "')}".`
      : `No AI disclosure found. HB 149 requires "clear and conspicuous" disclosure when AI contributes to patient care. ${found.length > 0 ? `Partial: "${found[0]}" — insufficient.` : 'Zero keywords detected.'} Note: If practice does not use AI in clinical care, this may not apply.`,
    clause: 'HB 149 Sec. 551.004',
    evidence: { foundKeywords: found, threshold: 2 },
  };
}

function scanAI02(pageHtml: string): ScanFinding {
  const lowerHtml = pageHtml.toLowerCase();
  const detected: string[] = [];
  for (const pattern of DARK_PATTERN_INDICATORS) {
    const sections = lowerHtml.split(/artificial intelligence|ai disclosure|algorithm/);
    for (let i = 1; i < sections.length; i++) {
      if (sections[i].substring(0, 500).includes(pattern)) detected.push(pattern.trim());
    }
  }
  const pass = detected.length === 0;
  return {
    id: 'AI-02', name: 'Disclosure Link Accessibility',
    status: pass ? 'pass' : 'fail', severity: 'critical',
    category: 'ai_transparency', phiRisk: 'none',
    detail: pass
      ? 'No dark pattern indicators found near AI disclosure content.'
      : `Dark patterns detected near AI disclosure: ${[...new Set(detected)].join(', ')}. Disclosure may be intentionally obscured.`,
    clause: 'HB 149 (d)', evidence: { detectedPatterns: [...new Set(detected)] },
  };
}

function scanAI03(pageHtml: string, pageText: string, pageCtx: ReturnType<typeof detectPageContext>): ScanFinding {
  if (!pageCtx.hasDiagnosticTools) {
    return {
      id: 'AI-03', name: 'Diagnostic AI Disclaimer Audit',
      status: 'pass', severity: 'info', category: 'ai_transparency', phiRisk: 'none',
      detail: `No AI diagnostic tools on this ${pageCtx.type} page. Not applicable here. If used on patient portal, manual audit recommended.`,
      clause: 'SB 1188 Sec. 183.005', evidence: { hasDiagnosticTool: false, pageType: pageCtx.type },
    };
  }
  const lowerText = pageText.toLowerCase();
  const disclaimers = ['reviewed by', 'approved by', 'supervised by', 'practitioner review',
    'physician review', 'licensed provider', 'not a substitute for medical advice', 'consult your doctor'];
  const has = disclaimers.some(k => lowerText.includes(k));
  return {
    id: 'AI-03', name: 'Diagnostic AI Disclaimer Audit',
    status: has ? 'pass' : 'fail', severity: 'critical',
    category: 'ai_transparency', phiRisk: 'direct',
    detail: has ? 'AI diagnostic tool with practitioner review disclaimer present.'
      : 'AI diagnostic tool WITHOUT practitioner review disclaimer. SB 1188 requires licensed practitioner review statement.',
    clause: 'SB 1188 Sec. 183.005', evidence: { hasDiagnosticTool: true, hasDisclaimer: has },
  };
}

function scanAI04(pageHtml: string, pageText: string, pageCtx: ReturnType<typeof detectPageContext>): ScanFinding {
  const lowerHtml = pageHtml.toLowerCase();
  const platforms: string[] = [];
  for (const sig of CHATBOT_SIGNATURES) { if (lowerHtml.includes(sig)) platforms.push(sig); }
  if (platforms.length === 0) {
    return {
      id: 'AI-04', name: 'Interactive Chatbot Notice',
      status: 'pass', severity: 'info', category: 'ai_transparency', phiRisk: 'none',
      detail: `No chatbot detected on this ${pageCtx.type} page. Not applicable.`,
      clause: 'HB 149 (b)', evidence: { chatbotDetected: false },
    };
  }
  const lowerText = pageText.toLowerCase();
  const noticeKw = ['ai assistant', 'chatbot', 'automated', 'virtual assistant', 'bot', 'not a human', 'speak to a human'];
  const has = noticeKw.some(k => lowerText.includes(k) || lowerHtml.includes(k));
  return {
    id: 'AI-04', name: 'Interactive Chatbot Notice',
    status: has ? 'pass' : 'fail', severity: 'high',
    category: 'ai_transparency', phiRisk: 'indirect',
    detail: has ? `Chatbot (${platforms.join(', ')}) with AI notice present.`
      : `Chatbot (${platforms.join(', ')}) WITHOUT AI disclosure. HB 149 requires notification.`,
    clause: 'HB 149 (b)', evidence: { detectedPlatforms: platforms, hasNotice: has },
  };
}

function scanER01(pageHtml: string, pageText: string, pageCtx: ReturnType<typeof detectPageContext>): ScanFinding {
  if (!pageCtx.hasIntakeForms && !pageCtx.hasPatientPortal && ['contact', 'about', 'services', 'homepage', 'general'].includes(pageCtx.type)) {
    return {
      id: 'ER-01', name: 'Biological Sex Input Fields',
      status: 'pass', severity: 'info', category: 'clinical_integrity', phiRisk: 'none',
      pageContext: pageCtx.type,
      detail: `Page type: "${pageCtx.type}" — no patient intake forms detected. This check applies to registration/intake pages only. EHR portal should be audited separately.`,
      clause: 'SB 1188 Sec. 183.010',
      evidence: { hasIntakeForms: false, pageType: pageCtx.type },
    };
  }
  const lowerHtml = pageHtml.toLowerCase();
  const lowerText = pageText.toLowerCase();
  const has = ['biological sex', 'sex assigned at birth', 'birth sex', 'patient sex'].some(k => lowerText.includes(k) || lowerHtml.includes(k));
  const hasField = lowerHtml.includes('name="sex"') || lowerHtml.includes('name="biological_sex"');
  return {
    id: 'ER-01', name: 'Biological Sex Input Fields',
    status: (has || hasField) ? 'pass' : 'fail', severity: 'high',
    category: 'clinical_integrity', phiRisk: 'none', pageContext: pageCtx.type,
    detail: (has || hasField)
      ? `Patient registration on ${pageCtx.type} page — biological sex field present.`
      : `Patient registration on ${pageCtx.type} page — NO biological sex field found. Texas statute requires "Biological Sex" (Male/Female) on intake forms.`,
    clause: 'SB 1188 Sec. 183.010',
    evidence: { hasBioSex: has, hasFormField: hasField, pageType: pageCtx.type },
  };
}

function scanER02(pageHtml: string, pageText: string, pageCtx: ReturnType<typeof detectPageContext>): ScanFinding {
  if (!pageCtx.hasPatientPortal) {
    return {
      id: 'ER-02', name: 'Minor/Parental Access Portal',
      status: 'pass', severity: 'info', category: 'clinical_integrity', phiRisk: 'none',
      pageContext: pageCtx.type,
      detail: `No patient portal detected on this ${pageCtx.type} page. EHR system should be audited separately.`,
      clause: 'SB 1188 Sec. 183.006', evidence: { hasPortal: false, pageType: pageCtx.type },
    };
  }
  const lowerText = pageText.toLowerCase();
  const lowerHtml = pageHtml.toLowerCase();
  const parentKw = ['parent portal', 'guardian access', 'minor patient', 'parent login', 'family access',
    'dependent access', 'proxy access', 'parent/guardian', 'parental consent', 'conservator'];
  const has = parentKw.some(k => lowerText.includes(k) || lowerHtml.includes(k));
  const portal = EHR_SIGNATURES.find(s => lowerHtml.includes(s)) || 'generic';
  return {
    id: 'ER-02', name: 'Minor/Parental Access Portal',
    status: has ? 'pass' : 'fail', severity: 'high',
    category: 'clinical_integrity', phiRisk: 'none', pageContext: pageCtx.type,
    detail: has ? `Portal (${portal}) with parental/guardian access pathway.`
      : `Portal (${portal}) WITHOUT parental/guardian access. Texas requires distinct auth for parents/guardians of minors.`,
    clause: 'SB 1188 Sec. 183.006',
    evidence: { hasPortal: true, hasParentalAccess: has, portalType: portal },
  };
}

function scanER03(pageHtml: string, pageText: string, pageCtx: ReturnType<typeof detectPageContext>): ScanFinding {
  const lowerText = pageText.toLowerCase();
  const kws = ['metabolic health', 'nutrition', 'dietary', 'diet counseling', 'weight management',
    'bmi', 'body mass', 'nutritionist', 'dietitian', 'metabolic', 'glucose', 'a1c',
    'lipid', 'cholesterol', 'obesity', 'bariatric', 'endocrin'];
  const found = kws.filter(k => lowerText.includes(k));
  return {
    id: 'ER-03', name: 'Metabolic Health Options',
    status: found.length >= 1 ? 'pass' : 'fail', severity: 'medium',
    category: 'clinical_integrity', phiRisk: 'none', pageContext: pageCtx.type,
    detail: found.length >= 1
      ? `Metabolic health references: "${found.slice(0, 3).join('", "')}".`
      : `No metabolic/nutrition references on this ${pageCtx.type} page.`,
    clause: 'SB 1188 Sec. 183.003', evidence: { foundKeywords: found },
  };
}

function scanER04(pageHtml: string, pageText: string, pageCtx: ReturnType<typeof detectPageContext>): ScanFinding {
  const lowerHtml = pageHtml.toLowerCase();
  const lowerText = pageText.toLowerCase();
  const forbidden = [
    { keyword: 'credit score', field: 'Credit Score' },
    { keyword: 'credit rating', field: 'Credit Rating' },
    { keyword: 'voter registration', field: 'Voter Registration' },
    { keyword: 'political affiliation', field: 'Political Affiliation' },
    { keyword: 'political party', field: 'Political Party' },
    { keyword: 'fico score', field: 'FICO Score' },
  ];
  const detected = forbidden.filter(f => lowerHtml.includes(f.keyword) || lowerText.includes(f.keyword));
  const pass = detected.length === 0;
  return {
    id: 'ER-04', name: 'Forbidden Data Field Check',
    status: pass ? 'pass' : 'fail', severity: 'critical',
    category: 'clinical_integrity', phiRisk: 'none', pageContext: pageCtx.type,
    detail: pass
      ? 'No prohibited data collection fields detected.'
      : `VIOLATION: ${detected.map(f => f.field).join(', ')} detected. Texas law forbids non-healthcare data collection.`,
    clause: 'SB 1188 Sec. 183.003', evidence: { detectedFields: detected.map(f => f.field) },
  };
}

// ─── NPI VERIFICATION ───────────────────────────────────

async function verifyNPI(npi: string): Promise<{
  valid: boolean; name?: string; type?: string; specialty?: string; state?: string;
}> {
  try {
    const res = await safeFetch(`https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`, {}, 8000);
    if (!res || !res.ok) return { valid: false };
    const data = await res.json();
    if (!data.result_count) return { valid: false };
    const r = data.results[0];
    const b = r.basic || {};
    const addr = (r.addresses || []).find((a: { address_purpose: string }) => a.address_purpose === 'LOCATION') || (r.addresses || [])[0] || {};
    const tax = (r.taxonomies || []).find((t: { primary: boolean }) => t.primary) || (r.taxonomies || [])[0] || {};
    return {
      valid: true, name: b.organization_name || `${b.first_name || ''} ${b.last_name || ''}`.trim(),
      type: r.enumeration_type === 'NPI-2' ? 'Organization' : 'Individual',
      specialty: tax.desc || '', state: addr.state || '',
    };
  } catch { return { valid: false }; }
}

// ─── SCORING ENGINE (v3 — Category Weighted) ────────────

function calculateCategoryScore(findings: ScanFinding[], category: string): CategoryScore {
  const catF = findings.filter(f => f.category === category);
  if (catF.length === 0) return { name: category, score: 100, maxScore: 100, percentage: 100, level: 'Sovereign', findings: 0, passed: 0, failed: 0, warnings: 0 };

  let score = 100;
  for (const f of catF) {
    if (f.status === 'fail') score -= SEVERITY_DEDUCTIONS[f.severity] || 10;
    else if (f.status === 'warn') score -= Math.floor((SEVERITY_DEDUCTIONS[f.severity] || 10) / 3);
  }
  score = Math.max(0, Math.min(100, score));

  return {
    name: category, score, maxScore: 100, percentage: score,
    level: score >= 67 ? 'Sovereign' : score >= 34 ? 'Drift' : 'Violation',
    findings: catF.length,
    passed: catF.filter(f => f.status === 'pass').length,
    failed: catF.filter(f => f.status === 'fail').length,
    warnings: catF.filter(f => f.status === 'warn').length,
  };
}

function calculateCompositeScore(cats: Record<string, CategoryScore>): { score: number; riskLevel: string; riskMeterLevel: string } {
  let wSum = 0, wTotal = 0;
  for (const [c, cs] of Object.entries(cats)) {
    const w = CATEGORY_WEIGHTS[c as keyof typeof CATEGORY_WEIGHTS] || 0.33;
    wSum += cs.percentage * w;
    wTotal += w;
  }
  const score = Math.round(wTotal > 0 ? wSum / wTotal : 0);
  return {
    score,
    riskLevel: score >= 67 ? 'Low' : score >= 34 ? 'Moderate' : 'High',
    riskMeterLevel: score >= 67 ? 'Sovereign' : score >= 34 ? 'Drift' : 'Violation',
  };
}

// ─── MAIN API HANDLER ───────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { npi, url } = body;
    if (!npi || !url) return NextResponse.json({ error: 'NPI and URL are required' }, { status: 400 });

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    const domain = extractDomain(targetUrl);

    const npiResult = await verifyNPI(npi);

    let pageHtml = '', pageText = '', fetchSuccess = false;
    const pageRes = await safeFetch(targetUrl, {}, 15000);
    if (pageRes && pageRes.ok) {
      pageHtml = await pageRes.text();
      pageText = pageHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      fetchSuccess = true;
    }

    const pageCtx = fetchSuccess ? detectPageContext(pageHtml, pageText)
      : { type: 'unknown', hasPatientPortal: false, hasIntakeForms: false, hasDiagnosticTools: false, hasChatbot: false, pageTitle: 'Unknown' };

    const findings: ScanFinding[] = [];
    const dataBorderMap: DataBorderNode[] = [];

    // Data Sovereignty
    findings.push(await scanDR01(domain, dataBorderMap));
    findings.push(await scanDR02(targetUrl, dataBorderMap));
    findings.push(await scanDR03(domain, dataBorderMap));
    findings.push(await scanDR04(targetUrl, pageHtml, dataBorderMap));

    // AI Transparency
    if (fetchSuccess) {
      findings.push(scanAI01(pageHtml, pageText));
      findings.push(scanAI02(pageHtml));
      findings.push(scanAI03(pageHtml, pageText, pageCtx));
      findings.push(scanAI04(pageHtml, pageText, pageCtx));
    } else {
      ['AI-01', 'AI-02', 'AI-03', 'AI-04'].forEach((id, i) => {
        const n = ['Conspicuous AI Disclosure Text', 'Disclosure Link Accessibility', 'Diagnostic AI Disclaimer Audit', 'Interactive Chatbot Notice'];
        const c = ['HB 149 Sec. 551.004', 'HB 149 (d)', 'SB 1188 Sec. 183.005', 'HB 149 (b)'];
        findings.push({ id, name: n[i], status: 'warn', severity: 'medium', category: 'ai_transparency', phiRisk: 'none', detail: `Unable to fetch content. Manual audit required.`, clause: c[i] });
      });
    }

    // Clinical Integrity
    if (fetchSuccess) {
      findings.push(scanER01(pageHtml, pageText, pageCtx));
      findings.push(scanER02(pageHtml, pageText, pageCtx));
      findings.push(scanER03(pageHtml, pageText, pageCtx));
      findings.push(scanER04(pageHtml, pageText, pageCtx));
    } else {
      ['ER-01', 'ER-02', 'ER-03', 'ER-04'].forEach((id, i) => {
        const n = ['Biological Sex Input Fields', 'Minor/Parental Access Portal', 'Metabolic Health Options', 'Forbidden Data Field Check'];
        const c = ['SB 1188 Sec. 183.010', 'SB 1188 Sec. 183.006', 'SB 1188 Sec. 183.003', 'SB 1188 Sec. 183.003'];
        findings.push({ id, name: n[i], status: 'warn', severity: 'low', category: 'clinical_integrity', phiRisk: 'none', detail: `Unable to fetch content. Manual audit required.`, clause: c[i] });
      });
    }

    // Scores
    const catScores = {
      data_sovereignty: calculateCategoryScore(findings, 'data_sovereignty'),
      ai_transparency: calculateCategoryScore(findings, 'ai_transparency'),
      clinical_integrity: calculateCategoryScore(findings, 'clinical_integrity'),
    };
    catScores.data_sovereignty.name = 'Data Residency';
    catScores.ai_transparency.name = 'AI Transparency';
    catScores.clinical_integrity.name = 'Clinical Integrity';

    const { score, riskLevel, riskMeterLevel } = calculateCompositeScore(catScores);

    const topIssues = findings
      .filter(f => f.status === 'fail')
      .sort((a, b) => {
        const p: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
        return (p[b.severity] || 0) - (p[a.severity] || 0);
      })
      .slice(0, 5)
      .map(f => ({ id: f.id, name: f.name, clause: f.clause, severity: f.severity, phiRisk: f.phiRisk }));

    return NextResponse.json({
      npi, url: targetUrl, riskScore: score, riskLevel, riskMeterLevel,
      complianceStatus: score >= 67 ? 'Sovereign' : score >= 34 ? 'Drift' : 'Violation',
      findings, topIssues, categoryScores: catScores, dataBorderMap,
      scanTimestamp: Date.now(), scanDuration: Date.now() - startTime,
      engineVersion: ENGINE_VERSION, npiVerification: npiResult, pageContext: pageCtx,
      meta: {
        engine: ENGINE_VERSION, duration: `${Date.now() - startTime}ms`,
        pageContentFetched: fetchSuccess, pageSize: pageHtml.length,
        pageType: pageCtx.type, checksRun: findings.length,
        checksPass: findings.filter(f => f.status === 'pass').length,
        checksFail: findings.filter(f => f.status === 'fail').length,
        checksWarn: findings.filter(f => f.status === 'warn').length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Scan failed', message: msg, engineVersion: ENGINE_VERSION }, { status: 500 });
  }
}
