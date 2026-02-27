/**
 * KairoLogic CDN Detection Module v1.0
 * =====================================
 * Three-layer CDN detection: IP CIDR ranges, CNAME/DNS patterns, HTTP headers.
 * Also includes known US SaaS allowlist for DR-04 and US mail platform recognition.
 *
 * Usage:
 *   import { detectCDN, isKnownUSSaaS, isKnownUSMailProvider } from './cdn-detection';
 */

// ─── CDN IP CIDR RANGES ──────────────────────────────────
// These are the primary IP ranges for major CDN providers.
// Anycast IPs in these ranges geolocate to corporate HQ (often Canada/EU)
// but actually route traffic to nearest edge node (typically US for US visitors).

interface CIDRRange {
  cidr: string;
  maskBits: number;
  networkInt: number;
  provider: string;
}

const CDN_CIDR_DEFINITIONS: { provider: string; ranges: string[] }[] = [
  {
    provider: 'Cloudflare',
    ranges: [
      '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
      '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
      '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
      '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
    ],
  },
  {
    provider: 'Fastly',
    ranges: [
      '23.235.32.0/20', '43.249.72.0/22', '103.244.50.0/24', '103.245.222.0/23',
      '103.245.224.0/24', '104.156.80.0/20', '140.248.64.0/18', '140.248.128.0/17',
      '146.75.0.0/17', '151.101.0.0/16', '157.52.64.0/18', '167.82.0.0/17',
      '167.82.128.0/20', '167.82.160.0/20', '167.82.224.0/20', '185.31.17.0/24',
      '199.27.72.0/21', '199.232.0.0/16',
    ],
  },
  {
    provider: 'Akamai',
    ranges: [
      '23.0.0.0/12', '23.32.0.0/11', '23.64.0.0/14', '23.72.0.0/13',
      '104.64.0.0/10', '184.24.0.0/13', '184.50.0.0/15', '184.84.0.0/14',
      '2.16.0.0/13',
    ],
  },
  {
    provider: 'CloudFront',
    ranges: [
      '13.32.0.0/15', '13.35.0.0/16', '13.224.0.0/14', '13.249.0.0/16',
      '18.64.0.0/14', '18.154.0.0/15', '18.160.0.0/15', '18.164.0.0/14',
      '18.172.0.0/15', '52.84.0.0/15', '52.222.128.0/17', '54.182.0.0/16',
      '54.192.0.0/16', '54.230.0.0/16', '54.239.128.0/18', '54.239.192.0/19',
      '64.252.64.0/18', '64.252.128.0/18', '65.8.0.0/16', '65.9.0.0/17',
      '65.9.128.0/18', '99.84.0.0/16', '99.86.0.0/16', '130.176.0.0/17',
      '143.204.0.0/16', '144.220.0.0/16', '204.246.164.0/22', '204.246.168.0/22',
      '205.251.192.0/19', '205.251.249.0/24', '205.251.250.0/23', '205.251.252.0/23',
      '205.251.254.0/24', '216.137.32.0/19',
    ],
  },
  {
    provider: 'Azure CDN',
    ranges: [
      '13.107.246.0/24', '13.107.213.0/24', '152.199.0.0/16',
    ],
  },
  {
    provider: 'Vercel',
    ranges: [
      '76.76.21.0/24', '76.223.0.0/16',
    ],
  },
];

// Pre-parse CIDR ranges for fast lookup
function parseCIDR(cidr: string): { networkInt: number; maskBits: number } {
  const [ip, bits] = cidr.split('/');
  const parts = ip.split('.').map(Number);
  const networkInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  return { networkInt, maskBits: parseInt(bits) };
}

