#!/usr/bin/env npx tsx
/**
 * scripts/import-nppes-urls.ts
 *
 * Imports practice website URLs from the NPPES provider data into practice_websites.
 * Only imports URLs that:
 *   1. Are NOT on the domain blocklist
 *   2. Pass a reachability check (HEAD → GET fallback)
 *
 * This closes the coverage gap for ~11K TX org NPIs that have NPPES URLs
 * but no practice_website entry yet.
 *
 * Usage:
 *   npx tsx scripts/import-nppes-urls.ts --state TX --limit 100 --dry-run
 *   npx tsx scripts/import-nppes-urls.ts --state TX --limit 5000 --concurrency 10
 */

import { isBlockedDomain } from '../lib/scanner/domain-blocklist';

// ── Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REACHABILITY_TIMEOUT = 8_000; // 8s per URL
const BATCH_INSERT_SIZE = 100;

// ── CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string, fallback: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};
const STATE = getArg('--state', 'TX').toUpperCase();
const LIMIT = parseInt(getArg('--limit', '200'), 10);
const CONCURRENCY = parseInt(getArg('--concurrency', '10'), 10);
const DRY_RUN = args.includes('--dry-run');

// ── DB helpers ──────────────────────────────────────────────────────
async function db(path: string): Promise<any[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!resp.ok) throw new Error(`DB GET ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.json();
}

async function dbInsert(rows: Record<string, any>[]): Promise<number> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/practice_websites`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) {
    const text = (await resp.text()).slice(0, 200);
    if (!text.includes('23505')) throw new Error(`DB POST ${resp.status}: ${text}`);
  }
  return resp.status;
}

// ── Reachability check ──────────────────────────────────────────────
async function isReachable(
  url: string,
): Promise<{ reachable: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT);

  try {
    // Try HEAD first (cheaper)
    const headResp = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'KairoLogic-URLCheck/1.0 (reachability-validation)',
      },
    });
    clearTimeout(timer);
    if (headResp.ok || headResp.status === 403 || headResp.status === 405) {
      // 403/405 means the server is up but blocking HEAD — still reachable
      return { reachable: true, status: headResp.status };
    }
    if (headResp.status >= 500) {
      return {
        reachable: false,
        status: headResp.status,
        error: `Server error ${headResp.status}`,
      };
    }
  } catch {
    clearTimeout(timer);
  }

  // Fallback to GET if HEAD failed/timed out
  const controller2 = new AbortController();
  const timer2 = setTimeout(() => controller2.abort(), REACHABILITY_TIMEOUT);
  try {
    const getResp = await fetch(url, {
      method: 'GET',
      signal: controller2.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'KairoLogic-URLCheck/1.0 (reachability-validation)',
      },
    });
    clearTimeout(timer2);
    if (getResp.ok || getResp.status === 403) {
      return { reachable: true, status: getResp.status };
    }
    return { reachable: false, status: getResp.status, error: `HTTP ${getResp.status}` };
  } catch (err: any) {
    clearTimeout(timer2);
    return { reachable: false, error: err.message?.slice(0, 100) || 'Network error' };
  }
}

