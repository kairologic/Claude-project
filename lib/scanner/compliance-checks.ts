// lib/scanner/compliance-checks.ts
// ═══ KairoLogic Compliance Check Library ═══
//
// Extracted from /api/scan/route.ts and batch-scan-v3.ts into a reusable
// module. These checks cover three state compliance categories:
//
//   - Data Sovereignty (DR-01..05) — SB 1188
//   - AI Transparency (AI-01..04)  — HB 149
//   - Clinical Integrity (ER-01..04) — SB 1188
//
// Each check function takes pre-crawled page data and returns a ComplianceFinding.
// Network-dependent checks (DR-01..05) are async; HTML-only checks are sync.
//
// Used by:
//   - scan-scheduler.ts (after each crawl cycle)
//   - /api/scan/route.ts (on-demand scans)

// ─── Types ──────────────────────────────────────────────

export interface ComplianceFinding {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'inconclusive';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'advisory' | 'info';
  category: 'data_sovereignty' | 'ai_transparency' | 'clinical_integrity';
  detail: string;
  clause: string;
  evidence?: Record<string, unknown>;
  recommended_fix?: string;
}

export interface ComplianceScanInput {
  url: string;
  html: string;
  text: string;
  responseHeaders: Record<string, string>;
}

export interface ComplianceScanResult {
  findings: ComplianceFinding[];
  composite_score: number;
  risk_level: string; // 'Sovereign' | 'Drift' | 'Violation'
  category_scores: Record<string, { score: number; level: string }>;
  failing_count: number;
  warning_count: number;
}

interface PageContext {
  type: string;
  hasPatientPortal: boolean;
  hasIntakeForms: boolean;
  hasDiagnosticTools: boolean;
  hasChatbot: boolean;
}

// ─── Constants ──────────────────────────────────────────

const AI_DISCLOSURE_KEYWORDS = [
  'artificial intelligence', 'ai disclosure', 'machine learning',
  'algorithm', 'ai-assisted', 'ai assisted', 'automated decision',
  'clinical ai', 'ai tool', 'ai system', 'ai-powered', 'ai powered',
  'computer-aided', 'computer aided', 'predictive model',
  'deep learning', 'neural network', 'intelligent system',
];

const DARK_PATTERN_INDICATORS = [
  'display:none', 'display: none', 'visibility:hidden', 'visibility: hidden',
  'opacity:0', 'opacity: 0', 'font-size:0', 'font-size: 0',
  'height:0', 'height: 0', 'width:0', 'width: 0',
  'text-indent:-9999', 'position:absolute;left:-9999',
  'clip:rect(0,0,0,0)', 'overflow:hidden;height:0',
];

const CHATBOT_SIGNATURES = [
  'intercom', 'drift', 'zendesk', 'tidio', 'livechat', 'tawk',
  'crisp', 'freshchat', 'hubspot-messages', 'olark', 'chatra',
  'comm100', 'happyfox', 'chatbot', 'dialogflow', 'botpress',
  'manychat', 'mobilemonkey', 'chatfuel', 'landbot',
];

const EHR_SIGNATURES = [
  'nextgen', 'epic', 'cerner', 'athena', 'allscripts', 'eclinicalworks',
  'drchrono', 'kareo', 'practice fusion', 'elation', 'greenway',
  'meditech', 'modernizing medicine', 'advancedmd', 'patientpop',
  'patient portal', 'myhealth', 'my chart', 'mychart', 'followmyhealth',
];

const US_SAAS = [
  'google-analytics.com', 'googletagmanager.com', 'googleapis.com', 'gstatic.com',
  'google.com', 'doubleclick.net', 'facebook.com', 'facebook.net', 'fbcdn.net',
  'stripe.com', 'stripe.network', 'hubspot.com', 'hsforms.com', 'hs-scripts.com',
  'cloudflare.com', 'jsdelivr.net', 'jquery.com', 'youtube.com', 'vimeo.com',
  'fonts.googleapis.com', 'fonts.gstatic.com', 'maps.googleapis.com', 'typekit.net',
  'calendly.com', 'zocdoc.com', 'patientpop.com', 'accessibe.com', 'userway.org',
  'intercom.io', 'zendesk.com', 'tawk.to', 'tidio.co', 'instagram.com',
  'twitter.com', 'linkedin.com', 'pinterest.com',
];

