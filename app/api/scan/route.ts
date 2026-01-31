import { NextRequest, NextResponse } from 'next/server';

/**
 * KairoLogic Sentry Scanner API v2.0
 * ===================================
 * Performs REAL compliance scans against provider websites.
 * 
 * Scan Categories:
 * - DR-01..04: Data Sovereignty & Residency (SB 1188)
 * - AI-01..04: AI Transparency & Disclosure (HB 149)
 * - ER-01..04: EHR System Integrity
 * 
 * Scoring: Base 100, deductions per finding.
 * Thresholds: Sovereign (67-100), Drift (34-66), Violation (0-33)
 */

// ─── TYPES ──────────────────────────────────────────────
interface ScanFinding {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
  clause: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence?: Record<string, unknown>;
}

interface ScanResult {
  npi: string;
  url: string;
  riskScore: number;
  riskLevel: string;
  riskMeterLevel: string;
  complianceStatus: string;
  findings: ScanFinding[];
  topIssues: Array<{ id: string; name: string; clause: string }>;
  scanTimestamp: number;
  scanDuration: number;
  engineVersion: string;
}

// ─── CONSTANTS ──────────────────────────────────────────
const ENGINE_VERSION = 'SENTRY-2.0.0';

// Known US-only IP ranges (common US cloud provider regions)
const US_GEO_PREFIXES = ['US', 'United States', 'US-', 'America'];

// Sovereign-approved US regions
const SOVEREIGN_REGIONS = ['US-TX', 'US-VA', 'US-OH', 'US-OR', 'US-CA', 'US-IL', 'US-GA', 'US-NJ', 'US-WA', 'US-IA'];

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

// ─── UTILITY FUNCTIONS ──────────────────────────────────

