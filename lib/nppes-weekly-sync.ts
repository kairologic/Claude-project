// scripts/nppes-weekly-sync.ts
// ═══ KairoLogic NPPES Weekly Sync — Orchestrator ═══
// Combines Task 1.2 (V.2 parser) and Task 1.3 (snapshot sync + delta detection).
//
// What it does:
//   1. Downloads the NPPES V.2 weekly diff file from CMS
//   2. Parses CSV with V.2 field lengths (extended First Name, Legal Business Name)
//   3. Upserts changed records into the providers table
//   4. Creates field-level snapshots for tracked providers
//   5. Diffs against previous snapshots, writes delta events
//   6. Updates mismatch flags on practice_providers
//
// Run: npx tsx scripts/nppes-weekly-sync.ts [--full] [--states TX,CA] [--dry-run]
//
// Scheduled via GitHub Actions: every Monday at 6am UTC
// (NPPES weekly diff published each Monday)

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { parseNppesFileStreaming, type ParseOptions } from '../lib/nppes/parser';
import type { NppesRecord } from '../lib/nppes/v2-columns';
import {
  upsertProviders,
  fetchTrackedNpis,
  fetchProviderNpisByState,
  type ProviderUpsertRow,
} from '../lib/nppes/supabase-client';
import { createSnapshotsAndDetectDeltas } from '../lib/nppes/snapshot';

// ── Configuration ────────────────────────────────────────────────

const NPPES_DOWNLOAD_BASE = 'https://download.cms.gov/nppes';
const WORK_DIR = join(process.cwd(), '.nppes-work');
const BATCH_SIZE = 500; // records per Supabase upsert batch

const DEFAULT_STATES = ['TX', 'CA']; // launch scope

// ── CLI argument parsing ─────────────────────────────────────────