const US_MAIL = [
  'google.com', 'googlemail.com', 'outlook.com', 'protection.outlook.com',
  'amazonses.com', 'pphosted.com', 'mimecast.com', 'emailsrvr.com',
  'secureserver.net', 'zoho.com', 'paubox.com',
];

const CNAME_PATTERNS: { pattern: string; provider: string }[] = [
  { pattern: '.cloudflare.com', provider: 'Cloudflare' },
  { pattern: '.cloudflare.net', provider: 'Cloudflare' },
  { pattern: '.fastly.net', provider: 'Fastly' },
  { pattern: '.akamaized.net', provider: 'Akamai' },
  { pattern: '.akamaiedge.net', provider: 'Akamai' },
  { pattern: '.cloudfront.net', provider: 'CloudFront' },
  { pattern: '.azureedge.net', provider: 'Azure CDN' },
  { pattern: '.vercel.app', provider: 'Vercel' },
  { pattern: '.vercel-dns.com', provider: 'Vercel' },
  { pattern: '.netlify.app', provider: 'Netlify' },
  { pattern: '.squarespace.com', provider: 'Squarespace' },
  { pattern: '.wixsite.com', provider: 'Wix' },
  { pattern: '.webflow.io', provider: 'Webflow' },
];

const SEVERITY_DEDUCTIONS: Record<string, number> = {
  critical: 30, high: 20, medium: 10, low: 5, advisory: 5, info: 0,
};

// ─── Helpers ────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

function isKnownUSSaaS(domain: string): boolean {
  const l = domain.toLowerCase();
  return US_SAAS.some(e => l === e || l.endsWith('.' + e));
}

function isKnownUSMail(exchange: string): boolean {
  const l = exchange.toLowerCase();
  return US_MAIL.some(e => l === e || l.endsWith('.' + e));
}

async function safeFetch(url: string, timeoutMs = 8000): Promise<Response | null> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return null;
  }
}

async function resolveIPGeo(hostname: string): Promise<{
  ip: string; country: string; countryCode: string; city: string; org: string; isSovereign: boolean;
} | null> {
  try {
    const res = await safeFetch(
      `http://ip-api.com/json/${hostname}?fields=status,country,countryCode,city,org,isp,query`,
      5000,
    );
    if (!res || !res.ok) return null;
    const d = await res.json();
    if (d.status !== 'success') return null;
    return {
      ip: d.query || '', country: d.country || '', countryCode: d.countryCode || '',
      city: d.city || '', org: d.org || d.isp || '', isSovereign: d.countryCode === 'US',
    };
  } catch {
    return null;
  }
}

async function resolveMX(domain: string): Promise<{ exchange: string; preference: number }[]> {
  try {
    const res = await safeFetch(`https://dns.google/resolve?name=${domain}&type=MX`, 5000);
    if (!res || !res.ok) return [];
    const data = await res.json();
    if (!data.Answer) return [];
    return data.Answer
      .filter((a: any) => a.type === 15)
      .map((a: any) => {
        const p = a.data.split(' ');
        return { preference: parseInt(p[0]) || 0, exchange: (p[1] || '').replace(/\.$/, '') };
      });
  } catch {
    return [];
  }
}

async function detectCDNByCNAME(domain: string): Promise<{ detected: boolean; provider: string }> {
  try {
    const res = await safeFetch(`https://dns.google/resolve?name=${domain}&type=CNAME`, 5000);
    if (!res || !res.ok) return { detected: false, provider: '' };
    const data = await res.json();
    if (!data.Answer) return { detected: false, provider: '' };
    for (const a of data.Answer) {
      if (a.type !== 5) continue;
      const cname = (a.data || '').toLowerCase().replace(/\.$/, '');
      for (const p of CNAME_PATTERNS) {
        if (cname.endsWith(p.pattern)) return { detected: true, provider: p.provider };
      }
    }
    return { detected: false, provider: '' };
  } catch {
    return { detected: false, provider: '' };
  }
}