/**
 * Safely fetch a URL with timeout and error handling
 */
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
  } catch (error) {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Resolve IP information using free IP geolocation API
 */
async function resolveIPGeo(hostname: string): Promise<{
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  org: string;
  isSovereign: boolean;
} | null> {
  try {
    // Use ip-api.com free endpoint (supports domain resolution)
    const response = await safeFetch(
      `http://ip-api.com/json/${hostname}?fields=status,country,countryCode,regionName,city,isp,org,query`,
      {},
      5000
    );
    if (!response || !response.ok) return null;

    const data = await response.json();
    if (data.status !== 'success') return null;

    const countryCode = data.countryCode || '';
    return {
      ip: data.query || '',
      country: data.country || '',
      countryCode,
      region: `${countryCode}-${data.regionName || ''}`,
      city: data.city || '',
      org: data.org || data.isp || '',
      isSovereign: countryCode === 'US',
    };
  } catch {
    return null;
  }
}

/**
 * Check MX records via DNS-over-HTTPS (Google Public DNS)
 */
async function resolveMX(domain: string): Promise<Array<{ exchange: string; preference: number }>> {
  try {
    const response = await safeFetch(
      `https://dns.google/resolve?name=${domain}&type=MX`,
      {},
      5000
    );
    if (!response || !response.ok) return [];

    const data = await response.json();
    if (!data.Answer) return [];

    return data.Answer
      .filter((a: { type: number }) => a.type === 15)
      .map((a: { data: string }) => {
        const parts = a.data.split(' ');
        return {
          preference: parseInt(parts[0]) || 0,
          exchange: (parts[1] || '').replace(/\.$/, ''),
        };
      });
  } catch {
    return [];
  }
}

/**
 * Resolve DNS A records via Google DNS-over-HTTPS
 */
async function resolveA(domain: string): Promise<string[]> {
  try {
    const response = await safeFetch(
      `https://dns.google/resolve?name=${domain}&type=A`,
      {},
      5000
    );
    if (!response || !response.ok) return [];

    const data = await response.json();
    if (!data.Answer) return [];

    return data.Answer
      .filter((a: { type: number }) => a.type === 1)
      .map((a: { data: string }) => a.data);
  } catch {
    return [];
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname;
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

// ─── SCAN MODULES ───────────────────────────────────────

/**
 * DR-01: Primary EHR Domain IP Geo-Location
 * Resolves the domain IP and checks geo-location
 */
async function scanDR01(domain: string): Promise<ScanFinding> {
  const geo = await resolveIPGeo(domain);

  if (!geo) {
    return {
      id: 'DR-01', name: 'Primary EHR Domain IP Geo-Location',
      status: 'warn', severity: 'critical',
      detail: `Unable to resolve IP geolocation for ${domain}. DNS resolution may be blocked or domain is behind a proxy. Manual verification recommended.`,
      clause: 'SB 1188 Sec. 183.002(a)',
      evidence: { domain, resolution: 'failed' },
    };
  }

  const pass = geo.isSovereign;
  return {
    id: 'DR-01', name: 'Primary EHR Domain IP Geo-Location',
    status: pass ? 'pass' : 'fail', severity: 'critical',
    detail: pass
      ? `Server resolved to ${geo.ip} in ${geo.city}, ${geo.country} (${geo.org}). Data residency confirmed within US borders.`
      : `Server resolved to ${geo.ip} in ${geo.city}, ${geo.country} (${geo.org}). PHI may transit through non-sovereign infrastructure outside the United States.`,
    clause: 'SB 1188 Sec. 183.002(a)',
    evidence: { ip: geo.ip, country: geo.countryCode, city: geo.city, org: geo.org, isSovereign: geo.isSovereign },
  };
}

/**
 * DR-02: CDN & Edge Cache Analysis
 * Analyzes HTTP response headers for CDN presence and non-US edge nodes
 */
async function scanDR02(targetUrl: string): Promise<ScanFinding> {
  const response = await safeFetch(targetUrl, { method: 'HEAD' });

  if (!response) {
    return {
      id: 'DR-02', name: 'CDN & Edge Cache Analysis',
      status: 'warn', severity: 'critical',
      detail: 'Unable to connect to target URL. Site may be down, blocking automated requests, or behind aggressive WAF. Manual review required.',
      clause: 'SB 1188 Sec. 183.002(a)(2)',
      evidence: { url: targetUrl, connection: 'failed' },
    };
  }

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value.toLowerCase();
  });

  // Detect CDN provider
  let cdnProvider = 'Unknown';
  if (headers['cf-ray']) cdnProvider = 'Cloudflare';
  else if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop']) cdnProvider = 'Amazon CloudFront';
  else if (headers['x-cache'] && headers['x-cache'].includes('fastly')) cdnProvider = 'Fastly';
  else if (headers['x-served-by'] && headers['x-served-by'].includes('cache-')) cdnProvider = 'Fastly/Varnish';
  else if (headers['server'] === 'cloudflare') cdnProvider = 'Cloudflare';
  else if (headers['x-vercel-id']) cdnProvider = 'Vercel Edge';
  else if (headers['x-azure-ref']) cdnProvider = 'Azure CDN';
  else if (headers['x-goog-generation']) cdnProvider = 'Google Cloud CDN';

  // Check for foreign edge node indicators
  const foreignEdges: string[] = [];
  const allHeaderValues = Object.values(headers).join(' ');

  for (const region of NON_US_INDICATORS.foreignRegions) {
    if (allHeaderValues.includes(region)) {
      foreignEdges.push(region.toUpperCase());
    }
  }

  // Check specific CDN pop codes
  const cfRay = headers['cf-ray'] || '';
  const cfPop = cfRay.split('-').pop() || '';
  const knownForeignPops = ['AMS', 'FRA', 'SIN', 'SYD', 'TOK', 'LON', 'CDG', 'BOM', 'GRU', 'NRT', 'ICN', 'DUB', 'LHR', 'MAN', 'HKG', 'KUL'];
  const isForeignPop = knownForeignPops.some(pop => cfPop.toUpperCase().includes(pop));

  if (isForeignPop) {
    foreignEdges.push(`CF-POP:${cfPop.toUpperCase()}`);
  }

  const pass = foreignEdges.length === 0;
  return {
    id: 'DR-02', name: 'CDN & Edge Cache Analysis',
    status: pass ? 'pass' : 'fail', severity: 'critical',
    detail: pass
      ? `CDN detected: ${cdnProvider}. No foreign edge node indicators found in HTTP response headers. Edge caching appears US-restricted.`
      : `CDN detected: ${cdnProvider}. Foreign edge indicators found: ${foreignEdges.join(', ')}. PHI content may be cached on non-US edge nodes.`,
    clause: 'SB 1188 Sec. 183.002(a)(2)',
    evidence: { cdnProvider, foreignEdges, headers: Object.fromEntries(Object.entries(headers).filter(([k]) => NON_US_INDICATORS.cdnHeaders.includes(k))) },
  };
}

/**
 * DR-03: Mail Exchange (MX) Pathing
 * Checks if MX records point to US-based mail servers
 */
async function scanDR03(domain: string): Promise<ScanFinding> {
  const mxRecords = await resolveMX(domain);

  if (mxRecords.length === 0) {
    return {
      id: 'DR-03', name: 'Mail Exchange (MX) Pathing',
      status: 'warn', severity: 'high',
      detail: `No MX records found for ${domain}. Domain may not handle email, or DNS query was blocked. If practice sends PHI via email from this domain, manual verification is required.`,
      clause: 'SB 1188 Sec. 183.002(a)',
      evidence: { domain, mxRecords: [] },
    };
  }

  // Resolve each MX server's geo-location
  const mxGeoResults = await Promise.all(
    mxRecords.slice(0, 3).map(async (mx) => {
      const geo = await resolveIPGeo(mx.exchange);
      return { exchange: mx.exchange, preference: mx.preference, geo };
    })
  );

  const foreignMX = mxGeoResults.filter(r => r.geo && !r.geo.isSovereign);
  const unresolvedMX = mxGeoResults.filter(r => !r.geo);

  const pass = foreignMX.length === 0;
  return {
    id: 'DR-03', name: 'Mail Exchange (MX) Pathing',
    status: pass ? (unresolvedMX.length > 0 ? 'warn' : 'pass') : 'fail',
    severity: 'high',
    detail: pass
      ? `${mxRecords.length} MX record(s) found. All resolved servers are located within the United States. Primary: ${mxRecords[0].exchange}${unresolvedMX.length > 0 ? ` (${unresolvedMX.length} server(s) could not be geo-verified)` : ''}`
      : `${mxRecords.length} MX record(s) found. ${foreignMX.length} mail server(s) resolve to non-US locations: ${foreignMX.map(f => `${f.exchange} (${f.geo?.country})`).join(', ')}. PHI transmitted via email may transit foreign infrastructure.`,
    clause: 'SB 1188 Sec. 183.002(a)',
    evidence: {
      mxRecords: mxRecords.map(r => r.exchange),
      geoResults: mxGeoResults.map(r => ({
        exchange: r.exchange,
        country: r.geo?.countryCode || 'UNRESOLVED',
        city: r.geo?.city || '',
        isSovereign: r.geo?.isSovereign,
      })),
    },
  };
}

/**
 * DR-04: Sub-Processor Domain Audit
 * Analyzes page HTML for 3rd-party scripts and external API calls
 */
async function scanDR04(targetUrl: string, pageHtml: string): Promise<ScanFinding> {
  // Extract all external domains from scripts, links, iframes
  const externalDomains = new Set<string>();
  const targetDomain = extractDomain(targetUrl);

  // Match src, href, action attributes
  const urlPattern = /(?:src|href|action|data-src)=["']?(https?:\/\/[^"'\s>]+)/gi;
  let match;
  while ((match = urlPattern.exec(pageHtml)) !== null) {
    try {
      const domain = extractDomain(match[1]);
      if (domain && domain !== targetDomain && !domain.includes('localhost')) {
        externalDomains.add(domain);
      }
    } catch { /* skip invalid URLs */ }
  }

  // Also check for inline fetch/XMLHttpRequest calls
  const apiPattern = /(?:fetch|XMLHttpRequest|axios)\s*\(\s*["'](https?:\/\/[^"']+)/gi;
  while ((match = apiPattern.exec(pageHtml)) !== null) {
    try {
      const domain = extractDomain(match[1]);
      if (domain && domain !== targetDomain) {
        externalDomains.add(domain);
      }
    } catch { /* skip */ }
  }

  if (externalDomains.size === 0) {
    return {
      id: 'DR-04', name: 'Sub-Processor Domain Audit',
      status: 'pass', severity: 'high',
      detail: 'No external third-party domains detected in page source. Site appears to be self-contained with no foreign sub-processor dependencies.',
      clause: 'SB 1188 Sec. 183.002(a)(1)',
      evidence: { externalDomains: [], foreignDomains: [] },
    };
  }

  // Geo-check up to 5 external domains
  const domainsToCheck = Array.from(externalDomains).slice(0, 8);
  const geoResults = await Promise.all(
    domainsToCheck.map(async (domain) => {
      const geo = await resolveIPGeo(domain);
      return { domain, geo };
    })
  );

  const foreignDomains = geoResults.filter(r => r.geo && !r.geo.isSovereign);
  const pass = foreignDomains.length === 0;

  return {
    id: 'DR-04', name: 'Sub-Processor Domain Audit',
    status: pass ? 'pass' : 'fail', severity: 'high',
    detail: pass
      ? `${externalDomains.size} external domain(s) detected. Sampled ${domainsToCheck.length} for geo-verification — all resolve to US-based servers.`
      : `${externalDomains.size} external domain(s) detected. ${foreignDomains.length} resolve to non-US locations: ${foreignDomains.map(f => `${f.domain} (${f.geo?.country})`).join(', ')}. Third-party scripts may transmit PHI to offshore servers.`,
    clause: 'SB 1188 Sec. 183.002(a)(1)',
    evidence: {
      totalExternal: externalDomains.size,
      checked: domainsToCheck,
      foreignDomains: foreignDomains.map(f => ({ domain: f.domain, country: f.geo?.country, city: f.geo?.city })),
    },
  };
}

/**
 * AI-01: Conspicuous AI Disclosure Text
 * Scans page content for AI-related disclosure keywords
 */
function scanAI01(pageHtml: string, pageText: string): ScanFinding {
  const lowerText = pageText.toLowerCase();
  const foundKeywords: string[] = [];

  for (const keyword of AI_DISCLOSURE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  const pass = foundKeywords.length >= 2; // Require at least 2 disclosure keywords

  return {
    id: 'AI-01', name: 'Conspicuous AI Disclosure Text',
    status: pass ? 'pass' : 'fail', severity: 'high',
    detail: pass
      ? `AI disclosure language detected on page. Found ${foundKeywords.length} disclosure keyword(s): "${foundKeywords.slice(0, 3).join('", "')}". Practice appears to have conspicuous AI transparency.`
      : `No conspicuous AI disclosure language found on the scanned page. HB 149 requires "clear and conspicuous" disclosure when AI contributes to patient care pathways. ${foundKeywords.length > 0 ? `Partial match found: "${foundKeywords[0]}" — but insufficient for compliance.` : 'Zero AI disclosure keywords detected.'}`,
    clause: 'HB 149 Sec. 551.004',
    evidence: { foundKeywords, totalChecked: AI_DISCLOSURE_KEYWORDS.length, threshold: 2 },
  };
}

/**
 * AI-02: Disclosure Link Accessibility (Dark Pattern Detection)
 * Checks for CSS tricks that hide disclosure content
 */
function scanAI02(pageHtml: string): ScanFinding {
  const lowerHtml = pageHtml.toLowerCase();
  const detectedPatterns: string[] = [];

  // Look for elements containing AI-related text that might be hidden
  for (const pattern of DARK_PATTERN_INDICATORS) {
    // Check if AI disclosure text is near hidden CSS
    const aiSections = lowerHtml.split(/artificial intelligence|ai disclosure|algorithm/);
    for (let i = 1; i < aiSections.length; i++) {
      const context = aiSections[i].substring(0, 500);
      if (context.includes(pattern)) {
        detectedPatterns.push(pattern.trim());
      }
    }
  }

  // Also check for very small font sizes near disclosure text
  const smallFontPattern = /font-size\s*:\s*([0-9]+)(px|pt|em)/g;
  let fontMatch;
  while ((fontMatch = smallFontPattern.exec(lowerHtml)) !== null) {
    const size = parseFloat(fontMatch[1]);
    const unit = fontMatch[2];
    if ((unit === 'px' && size < 10) || (unit === 'pt' && size < 8) || (unit === 'em' && size < 0.6)) {
      // Check if this is near AI disclosure content
      const nearbyText = lowerHtml.substring(Math.max(0, fontMatch.index - 200), fontMatch.index + 200);
      if (AI_DISCLOSURE_KEYWORDS.some(k => nearbyText.includes(k))) {
        detectedPatterns.push(`font-size: ${fontMatch[1]}${unit}`);
      }
    }
  }

  const pass = detectedPatterns.length === 0;

  return {
    id: 'AI-02', name: 'Disclosure Link Accessibility',
    status: pass ? 'pass' : 'fail', severity: 'critical',
    detail: pass
      ? 'No dark pattern indicators found near AI disclosure content. Disclosure elements appear to use standard visibility properties.'
      : `Dark pattern indicators detected near AI disclosure content: ${[...new Set(detectedPatterns)].join(', ')}. Disclosure may be intentionally obscured from users, violating the "conspicuous" requirement.`,
    clause: 'HB 149 (d)',
    evidence: { detectedPatterns: [...new Set(detectedPatterns)] },
  };
}

/**
 * AI-03: Diagnostic AI Disclaimer Audit
 * Checks for practitioner review statements on AI diagnostic tools
 */
function scanAI03(pageHtml: string, pageText: string): ScanFinding {
  const lowerText = pageText.toLowerCase();

  // Check for diagnostic tool presence
  const diagnosticKeywords = ['symptom checker', 'risk calculator', 'health assessment', 'self-assessment',
    'diagnostic', 'screening tool', 'risk assessment', 'health quiz', 'medical calculator'];
  const hasDiagnosticTool = diagnosticKeywords.some(k => lowerText.includes(k));

  if (!hasDiagnosticTool) {
    return {
      id: 'AI-03', name: 'Diagnostic AI Disclaimer Audit',
      status: 'pass', severity: 'critical',
      detail: 'No AI-powered diagnostic tools (symptom checkers, risk calculators) detected on the scanned page. This check is not applicable if no clinical AI tools are patient-facing.',
      clause: 'SB 1188 Sec. 183.005',
      evidence: { hasDiagnosticTool: false },
    };
  }

  // If diagnostic tool exists, check for practitioner review disclaimer
  const disclaimerKeywords = ['reviewed by', 'approved by', 'supervised by', 'practitioner review',
    'physician review', 'licensed provider', 'medical professional', 'clinician oversight',
    'human review', 'not a substitute for medical advice', 'consult your doctor',
    'healthcare professional', 'does not replace'];
  const hasDisclaimer = disclaimerKeywords.some(k => lowerText.includes(k));

  return {
    id: 'AI-03', name: 'Diagnostic AI Disclaimer Audit',
    status: hasDisclaimer ? 'pass' : 'fail', severity: 'critical',
    detail: hasDisclaimer
      ? 'AI diagnostic tool detected with practitioner review disclaimer present. Tool appears to include required human oversight statement.'
      : 'AI diagnostic tool detected WITHOUT practitioner review disclaimer. SB 1188 requires statement that a licensed practitioner reviews AI-generated clinical recommendations.',
    clause: 'SB 1188 Sec. 183.005',
    evidence: { hasDiagnosticTool: true, hasDisclaimer, diagnosticKeywordsFound: diagnosticKeywords.filter(k => lowerText.includes(k)) },
  };
}

/**
 * AI-04: Interactive Chatbot Notice
 * Detects chatbot platforms and checks for AI disclosure
 */
function scanAI04(pageHtml: string, pageText: string): ScanFinding {
  const lowerHtml = pageHtml.toLowerCase();
  const lowerText = pageText.toLowerCase();
  const detectedPlatforms: string[] = [];

  for (const sig of CHATBOT_SIGNATURES) {
    if (lowerHtml.includes(sig)) {
      detectedPlatforms.push(sig);
    }
  }

  if (detectedPlatforms.length === 0) {
    return {
      id: 'AI-04', name: 'Interactive Chatbot Notice',
      status: 'pass', severity: 'high',
      detail: 'No interactive chatbot or live chat platforms detected on the scanned page. This check is not applicable if no chatbot is deployed.',
      clause: 'HB 149 (b)',
      evidence: { chatbotDetected: false },
    };
  }

  // Check for AI notice near chatbot
  const chatbotNoticeKeywords = ['ai assistant', 'chatbot', 'automated', 'virtual assistant',
    'bot', 'ai-powered chat', 'not a human', 'speak to a human', 'talk to a person'];
  const hasNotice = chatbotNoticeKeywords.some(k => lowerText.includes(k) || lowerHtml.includes(k));

  return {
    id: 'AI-04', name: 'Interactive Chatbot Notice',
    status: hasNotice ? 'pass' : 'fail', severity: 'high',
    detail: hasNotice
      ? `Chatbot detected (${detectedPlatforms.join(', ')}) with AI interaction notice present. Users appear to be informed they are interacting with an automated system.`
      : `Chatbot detected (${detectedPlatforms.join(', ')}) WITHOUT initial AI disclosure. HB 149 requires users be informed when they interact with AI rather than human staff.`,
    clause: 'HB 149 (b)',
    evidence: { detectedPlatforms, hasNotice },
  };
}

/**
 * ER-01: Biological Sex Input Fields
 * Scans forms for biological sex field
 */
function scanER01(pageHtml: string, pageText: string): ScanFinding {
  const lowerHtml = pageHtml.toLowerCase();
  const lowerText = pageText.toLowerCase();

  const bioSexKeywords = ['biological sex', 'sex assigned at birth', 'birth sex',
    'sex (male/female)', 'sex: male', 'sex: female', 'patient sex'];
  const hasBioSex = bioSexKeywords.some(k => lowerText.includes(k) || lowerHtml.includes(k));

  // Check for form fields
  const hasFormField = lowerHtml.includes('name="sex"') || lowerHtml.includes('name="biological_sex"') ||
    lowerHtml.includes('id="sex"') || lowerHtml.includes('id="biological_sex"') ||
    (lowerHtml.includes('<select') && (lowerHtml.includes('>male<') || lowerHtml.includes('>female<')));

  // Check if there's a patient portal or intake form reference
  const hasPortalRef = ['patient portal', 'intake form', 'registration', 'new patient',
    'patient form', 'sign up', 'create account', 'patient registration'].some(k => lowerText.includes(k));

  if (!hasPortalRef) {
    return {
      id: 'ER-01', name: 'Biological Sex Input Fields',
      status: 'pass', severity: 'critical',
      detail: 'No patient intake forms or registration pages detected on the scanned URL. This check applies to patient-facing portals with demographic collection. Manual audit of EHR portal recommended.',
      clause: 'SB 1188 Sec. 183.010',
      evidence: { hasPortalRef: false, scannedUrl: 'public-facing page' },
    };
  }

  return {
    id: 'ER-01', name: 'Biological Sex Input Fields',
    status: (hasBioSex || hasFormField) ? 'pass' : 'fail', severity: 'critical',
    detail: (hasBioSex || hasFormField)
      ? 'Patient registration reference detected with biological sex field present. Form includes required Male/Female biological sex input per Texas statute.'
      : 'Patient registration reference detected but NO biological sex field found. Texas statute requires distinct "Biological Sex" field with Male/Female options based on reproductive biology.',
    clause: 'SB 1188 Sec. 183.010',
    evidence: { hasBioSex, hasFormField, hasPortalRef },
  };
}

/**
 * ER-02: Minor/Parental Access Portal
 * Checks for guardian/parental access mechanisms
 */
function scanER02(pageHtml: string, pageText: string): ScanFinding {
  const lowerText = pageText.toLowerCase();
  const lowerHtml = pageHtml.toLowerCase();

  const parentalKeywords = ['parent portal', 'guardian access', 'minor patient', 'child patient',
    'parent login', 'guardian login', 'family access', 'dependent access', 'proxy access',
    'authorized representative', 'parent/guardian', 'minor access', 'pediatric portal',
    'child health', 'parental consent', 'conservator'];
  const hasParentalAccess = parentalKeywords.some(k => lowerText.includes(k) || lowerHtml.includes(k));

  const hasPortal = EHR_SIGNATURES.some(s => lowerHtml.includes(s)) || lowerText.includes('patient portal') || lowerText.includes('my chart');

  if (!hasPortal) {
    return {
      id: 'ER-02', name: 'Minor/Parental Access Portal',
      status: 'pass', severity: 'critical',
      detail: 'No patient portal or EHR system detected on the scanned page. This check applies to providers with electronic health record portals offering patient access. Manual audit recommended.',
      clause: 'SB 1188 Sec. 183.006',
      evidence: { hasPortal: false },
    };
  }

  return {
    id: 'ER-02', name: 'Minor/Parental Access Portal',
    status: hasParentalAccess ? 'pass' : 'fail', severity: 'critical',
    detail: hasParentalAccess
      ? 'Patient portal detected with parental/guardian access pathway. Portal includes references to dependent or minor patient access.'
      : 'Patient portal detected WITHOUT clear parental/guardian access pathway. Texas statute requires distinct authentication and access for parents/legal guardians of minor patients without impediments.',
    clause: 'SB 1188 Sec. 183.006',
    evidence: { hasPortal, hasParentalAccess, portalType: EHR_SIGNATURES.find(s => lowerHtml.includes(s)) || 'generic' },
  };
}

/**
 * ER-03: Metabolic Health Options
 * Checks for metabolic health documentation/communication
 */
function scanER03(pageHtml: string, pageText: string): ScanFinding {
  const lowerText = pageText.toLowerCase();

  const metabolicKeywords = ['metabolic health', 'nutrition', 'dietary', 'diet counseling',
    'weight management', 'bmi', 'body mass', 'nutritionist', 'dietitian',
    'metabolic', 'glucose', 'a1c', 'lipid', 'cholesterol', 'obesity',
    'bariatric', 'endocrin'];
  const foundKeywords = metabolicKeywords.filter(k => lowerText.includes(k));

  return {
    id: 'ER-03', name: 'Metabolic Health Options',
    status: foundKeywords.length >= 1 ? 'pass' : 'fail', severity: 'medium',
    detail: foundKeywords.length >= 1
      ? `Metabolic health references found: "${foundKeywords.slice(0, 3).join('", "')}". Practice appears to offer metabolic health documentation or communication channels.`
      : 'No metabolic health, nutrition, or dietary counseling references found on the scanned page. Texas statute requires communication options for metabolic health tracking in patient portals.',
    clause: 'SB 1188 Sec. 183.003',
    evidence: { foundKeywords },
  };
}

/**
 * ER-04: Forbidden Data Field Check
 * Scans for prohibited data collection fields
 */
function scanER04(pageHtml: string, pageText: string): ScanFinding {
  const lowerHtml = pageHtml.toLowerCase();
  const lowerText = pageText.toLowerCase();

  const forbiddenFields = [
    { keyword: 'credit score', field: 'Credit Score' },
    { keyword: 'credit rating', field: 'Credit Rating' },
    { keyword: 'voter registration', field: 'Voter Registration' },
    { keyword: 'political affiliation', field: 'Political Affiliation' },
    { keyword: 'political party', field: 'Political Party' },
    { keyword: 'voter status', field: 'Voter Status' },
    { keyword: 'fico score', field: 'FICO Score' },
  ];

  const detectedFields = forbiddenFields.filter(f =>
    lowerHtml.includes(f.keyword) || lowerText.includes(f.keyword)
  );

  // Check for form inputs with suspicious names
  const suspiciousInputs = ['name="credit', 'name="voter', 'name="political', 'id="credit', 'id="voter'];
  const detectedInputs = suspiciousInputs.filter(i => lowerHtml.includes(i));

  const pass = detectedFields.length === 0 && detectedInputs.length === 0;

  return {
    id: 'ER-04', name: 'Forbidden Data Field Check',
    status: pass ? 'pass' : 'fail', severity: 'critical',
    detail: pass
      ? 'No prohibited data collection fields detected. Page does not appear to collect credit scores, voter registration, or other explicitly forbidden personal information.'
      : `VIOLATION: Prohibited data fields detected: ${detectedFields.map(f => f.field).join(', ')}${detectedInputs.length > 0 ? ` + ${detectedInputs.length} suspicious form input(s)` : ''}. Texas law explicitly forbids collection of non-healthcare personal data.`,
    clause: 'SB 1188 Sec. 183.003',
    evidence: { detectedFields: detectedFields.map(f => f.field), detectedInputs },
  };
}

// ─── NPI VERIFICATION ───────────────────────────────────

/**
 * Verify NPI against CMS NPPES registry
 */
async function verifyNPI(npi: string): Promise<{
  valid: boolean;
  name?: string;
  type?: string;
  specialty?: string;
  state?: string;
}> {
  try {
    const response = await safeFetch(
      `https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`,
      {},
      8000
    );
    if (!response || !response.ok) return { valid: false };

    const data = await response.json();
    if (!data.result_count || data.result_count === 0) return { valid: false };

    const result = data.results[0];
    const basic = result.basic || {};
    const addresses = result.addresses || [];
    const taxonomies = result.taxonomies || [];

    const practiceAddr = addresses.find((a: { address_purpose: string }) => a.address_purpose === 'LOCATION') || addresses[0] || {};
    const primaryTaxonomy = taxonomies.find((t: { primary: boolean }) => t.primary) || taxonomies[0] || {};

    return {
      valid: true,
      name: basic.organization_name || `${basic.first_name || ''} ${basic.last_name || ''}`.trim(),
      type: result.enumeration_type === 'NPI-2' ? 'Organization' : 'Individual',
      specialty: primaryTaxonomy.desc || '',
      state: practiceAddr.state || '',
    };
  } catch {
    return { valid: false };
  }
}

// ─── SCORING ENGINE ─────────────────────────────────────

function calculateScore(findings: ScanFinding[]): { score: number; riskLevel: string; riskMeterLevel: string } {
  // Health-based scoring: Start at 100, deduct per finding
  let score = 100;

  const severityDeductions: Record<string, number> = {
    critical: 15,
    high: 10,
    medium: 5,
    low: 2,
  };

  for (const finding of findings) {
    if (finding.status === 'fail') {
      score -= severityDeductions[finding.severity] || 10;
    } else if (finding.status === 'warn') {
      score -= Math.floor((severityDeductions[finding.severity] || 10) / 2);
    }
  }

  score = Math.max(0, Math.min(100, score));

  let riskLevel: string;
  let riskMeterLevel: string;

  if (score >= 67) {
    riskLevel = 'Low';
    riskMeterLevel = 'Sovereign';
  } else if (score >= 34) {
    riskLevel = 'Moderate';
    riskMeterLevel = 'Drift';
  } else {
    riskLevel = 'High';
    riskMeterLevel = 'Violation';
  }

  return { score, riskLevel, riskMeterLevel };
}

// ─── MAIN API HANDLER ───────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { npi, url } = body;

    if (!npi || !url) {
      return NextResponse.json({ error: 'NPI and URL are required' }, { status: 400 });
    }

    // Normalize URL
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    const domain = extractDomain(targetUrl);

    // ── Phase 0: NPI Verification ──────────────────────
    const npiResult = await verifyNPI(npi);

    // ── Phase 1: Fetch Page HTML ───────────────────────
    let pageHtml = '';
    let pageText = '';
    let fetchSuccess = false;

    const pageResponse = await safeFetch(targetUrl, {}, 15000);
    if (pageResponse && pageResponse.ok) {
      pageHtml = await pageResponse.text();
      // Extract text content (strip tags)
      pageText = pageHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      fetchSuccess = true;
    }

    // ── Phase 2: Run All Scans ─────────────────────────
    const findings: ScanFinding[] = [];

    // Data Sovereignty (SB 1188) - Network-based checks
    findings.push(await scanDR01(domain));
    findings.push(await scanDR02(targetUrl));
    findings.push(await scanDR03(domain));
    findings.push(await scanDR04(targetUrl, pageHtml));

    // AI Transparency (HB 149) - Content-based checks
    if (fetchSuccess) {
      findings.push(scanAI01(pageHtml, pageText));
      findings.push(scanAI02(pageHtml));
      findings.push(scanAI03(pageHtml, pageText));
      findings.push(scanAI04(pageHtml, pageText));
    } else {
      // Can't scan content, mark as warnings
      ['AI-01', 'AI-02', 'AI-03', 'AI-04'].forEach((id, idx) => {
        const names = ['Conspicuous AI Disclosure Text', 'Disclosure Link Accessibility', 'Diagnostic AI Disclaimer Audit', 'Interactive Chatbot Notice'];
        const clauses = ['HB 149 Sec. 551.004', 'HB 149 (d)', 'SB 1188 Sec. 183.005', 'HB 149 (b)'];
        findings.push({
          id, name: names[idx],
          status: 'warn', severity: 'high',
          detail: `Unable to fetch page content from ${targetUrl}. Site may block automated requests or require JavaScript rendering. Manual audit required for HB 149 compliance verification.`,
          clause: clauses[idx],
        });
      });
    }

    // EHR Integrity - Content-based checks
    if (fetchSuccess) {
      findings.push(scanER01(pageHtml, pageText));
      findings.push(scanER02(pageHtml, pageText));
      findings.push(scanER03(pageHtml, pageText));
      findings.push(scanER04(pageHtml, pageText));
    } else {
      ['ER-01', 'ER-02', 'ER-03', 'ER-04'].forEach((id, idx) => {
        const names = ['Biological Sex Input Fields', 'Minor/Parental Access Portal', 'Metabolic Health Options', 'Forbidden Data Field Check'];
        const clauses = ['SB 1188 Sec. 183.010', 'SB 1188 Sec. 183.006', 'SB 1188 Sec. 183.003', 'SB 1188 Sec. 183.003'];
        findings.push({
          id, name: names[idx],
          status: 'warn', severity: 'medium',
          detail: `Unable to fetch page content from ${targetUrl}. Manual audit required.`,
          clause: clauses[idx],
        });
      });
    }

    // ── Phase 3: Calculate Score ────────────────────────
    const { score, riskLevel, riskMeterLevel } = calculateScore(findings);

    const topIssues = findings
      .filter(f => f.status === 'fail')
      .sort((a, b) => {
        const priority: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priority[b.severity] || 0) - (priority[a.severity] || 0);
      })
      .slice(0, 5)
      .map(f => ({ id: f.id, name: f.name, clause: f.clause }));

    const result: ScanResult = {
      npi,
      url: targetUrl,
      riskScore: score,
      riskLevel,
      riskMeterLevel,
      complianceStatus: score >= 67 ? 'Sovereign' : score >= 34 ? 'Drift' : 'Violation',
      findings,
      topIssues,
      scanTimestamp: Date.now(),
      scanDuration: Date.now() - startTime,
      engineVersion: ENGINE_VERSION,
    };

    return NextResponse.json({
      ...result,
      npiVerification: npiResult,
      meta: {
        engine: ENGINE_VERSION,
        duration: `${result.scanDuration}ms`,
        pageContentFetched: fetchSuccess,
        pageSize: pageHtml.length,
        checksRun: findings.length,
        checksPass: findings.filter(f => f.status === 'pass').length,
        checksFail: findings.filter(f => f.status === 'fail').length,
        checksWarn: findings.filter(f => f.status === 'warn').length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Scan failed', message: errorMessage, engineVersion: ENGINE_VERSION },
      { status: 500 }
    );
  }
}