function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return 0;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipInCIDR(ipInt: number, networkInt: number, maskBits: number): boolean {
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

// Build the lookup table once
const CDN_CIDR_RANGES: CIDRRange[] = [];
for (const def of CDN_CIDR_DEFINITIONS) {
  for (const cidr of def.ranges) {
    const parsed = parseCIDR(cidr);
    CDN_CIDR_RANGES.push({ cidr, ...parsed, provider: def.provider });
  }
}

/**
 * Check if an IP address belongs to a known CDN provider via CIDR range matching.
 */
export function detectCDNByIP(ip: string): { detected: boolean; provider: string; method: 'ip_range' } {
  const ipInt = ipToInt(ip);
  if (ipInt === 0) return { detected: false, provider: '', method: 'ip_range' };

  for (const range of CDN_CIDR_RANGES) {
    if (ipInCIDR(ipInt, range.networkInt, range.maskBits)) {
      return { detected: true, provider: range.provider, method: 'ip_range' };
    }
  }
  return { detected: false, provider: '', method: 'ip_range' };
}


// ─── CNAME / DNS PATTERN DETECTION ───────────────────────
// Many CDN-proxied sites have CNAME records pointing to CDN hostnames.

const CNAME_PATTERNS: { pattern: string; provider: string }[] = [
  // Cloudflare
  { pattern: '.cloudflare.com', provider: 'Cloudflare' },
  { pattern: '.cloudflare-dns.com', provider: 'Cloudflare' },
  { pattern: '.cloudflare.net', provider: 'Cloudflare' },

  // Fastly
  { pattern: '.fastly.net', provider: 'Fastly' },
  { pattern: '.fastlylb.net', provider: 'Fastly' },

  // Akamai
  { pattern: '.akamai.net', provider: 'Akamai' },
  { pattern: '.akamaized.net', provider: 'Akamai' },
  { pattern: '.akamaiedge.net', provider: 'Akamai' },
  { pattern: '.akamaitechnologies.com', provider: 'Akamai' },
  { pattern: '.edgesuite.net', provider: 'Akamai' },
  { pattern: '.edgekey.net', provider: 'Akamai' },

  // CloudFront
  { pattern: '.cloudfront.net', provider: 'CloudFront' },

  // Azure CDN
  { pattern: '.azureedge.net', provider: 'Azure CDN' },
  { pattern: '.azurefd.net', provider: 'Azure CDN' },
  { pattern: '.trafficmanager.net', provider: 'Azure CDN' },

  // Vercel
  { pattern: '.vercel.app', provider: 'Vercel' },
  { pattern: '.vercel-dns.com', provider: 'Vercel' },
  { pattern: '.now.sh', provider: 'Vercel' },

  // Google Cloud CDN
  { pattern: '.googleapis.com', provider: 'Google Cloud' },
  { pattern: '.googlevideo.com', provider: 'Google Cloud' },

  // Netlify
  { pattern: '.netlify.app', provider: 'Netlify' },
  { pattern: '.netlify.com', provider: 'Netlify' },

  // Hosting platforms with built-in CDN
  { pattern: '.kinsta.cloud', provider: 'Kinsta (CDN)' },
  { pattern: '.wpdns.site', provider: 'WP Engine (CDN)' },
  { pattern: '.wpengine.com', provider: 'WP Engine (CDN)' },
  { pattern: '.wpmucdn.com', provider: 'WP Engine (CDN)' },
  { pattern: '.pantheonsite.io', provider: 'Pantheon (CDN)' },
  { pattern: '.squarespace.com', provider: 'Squarespace (CDN)' },
  { pattern: '.wixsite.com', provider: 'Wix (CDN)' },
  { pattern: '.wix.com', provider: 'Wix (CDN)' },
  { pattern: '.shopify.com', provider: 'Shopify (CDN)' },
  { pattern: '.myshopify.com', provider: 'Shopify (CDN)' },
  { pattern: '.webflow.io', provider: 'Webflow (CDN)' },
  { pattern: '.ghost.io', provider: 'Ghost (CDN)' },
  { pattern: '.herokuapp.com', provider: 'Heroku' },
  { pattern: '.render.com', provider: 'Render' },
  { pattern: '.fly.dev', provider: 'Fly.io' },
  { pattern: '.deno.dev', provider: 'Deno Deploy' },
  { pattern: '.pages.dev', provider: 'Cloudflare Pages' },
  { pattern: '.workers.dev', provider: 'Cloudflare Workers' },
  { pattern: '.r2.dev', provider: 'Cloudflare R2' },

  // Sucuri / security CDNs
  { pattern: '.sucuri.net', provider: 'Sucuri (CDN)' },
  { pattern: '.stackpathdns.com', provider: 'StackPath (CDN)' },
  { pattern: '.stackpathcdn.com', provider: 'StackPath (CDN)' },
];

/**
 * Check CNAME records for CDN patterns via DNS-over-HTTPS.
 */
export async function detectCDNByCNAME(domain: string): Promise<{ detected: boolean; provider: string; cname: string; method: 'cname' }> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { detected: false, provider: '', cname: '', method: 'cname' };
    const data = await res.json();
    if (!data.Answer) return { detected: false, provider: '', cname: '', method: 'cname' };

    for (const answer of data.Answer) {
      if (answer.type !== 5) continue; // type 5 = CNAME
      const cname = (answer.data || '').toLowerCase().replace(/\.$/, '');
      for (const pattern of CNAME_PATTERNS) {
        if (cname.endsWith(pattern.pattern)) {
          return { detected: true, provider: pattern.provider, cname, method: 'cname' };
        }
      }
    }
    return { detected: false, provider: '', cname: '', method: 'cname' };
  } catch {
    return { detected: false, provider: '', cname: '', method: 'cname' };
  }
}