function detectCDNByHeaders(headers: Record<string, string>): { detected: boolean; provider: string } {
  if (headers['cf-ray'] || headers['server'] === 'cloudflare' || headers['cf-cache-status'])
    return { detected: true, provider: 'Cloudflare' };
  if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop'])
    return { detected: true, provider: 'CloudFront' };
  if (headers['x-served-by']?.includes('cache-') || headers['x-fastly-request-id'])
    return { detected: true, provider: 'Fastly' };
  if (headers['x-vercel-id'] || headers['x-vercel-cache'])
    return { detected: true, provider: 'Vercel' };
  if (headers['x-azure-ref'] || headers['x-msedge-ref'])
    return { detected: true, provider: 'Azure CDN' };
  if (headers['server']?.includes('netlify'))
    return { detected: true, provider: 'Netlify' };
  return { detected: false, provider: '' };
}

function detectPageContext(html: string, text: string): PageContext {
  const lt = text.toLowerCase();
  const lh = html.toLowerCase();

  const isContact = ['contact us', 'get in touch', 'contact form'].some(k => lt.includes(k));
  const isHomepage = lh.includes('og:type" content="website"') || lt.includes('welcome to');
  const isAbout = ['about us', 'our team', 'our mission', 'our doctors'].some(k => lt.includes(k));
  const isServices = ['our services', 'services we offer', 'treatments'].some(k => lt.includes(k));
  const isPortal = ['patient portal', 'login', 'sign in', 'my chart'].some(k => lt.includes(k));
  const isIntake = ['intake form', 'registration form', 'new patient form'].some(k => lt.includes(k));

  let type = 'general';
  if (isIntake) type = 'patient_intake';
  else if (isPortal) type = 'patient_portal';
  else if (isContact) type = 'contact';
  else if (isServices) type = 'services';
  else if (isAbout) type = 'about';
  else if (isHomepage) type = 'homepage';

  return {
    type,
    hasPatientPortal: EHR_SIGNATURES.some(s => lh.includes(s)) || lt.includes('patient portal'),
    hasIntakeForms: ['intake form', 'registration', 'new patient', 'patient form'].some(k => lt.includes(k)),
    hasDiagnosticTools: ['symptom checker', 'risk calculator', 'health assessment'].some(k => lt.includes(k)),
    hasChatbot: CHATBOT_SIGNATURES.some(s => lh.includes(s)),
  };
}

// ─── DR Checks (Data Sovereignty — SB 1188) ────────────

async function checkDR01(
  domain: string,
  headers: Record<string, string>,
): Promise<{ finding: ComplianceFinding; cdnDetected: boolean; cdnProvider: string }> {
  const geo = await resolveIPGeo(domain);
  if (!geo) {
    return {
      finding: {
        id: 'DR-01', name: 'Primary Domain IP Geo-Location',
        status: 'warn', severity: 'high', category: 'data_sovereignty',
        detail: `Unable to resolve IP for ${domain}. Manual audit needed.`,
        clause: 'SB 1188 Sec. 183.002(a)',
      },
      cdnDetected: false, cdnProvider: '',
    };
  }

  // CDN detection: headers first (cheapest), then CNAME
  const hdrCdn = detectCDNByHeaders(headers);
  const cnameCdn = hdrCdn.detected ? { detected: false, provider: '' } : await detectCDNByCNAME(domain);
  const cdnDetected = hdrCdn.detected || cnameCdn.detected;
  const cdnProvider = hdrCdn.provider || cnameCdn.provider;

  if (cdnDetected && !geo.isSovereign) {
    return {
      finding: {
        id: 'DR-01', name: 'Primary Domain IP Geo-Location',
        status: 'pass', severity: 'low', category: 'data_sovereignty',
        detail: `IP ${geo.ip} geolocates to ${geo.city}, ${geo.country} but is ${cdnProvider} anycast. US edge nodes serve US traffic.`,
        clause: 'SB 1188 Sec. 183.002(a)',
        evidence: { ip: geo.ip, country: geo.countryCode, cdnProvider },
      },
      cdnDetected: true, cdnProvider,
    };
  }

  if (geo.isSovereign) {
    return {
      finding: {
        id: 'DR-01', name: 'Primary Domain IP Geo-Location',
        status: 'pass', severity: 'low', category: 'data_sovereignty',
        detail: `Server ${geo.ip} in ${geo.city}, US (${geo.org}).`,
        clause: 'SB 1188 Sec. 183.002(a)',
        evidence: { ip: geo.ip, country: 'US', city: geo.city, org: geo.org },
      },
      cdnDetected, cdnProvider,
    };
  }

  return {
    finding: {
      id: 'DR-01', name: 'Primary Domain IP Geo-Location',
      status: 'fail', severity: 'critical', category: 'data_sovereignty',
      detail: `Server ${geo.ip} in ${geo.city}, ${geo.country} (${geo.org}). No CDN detected.`,
      clause: 'SB 1188 Sec. 183.002(a)',
      evidence: { ip: geo.ip, country: geo.countryCode, city: geo.city },
      recommended_fix: 'Migrate hosting to a US-based provider or configure a US-only CDN.',
    },
    cdnDetected: false, cdnProvider: '',
  };
}

