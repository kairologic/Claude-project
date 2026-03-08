// scripts/pecos-monthly-sync.ts
// ═══ KairoLogic PECOS Monthly Sync — Orchestrator ═══
// Task 1.4: Downloads CMS PECOS public enrollment data, parses into
// provider_pecos table, enriches with reassignment data.
//
// v2: Uses CMS Data API directly with JSON pagination.
// No more 500MB CSV download or 100MB catalog resolver.
//
// Usage:
//   npx tsx scripts/pecos-monthly-sync.ts [--states TX,CA] [--dry-run] [--limit 1000]
//
// Scheduled via GitHub Actions: 1st of each month at 7am UTC

import {
  fetchPecosFromApi,
  upsertPecosRecords,
} from '../lib/nppes/pecos-client';

// ── Configuration ────────────────────────────────────────────────

const DEFAULT_STATES = ['TX', 'CA'];

function parseArgs() {
  const args = process.argv.slice(2);
  let states = DEFAULT_STATES;
  let dryRun = false;
  let limit = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--states' && args[i + 1]) {
      states = args[i + 1].split(',').map((s: any) => s.trim().toUpperCase());
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { states, dryRun, limit };
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const { states, dryRun, limit } = parseArgs();

  console.log('══════════════════════════════════════════════');
  console.log('  KairoLogic PECOS Monthly Sync Pipeline');
  console.log('  CMS Public Provider Enrollment Ingest');
  console.log('══════════════════════════════════════════════');
  console.log(`  States:    ${states.join(', ')}`);
  console.log(`  Dry run:   ${dryRun}`);
  if (limit) console.log(`  Limit:     ${limit}`);
  console.log(`  Method:    CMS Data API (JSON pagination)`);
  console.log('');

  // Verify env vars
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Set these in .env.local or environment variables');
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    // 1. Fetch from CMS Data API
    console.log('[PECOS] Step 1: Fetching base enrollment from CMS Data API...');

    const result = await fetchPecosFromApi(states, {
      limit,
      pageSize: 5000,
      onProgress: (fetched: any, state: any) => {
        console.log(`  [${state}] ${fetched.toLocaleString()} rows fetched so far...`);
      },
    });

    console.log('');
    console.log('[PECOS] Fetch complete:');
    console.log(`  Total API rows:   ${result.totalLines.toLocaleString()}`);
    console.log(`  Matched records:  ${result.matched.toLocaleString()}`);
    console.log(`  Skipped:          ${result.skipped.toLocaleString()}`);
    console.log(`  Errors:           ${result.errors}`);
    console.log(`  Duration:         ${(result.durationMs / 1000).toFixed(1)}s`);

    const records = result.records;

    // 2. Data quality stats
    console.log('');
    console.log('[PECOS] Data quality:');
    const withSpecialty = records.filter((r: any) => r.specialty).length;
    const withCity = records.filter((r: any) => r.city).length;
    const individuals = records.filter((r: any) => r.enrollment_type === 'individual').length;
    const orgs = records.filter((r: any) => r.enrollment_type === 'organization').length;

    console.log(`  With specialty:    ${withSpecialty.toLocaleString()}`);
    console.log(`  With city:         ${withCity.toLocaleString()}`);
    console.log(`  Individuals:       ${individuals.toLocaleString()}`);
    console.log(`  Organizations:     ${orgs.toLocaleString()}`);

    for (const state of states) {
      const stateCount = records.filter((r: any) => r.state === state).length;
      console.log(`  ${state} providers:    ${stateCount.toLocaleString()}`);
    }

    // 3. Note about reassignment (skipped in API mode)
    console.log('');
    console.log('[PECOS] Step 2: Reassignment enrichment');
    console.log('  Skipped — reassignment dataset ID not yet discovered for API path.');
    console.log('  Base enrollment alone is sufficient for NPI resolution bridge.');

    // 4. Upsert to Supabase
    if (dryRun) {
      console.log('');
      console.log('[PECOS] DRY RUN — skipping database upsert.');
      console.log(`  Would upsert ${records.length.toLocaleString()} records to provider_pecos.`);
    } else {
      console.log('');
      console.log(`[PECOS] Step 3: Upserting ${records.length.toLocaleString()} records to provider_pecos...`);
      const upserted = await upsertPecosRecords(records);
      console.log(`[PECOS] Upserted ${upserted.toLocaleString()} records.`);
    }

    // 5. Summary
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log(`  PECOS sync complete in ${totalDuration}s`);
    console.log(`  Records: ${records.length.toLocaleString()}`);
    console.log(`  States:  ${states.join(', ')}`);
    console.log('══════════════════════════════════════════════');

  } catch (err) {
    console.error('[FATAL] PECOS sync failed:', err);
    process.exit(1);
  }
}

main();
