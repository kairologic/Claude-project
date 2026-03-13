// scripts/ca-mb-monthly-sync.ts
// ═══ KairoLogic CA Medical Board + NPI Resolution Sync ═══
// Task 1.8 + Task 1.6: Downloads CA MB license data, upserts to
// provider_licenses, then runs NPI resolution on all unresolved records.
//
// Data source: CA Medical Board (via DCA open data portal)
// Cadence: Weekly (published Tuesdays), we sync monthly
// Format: CSV, no authentication required
//
// Run: npx tsx scripts/ca-mb-monthly-sync.ts [--file <path>] [--skip-resolution] [--dry-run]
//   --file <path>    Use a local file instead of downloading
//   --skip-resolution Skip NPI resolution step
//   --resolve-only   Skip CA MB ingest, only run resolution on existing unresolved records
//   --states TX,CA   States to resolve (default: TX,CA)
//   --dry-run        Parse only, no DB writes

import { existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  parseCaMbFile,
  toProviderLicenseRow,
  upsertCaMbRecords,
} from '../lib/nppes/ca-medical-board';
import {
  fetchUnresolvedLicenses,
  resolveNpiBatch,
  runValidationGate,
} from '../lib/nppes/npi-resolver';

// ── Configuration ────────────────────────────────────────

const WORK_DIR = join(process.cwd(), '.camb-work');

// CA Medical Board CSV download URL
// This URL may need updating if CA changes their data portal structure.
// Alternative: https://data.ca.gov → search "Medical Board" → CSV download
const CA_MB_DOWNLOAD_URL =
  'https://data.ca.gov/dataset/medical-board-of-california-physician-and-surgeon/resource/physician_and_surgeon.csv';

const DEFAULT_STATES = ['TX', 'CA'];

// ── CLI ──────────────────────────────────────────────────

interface SyncOptions {
  filePath: string | null;
  skipResolution: boolean;
  resolveOnly: boolean;
  states: string[];
  dryRun: boolean;
  activeOnly: boolean;
  limit: number;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');

  return {
    filePath: fileIdx >= 0 && fileIdx + 1 < args.length ? args[fileIdx + 1] : null,
    skipResolution: args.includes('--skip-resolution'),
    resolveOnly: args.includes('--resolve-only'),
    states: getArgValue(args, '--states')?.split(',') || DEFAULT_STATES,
    dryRun: args.includes('--dry-run'),
    activeOnly: !args.includes('--include-inactive'),
    limit: parseInt(getArgValue(args, '--limit') || '0', 10),
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const options = parseArgs();
  const startTime = Date.now();
  const syncedAt = new Date();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  KairoLogic CA Medical Board + NPI Resolution Sync');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Mode:       ${options.resolveOnly ? 'Resolution only' : 'Full sync (ingest + resolve)'}`);
  console.log(`  States:     ${options.states.join(', ')}`);
  console.log(`  Dry run:    ${options.dryRun}`);
  if (options.limit > 0) console.log(`  Limit:      ${options.limit}`);
  console.log('');

  // ── Part 1: CA Medical Board Ingest ────────────────────

  if (!options.resolveOnly) {
    let csvPath: string;

    if (options.filePath) {
      csvPath = options.filePath;
      console.log(`[CA MB] Using local file: ${csvPath}`);
    } else {
      // Download from CA DCA portal
      if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });
      csvPath = join(WORK_DIR, 'ca_mb_physicians.csv');

      console.log('[CA MB] Downloading from CA DCA portal...');
      const { execSync } = require('child_process');
      try {
        execSync(`curl -sS -L -o "${csvPath}" "${CA_MB_DOWNLOAD_URL}"`, {
          stdio: 'inherit',
          timeout: 300_000,
        });
        const { statSync } = require('fs');
        const size = statSync(csvPath).size;
        console.log(`[CA MB] Downloaded: ${(size / 1024 / 1024).toFixed(1)} MB`);
      } catch (err) {
        console.error('[CA MB] Download failed. Use --file <path> to provide a local file.');
        console.error('[CA MB] Download CA MB data from: https://data.ca.gov → Medical Board');
        throw err;
      }
    }

    // Parse
    console.log('\n[CA MB] Parsing physician license file...');
    const parseResult = await parseCaMbFile(csvPath, {
      activeOnly: options.activeOnly,
      limit: options.limit,
      onProgress: (processed, matched) => {
        process.stdout.write(`\r[CA MB] Processed ${processed.toLocaleString()} lines, ${matched.toLocaleString()} matched`);
      },
    });

    console.log(`\n[CA MB] Parse complete:`);
    console.log(`  Lines processed: ${parseResult.total_lines.toLocaleString()}`);
    console.log(`  Records matched: ${parseResult.matched.toLocaleString()}`);
    console.log(`  Skipped:         ${parseResult.skipped.toLocaleString()}`);
    console.log(`  Errors:          ${parseResult.errors}`);

    // Data quality
    const byStatus = new Map<string, number>();
    const withAddress = parseResult.records.filter(r => r.address_line_1).length;
    const withSpecialty = parseResult.records.filter(r => r.specialty).length;