function checkDR02(headers: Record<string, string>): ComplianceFinding {
  const foreignRegions = ['eu-', 'ap-', 'sa-', 'af-', 'me-', 'cn-', 'ams', 'fra', 'sin', 'syd', 'tok', 'lon', 'cdg'];
  const allVals = Object.values(headers).join(' ');
  const foreignEdges = foreignRegions.filter(r => allVals.includes(r)).map(r => r.toUpperCase());
  const cfPop = (headers['cf-ray'] || '').split('-').pop() || '';
  const foreignPops = ['AMS', 'FRA', 'SIN', 'SYD', 'TOK', 'LON', 'CDG', 'BOM', 'GRU', 'NRT', 'ICN', 'DUB'];
  if (foreignPops.some(p => cfPop.toUpperCase().includes(p))) foreignEdges.push(`CF:${cfPop.toUpperCase()}`);

  return {
    id: 'DR-02', name: 'CDN & Edge Cache Analysis',
    status: foreignEdges.length > 0 ? 'warn' : 'pass',
    severity: foreignEdges.length > 0 ? 'medium' : 'low',
    category: 'data_sovereignty',
    detail: foreignEdges.length > 0
      ? `CDN foreign edge indicators: ${foreignEdges.join(', ')}. Static asset caching only.`
      : 'No foreign edge node indicators detected.',
    clause: 'SB 1188 Sec. 183.002(b)',
    evidence: { foreignEdges },
  };
}

async function checkDR03(domain: string): Promise<ComplianceFinding> {
  const mxRecords = await resolveMX(domain);
  if (mxRecords.length === 0) {
    return {
      id: 'DR-03', name: 'Mail Exchange (MX) Pathing',
      status: 'warn', severity: 'medium', category: 'data_sovereignty',
      detail: `No MX records for ${domain}.`,
      clause: 'SB 1188 Sec. 183.002(c)',
    };
  }

  const mxGeo = await Promise.all(
    mxRecords.slice(0, 3).map(async mx => ({
      exchange: mx.exchange,
      geo: await resolveIPGeo(mx.exchange),
    })),
  );
  const foreignMX = mxGeo.filter(r => r.geo && !r.geo.isSovereign && !isKnownUSMail(r.exchange));

  return {
    id: 'DR-03', name: 'Mail Exchange (MX) Pathing',
    status: foreignMX.length > 0 ? 'fail' : 'pass',
    severity: foreignMX.length > 0 ? 'critical' : 'low',
    category: 'data_sovereignty',
    detail: foreignMX.length > 0
      ? `Foreign mail routing: ${foreignMX.map(f => `${f.exchange} (${f.geo?.country})`).join('; ')}`
      : `${mxRecords.length} MX records, all US. Primary: ${mxRecords[0].exchange}`,
    clause: 'SB 1188 Sec. 183.002(c)',
    evidence: { mxRecords: mxRecords.map(r => r.exchange) },
    recommended_fix: foreignMX.length > 0
      ? 'Migrate email to a US-based provider (Google Workspace, Microsoft 365, Paubox).'
      : undefined,
  };
}

