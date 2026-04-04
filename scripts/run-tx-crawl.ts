#!/usr/bin/env npx tsx
/**
 * scripts/run-tx-crawl.ts
 * ════════════════════════════════════════════════════════════════
 * KairoLogic — Phase 1A Task 7: Enhanced TX Provider Bulk Crawl
 * ════════════════════════════════════════════════════════════════
 *
 * Runs the ENHANCED website crawler over all 39,602 TX providers
 * with a known URL. Integrates Tasks 3–6 into a single pipeline:
 *
 *   Task 3: Detect "accepting new patients" from website text
 *   Task 4: Extract accepted insurance payers (payer-acceptance-extractor)
 *   Task 5: Detect AI tool vendors (ai-tool-detector)
 *   Task 6: Write AI tool detections to ai_tools_detected table
 *
 * Results written to:
 *   practice_websites.website_accepting_patients       (Task 3)
 *   practice_websites.accepted_payers                  (Task 4)
 *   ai_tools_detected table                            (Task 5 & 6)
 *   practice_websites.last_scan_at / scan metadata     (all)
 *
 * Expected runtime: ~2 weeks for 39,602 sites at ~250ms delay each
 * This script runs in a rolling fashion and is safe to resume.
 * It tracks progress by `last_scan_at` — only sites not crawled
 * within CRAWL_INTERVAL_DAYS are reprocessed.
 *
 * Usage:
 *   npx tsx scripts/run-tx-crawl.ts
 *   npx tsx scripts/run-tx-crawl.ts --limit 100 --dry-run
 *   npx tsx scripts/run-tx-crawl.ts --offset 5000 --limit 5000
 *   npx tsx scripts/run-tx-crawl.ts --force-all    (ignore last_scan_at)
 *   npx tsx scripts/run-tx-crawl.ts --npi 1234567890  (single provider)
 *
 * Environment:
 *   SUPABASE_URL             (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BROWSERLESS_API_KEY      (optional — enables JS-rendered pages)
 */

import { crawlPage, stripHtmlToText } from '../lib/crawler';
import { extractAcceptedPayers } from '../lib/scanner/payer-acceptance-extractor';
import { detectAcceptingPatients } from '../lib/scanner/accepting-patients-detector';
import { detectAITools, saveAIToolDetections } from '../lib/scanner/ai-tool-detector';

// ── Config ────────────────────────────────────────────────────────

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  console.error('    $env:SUPABASE_URL="https://xxx.supabase.co"');
  console.error('    $env:SUPABASE_SERVICE_ROLE_KEY="service_role_key"');
  process.exit(1);
}

// Pages not crawled within this window are eligible for re-crawl
const CRAWL_INTERVAL_DAYS = 14;

// Delay between requests (ms) to avoid overloading provider sites
const INTER_CRAWL_DELAY_MS = 350;

// Internal batch size for Supabase queries
const FETCH_BATCH_SIZE = 500;

// ── CLI Args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getVal = (flag: string): string | undefined => {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
};

const DRY_RUN    = args.includes('--dry-run');
const FORCE_ALL  = args.includes('--force-all');
const LIMIT      = parseInt(getVal('--limit') || '0', 10) || 0;
const OFFSET     = parseInt(getVal('--offset') || '0', 10) || 0;
const NPI_FILTER = getVal('--npi');

// ── Supabase helpers ──────────────────────────────────────────────