    for (const r of parseResult.records) {
      byStatus.set(r.license_status, (byStatus.get(r.license_status) || 0) + 1);
    }

    console.log('\n[CA MB] Data quality:');
    console.log(`  With address:   ${withAddress.toLocaleString()} (${((withAddress / parseResult.records.length) * 100).toFixed(1)}%)`);
    console.log(`  With specialty: ${withSpecialty.toLocaleString()} (${((withSpecialty / parseResult.records.length) * 100).toFixed(1)}%)`);
    console.log(`  Top statuses:`);
    [...byStatus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([s, c]) => {
      console.log(`    ${s}: ${c.toLocaleString()}`);
    });

    // Upsert
    if (!options.dryRun) {
      const rows = parseResult.records.map(r => toProviderLicenseRow(r, syncedAt));
      console.log(`\n[CA MB] Upserting ${rows.length.toLocaleString()} records...`);
      const upserted = await upsertCaMbRecords(rows);
      console.log(`[CA MB] Upserted ${upserted.toLocaleString()} records`);
    }

    // Cleanup
    if (!options.filePath && existsSync(WORK_DIR)) {
      try {
        for (const f of readdirSync(WORK_DIR)) unlinkSync(join(WORK_DIR, f));
      } catch {}
    }
  }

  // ── Part 2: NPI Resolution ─────────────────────────────

  if (!options.skipResolution && !options.dryRun) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  NPI Resolution Engine');
    console.log('═══════════════════════════════════════════════════════');

    // Fetch unresolved licenses
    console.log(`\n[Resolution] Fetching unresolved licenses for ${options.states.join(', ')}...`);
    const unresolved = await fetchUnresolvedLicenses(options.states);
    console.log(`[Resolution] Found ${unresolved.length.toLocaleString()} unresolved records`);

    if (unresolved.length > 0) {
      // Process in batches of 100
      const BATCH_SIZE = 100;
      let totalResult = {
        total: 0, resolved_pecos: 0, resolved_fuzzy: 0,
        unresolved: 0, needs_review: 0, duration_ms: 0,
      };

      for (let i = 0; i < unresolved.length; i += BATCH_SIZE) {
        const batch = unresolved.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(unresolved.length / BATCH_SIZE);

        process.stdout.write(`\r[Resolution] Processing batch ${batchNum}/${totalBatches}...`);

        const result = await resolveNpiBatch(batch);
        await new Promise(r => setTimeout(r, 500)); // 500ms cooldown
        totalResult.total += result.total;
        totalResult.resolved_pecos += result.resolved_pecos;
        totalResult.resolved_fuzzy += result.resolved_fuzzy;
        totalResult.unresolved += result.unresolved;
        totalResult.needs_review += result.needs_review;
        totalResult.duration_ms += result.duration_ms;
      }

      console.log(`\n\n[Resolution] Results:`);
      console.log(`  Total processed:   ${totalResult.total.toLocaleString()}`);
      console.log(`  Resolved (PECOS):  ${totalResult.resolved_pecos.toLocaleString()}`);
      console.log(`  Resolved (Fuzzy):  ${totalResult.resolved_fuzzy.toLocaleString()}`);
      console.log(`  Needs review:      ${totalResult.needs_review.toLocaleString()}`);
      console.log(`  Unresolved:        ${totalResult.unresolved.toLocaleString()}`);

      const resolveRate = totalResult.total > 0
        ? ((totalResult.resolved_pecos + totalResult.resolved_fuzzy) / totalResult.total * 100).toFixed(1)
        : '0';
      console.log(`  Resolution rate:   ${resolveRate}%`);
    }

    // Run validation gate
    console.log('\n[Validation] Running accuracy validation gate...');
    const validation = await runValidationGate();

    if (validation.total_sample > 0) {
      console.log(`[Validation] Results (${validation.total_sample} validated samples):`);
      console.log(`  PECOS FP rate:   ${(validation.pecos_fp_rate * 100).toFixed(2)}% (target: <1%)`);
      console.log(`  Fuzzy FP rate:   ${(validation.fuzzy_fp_rate * 100).toFixed(2)}% (target: <3%)`);
      console.log(`  Weighted FP rate: ${(validation.weighted_fp_rate * 100).toFixed(2)}% (target: <2%)`);
      console.log(`  Gate: ${validation.gate_passed ? 'PASSED ✓' : 'FAILED ✗'}`);

      if (!validation.gate_passed) {
        console.warn('\n  ⚠ VALIDATION GATE FAILED — state board findings blocked from production');
        console.warn('  Review provider_npi_resolutions for false positives and adjust thresholds.');
      }
    } else {
      console.log('[Validation] No validated samples yet. Mark records in provider_npi_resolutions');
      console.log('  with is_validated=true and is_false_positive=true/false to build the sample.');
    }
  }

  // ── Summary ────────────────────────────────────────────

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CA Medical Board + NPI Resolution — Complete');
  console.log(`  Duration: ${durationSec}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (options.dryRun) {
    console.log('\n  ⚠ DRY RUN — no data was written to the database');
  }
}

main().catch((err) => {
  console.error('\n[FATAL] CA MB sync failed:', err);
  process.exit(1);
});