async function checkDR04(html: string, domain: string): Promise<ComplianceFinding> {
  const extDomains = new Set<string>();
  const re = /(?:src|href|action)=["']?(https?:\/\/[^"'\s>]+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const d = extractDomain(m[1]);
      if (d && d !== domain && !d.includes('localhost')) extDomains.add(d);
    } catch { /* skip */ }
  }

  if (extDomains.size === 0) {
    return {
      id: 'DR-04', name: 'Sub-Processor Domain Audit',
      status: 'pass', severity: 'low', category: 'data_sovereignty',
      detail: 'No external domains detected. Self-contained.',
      clause: 'SB 1188 Sec. 183.004',
    };
  }

  const toCheck = [...extDomains].slice(0, 10);
  const geoResults = await Promise.all(
    toCheck.map(async d => ({ domain: d, geo: await resolveIPGeo(d), isUS: isKnownUSSaaS(d) })),
  );
  const foreign = geoResults.filter(r => r.geo && !r.geo.isSovereign && !r.isUS);

  return {
    id: 'DR-04', name: 'Sub-Processor Domain Audit',
    status: foreign.length > 0 ? 'warn' : 'pass',
    severity: foreign.length > 0 ? 'high' : 'low',
    category: 'data_sovereignty',
    detail: foreign.length > 0
      ? `${foreign.length} foreign sub-processor(s): ${foreign.map(f => `${f.domain} (${f.geo?.country})`).join(', ')}`
      : `${extDomains.size} external domains sampled, all US.`,
    clause: 'SB 1188 Sec. 183.004',
    evidence: { totalExternal: extDomains.size, foreign: foreign.map(f => ({ d: f.domain, c: f.geo?.country })) },
    recommended_fix: foreign.length > 0
      ? `Review foreign sub-processors and migrate to US-hosted alternatives where possible.`
      : undefined,
  };
}

function checkDR05(cdnDetected: boolean, cdnProvider: string): ComplianceFinding | null {
  if (!cdnDetected) return null;
  return {
    id: 'DR-05', name: 'CDN Data Path Transparency',
    status: 'warn', severity: 'advisory', category: 'data_sovereignty',
    detail: `Site uses ${cdnProvider} CDN. SB 1188 requires documented evidence of data residency compliance.`,
    clause: 'SB 1188 Sec. 183.002(a)',
    recommended_fix: `Execute ${cdnProvider} DPA, create Data Flow Map, add compliance attestation.`,
  };
}

// ─── AI Checks (AI Transparency — HB 149) ──────────────

function checkAI01(text: string): ComplianceFinding {
  const lt = text.toLowerCase();
  const found = AI_DISCLOSURE_KEYWORDS.filter(kw => lt.includes(kw));
  const pass = found.length >= 2;
  return {
    id: 'AI-01', name: 'Conspicuous AI Disclosure Text',
    status: pass ? 'pass' : 'fail', severity: 'high', category: 'ai_transparency',
    detail: pass
      ? `AI disclosure detected. Found ${found.length} keyword(s): "${found.slice(0, 3).join('", "')}".`
      : `No AI disclosure found. HB 149 requires clear disclosure when AI contributes to patient care.`,
    clause: 'HB 149 Sec. 551.004',
    evidence: { foundKeywords: found, threshold: 2 },
    recommended_fix: pass ? undefined
      : 'Add a clear AI disclosure statement to the website homepage and service pages.',
  };
}

function checkAI02(html: string): ComplianceFinding {
  const lh = html.toLowerCase();
  const detected: string[] = [];
  for (const pattern of DARK_PATTERN_INDICATORS) {
    const sections = lh.split(/artificial intelligence|ai disclosure|algorithm/);
    for (let i = 1; i < sections.length; i++) {
      if (sections[i].substring(0, 500).includes(pattern)) detected.push(pattern.trim());
    }
  }
  const pass = detected.length === 0;
  return {
    id: 'AI-02', name: 'Disclosure Link Accessibility',
    status: pass ? 'pass' : 'fail', severity: 'critical', category: 'ai_transparency',
    detail: pass
      ? 'No dark pattern indicators found near AI disclosure content.'
      : `Dark patterns detected near AI disclosure: ${[...new Set(detected)].join(', ')}.`,
    clause: 'HB 149 (d)',
    evidence: { detectedPatterns: [...new Set(detected)] },
    recommended_fix: pass ? undefined
      : 'Remove CSS dark patterns obscuring AI disclosure content. Ensure readable styling.',
  };
}