async function db<T = unknown>(
  path: string,
  opts: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.method === 'POST'
        ? 'return=minimal,resolution=merge-duplicates'
        : 'return=representation',
      ...(opts.headers || {}),
    },
    body: opts.body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB ${opts.method || 'GET'} ${path}: ${res.status} ${err.slice(0, 300)}`);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ([] as unknown as T);
}

// ── Site record type ──────────────────────────────────────────────

interface PracticeWebsiteSite {
  id: string;
  npi: string | null;       // NPI from practice_websites
  url: string;
  state: string | null;
  last_scan_at: string | null;
  scan_status: string | null;
}

// ── Fetch sites due for crawl ─────────────────────────────────────

async function fetchSitesDue(): Promise<PracticeWebsiteSite[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CRAWL_INTERVAL_DAYS);
  const cutoffISO = cutoff.toISOString();

  let query = `practice_websites?select=id,npi,url,state,last_scan_at,scan_status`;

  // TX-only (state = TX or state IS NULL but we rely on registry state)
  query += `&state=eq.TX`;

  // Only sites with a URL
  query += `&url=not.is.null&url=neq.`;

  // Skip unreachable sites
  query += `&scan_status=neq.unreachable`;

  if (!FORCE_ALL) {
    // Only sites not scanned recently OR never scanned
    query += `&or=(last_scan_at.is.null,last_scan_at.lt.${cutoffISO})`;
  }

  if (NPI_FILTER) {
    query += `&npi=eq.${NPI_FILTER}`;
  }

  query += `&order=last_scan_at.asc.nullsfirst`;

  if (LIMIT > 0) query += `&limit=${LIMIT}`;
  if (OFFSET > 0) query += `&offset=${OFFSET}`;

  return db<PracticeWebsiteSite[]>(query);
}

// ── Per-site enhanced crawl ────────────────────────────────────────

interface SiteResult {
  id: string;
  url: string;
  npi: string | null;
  success: boolean;
  accepting_patients_status: string;
  accepted_payers: string[];
  ai_tools_count: number;
  duration_ms: number;
  error?: string;
}

async function crawlSite(site: PracticeWebsiteSite): Promise<SiteResult> {
  const start = Date.now();
  const result: SiteResult = {
    id: site.id,
    url: site.url,
    npi: site.npi,
    success: false,
    accepting_patients_status: 'unknown',
    accepted_payers: [],
    ai_tools_count: 0,
    duration_ms: 0,
  };

  try {
    // ── 1. Crawl the page ────────────────────────────────────────
    const crawl = await crawlPage(site.url);

    if (!crawl.success || (!crawl.html && !crawl.text)) {
      result.error = crawl.error || 'Empty response';
      // Mark as unreachable after consistent failures (handled by batch logic)
      return result;
    }

    const html = crawl.html || '';
    const text = crawl.text || stripHtmlToText(html);
    const responseHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(crawl.headers || {})) {
      responseHeaders[k.toLowerCase()] = String(v).toLowerCase();
    }

    result.success = true;

    // ── 2. Task 3: Detect "accepting new patients" ────────────────
    const acceptingResult = detectAcceptingPatients(html, text);
    result.accepting_patients_status = acceptingResult.status;

    // ── 3. Task 4: Extract accepted insurance payers ──────────────
    const payerResult = extractAcceptedPayers(html, text, site.state);
    result.accepted_payers = payerResult.accepted_payers;

    // ── 4. Task 5: Detect AI tool vendors ─────────────────────────
    const aiResult = detectAITools(html, text, responseHeaders);
    result.ai_tools_count = aiResult.tool_count;

    if (DRY_RUN) {
      console.log(
        `  [DRY RUN] ${site.url.slice(0, 60)}` +
        ` | accept=${acceptingResult.status}(${acceptingResult.confidence})` +
        ` | payers=${payerResult.accepted_payers.join(',') || 'none'}` +
        ` | ai_tools=${aiResult.tool_count}`,
      );
      result.duration_ms = Date.now() - start;
      return result;
    }

    // ── 5. Write results to Supabase ──────────────────────────────

    // 5a. Update practice_websites
    const websiteUpdate: Record<string, unknown> = {
      last_scan_at: new Date().toISOString(),
      scan_status: 'healthy',
      // Task 3: accepting patients
      website_accepting_patients:
        acceptingResult.status === 'accepting' ? true
        : acceptingResult.status === 'not_accepting' ? false
        : null,
      website_accepting_patients_extracted_at:
        acceptingResult.status !== 'unknown' ? new Date().toISOString() : null,
    };

    // Task 4: accepted payers (only overwrite if we found something)
    if (payerResult.accepted_payers.length > 0) {
      websiteUpdate.accepted_payers = payerResult.accepted_payers;
      websiteUpdate.accepted_payers_extracted_at = new Date().toISOString();
    }

    await db(`practice_websites?id=eq.${site.id}`, {
      method: 'PATCH',
      body: JSON.stringify(websiteUpdate),
    });

    // 5b. Task 6: write AI tool detections (if NPI available)
    if (site.npi && aiResult.tool_count > 0) {
      const saveResult = await saveAIToolDetections(
        site.npi,
        site.url,
        aiResult,
        SUPABASE_URL,
        SUPABASE_KEY,
      );
      if (saveResult.errors > 0) {
        console.warn(`  ⚠ AI tools write errors for NPI ${site.npi}: ${saveResult.errors}`);
      }
    }

  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  result.duration_ms = Date.now() - start;
  return result;
}

// ── Sleep helper ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Progress reporter ─────────────────────────────────────────────

function printProgress(
  done: number,
  total: number,
  stats: { success: number; errors: number; accepting: number; notAccepting: number; aiTools: number },
): void {
  const pct = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0';
  const bar = '█'.repeat(Math.floor(done / total * 30)).padEnd(30, '░');
  process.stdout.write(
    `\r  [${bar}] ${pct}% (${done}/${total}) ` +
    `✓${stats.success} ✗${stats.errors} ` +
    `🏥accept=${stats.accepting} 🚫not=${stats.notAccepting} 🤖ai=${stats.aiTools}    `,
  );
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const runStart = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  KairoLogic — Phase 1A Task 7: Enhanced TX Provider Crawl   ║');
  console.log('║  Tasks 3+4+5+6 integrated into a single pipeline           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Supabase:     ${SUPABASE_URL}`);
  console.log(`  Dry run:      ${DRY_RUN}`);
  console.log(`  Force all:    ${FORCE_ALL}`);
  console.log(`  Interval:     ${CRAWL_INTERVAL_DAYS} days`);
  if (LIMIT)       console.log(`  Limit:        ${LIMIT}`);
  if (OFFSET)      console.log(`  Offset:       ${OFFSET}`);
  if (NPI_FILTER)  console.log(`  NPI filter:   ${NPI_FILTER}`);
  console.log('');

  // ── 1. Fetch sites due for crawl ──────────────────────────────
  console.log('  Loading TX provider sites due for crawl...');
  const sites = await fetchSitesDue();

  if (sites.length === 0) {
    console.log('  ✅  No sites due for crawl — all TX providers are up to date.');
    return;
  }

  console.log(`  Found ${sites.length.toLocaleString()} sites to crawl`);
  console.log('');

  // ── 2. Crawl each site ────────────────────────────────────────
  const stats = {
    success: 0,
    errors: 0,
    accepting: 0,
    notAccepting: 0,
    waitlist: 0,
    unknown: 0,
    aiTools: 0,
    totalPayers: new Map<string, number>(),
  };

  const errorLog: Array<{ url: string; error: string }> = [];

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];

    // Print progress every 10 sites
    if (i % 10 === 0) {
      printProgress(i, sites.length, {
        success: stats.success,
        errors: stats.errors,
        accepting: stats.accepting,
        notAccepting: stats.notAccepting,
        aiTools: stats.aiTools,
      });
    }

    const result = await crawlSite(site);

    if (result.success) {
      stats.success++;
    } else {
      stats.errors++;
      if (result.error) {
        errorLog.push({ url: result.url, error: result.error });
      }
    }

    // Tally accepting patients
    switch (result.accepting_patients_status) {
      case 'accepting':     stats.accepting++;     break;
      case 'not_accepting': stats.notAccepting++;  break;
      case 'waitlist':      stats.waitlist++;       break;
      default:              stats.unknown++;        break;
    }

    stats.aiTools += result.ai_tools_count;

    // Tally payers for priority list
    for (const payer of result.accepted_payers) {
      stats.totalPayers.set(payer, (stats.totalPayers.get(payer) ?? 0) + 1);
    }

    // Delay between requests (be a good citizen)
    if (i < sites.length - 1) {
      await sleep(INTER_CRAWL_DELAY_MS);
    }
  }

  // Clear progress line
  console.log('');
  console.log('');

  // ── 3. Final summary ──────────────────────────────────────────
  const elapsedSec = ((Date.now() - runStart) / 1000).toFixed(1);
  const totalSec = sites.length * (INTER_CRAWL_DELAY_MS / 1000 + 0.5);
  const estimatedHours = (totalSec / 3600).toFixed(1);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CRAWL SUMMARY                                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Sites crawled:       ${sites.length.toLocaleString()}`);
  console.log(`  Succeeded:           ${stats.success.toLocaleString()}`);
  console.log(`  Failed:              ${stats.errors.toLocaleString()}`);
  console.log('');
  console.log('  ── Accepting Patients (Task 3) ──');
  console.log(`    Accepting:         ${stats.accepting.toLocaleString()}`);
  console.log(`    Not accepting:     ${stats.notAccepting.toLocaleString()}`);
  console.log(`    Waitlist:          ${stats.waitlist.toLocaleString()}`);
  console.log(`    Unknown:           ${stats.unknown.toLocaleString()}`);
  console.log('');
  console.log('  ── AI Tools Detected (Tasks 5-6) ──');
  console.log(`    Total detections:  ${stats.aiTools.toLocaleString()}`);
  console.log('');

  // Top payers from website data (Task 4)
  if (stats.totalPayers.size > 0) {
    const sortedPayers = [...stats.totalPayers.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    console.log('  ── Top Payers Found on Websites (Task 4) ──');
    for (const [payer, count] of sortedPayers) {
      console.log(`    ${payer.padEnd(20)} ${count.toLocaleString()} sites`);
    }
    console.log('');
  }

  console.log(`  Elapsed:             ${elapsedSec}s`);

  if (sites.length < 39602) {
    const remaining = 39602 - (OFFSET + sites.length);
    console.log(`  Remaining (est):     ${remaining.toLocaleString()} sites`);
    console.log(`  Est. total runtime:  ~${estimatedHours}h for full TX crawl`);
  }

  if (DRY_RUN) {
    console.log('');
    console.log('  ⚠️   DRY RUN — no data written to Supabase');
  }

  // Print errors if any
  if (errorLog.length > 0 && errorLog.length <= 20) {
    console.log('');
    console.log('  ── Errors ──');
    for (const { url, error } of errorLog.slice(0, 20)) {
      console.log(`    ${url.slice(0, 60).padEnd(60)} ${error.slice(0, 60)}`);
    }
  }

  console.log('');
}

main().catch((err) => {
  console.error('\n❌  Fatal error:', err);
  process.exit(1);
});
