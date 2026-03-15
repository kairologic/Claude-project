// scripts/scan-500-practices.ts
// ═══ KairoLogic — Scan 500 Texas Type 2 Practices ═══
// Task 1.16: Runs surveillance engine against 500 Texas practices,
// builds mismatch inventory, and generates Tier 1/2/3 outreach target list.
//
// This is the first real scan run. Outputs:
//   1. practice_websites populated with scan results
//   2. practice_providers auto-populated with detected providers
//   3. nppes_delta_events created for mismatches
//   4. A CSV target list ranked by tier for the Round 1 campaign
//
// Run: npx tsx scripts/scan-500-practices.ts [--limit 500] [--state TX] [--dry-run]
//      npx tsx scripts/scan-500-practices.ts --export-targets targets.csv

import { writeFileSync } from 'fs';
import { runScheduler } from '../lib/scanner/scan-scheduler';
import { runDeltaDetectionBatch } from '../lib/scanner/delta-engine';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'resolution=ignore-duplicates,return=minimal' : '',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB error: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// ── Update Practice Counts ───────────────────────────────

/**
 * Calls Supabase RPC functions to update provider_count and mismatch_count
 * on practice_websites. These run server-side SQL — fast and atomic.
 *
 * Requires two RPC functions created once in Supabase SQL Editor:
 *
 * CREATE OR REPLACE FUNCTION update_provider_counts()
 * RETURNS void AS $$
 *   UPDATE practice_websites pw
 *   SET provider_count = sub.cnt
 *   FROM (SELECT practice_website_id, count(DISTINCT npi) as cnt
 *         FROM practice_providers GROUP BY practice_website_id) sub
 *   WHERE pw.id = sub.practice_website_id;
 * $$ LANGUAGE sql;
 *
 * CREATE OR REPLACE FUNCTION update_mismatch_counts()
 * RETURNS void AS $$
 *   UPDATE practice_websites pw
 *   SET mismatch_count = sub.cnt
 *   FROM (SELECT pp.practice_website_id, count(DISTINCT de.id) as cnt
 *         FROM practice_providers pp
 *         JOIN nppes_delta_events de ON de.npi = pp.npi
 *         GROUP BY pp.practice_website_id) sub
 *   WHERE pw.id = sub.practice_website_id;
 * $$ LANGUAGE sql;
 */
async function updatePracticeCounts(state: string): Promise<void> {
  const rpcCall = async (fn: string): Promise<boolean> => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    return res.ok;
  };

  try {
    const pcOk = await rpcCall('update_provider_counts');
    if (pcOk) {
      console.log('  provider_count updated');
    } else {
      console.log('  [Counts] update_provider_counts RPC failed — create it in Supabase SQL Editor (see scan-500-practices.ts comments)');
    }

    const mcOk = await rpcCall('update_mismatch_counts');
    if (mcOk) {
      console.log('  mismatch_count updated');
    } else {
      console.log('  [Counts] update_mismatch_counts RPC failed — create it in Supabase SQL Editor (see scan-500-practices.ts comments)');
    }

    if (pcOk && mcOk) {
      console.log('  Both counts updated successfully');
    }
  } catch (err) {
    console.log(`  [Counts] Auto-update failed: ${err}`);
    console.log('  Run the SQL manually in Supabase SQL Editor.');
  }
}

// ── CLI ──────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const getVal = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  return {
    limit: parseInt(getVal('--limit') || '500', 10),
    state: getVal('--state') || 'TX',
    dryRun: args.includes('--dry-run'),
    exportOnly: args.includes('--export-targets'),
    outputFile: getVal('--export-targets') || getVal('--output') || 'outreach-targets.csv',
    seedFromRegistry: args.includes('--seed-from-registry'),
  };
}

// ── Seed practice_websites from registry ─────────────────

/**
 * Seed practice_websites from the existing registry table
 * (Type 2 providers with URLs that haven't been added yet).
 */