function checkAI03(html: string, text: string, ctx: PageContext): ComplianceFinding {
  if (!ctx.hasDiagnosticTools) {
    return {
      id: 'AI-03', name: 'Diagnostic AI Disclaimer Audit',
      status: 'pass', severity: 'info', category: 'ai_transparency',
      detail: `No AI diagnostic tools on this ${ctx.type} page. Not applicable.`,
      clause: 'SB 1188 Sec. 183.005',
    };
  }
  const lt = text.toLowerCase();
  const disclaimers = ['reviewed by', 'approved by', 'supervised by', 'practitioner review',
    'physician review', 'licensed provider', 'not a substitute for medical advice'];
  const has = disclaimers.some(k => lt.includes(k));
  return {
    id: 'AI-03', name: 'Diagnostic AI Disclaimer Audit',
    status: has ? 'pass' : 'fail', severity: 'critical', category: 'ai_transparency',
    detail: has ? 'AI diagnostic tool with practitioner review disclaimer present.'
      : 'AI diagnostic tool WITHOUT practitioner review disclaimer.',
    clause: 'SB 1188 Sec. 183.005',
    recommended_fix: has ? undefined
      : 'Add a practitioner review disclaimer adjacent to all AI diagnostic tools.',
  };
}

function checkAI04(html: string, text: string, ctx: PageContext): ComplianceFinding {
  const lh = html.toLowerCase();
  const platforms = CHATBOT_SIGNATURES.filter(sig => lh.includes(sig));
  if (platforms.length === 0) {
    return {
      id: 'AI-04', name: 'Interactive Chatbot Notice',
      status: 'pass', severity: 'info', category: 'ai_transparency',
      detail: `No chatbot detected on this ${ctx.type} page.`,
      clause: 'HB 149 (b)',
    };
  }
  const lt = text.toLowerCase();
  const noticeKw = ['ai assistant', 'chatbot', 'automated', 'virtual assistant', 'bot', 'not a human'];
  const has = noticeKw.some(k => lt.includes(k) || lh.includes(k));
  return {
    id: 'AI-04', name: 'Interactive Chatbot Notice',
    status: has ? 'pass' : 'fail', severity: 'high', category: 'ai_transparency',
    detail: has ? `Chatbot (${platforms.join(', ')}) with AI notice present.`
      : `Chatbot (${platforms.join(', ')}) WITHOUT AI disclosure. HB 149 requires notification.`,
    clause: 'HB 149 (b)',
    evidence: { detectedPlatforms: platforms, hasNotice: has },
    recommended_fix: has ? undefined
      : `Add AI disclosure notice to chatbot (${platforms[0]}) welcome message.`,
  };
}

// ─── ER Checks (Clinical Integrity — SB 1188) ──────────

function checkER01(html: string, text: string, ctx: PageContext): ComplianceFinding {
  if (!ctx.hasIntakeForms && !ctx.hasPatientPortal && ['contact', 'about', 'services', 'homepage', 'general'].includes(ctx.type)) {
    return {
      id: 'ER-01', name: 'Biological Sex Input Fields',
      status: 'pass', severity: 'info', category: 'clinical_integrity',
      detail: `Page type: "${ctx.type}" — no intake forms detected. Applies to registration pages only.`,
      clause: 'SB 1188 Sec. 183.010',
    };
  }
  const lh = html.toLowerCase();
  const lt = text.toLowerCase();
  const has = ['biological sex', 'sex assigned at birth', 'birth sex', 'patient sex'].some(k => lt.includes(k) || lh.includes(k));
  const hasField = lh.includes('name="sex"') || lh.includes('name="biological_sex"');
  return {
    id: 'ER-01', name: 'Biological Sex Input Fields',
    status: (has || hasField) ? 'pass' : 'fail', severity: 'high', category: 'clinical_integrity',
    detail: (has || hasField)
      ? 'Patient registration — biological sex field present.'
      : 'Patient registration — NO biological sex field. Texas statute requires this on intake forms.',
    clause: 'SB 1188 Sec. 183.010',
    recommended_fix: (has || hasField) ? undefined
      : 'Add a "Biological Sex" field (Male/Female) to patient intake forms.',
  };
}

