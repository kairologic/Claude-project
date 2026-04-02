/**
 * KairoLogic Adaptive Web Crawler v2.0
 * =====================================
 * Two-strategy page content fetcher for compliance scanning.
 *
 * Strategy 1: Direct fetch (fast, works for server-rendered sites)
 *   - If the HTML has meaningful text content, use it immediately
 *
 * Strategy 2: Local headless Chrome via @sparticuz/chromium + puppeteer-core
 *   - Runs in-process — no external API dependency (replaces Browserless.io)
 *   - Works on Vercel serverless (binary optimised for Lambda/Vercel)
 *   - Zero per-unit cost
 *
 * Retry logic: each strategy retries once after a short delay on failure.
 * Falls back gracefully: if headless Chrome fails, returns whatever direct fetch got.
 */

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// ─── TYPES ──────────────────────────────────────────────

export interface CrawlResult {
  success: boolean;
  html: string;
  text: string;
  strategy: 'direct' | 'headless_chrome' | 'none';
  statusCode?: number;
  headers: Record<string, string>;
  duration: number;
  isJSRendered: boolean;
  error?: string;
  finalUrl?: string;
}

// ─── CONSTANTS ──────────────────────────────────────────

const FETCH_TIMEOUT = 25_000; // bumped from 15s → 25s for slower practice sites
const BROWSER_TIMEOUT = 45_000; // bumped from 30s → 45s
const RETRY_DELAY = 3_000; // 3s delay before retry

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
  const spaHits = SPA_INDICATORS.filter((s) => lowerHtml.includes(s.toLowerCase())).length;

  // Strong signal: SPA skeleton + almost no readable text
  if (spaHits >= 1 && text.length < MIN_TEXT_LENGTH) return true;

  // Very short body text relative to HTML size usually means unrendered JS
  if (html.length > 5000 && text.length < 100) return true;

  return false;
}

async function timedFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number,
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

/** Sleep helper for retry delay */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── STRATEGY 1: DIRECT FETCH (with retry) ─────────────

async function directFetch(url: string): Promise<{
  html: string;
  text: string;
  headers: Record<string, string>;
  statusCode: number;
  finalUrl?: string;
} | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      console.log(`[Crawler] Direct fetch retry (attempt ${attempt + 1}) for ${url}`);
      await sleep(RETRY_DELAY);
    }

    const res = await timedFetch(url, { headers: BROWSER_HEADERS }, FETCH_TIMEOUT);
    if (!res || !res.ok) continue;

    const html = await res.text();
    const text = stripHtmlToText(html);
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });

    return { html, text, headers, statusCode: res.status, finalUrl: res.url };
  }

  return null;
}

// ─── STRATEGY 2: LOCAL HEADLESS CHROME (with retry) ─────

async function headlessChromeFetch(url: string): Promise<{
  html: string;
  text: string;
} | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      console.log(`[Crawler] Headless Chrome retry (attempt ${attempt + 1}) for ${url}`);
      await sleep(RETRY_DELAY);
    }

    let browser = null;
    try {
      // @sparticuz/chromium provides a pre-built Chromium binary for Lambda/Vercel
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();
      await page.setUserAgent(BROWSER_HEADERS['User-Agent']);

      // Navigate with networkidle2 — waits until ≤2 connections for 500ms
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: BROWSER_TIMEOUT,
      });

      // Extra wait for late-loading content (React hydration, lazy components)
      await page.waitForSelector('body', { timeout: 10_000 }).catch(() => {});
      await sleep(2_000);

      const html = await page.content();
      const text = stripHtmlToText(html);

      await browser.close();
      browser = null;

      if (text.length >= MIN_TEXT_LENGTH) {
        return { html, text };
      }

      // Content too short — try again
      console.log(
        `[Crawler] Headless Chrome got ${text.length} chars (min ${MIN_TEXT_LENGTH}), retrying...`,
      );
    } catch (err) {
      console.warn(`[Crawler] Headless Chrome error (attempt ${attempt + 1}):`, err);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          /* ignore close errors */
        }
      }
    }
  }

  return null;
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
    success: false,
    html: '',
    text: '',
    strategy: 'none',
    headers: {},
    duration: Date.now() - start,
    isJSRendered: false,
    error,
  });

  // ── Strategy 1: Direct fetch (with retry) ──
  const direct = await directFetch(url);
  if (!direct) {
    // Direct fetch completely failed — try headless Chrome before giving up
    const rendered = await headlessChromeFetch(url);
    if (rendered && rendered.text.length >= MIN_TEXT_LENGTH) {
      return {
        success: true,
        html: rendered.html,
        text: rendered.text,
        strategy: 'headless_chrome',
        headers: {},
        duration: Date.now() - start,
        isJSRendered: true,
        finalUrl: url,
      };
    }
    return fail(
      `Direct fetch failed and headless Chrome ${rendered ? 'returned insufficient content' : 'failed'}.`,
    );
  }

  // Direct fetch succeeded — check if content is actually rendered
  const jsShell = looksLikeJSShell(direct.html, direct.text);

  if (!jsShell && direct.text.length >= MIN_TEXT_LENGTH) {
    // Good content from direct fetch — done
    return {
      success: true,
      html: direct.html,
      text: direct.text,
      strategy: 'direct',
      statusCode: direct.statusCode,
      headers: direct.headers,
      duration: Date.now() - start,
      isJSRendered: false,
      finalUrl: direct.finalUrl,
    };
  }

  // ── Strategy 2: Looks like a JS shell — try headless Chrome ──
  const rendered = await headlessChromeFetch(url);
  if (rendered && rendered.text.length >= MIN_TEXT_LENGTH) {
    return {
      success: true,
      html: rendered.html,
      text: rendered.text,
      strategy: 'headless_chrome',
      statusCode: direct.statusCode,
      headers: direct.headers,
      duration: Date.now() - start,
      isJSRendered: true,
      finalUrl: direct.finalUrl || url,
    };
  }

  // ── Fallback: return whatever direct fetch got (partial > nothing) ──
  if (direct.text.length > 0) {
    return {
      success: true,
      html: direct.html,
      text: direct.text,
      strategy: 'direct',
      statusCode: direct.statusCode,
      headers: direct.headers,
      duration: Date.now() - start,
      isJSRendered: jsShell,
      error: jsShell
        ? 'Page appears JS-rendered but headless Chrome failed. Content may be incomplete.'
        : undefined,
      finalUrl: direct.finalUrl,
    };
  }

  return fail('All strategies returned empty content.');
}
