/**
 * KairoLogic Adaptive Web Crawler v1.0
 * =====================================
 * Two-strategy page content fetcher for compliance scanning.
 * 
 * Strategy 1: Direct fetch (fast, works for server-rendered sites)
 *   - If the HTML has meaningful text content, use it immediately
 * 
 * Strategy 2: Browserless.io REST API (for JS-rendered SPAs)
 *   - Cloud headless Chrome, just an HTTP POST — no npm deps
 *   - Works on Vercel serverless (no binary to install)
 *   - Requires BROWSERLESS_API_KEY env var
 *   - Free tier: 1,000 units/month at https://www.browserless.io
 * 
 * Falls back gracefully: if no API key or service is down,
 * returns whatever the direct fetch got (even if partial).
 */

// ─── TYPES ──────────────────────────────────────────────

export interface CrawlResult {
  success: boolean;
  html: string;
  text: string;
  strategy: 'direct' | 'browserless' | 'none';
  statusCode?: number;
  headers: Record<string, string>;
  duration: number;
  isJSRendered: boolean;
  error?: string;
  finalUrl?: string;
}

// ─── CONSTANTS ──────────────────────────────────────────

const FETCH_TIMEOUT = 15000;
const BROWSER_TIMEOUT = 30000;

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * If we see these in the HTML and very little readable text,
 * the page needs a real browser to render.
 */
const SPA_INDICATORS = [
  '<div id="root"></div>',
  '<div id="root"> </div>',
  '<div id="app"></div>',
  '<div id="__next"></div>',
  '<noscript>you need to enable javascript',
  '<noscript>please enable javascript',
  'loading...</div>',
  '__next_data__',
];

/** Minimum stripped-text length to consider the page "rendered" */
const MIN_TEXT_LENGTH = 200;

// ─── HELPERS ────────────────────────────────────────────

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect if the fetched HTML is a JS-framework shell with no
 * real content (needs headless browser to render).
 */
function looksLikeJSShell(html: string, text: string): boolean {
  const lowerHtml = html.toLowerCase();
  const spaHits = SPA_INDICATORS.filter(s => lowerHtml.includes(s.toLowerCase())).length;

  // Strong signal: SPA skeleton + almost no readable text
  if (spaHits >= 1 && text.length < MIN_TEXT_LENGTH) return true;

  // Very short body text relative to HTML size usually means unrendered JS
  if (html.length > 5000 && text.length < 100) return true;

  return false;
}

async function timedFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── STRATEGY 1: DIRECT FETCH ───────────────────────────

async function directFetch(url: string): Promise<{
  html: string; text: string; headers: Record<string, string>;
  statusCode: number; finalUrl?: string;
} | null> {
  const res = await timedFetch(url, { headers: BROWSER_HEADERS }, FETCH_TIMEOUT);
  if (!res || !res.ok) return null;

  const html = await res.text();
  const text = stripHtmlToText(html);
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  return { html, text, headers, statusCode: res.status, finalUrl: res.url };
}

// ─── STRATEGY 2: BROWSERLESS.IO ─────────────────────────

async function browserlessFetch(url: string): Promise<{
  html: string; text: string;
} | null> {
  const apiKey = process.env.BROWSERLESS_API_KEY;
  if (!apiKey) return null;

  // Browserless REST API — /content endpoint returns rendered HTML
  // Docs: https://docs.browserless.io/rest-apis/content
  const apiUrl = `https://chrome.browserless.io/content?token=${apiKey}`;

  const res = await timedFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      waitForSelector: { selector: 'body', timeout: 10000 },
      waitForTimeout: 3000,
      bestAttempt: true,
      gotoOptions: {
        waitUntil: 'networkidle2',
        timeout: 20000,
      },
    }),
  }, BROWSER_TIMEOUT);

  if (!res || !res.ok) return null;

  const html = await res.text();
  const text = stripHtmlToText(html);
  return { html, text };
}

// ─── MAIN CRAWL FUNCTION ────────────────────────────────

/**
 * Crawl a URL and return fully rendered page content.
 *
 * Usage:
 * ```
 * import { crawlPage } from '@/lib/crawler';
 * const result = await crawlPage(targetUrl);
 * if (result.success) { ... use result.html / result.text ... }
 * ```
 */
export async function crawlPage(url: string): Promise<CrawlResult> {
  const start = Date.now();
  const fail = (error: string): CrawlResult => ({
    success: false, html: '', text: '', strategy: 'none',
    headers: {}, duration: Date.now() - start, isJSRendered: false, error,
  });

  // ── Strategy 1: Direct fetch ──
  const direct = await directFetch(url);
  if (!direct) {
    // Direct fetch completely failed — try browserless before giving up
    const rendered = await browserlessFetch(url);
    if (rendered && rendered.text.length >= MIN_TEXT_LENGTH) {
      return {
        success: true, html: rendered.html, text: rendered.text,
        strategy: 'browserless', headers: {}, duration: Date.now() - start,
        isJSRendered: true, finalUrl: url,
      };
    }
    return fail(`Direct fetch failed and browserless ${rendered ? 'returned insufficient content' : 'unavailable or failed'}.`);
  }

  // Direct fetch succeeded — check if content is actually rendered
  const jsShell = looksLikeJSShell(direct.html, direct.text);

  if (!jsShell && direct.text.length >= MIN_TEXT_LENGTH) {
    // Good content from direct fetch — done
    return {
      success: true, html: direct.html, text: direct.text,
      strategy: 'direct', statusCode: direct.statusCode,
      headers: direct.headers, duration: Date.now() - start,
      isJSRendered: false, finalUrl: direct.finalUrl,
    };
  }

  // ── Strategy 2: Looks like a JS shell — try Browserless ──
  const rendered = await browserlessFetch(url);
  if (rendered && rendered.text.length >= MIN_TEXT_LENGTH) {
    return {
      success: true, html: rendered.html, text: rendered.text,
      strategy: 'browserless', statusCode: direct.statusCode,
      headers: direct.headers, duration: Date.now() - start,
      isJSRendered: true, finalUrl: direct.finalUrl || url,
    };
  }

  // ── Fallback: return whatever direct fetch got (partial > nothing) ──
  if (direct.text.length > 0) {
    return {
      success: true, html: direct.html, text: direct.text,
      strategy: 'direct', statusCode: direct.statusCode,
      headers: direct.headers, duration: Date.now() - start,
      isJSRendered: jsShell,
      error: jsShell
        ? 'Page appears JS-rendered but browserless unavailable. Content may be incomplete — set BROWSERLESS_API_KEY env var for full rendering.'
        : undefined,
      finalUrl: direct.finalUrl,
    };
  }

  return fail('All strategies returned empty content.');
}