function checkER02(html: string, text: string, ctx: PageContext): ComplianceFinding {
  if (!ctx.hasPatientPortal) {
    return {
      id: 'ER-02', name: 'Minor/Parental Access Portal',
      status: 'pass', severity: 'info', category: 'clinical_integrity',
      detail: `No patient portal detected on this ${ctx.type} page.`,
      clause: 'SB 1188 Sec. 183.006',
    };
  }
  const lt = text.toLowerCase();
  const lh = html.toLowerCase();
  const parentKw = ['parent portal', 'guardian access', 'minor patient', 'parent login', 'family access',
    'dependent access', 'proxy access', 'parent/guardian', 'parental consent'];
  const has = parentKw.some(k => lt.includes(k) || lh.includes(k));
  const portal = EHR_SIGNATURES.find(s => lh.includes(s)) || 'generic';
  return {
    id: 'ER-02', name: 'Minor/Parental Access Portal',
    status: has ? 'pass' : 'fail', severity: 'high', category: 'clinical_integrity',
    detail: has ? `Portal (${portal}) with parental/guardian access pathway.`
      : `Portal (${portal}) WITHOUT parental/guardian access. Texas requires distinct auth for parents/guardians.`,
    clause: 'SB 1188 Sec. 183.006',
    recommended_fix: has ? undefined
      : `Configure parent/guardian proxy access in ${portal} patient portal.`,
  };
}

function checkER03(text: string, ctx: PageContext): ComplianceFinding {
  const lt = text.toLowerCase();
  const kws = ['metabolic health', 'nutrition', 'dietary', 'diet counseling', 'weight management',
    'bmi', 'body mass', 'nutritionist', 'dietitian', 'metabolic', 'glucose', 'a1c',
    'lipid', 'cholesterol', 'obesity', 'bariatric', 'endocrin'];
  const found = kws.filter(k => lt.includes(k));
  return {
    id: 'ER-03', name: 'Metabolic Health Options',
    status: found.length >= 1 ? 'pass' : 'fail', severity: 'medium', category: 'clinical_integrity',
    detail: found.length >= 1
      ? `Metabolic health references: "${found.slice(0, 3).join('", "')}".`
      : `No metabolic/nutrition references on this ${ctx.type} page.`,
    clause: 'SB 1188 Sec. 183.003',
    evidence: { foundKeywords: found },
  };
}

function checkER04(html: string, text: string): ComplianceFinding {
  const lh = html.toLowerCase();
  const lt = text.toLowerCase();
  const forbidden = [
    { keyword: 'credit score', field: 'Credit Score' },
    { keyword: 'credit rating', field: 'Credit Rating' },
    { keyword: 'voter registration', field: 'Voter Registration' },
    { keyword: 'political affiliation', field: 'Political Affiliation' },
    { keyword: 'fico score', field: 'FICO Score' },
  ];
  const detected = forbidden.filter(f => lh.includes(f.keyword) || lt.includes(f.keyword));
  const pass = detected.length === 0;
  return {
    id: 'ER-04', name: 'Forbidden Data Field Check',
    status: pass ? 'pass' : 'fail', severity: 'critical', category: 'clinical_integrity',
    detail: pass
      ? 'No prohibited data collection fields detected.'
      : `VIOLATION: ${detected.map(f => f.field).join(', ')} detected. Texas law forbids non-healthcare data collection.`,
    clause: 'SB 1188 Sec. 183.003',
    evidence: { detectedFields: detected.map(f => f.field) },
    recommended_fix: pass ? undefined
      : `URGENT: Remove prohibited fields: ${detected.map(f => f.field).join(', ')}.`,
  };
}

// ─── Scoring ────────────────────────────────────────────