// ── Concurrency limiter ─────────────────────────────────────────────
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ── Main ────────────────────────────────────────────────────────────
interface ProviderRow {
  npi: string;
  organization_name: string;
  url: string;
  city: string;
  state: string;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('  KairoLogic — NPPES URL Import with Reachability Check');
  console.log('='.repeat(60));
  console.log(`  State:       ${STATE}`);
  console.log(`  Limit:       ${LIMIT}`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log(`  Dry run:     ${DRY_RUN}`);
  console.log();

  // ── Step 1: Fetch providers with NPPES URLs but no practice_website ──
  console.log('[1/4] Fetching providers with NPPES URLs but no practice_website...');

  // We need to paginate — PostgREST max is 1000 per request
  let allProviders: ProviderRow[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (allProviders.length < LIMIT) {
    const fetchSize = Math.min(pageSize, LIMIT - allProviders.length);
    const providers: ProviderRow[] = await db(
      `providers?entity_type_code=eq.2&state=eq.${STATE}` +
        `&deactivation_date=is.null` +
        `&url=not.is.null&url=neq.` +
        `&select=npi,organization_name,url,city,state` +
        `&order=npi.asc&limit=${fetchSize}&offset=${offset}`,
    );

    if (!providers.length) break;

    // Check which NPIs already have practice_websites
    const npiList = providers.map((p) => `"${p.npi}"`).join(',');
    let existingNpis = new Set<string>();
    try {
      const existing = await db(`practice_websites?npi=in.(${npiList})&select=npi`);
      existingNpis = new Set(existing.map((r: any) => r.npi));
    } catch {
      // If query fails, be conservative and skip none
    }

    for (const p of providers) {
      if (!existingNpis.has(p.npi)) {
        allProviders.push(p);
      }
    }

    offset += pageSize;
    if (providers.length < fetchSize) break;
  }

  // Trim to limit
  allProviders = allProviders.slice(0, LIMIT);
  console.log(
    `  Found ${allProviders.length} providers with NPPES URLs missing from practice_websites`,
  );

  if (!allProviders.length) {
    console.log('  Nothing to import!');
    return;
  }

  // ── Step 2: Filter through domain blocklist ──
  console.log('\n[2/4] Filtering through domain blocklist...');

  const afterBlocklist = allProviders.filter((p) => {
    const blocked = isBlockedDomain(p.url);
    return !blocked;
  });
  const blockedCount = allProviders.length - afterBlocklist.length;
  console.log(`  Blocked: ${blockedCount} junk URLs`);
  console.log(`  Remaining: ${afterBlocklist.length} URLs to check reachability`);

  if (!afterBlocklist.length) {
    console.log('  All URLs were blocked — nothing to import.');
    return;
  }

  // ── Step 3: Reachability check ──
  console.log(`\n[3/4] Checking reachability (concurrency=${CONCURRENCY})...`);

  let reachableCount = 0;
  let unreachableCount = 0;
  const toInsert: Array<{
    npi: string;
    name: string;
    url: string;
    state: string;
    city: string;
    scan_tier: string;
    scan_status: string;
  }> = [];

  if (DRY_RUN) {
    // In dry run, skip reachability — just show what would be checked
    console.log('  [DRY RUN] Skipping reachability checks');
    for (const p of afterBlocklist) {
      toInsert.push({
        npi: p.npi,
        name: p.organization_name,
        url: p.url,
        state: p.state,
        city: p.city,
        scan_tier: 'monthly',
        scan_status: 'pending',
      });
    }
  } else {
    await mapConcurrent(afterBlocklist, CONCURRENCY, async (p, i) => {
      const result = await isReachable(p.url);
      if (result.reachable) {
        reachableCount++;
        toInsert.push({
          npi: p.npi,
          name: p.organization_name,
          url: p.url,
          state: p.state,
          city: p.city,
          scan_tier: 'monthly',
          scan_status: 'pending',
        });
      } else {
        unreachableCount++;
      }

      const processed = i + 1;
      if (processed % 50 === 0 || processed === afterBlocklist.length) {
        console.log(
          `  Checked: ${processed}/${afterBlocklist.length} | ` +
            `Reachable: ${reachableCount} | Unreachable: ${unreachableCount}`,
        );
      }
    });
  }

  console.log(`\n  Reachable: ${reachableCount}`);
  console.log(`  Unreachable: ${unreachableCount}`);
  console.log(`  Ready to insert: ${toInsert.length}`);

  // ── Step 4: Insert into practice_websites ──
  if (DRY_RUN) {
    console.log(`\n[4/4] DRY RUN — would insert ${toInsert.length} practice websites`);
    console.log('\n  Sample (first 10):');
    for (const row of toInsert.slice(0, 10)) {
      console.log(`    ${row.name.slice(0, 40).padEnd(40)} → ${row.url}`);
    }
  } else {
    console.log(`\n[4/4] Inserting ${toInsert.length} practice websites...`);
    let totalInserted = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_INSERT_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_INSERT_SIZE);
      try {
        await dbInsert(batch);
        totalInserted += batch.length;
        console.log(`  Inserted batch: ${totalInserted}/${toInsert.length}`);
      } catch (err: any) {
        console.error(`  Batch error at offset ${i}: ${err.message}`);
      }
    }

    console.log(`\n  Total inserted: ${totalInserted}`);
  }

  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  console.log('  NPPES URL Import Summary');
  console.log('='.repeat(60));
  console.log(`  State:              ${STATE}`);
  console.log(`  Candidates:         ${allProviders.length}`);
  console.log(`  Blocked (junk):     ${blockedCount}`);
  console.log(`  Reachable:          ${reachableCount}`);
  console.log(`  Unreachable:        ${unreachableCount}`);
  console.log(`  Inserted:           ${toInsert.length}`);
  if (DRY_RUN) console.log('  (DRY RUN — no data written)');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