async function seedPracticeWebsites(state: string, limit: number): Promise<number> {
  console.log(`[Seed] Fetching Type 2 providers from registry (state=${state})...`);

  // Fetch Type 2 providers from registry that have URLs
  const registryRows: any[] = await db(
    `registry?url=not.is.null&select=npi,name,url,city,zip&limit=${limit}`
  );

  // Also check providers table for Type 2
  const providerRows: any[] = await db(
    `providers?entity_type_code=eq.2&state=eq.${state}&deactivation_date=is.null&url=not.is.null&select=npi,organization_name,url,city,state&limit=${limit}`
  );

  // Combine and deduplicate by URL
  const seen = new Set<string>();
  const toInsert: any[] = [];

  for (const rows of [registryRows, providerRows]) {
    for (const r of rows) {
      const url = r.url?.trim();
      if (!url || seen.has(url.toLowerCase())) continue;
      seen.add(url.toLowerCase());

      toInsert.push({
        npi: r.npi,
        name: r.name || r.organization_name || null,
        url,
        state: r.state || state,
        city: r.city || null,
        scan_tier: 'monthly',
        scan_status: 'pending',
      });
    }
  }

  if (toInsert.length === 0) {
    console.log('[Seed] No new practice websites to seed.');
    return 0;
  }

  // Insert into practice_websites (skip duplicates)
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < toInsert.length && inserted < limit; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    try {
      await db('practice_websites', {
        method: 'POST',
        body: JSON.stringify(batch),
      });
      inserted += batch.length;
    } catch (err) {
      // Duplicates will fail silently with ignore-duplicates
      console.warn(`[Seed] Batch ${Math.floor(i / BATCH) + 1} partial insert:`, err);
    }
  }

  console.log(`[Seed] Seeded ${inserted} practice websites.`);
  return inserted;
}

// ── Export Target List ────────────────────────────────────

