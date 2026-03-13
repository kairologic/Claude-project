// scripts/run-scan-and-delta.ts
// ═══ KairoLogic Scan + Delta Engine — Combined Runner ═══
// Runs the scan scheduler followed by the delta detection engine.
// This is the primary scheduled job: scan sites, detect mismatches.
//
// Usage:
//   npx tsx scripts/run-scan-and-delta.ts [--limit 50] [--dry-run]
//   npx tsx scripts/run-scan-and-delta.ts --delta-only --since 2026-03-07
//   npx tsx scripts/run-scan-and-delta.ts --scan-only

import { runScheduler } from '../lib/scanner/scan-scheduler';
import { runDeltaDetectionBatch } from '../lib/scanner/delta-engine';

async function main() {
  const args = process.argv.slice(2);
  const getVal = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const scanOnly = args.includes('--scan-only');
  const deltaOnly = args.includes('--delta-only');
  const dryRun = args.includes('--dry-run');
  const limit = parseInt(getVal('--limit') || '500', 10);
  const state = getVal('--state') || 'TX';
  const since = getVal('--since');
  const forceAll = args.includes('--force-all');

  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  KairoLogic Scan + Delta Detection Engine');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Mode:      ${deltaOnly ? 'Delta only' : scanOnly ? 'Scan only' : 'Full (scan + delta)'}`);
  console.log(`  State:     ${state}`);
  console.log(`  Max sites: ${limit}`);
  console.log(`  Dry run:   ${dryRun}`);
  if (since) console.log(`  Since:     ${since}`);
  console.log('');

  // ── Phase 1: Scan ──────────────────────────────────────

  let scanStart: string | undefined;

  if (!deltaOnly) {
    scanStart = new Date().toISOString();

    console.log('─── Phase 1: Scan Scheduler ────────────────────────\n');

    const scanResult = await runScheduler({
      limit,
      forceAll,
      dryRun,
      state,
      onProgress: (scanned, total) => {
        process.stdout.write(`\r  Scanning: ${scanned}/${total}`);
      },
    });

    console.log('\n');
    console.log(`  Sites scanned:      ${scanResult.sites_scanned}`);
    console.log(`  Succeeded:          ${scanResult.sites_succeeded}`);
    console.log(`  Failed:             ${scanResult.sites_failed}`);
    console.log(`  Providers detected: ${scanResult.providers_detected}`);
    console.log(`  Providers matched:  ${scanResult.providers_matched}`);
    console.log(`  Duration:           ${(scanResult.total_duration_ms / 1000).toFixed(1)}s`);
  }

  // ── Phase 2: Delta Detection ───────────────────────────

  if (!scanOnly && !dryRun) {
    console.log('\n─── Phase 2: Delta Detection Engine ─────────────────\n');

    const deltaResult = await runDeltaDetectionBatch({
      since: since || scanStart,
      limit,
      onProgress: (processed, total) => {
        process.stdout.write(`\r  Processing: ${processed}/${total} sites`);
      },
    });

    console.log('\n');
    console.log(`  Providers analyzed:  ${deltaResult.total_providers}`);
    console.log(`  Deltas created:      ${deltaResult.deltas_created}`);
    console.log(`  Providers w/ deltas: ${deltaResult.providers_with_deltas}`);
    console.log(`  High confidence:     ${deltaResult.high_confidence}`);
    console.log(`  Medium confidence:   ${deltaResult.medium_confidence}`);
    console.log(`  Low confidence:      ${deltaResult.low_confidence}`);
    console.log(`  Corroborated (2+):   ${deltaResult.corroborated}`);
    console.log(`  Duration:            ${(deltaResult.duration_ms / 1000).toFixed(1)}s`);
  }

  // ── Summary ────────────────────────────────────────────

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Complete. Total duration: ${totalSec}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (dryRun) {
    console.log('\n  ⚠ DRY RUN — no data was written to the database');
  }
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
