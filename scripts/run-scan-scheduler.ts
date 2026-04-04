// scripts/run-scan-scheduler.ts
// ═══ KairoLogic Scan Scheduler — CLI Runner ═══
// Runs the practice website scan scheduler.
//
// Usage:
//   npx tsx scripts/run-scan-scheduler.ts [--limit 50] [--force-all] [--dry-run]
//
// Scheduled via GitHub Actions for weekly/daily runs.
// Can also be triggered manually from Actions tab.

import { runScheduler } from '../lib/scanner/scan-scheduler';

async function main() {
  const args = process.argv.slice(2);
  const getVal = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const options = {
    limit: parseInt(getVal('--limit') || '50', 10),
    forceAll: args.includes('--force-all'),
    dryRun: args.includes('--dry-run'),
    concurrency: parseInt(getVal('--concurrency') || '3', 10),
  };

  console.log('═══════════════════════════════════════════════════════');
  console.log('  KairoLogic Practice Website Scan Scheduler');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Max sites:    ${options.limit}`);
  console.log(`  Force all:    ${options.forceAll}`);
  console.log(`  Concurrency:  ${options.concurrency}`);
  console.log(`  Dry run:      ${options.dryRun}`);
  console.log('');

  const result = await runScheduler({
    ...options,
    onProgress: (scanned, total) => {
      process.stdout.write(`\r[Scheduler] ${scanned}/${total} sites scanned`);
    },
  });

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Scan Scheduler — Complete');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Sites scanned:      ${result.sites_scanned}`);
  console.log(`  Succeeded:          ${result.sites_succeeded}`);
  console.log(`  Failed:             ${result.sites_failed}`);
  console.log(`  Providers detected: ${result.providers_detected}`);
  console.log(`  Providers matched:  ${result.providers_matched}`);
  console.log(`  New associations:   ${result.new_associations}`);
  console.log(`  Departures:         ${result.departures_detected}`);
  console.log(`  Duration:           ${(result.total_duration_ms / 1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (options.dryRun) {
    console.log('\n  ⚠ DRY RUN — no data was written to the database');
  }
}

main().catch((err) => {
  console.error('\n[FATAL] Scan scheduler failed:', err);
  process.exit(1);
});