async function exportTargetList(outputFile: string, state?: string) {
  console.log('[Export] Building outreach target list...\n');

  // Fetch practice websites with their mismatch data (filtered by state if provided)
  // Exclude provider_count > 50 to filter out medical building false positives
  const stateFilter = state ? `&state=eq.${state}` : '';
  const practices: any[] = await db(
    `practice_websites?mismatch_count=gt.0&provider_count=lt.50${stateFilter}&order=mismatch_count.desc&select=id,npi,name,url,state,city,provider_count,mismatch_count,last_scan_at&limit=5000`
  );

  if (practices.length === 0) {
    console.log('[Export] No practices with mismatches found. Run scans first.');
    return;
  }

  // Tier classification (from MVP plan campaign segmentation)
  const tiered = practices.map((p: any) => {
    let tier: number;
    let tierLabel: string;

    if (p.mismatch_count >= 2 && p.provider_count >= 6) {
      tier = 1; tierLabel = 'Tier 1 — High signal';
    } else if (p.mismatch_count >= 2 && p.provider_count >= 4) {
      tier = 2; tierLabel = 'Tier 2 — Movement signal';
    } else if (p.mismatch_count >= 1 && p.provider_count >= 4) {
      tier = 3; tierLabel = 'Tier 3 — Single mismatch';
    } else {
      tier = 4; tierLabel = 'Tier 4 — Low signal';
    }

    return {
      tier,
      tierLabel,
      practice_id: p.id,
      npi: p.npi || '',
      name: p.name || '',
      url: p.url,
      state: p.state || '',
      city: p.city || '',
      providers: p.provider_count,
      mismatches: p.mismatch_count,
      last_scan: p.last_scan_at || '',
    };
  });

  // Sort by tier then mismatches
  tiered.sort((a: any, b: any) => a.tier - b.tier || b.mismatches - a.mismatches);

  // Build CSV
  const headers = 'tier,tier_label,practice_id,npi,name,url,state,city,providers,mismatches,last_scan';
  const rows = tiered.map((t: any) =>
    `${t.tier},"${t.tierLabel}",${t.practice_id},${t.npi},"${(t.name || '').replace(/"/g, '""')}","${t.url}",${t.state},"${t.city}",${t.providers},${t.mismatches},${t.last_scan}`
  );

  const csv = [headers, ...rows].join('\n');
  writeFileSync(outputFile, csv);

  // Summary
  const tier1 = tiered.filter((t: any) => t.tier === 1).length;
  const tier2 = tiered.filter((t: any) => t.tier === 2).length;
  const tier3 = tiered.filter((t: any) => t.tier === 3).length;
  const tier4 = tiered.filter((t: any) => t.tier === 4).length;

  console.log(`[Export] Target list exported to ${outputFile}`);
  console.log(`  Total practices:  ${tiered.length}`);
  console.log(`  Tier 1 (strong):  ${tier1}  — 2+ mismatches, 6+ providers`);
  console.log(`  Tier 2 (medium):  ${tier2}  — 2+ mismatches, 4+ providers`);
  console.log(`  Tier 3 (single):  ${tier3}  — 1 mismatch, 4+ providers`);
  console.log(`  Tier 4 (low):     ${tier4}  — low signal`);
  console.log(`\n  Top 5 targets:`);
  tiered.slice(0, 5).forEach((t: any, i: number) => {
    console.log(`    ${i + 1}. ${t.name || t.url} — ${t.mismatches} mismatches, ${t.providers} providers (${t.tierLabel})`);
  });
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  KairoLogic — Batch Practice Scan');
  console.log('  Build Outreach Target List');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  State:     ${opts.state}`);
  console.log(`  Limit:     ${opts.limit}`);
  console.log(`  Dry run:   ${opts.dryRun}`);
  console.log('');

  // Export only mode
  if (opts.exportOnly) {
    await exportTargetList(opts.outputFile, opts.state);
    return;
  }

  // Phase 1: Seed practice_websites if needed
  if (opts.seedFromRegistry) {
    await seedPracticeWebsites(opts.state, opts.limit);
  }

  // Phase 2: Run scan scheduler
  console.log('\n─── Phase 1: Scanning Practice Websites ─────────────\n');

  const scanStart = new Date().toISOString();
  const scanResult = await runScheduler({
    limit: opts.limit,
    forceAll: false,  // rescan everything,
    dryRun: opts.dryRun,
    concurrency: 5,  // higher concurrency for batch jobs
    state: opts.state,
    onProgress: (scanned, total) => {
      process.stdout.write(`\r  Scanning: ${scanned}/${total} sites`);
    },
  });

  console.log('\n');
  console.log(`  Sites scanned:      ${scanResult.sites_scanned}`);
  console.log(`  Succeeded:          ${scanResult.sites_succeeded}`);
  console.log(`  Failed:             ${scanResult.sites_failed}`);
  console.log(`  Providers detected: ${scanResult.providers_detected}`);
  console.log(`  Providers matched:  ${scanResult.providers_matched}`);

  // Phase 3: Run delta detection
  if (!opts.dryRun) {
    console.log('\n─── Phase 2: Delta Detection ────────────────────────\n');

    const deltaResult = await runDeltaDetectionBatch({
      since: scanStart,
      limit: opts.limit,
      onProgress: (processed, total) => {
        process.stdout.write(`\r  Processing: ${processed}/${total} sites`);
      },
    });

    console.log('\n');
    console.log(`  Providers analyzed:  ${deltaResult.total_providers}`);
    console.log(`  Deltas created:      ${deltaResult.deltas_created}`);
    console.log(`  Providers w/ deltas: ${deltaResult.providers_with_deltas}`);
    console.log(`  Corroborated:        ${deltaResult.corroborated}`);

    // Phase 3: Update provider_count and mismatch_count on practice_websites
    console.log('\n─── Phase 3: Update Practice Counts ─────────────────\n');
    await updatePracticeCounts(opts.state);
  }

  // Phase 4: Export target list
  if (!opts.dryRun) {
    console.log('\n─── Phase 4: Export Target List ──────────────────────\n');
    await exportTargetList(opts.outputFile, opts.state);
  }

  // Summary
  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Batch Scan Complete. Duration: ${totalSec}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (opts.dryRun) {
    console.log('\n  ⚠ DRY RUN — no data was written');
  }
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