// ─── HTTP HEADER DETECTION ───────────────────────────────
// Detect CDN from response headers (already partially done in DR-02).

export function detectCDNByHeaders(headers: Record<string, string>): { detected: boolean; provider: string; method: 'headers'; evidence: string[] } {
  const evidence: string[] = [];
  let provider = '';

  // Cloudflare
  if (headers['cf-ray'] || headers['server'] === 'cloudflare' || headers['cf-cache-status']) {
    provider = 'Cloudflare';
    if (headers['cf-ray']) evidence.push(`cf-ray: ${headers['cf-ray']}`);
    if (headers['server'] === 'cloudflare') evidence.push('server: cloudflare');
    if (headers['cf-cache-status']) evidence.push(`cf-cache-status: ${headers['cf-cache-status']}`);
  }
  // CloudFront
  else if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop']) {
    provider = 'CloudFront';
    if (headers['x-amz-cf-id']) evidence.push('x-amz-cf-id present');
    if (headers['x-amz-cf-pop']) evidence.push(`x-amz-cf-pop: ${headers['x-amz-cf-pop']}`);
  }
  // Fastly
  else if (headers['x-served-by']?.includes('cache-') || headers['x-cache']?.includes('fastly') || headers['x-fastly-request-id']) {
    provider = 'Fastly';
    if (headers['x-served-by']) evidence.push(`x-served-by: ${headers['x-served-by']}`);
    if (headers['x-fastly-request-id']) evidence.push('x-fastly-request-id present');
  }
  // Vercel
  else if (headers['x-vercel-id'] || headers['x-vercel-cache']) {
    provider = 'Vercel';
    if (headers['x-vercel-id']) evidence.push(`x-vercel-id: ${headers['x-vercel-id']}`);
  }
  // Azure CDN
  else if (headers['x-azure-ref'] || headers['x-msedge-ref']) {
    provider = 'Azure CDN';
    evidence.push('x-azure-ref or x-msedge-ref present');
  }
  // Akamai
  else if (headers['x-akamai-transformed'] || (headers['server'] || '').includes('akamai')) {
    provider = 'Akamai';
    evidence.push('Akamai headers detected');
  }
  // Netlify
  else if (headers['x-nf-request-id'] || headers['server'] === 'netlify') {
    provider = 'Netlify';
    evidence.push('Netlify headers detected');
  }
  // Sucuri
  else if (headers['x-sucuri-id'] || (headers['server'] || '').includes('sucuri')) {
    provider = 'Sucuri';
    evidence.push('Sucuri headers detected');
  }

  return { detected: !!provider, provider, method: 'headers', evidence };
}


// ─── COMBINED CDN DETECTION ──────────────────────────────

export interface CDNDetectionResult {
  detected: boolean;
  provider: string;
  detectedVia: 'ip_range' | 'cname' | 'headers' | 'none';
  confidence: 'high' | 'medium' | 'low';
  details: {
    ipCheck?: { detected: boolean; provider: string };
    cnameCheck?: { detected: boolean; provider: string; cname: string };
    headerCheck?: { detected: boolean; provider: string; evidence: string[] };
  };
}

/**
 * Run all three CDN detection layers. Returns on first match with highest confidence.
 * Layer priority: IP range (high) > Headers (high) > CNAME (medium)
 */
export async function detectCDN(
  ip: string,
  domain: string,
  headers: Record<string, string>
): Promise<CDNDetectionResult> {
  // Layer 1: IP CIDR range (fastest, most definitive)
  const ipResult = detectCDNByIP(ip);
  if (ipResult.detected) {
    return {
      detected: true, provider: ipResult.provider, detectedVia: 'ip_range', confidence: 'high',
      details: { ipCheck: ipResult },
    };
  }

  // Layer 2: HTTP headers (already available, no extra network call)
  const headerResult = detectCDNByHeaders(headers);
  if (headerResult.detected) {
    return {
      detected: true, provider: headerResult.provider, detectedVia: 'headers', confidence: 'high',
      details: { ipCheck: ipResult, headerCheck: headerResult },
    };
  }

  // Layer 3: CNAME DNS lookup (requires network call)
  const cnameResult = await detectCDNByCNAME(domain);
  if (cnameResult.detected) {
    return {
      detected: true, provider: cnameResult.provider, detectedVia: 'cname', confidence: 'medium',
      details: { ipCheck: ipResult, headerCheck: headerResult, cnameCheck: cnameResult },
    };
  }

  return {
    detected: false, provider: '', detectedVia: 'none', confidence: 'low',
    details: { ipCheck: ipResult, headerCheck: headerResult, cnameCheck: cnameResult },
  };
}