function scoreFindingsByCategory(
  findings: ComplianceFinding[],
  category: string,
): { score: number; level: string } {
  const catF = findings.filter(f => f.category === category);
  if (catF.length === 0) return { score: 100, level: 'Sovereign' };

  let score = 100;
  let advisoryDeduction = 0;
  for (const f of catF) {
    if (f.severity === 'advisory') {
      const deduct = Math.min(5, 15 - advisoryDeduction);
      if (f.status === 'warn' || f.status === 'fail') {
        advisoryDeduction += deduct;
        score -= deduct;
      }
    } else if (f.status === 'fail') {
      score -= SEVERITY_DEDUCTIONS[f.severity] || 10;
    } else if (f.status === 'warn') {
      score -= Math.floor((SEVERITY_DEDUCTIONS[f.severity] || 10) / 3);
    }
  }
  score = Math.max(0, Math.min(100, score));
  const level = score >= 80 ? 'Sovereign' : score >= 60 ? 'Drift' : 'Violation';
  return { score, level };
}

// ─── Main Entry Point ───────────────────────────────────

/**
 * Run all compliance checks against a crawled page.
 *
 * DR checks (01-05) are async — they make DNS/geo lookups.
 * AI checks (01-04) and ER checks (01-04) are sync — HTML analysis only.
 *
 * @returns ComplianceScanResult with all findings and composite score
 */
export async function runComplianceChecks(input: ComplianceScanInput): Promise<ComplianceScanResult> {
  const { url, html, text, responseHeaders } = input;
  const domain = extractDomain(url);
  const ctx = detectPageContext(html, text);
  const findings: ComplianceFinding[] = [];

  // DR checks (async, network-dependent)
  try {
    const { finding: dr01, cdnDetected, cdnProvider } = await checkDR01(domain, responseHeaders);
    findings.push(dr01);
    findings.push(checkDR02(responseHeaders));

    const [dr03, dr04] = await Promise.all([
      checkDR03(domain),
      checkDR04(html, domain),
    ]);
    findings.push(dr03);
    findings.push(dr04);

    const dr05 = checkDR05(cdnDetected, cdnProvider);
    if (dr05) findings.push(dr05);
  } catch (err) {
    console.warn(`[ComplianceChecks] DR checks failed for ${domain}:`, err);
    findings.push({
      id: 'DR-01', name: 'Data Sovereignty', status: 'inconclusive', severity: 'high',
      category: 'data_sovereignty', detail: 'DR checks failed — manual audit needed.',
      clause: 'SB 1188',
    });
  }

  // AI checks (sync, HTML only)
  findings.push(checkAI01(text));
  findings.push(checkAI02(html));
  findings.push(checkAI03(html, text, ctx));
  findings.push(checkAI04(html, text, ctx));

  // ER checks (sync, HTML only)
  findings.push(checkER01(html, text, ctx));
  findings.push(checkER02(html, text, ctx));
  findings.push(checkER03(text, ctx));
  findings.push(checkER04(html, text));

  // Score by category
  const ds = scoreFindingsByCategory(findings, 'data_sovereignty');
  const ai = scoreFindingsByCategory(findings, 'ai_transparency');
  const ci = scoreFindingsByCategory(findings, 'clinical_integrity');

  // Weighted composite: DS 45%, AI 30%, CI 25%
  const composite = Math.round(ds.score * 0.45 + ai.score * 0.30 + ci.score * 0.25);
  const riskLevel = composite >= 80 && ds.score >= 75 ? 'Sovereign'
    : composite >= 60 ? 'Drift'
    : 'Violation';

  return {
    findings,
    composite_score: composite,
    risk_level: riskLevel,
    category_scores: {
      data_sovereignty: ds,
      ai_transparency: ai,
      clinical_integrity: ci,
    },
    failing_count: findings.filter(f => f.status === 'fail').length,
    warning_count: findings.filter(f => f.status === 'warn').length,
  };
}

/**
 * Returns only findings that need remediation (fail or warn with severity >= medium).
 * These are the findings that should trigger compliance workflows.
 */
export function getActionableFindings(findings: ComplianceFinding[]): ComplianceFinding[] {
  return findings.filter(f =>
    (f.status === 'fail' || f.status === 'warn') &&
    f.severity !== 'info' &&
    f.severity !== 'advisory',
  );
}
