// scripts/pecos-monthly-sync.ts
// ═══ KairoLogic PECOS Monthly Sync — Orchestrator ═══
// Task 1.4: Downloads CMS PECOS public enrollment data, parses into
// provider_pecos table, enriches with reassignment data.
//
// What it does:
//   1. Downloads PECOS base enrollment CSV from data.cms.gov
//   2. Downloads reassignment sub-file for group practice associations
//   3. Parses base enrollment, filters to launch states (TX, CA)
//   4. Enriches with reassignment data (provider → billing group)
//   5. Upserts into provider_pecos table
//
// Run: npx tsx scripts/pecos-monthly-sync.ts [--states TX,CA] [--dry-run] [--limit 1000]
//
// Scheduled via GitHub Actions: 1st of each month at 7am UTC

import { existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  parsePecosFile,
  parseReassignmentFile,
  enrichWithReassignments,
  upsertPecosRecords,
  downloadCmsFile,
  PECOS_URLS,
} from '../lib/nppes/pecos-client';

// ── Configuration ────────────────────────────────────────────────

const WORK_DIR = join(process.cwd(), '.pecos-work');
const DEFAULT_STATES = ['TX', 'CA'];

// ── CLI argument parsing ─────────────────────────────────────────

interface SyncOptions {
  states: string[];
  dryRun: boolean;
  limit: number;
  skipReassignment: boolean;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  return {
    states: getArgValue(args, '--states')?.split(',') || DEFAULT_STATES,
    dryRun: args.includes('--dry-run'),
    limit: parseInt(getArgValue(args, '--limit') || '0', 10),
    skipReassignment: args.includes('--skip-reassignment'),
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

// ── Main sync pipeline ───────────────────────────────────────────

async function main() {
  const options = parseArgs();
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];

  console.log('═══════════════════════════════════════════════════════');
  console.log('  KairoLogic PECOS Monthly Sync Pipeline');
  console.log('  CMS Public Provider Enrollment Ingest');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  States:  ${options.states.join(', ')}`);
  console.log(`  Dry run: ${options.dryRun}`);
  if (options.limit > 0) console.log(`  Limit:   ${options.limit} records`);
  console.log('');

  // 1. Set up work directory
  if (!existsSync(WORK_DIR)) {
    mkdirSync(WORK_DIR, { recursive: true });
  }

  // 2. Download files
  const baseFilePath = join(WORK_DIR, 'pecos_base_enrollment.csv');
  const reassignFilePath = join(WORK_DIR, 'pecos_reassignment.csv');

  downloadCmsFile(PECOS_URLS.baseEnrollment, baseFilePath, 'Base Enrollment');

  if (!options.skipReassignment) {
    const { baseEnrollmentUrl, reassignmentUrl } = await resolvePecosDownloadUrls();
downloadCmsFile(baseEnrollmentUrl, baseFilePath, 'Base Enrollment');
downloadCmsFile(reassignmentUrl, reassignmentFilePath, 'Reassignment Sub-file');
  }

  // 3. Parse base enrollment
  console.log('\n[PECOS] Parsing base enrollment file...');
  const parseResult = await parsePecosFile(baseFilePath, today, {
    filterStates: new Set(options.states),
    limit: options.limit,
    onProgress: (processed, matched) => {
      process.stdout.write(
        `\r[PECOS] Processed ${processed.toLocaleString()} lines, ${matched.toLocaleString()} matched`,
      );
    },
  });

  console.log(`\n[PECOS] Parse complete:`);
  console.log(`  Lines processed: ${parseResult.totalLines.toLocaleString()}`);
  console.log(`  Records matched: ${parseResult.matched.toLocaleString()}`);
  console.log(`  Records skipped: ${parseResult.skipped.toLocaleString()}`);
  console.log(`  Parse errors:    ${parseResult.errors}`);
  console.log(`  Duration:        ${(parseResult.durationMs / 1000).toFixed(1)}s`);

  let records = parseResult.records;

  // 4. Enrich with reassignment data
  if (!options.skipReassignment && existsSync(reassignFilePath)) {
    console.log('\n[PECOS] Parsing reassignment file...');
    const reassignments = await parseReassignmentFile(reassignFilePath);
    console.log(`[PECOS] Found ${reassignments.size.toLocaleString()} reassignment records`);

    records = enrichWithReassignments(records, reassignments);

    const enrichedCount = records.filter((r) => r.reassignment_npi).length;
    console.log(`[PECOS] Enriched ${enrichedCount.toLocaleString()} records with reassignment data`);
  }

  // 5. Quick data quality stats
  const byState = new Map<string, number>();
  const byType = new Map<string, number>();
  const withSpecialty = records.filter((r) => r.specialty).length;
  const withCity = records.filter((r) => r.city).length;

  for (const r of records) {
    if (r.state) byState.set(r.state, (byState.get(r.state) || 0) + 1);
    if (r.enrollment_type) byType.set(r.enrollment_type, (byType.get(r.enrollment_type) || 0) + 1);
  }

  console.log('\n[PECOS] Data quality:');
  console.log(`  By state:      ${[...byState.entries()].map(([s, c]) => `${s}=${c.toLocaleString()}`).join(', ')}`);
  console.log(`  By type:       ${[...byType.entries()].map(([t, c]) => `${t}=${c.toLocaleString()}`).join(', ')}`);
  console.log(`  With specialty: ${withSpecialty.toLocaleString()} (${((withSpecialty / records.length) * 100).toFixed(1)}%)`);
  console.log(`  With city:      ${withCity.toLocaleString()} (${((withCity / records.length) * 100).toFixed(1)}%)`);

  // 6. Upsert to Supabase
  if (!options.dryRun) {
    console.log('\n[PECOS] Upserting to provider_pecos table...');
    const upserted = await upsertPecosRecords(records);
    console.log(`[PECOS] Upserted ${upserted.toLocaleString()} records`);
  }

  // 7. Clean up
  try {
    const files = readdirSync(WORK_DIR);
    for (const f of files) {
      unlinkSync(join(WORK_DIR, f));
    }
  } catch {
    // non-critical
  }

  // 8. Summary
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PECOS Monthly Sync — Complete');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total records:          ${records.length.toLocaleString()}`);
  console.log(`  With reassignment:      ${records.filter((r) => r.reassignment_npi).length.toLocaleString()}`);
  console.log(`  Duration:               ${durationSec}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (options.dryRun) {
    console.log('\n  ⚠ DRY RUN — no data was written to the database');

    // Print sample records for verification
    console.log('\n  Sample records (first 3):');
    for (const r of records.slice(0, 3)) {
      console.log(`    NPI: ${r.npi} | ${r.provider_name} | ${r.specialty} | ${r.state} ${r.city} | Reassign: ${r.reassignment_npi || 'none'}`);
    }
  }
}

// ── Run ──────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\n[FATAL] PECOS sync failed:', err);
  process.exit(1);
});