// ─── KNOWN US SAAS PROVIDERS (DR-04 ALLOWLIST) ───────────
// These domains are operated by US companies with US data centers.
// They should NOT be flagged as "foreign sub-processors" even if some
// IP addresses resolve to non-US locations (due to anycast/CDN).

const KNOWN_US_SAAS_DOMAINS: { pattern: string; provider: string; category: string }[] = [
  // Analytics
  { pattern: 'google-analytics.com', provider: 'Google', category: 'analytics' },
  { pattern: 'googletagmanager.com', provider: 'Google', category: 'analytics' },
  { pattern: 'googleapis.com', provider: 'Google', category: 'api' },
  { pattern: 'gstatic.com', provider: 'Google', category: 'cdn' },
  { pattern: 'googleadservices.com', provider: 'Google', category: 'advertising' },
  { pattern: 'googlesyndication.com', provider: 'Google', category: 'advertising' },
  { pattern: 'google.com', provider: 'Google', category: 'services' },
  { pattern: 'doubleclick.net', provider: 'Google', category: 'advertising' },

  // Meta
  { pattern: 'facebook.com', provider: 'Meta', category: 'social' },
  { pattern: 'facebook.net', provider: 'Meta', category: 'social' },
  { pattern: 'fbcdn.net', provider: 'Meta', category: 'cdn' },
  { pattern: 'instagram.com', provider: 'Meta', category: 'social' },

  // Payments
  { pattern: 'stripe.com', provider: 'Stripe', category: 'payments' },
  { pattern: 'stripe.network', provider: 'Stripe', category: 'payments' },
  { pattern: 'paypal.com', provider: 'PayPal', category: 'payments' },
  { pattern: 'braintreegateway.com', provider: 'Braintree/PayPal', category: 'payments' },
  { pattern: 'square.com', provider: 'Square', category: 'payments' },
  { pattern: 'squareup.com', provider: 'Square', category: 'payments' },

  // CRM / Marketing
  { pattern: 'hubspot.com', provider: 'HubSpot', category: 'crm' },
  { pattern: 'hsforms.com', provider: 'HubSpot', category: 'forms' },
  { pattern: 'hs-scripts.com', provider: 'HubSpot', category: 'scripts' },
  { pattern: 'hs-analytics.net', provider: 'HubSpot', category: 'analytics' },
  { pattern: 'salesforce.com', provider: 'Salesforce', category: 'crm' },
  { pattern: 'mailchimp.com', provider: 'Mailchimp', category: 'email' },

  // Healthcare-specific
  { pattern: 'zocdoc.com', provider: 'Zocdoc', category: 'scheduling' },
  { pattern: 'patientpop.com', provider: 'PatientPop', category: 'marketing' },
  { pattern: 'webmd.com', provider: 'WebMD', category: 'health_content' },
  { pattern: 'healthgrades.com', provider: 'Healthgrades', category: 'directory' },
  { pattern: 'vitals.com', provider: 'Vitals', category: 'directory' },
  { pattern: 'practicefusion.com', provider: 'Practice Fusion', category: 'ehr' },

  // Scheduling
  { pattern: 'calendly.com', provider: 'Calendly', category: 'scheduling' },
  { pattern: 'acuityscheduling.com', provider: 'Acuity', category: 'scheduling' },

  // Chat / Support
  { pattern: 'intercom.io', provider: 'Intercom', category: 'chat' },
  { pattern: 'zendesk.com', provider: 'Zendesk', category: 'support' },
  { pattern: 'tawk.to', provider: 'Tawk.to', category: 'chat' },
  { pattern: 'tidio.co', provider: 'Tidio', category: 'chat' },
  { pattern: 'drift.com', provider: 'Drift', category: 'chat' },

  // CDN / Infrastructure (US-based)
  { pattern: 'cloudflare.com', provider: 'Cloudflare', category: 'cdn' },
  { pattern: 'cdnjs.cloudflare.com', provider: 'Cloudflare', category: 'cdn' },
  { pattern: 'unpkg.com', provider: 'Cloudflare', category: 'cdn' },
  { pattern: 'jsdelivr.net', provider: 'jsDelivr', category: 'cdn' },
  { pattern: 'bootstrapcdn.com', provider: 'StackPath', category: 'cdn' },
  { pattern: 'jquery.com', provider: 'jQuery Foundation', category: 'cdn' },

  // Fonts / Assets
  { pattern: 'fonts.googleapis.com', provider: 'Google', category: 'fonts' },
  { pattern: 'fonts.gstatic.com', provider: 'Google', category: 'fonts' },
  { pattern: 'typekit.net', provider: 'Adobe', category: 'fonts' },
  { pattern: 'use.fontawesome.com', provider: 'Font Awesome', category: 'fonts' },

  // Video
  { pattern: 'youtube.com', provider: 'Google', category: 'video' },
  { pattern: 'youtu.be', provider: 'Google', category: 'video' },
  { pattern: 'vimeo.com', provider: 'Vimeo', category: 'video' },
  { pattern: 'wistia.com', provider: 'Wistia', category: 'video' },

  // Maps
  { pattern: 'maps.google.com', provider: 'Google', category: 'maps' },
  { pattern: 'maps.googleapis.com', provider: 'Google', category: 'maps' },

  // Reviews
  { pattern: 'yelp.com', provider: 'Yelp', category: 'reviews' },
  { pattern: 'birdeye.com', provider: 'Birdeye', category: 'reviews' },

  // Accessibility
  { pattern: 'accessibe.com', provider: 'accessiBe', category: 'accessibility' },
  { pattern: 'userway.org', provider: 'UserWay', category: 'accessibility' },
];