interface SyncOptions {
  full: boolean;          // use full replacement file instead of weekly diff
  states: string[];       // filter to specific states
  dryRun: boolean;        // parse and report but don't write to DB
  snapshotOnly: boolean;  // skip provider upsert, only do snapshots
  limit: number;          // max records (for testing)
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  return {
    full: args.includes('--full'),
    states: getArgValue(args, '--states')?.split(',') || DEFAULT_STATES,
    dryRun: args.includes('--dry-run'),
    snapshotOnly: args.includes('--snapshot-only'),
    limit: parseInt(getArgValue(args, '--limit') || '0', 10),
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

// ── Download NPPES files ─────────────────────────────────────────

/**
 * Determine the correct weekly diff file URL.
 * NPPES publishes weekly diffs every Monday. File naming convention:
 *   npidata_pfile_20050523-{YYYYMMDD}.csv  (V.1 — discontinued)
 *   npidata_pfile_20050523-{YYYYMMDD}_v2.csv (V.2)
 *
 * The weekly diff ZIP is at:
 *   https://download.cms.gov/nppes/NPPES_Data_Dissemination_{Month}_{Year}.zip
 *
 * For simplicity, we use the direct weekly update file endpoint.
 */
function getWeeklyDiffUrl(): string {
  // CMS publishes the weekly update as a ZIP containing the diff CSV
  // The URL pattern for the weekly update file:
  return `${NPPES_DOWNLOAD_BASE}/NPPES_Data_Dissemination_Weekly.zip`;
}

function getFullFileUrl(): string {
  return `${NPPES_DOWNLOAD_BASE}/NPPES_Data_Dissemination.zip`;
}

async function downloadAndExtract(url: string, label: string): Promise<string> {
  if (!existsSync(WORK_DIR)) {
    mkdirSync(WORK_DIR, { recursive: true });
  }

  const zipPath = join(WORK_DIR, `${label}.zip`);
  console.log(`[Download] Fetching ${label} from ${url}`);

  // Use curl for reliable large file downloads
  execSync(`curl -sS -L -o "${zipPath}" "${url}"`, {
    stdio: 'inherit',
    timeout: 600_000, // 10 minute timeout for large files
  });

  const zipSize = statSync(zipPath).size;
  console.log(`[Download] Downloaded ${(zipSize / 1024 / 1024).toFixed(1)} MB`);

  // Extract
  console.log(`[Download] Extracting...`);
  execSync(`unzip -o -d "${WORK_DIR}" "${zipPath}"`, { stdio: 'inherit' });

  // Find the V.2 CSV file (look for _v2.csv or npidata_pfile patterns)
  const files = readdirSync(WORK_DIR);
  const csvFile = files.find(
    (f) => f.endsWith('.csv') && (f.includes('npidata') || f.includes('NPPES')),
  );

  if (!csvFile) {
    throw new Error(
      `No NPPES CSV file found in extracted ZIP. Files: ${files.join(', ')}`,
    );
  }

  const csvPath = join(WORK_DIR, csvFile);
  const csvSize = statSync(csvPath).size;
  console.log(
    `[Download] Found CSV: ${csvFile} (${(csvSize / 1024 / 1024).toFixed(1)} MB)`,
  );

  // Clean up ZIP
  unlinkSync(zipPath);

  return csvPath;
}

// ── Main sync pipeline ───────────────────────────────────────────

async function main() {
  const options = parseArgs();
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  KairoLogic NPPES Weekly Sync Pipeline');
  console.log('  V.2 Parser + Snapshot Sync + Delta Detection');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Mode:   ${options.full ? 'FULL REPLACEMENT' : 'WEEKLY DIFF'}`);
  console.log(`  States: ${options.states.join(', ')}`);
  console.log(`  Dry run: ${options.dryRun}`);
  if (options.limit > 0) console.log(`  Limit: ${options.limit} records`);
  console.log('');

  // 1. Download NPPES file
  const url = options.full ? getFullFileUrl() : getWeeklyDiffUrl();
  const label = options.full ? 'nppes-full' : 'nppes-weekly-diff';
  const csvPath = await downloadAndExtract(url, label);

  // 2. Determine which NPIs to snapshot
  console.log('\n[Tracked NPIs] Fetching tracked provider list...');
  let trackedNpis: Set<string>;

  try {
    trackedNpis = await fetchTrackedNpis();
    console.log(
      `[Tracked NPIs] Found ${trackedNpis.size} NPIs in practice_providers`,
    );
  } catch {
    // practice_providers may be empty early on; fall back to state-based
    console.log(
      '[Tracked NPIs] practice_providers empty, falling back to state-based tracking',
    );
    trackedNpis = await fetchProviderNpisByState(options.states);
    console.log(
      `[Tracked NPIs] Found ${trackedNpis.size} active providers in ${options.states.join(', ')}`,
    );
  }

  // 3. Parse and process
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sourceFile = options.full
    ? `full_replacement_${today}`
    : `weekly_diff_${today}`;

  let totalUpserted = 0;
  let totalSnapshots = 0;
  let totalDeltas = 0;
  let totalProvidersChanged = 0;

  const parseOptions: ParseOptions = {
    filterStates: new Set(options.states),
    limit: options.limit,
    onProgress: (processed, matched) => {
      process.stdout.write(
        `\r[Parser] Processed ${processed.toLocaleString()} lines, ${matched.toLocaleString()} matched`,
      );
    },
  };

  console.log(`\n[Parser] Starting V.2 CSV parse...`);

  // Accumulate records per batch for snapshot processing
  let batchRecords: NppesRecord[] = [];

  const parseResult = await parseNppesFileStreaming(
    csvPath,
    BATCH_SIZE,
    async (batch, batchNumber) => {
      // Upsert providers
      if (!options.snapshotOnly && !options.dryRun) {
        const upsertRows: ProviderUpsertRow[] = batch.map((r) => ({
          npi: r.npi,
          entity_type_code: r.entity_type_code,
          organization_name: r.organization_name,
          first_name: r.first_name,
          last_name: r.last_name,
          credential: r.credential,
          address_line_1: r.address_line_1,
          address_line_2: r.address_line_2,
          city: r.city,
          state: r.state,
          zip_code: r.zip_code,
          country_code: r.country_code,
          phone: r.phone,
          fax: r.fax,
          primary_taxonomy_code: r.primary_taxonomy_code,
          last_nppes_update_date: r.last_nppes_update_date,
          deactivation_date: r.deactivation_date,
          last_updated_at: new Date().toISOString(),
        }));

        try {
          const count = await upsertProviders(upsertRows);
          totalUpserted += count;
        } catch (err) {
          console.error(
            `\n[Upsert] Batch ${batchNumber} failed:`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      // Accumulate for snapshot processing
      batchRecords.push(...batch);

      // Process snapshots every 2000 records to manage memory
      if (batchRecords.length >= 2000) {
        if (!options.dryRun) {
          const result = await createSnapshotsAndDetectDeltas(
            batchRecords,
            today,
            sourceFile,
            trackedNpis,
          );
          totalSnapshots += result.snapshotsCreated;
          totalDeltas += result.deltaEventsCreated;
          totalProvidersChanged += result.providersWithChanges;
        }
        batchRecords = [];
      }
    },
    parseOptions,
  );

  // Flush remaining records for snapshots
  if (batchRecords.length > 0 && !options.dryRun) {
    const result = await createSnapshotsAndDetectDeltas(
      batchRecords,
      today,
      sourceFile,
      trackedNpis,
    );
    totalSnapshots += result.snapshotsCreated;
    totalDeltas += result.deltaEventsCreated;
    totalProvidersChanged += result.providersWithChanges;
  }

  // 4. Clean up work directory
  try {
    const files = readdirSync(WORK_DIR);
    for (const f of files) {
      unlinkSync(join(WORK_DIR, f));
    }
  } catch {
    // non-critical
  }

  // 5. Summary
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NPPES Weekly Sync — Complete');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  CSV lines processed:    ${parseResult.totalLines.toLocaleString()}`);
  console.log(`  Records matched:        ${parseResult.matchedRecords.toLocaleString()}`);
  console.log(`  Records skipped:        ${parseResult.skippedRecords.toLocaleString()}`);
  console.log(`  Parse errors:           ${parseResult.errors}`);
  console.log(`  Providers upserted:     ${totalUpserted.toLocaleString()}`);
  console.log(`  Snapshots created:      ${totalSnapshots.toLocaleString()}`);
  console.log(`  Delta events created:   ${totalDeltas.toLocaleString()}`);
  console.log(`  Providers with changes: ${totalProvidersChanged.toLocaleString()}`);
  console.log(`  Duration:               ${durationSec}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (options.dryRun) {
    console.log('\n  ⚠ DRY RUN — no data was written to the database');
  }
}

// ── Run ──────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\n[FATAL] NPPES sync failed:', err);
  process.exit(1);
});