/**
 * Check if a domain is a known US SaaS provider.
 * Returns the provider info if matched, null otherwise.
 */
export function isKnownUSSaaS(domain: string): { provider: string; category: string } | null {
  const lower = domain.toLowerCase();
  for (const entry of KNOWN_US_SAAS_DOMAINS) {
    if (lower === entry.pattern || lower.endsWith('.' + entry.pattern)) {
      return { provider: entry.provider, category: entry.category };
    }
  }
  return null;
}


// ─── KNOWN US MAIL PROVIDERS (DR-03 ENHANCEMENT) ────────

const KNOWN_US_MAIL_PATTERNS: { pattern: string; provider: string }[] = [
  // Google Workspace
  { pattern: 'google.com', provider: 'Google Workspace' },
  { pattern: 'googlemail.com', provider: 'Google Workspace' },
  { pattern: 'gmail-smtp-in.l.google.com', provider: 'Google Workspace' },
  { pattern: 'aspmx.l.google.com', provider: 'Google Workspace' },
  { pattern: 'alt1.aspmx.l.google.com', provider: 'Google Workspace' },
  { pattern: 'alt2.aspmx.l.google.com', provider: 'Google Workspace' },

  // Microsoft 365
  { pattern: 'outlook.com', provider: 'Microsoft 365' },
  { pattern: 'protection.outlook.com', provider: 'Microsoft 365' },
  { pattern: 'mail.protection.outlook.com', provider: 'Microsoft 365' },
  { pattern: 'olc.protection.outlook.com', provider: 'Microsoft 365' },
  { pattern: 'hotmail.com', provider: 'Microsoft 365' },

  // Amazon SES
  { pattern: 'amazonses.com', provider: 'Amazon SES' },
  { pattern: 'inbound-smtp.us-east-1.amazonaws.com', provider: 'Amazon SES' },
  { pattern: 'inbound-smtp.us-west-2.amazonaws.com', provider: 'Amazon SES' },

  // Proofpoint
  { pattern: 'pphosted.com', provider: 'Proofpoint' },
  { pattern: 'ppe-hosted.com', provider: 'Proofpoint' },

  // Mimecast
  { pattern: 'mimecast.com', provider: 'Mimecast' },

  // Barracuda
  { pattern: 'barracudanetworks.com', provider: 'Barracuda' },

  // Rackspace
  { pattern: 'emailsrvr.com', provider: 'Rackspace' },

  // GoDaddy
  { pattern: 'secureserver.net', provider: 'GoDaddy' },

  // Zoho (US region)
  { pattern: 'zoho.com', provider: 'Zoho' },

  // Healthcare-specific email security
  { pattern: 'paubox.com', provider: 'Paubox (HIPAA)' },
  { pattern: 'virtru.com', provider: 'Virtru (HIPAA)' },
  { pattern: 'zixcorp.com', provider: 'Zix (HIPAA)' },
  { pattern: 'hushmail.com', provider: 'Hushmail (HIPAA)' },
];

/**
 * Check if an MX exchange hostname belongs to a known US mail provider.
 */
export function isKnownUSMailProvider(exchange: string): { provider: string } | null {
  const lower = exchange.toLowerCase();
  for (const entry of KNOWN_US_MAIL_PATTERNS) {
    if (lower === entry.pattern || lower.endsWith('.' + entry.pattern)) {
      return { provider: entry.provider };
    }
  }
  return null;
}
