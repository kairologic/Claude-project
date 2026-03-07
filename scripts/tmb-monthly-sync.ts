// scripts/tmb-monthly-sync.ts
// ═══ KairoLogic TMB ORSSP Monthly Sync — Orchestrator ═══
// Task 1.7 (revised): Downloads Texas Medical Board physician data via
// ORSSP open records portal, parses fixed-width file, upserts into
// provider_licenses table.
//
// Data source: TMB ORSSP (http://orssp.tmb.state.tx.us)
// Cost: $0.26 per report
// Cadence: Monthly (reports posted 1st business day of month)
// Format: Fixed-width text, 508 chars per record
// Auth: Registered ORSSP account (legitimate open records access)
//
// IMPORTANT: The ORSSP file must be downloaded manually (requires login +
// payment). This script processes the downloaded file, it does NOT automate
// the ORSSP portal itself. The workflow is:
//   1. Ravi downloads PHY file from ORSSP portal (~1st of month)
//   2. Uploads to repo or triggers workflow with file path
//   3. This script parses and upserts
//
// Run: npx tsx scripts/tmb-monthly-sync.ts <path-to-PHY-file.txt> [--dry-run]

import { parseTMBFile, toProviderLicenseRow, upsertTmbRecords } from '../lib/nppes/tmb-parser';

// ── CLI ──────────────────────────────────────────────────────────

interface SyncOptions {
  filePath: string;
  dryRun: boolean;
  activeOnly: boolean;
  limit: number;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const filePath = args.find((a) => !a.startsWith('--'));

  if (!filePath) {
    console.error('Usage: npx tsx scripts/tmb-monthly-sync.ts <path-to-PHY-file.txt> [--dry-run] [--active-only] [--limit N]');
    console.error('');
    console.error('Download the Physician report from http://orssp.tmb.state.tx.us first.');
    process.exit(1);
  }

  const limitArg = args.find((a) => a.startsWith('--limit'));
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && limitIdx + 1 < args.length
    ? parseInt(args[limitIdx + 1], 10)
    : 0;

  return {
    filePath,
    dryRun: args.includes('--dry-run'),
    activeOnly: args.includes('--active-only'),
    limit,
  };
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs();
  const startTime = Date.now();
  const downloadedAt = new Date();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  KairoLogic TMB ORSSP Monthly Sync');
  console.log('  Texas Medical Board — Physician License Data');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  File:        ${options.filePath}`);
  console.log(`  Dry run:     ${options.dryRun}`);
  console.log(`  Active only: ${options.activeOnly}`);
  if (options.limit > 0) console.log(`  Limit:       ${options.limit}`);
  console.log('');

  // 1. Parse the fixed-width file
  console.log('[TMB] Parsing ORSSP physician file...');
  const result = await parseTMBFile(options.filePath);

  console.log(`[TMB] Parse complete:`);
  console.log(`  Total lines:     ${result.total.toLocaleString()}`);
  console.log(`  Records parsed:  ${result.records.length.toLocaleString()}`);
  console.log(`  Active licenses: ${result.active.toLocaleString()}`);
  console.log(`  Skipped:         ${result.skipped}`);
  console.log(`  Errors:          ${result.errors}`);

  // 2. Filter if needed
  let records = result.records;

  if (options.activeOnly) {
    records = records.filter((r) => r.is_active);
    console.log(`\n[TMB] Filtered to active only: ${records.length.toLocaleString()} records`);
  }

  if (options.limit > 0) {
    records = records.slice(0, options.limit);
    console.log(`[TMB] Limited to ${records.length} records`);
  }

  // 3. Data quality stats
  const byStatus = new Map<string, number>();
  const bySpecialty = new Map<string, number>();
  const withPracAddress = records.filter((r) => r.prac_addr1).length;
  const txPractice = records.filter((r) => r.is_texas_practice).length;

  for (const r of records) {
    byStatus.set(r.reg_status_label, (byStatus.get(r.reg_status_label) || 0) + 1);
    if (r.specialty1) {
      bySpecialty.set(r.specialty1, (bySpecialty.get(r.specialty1) || 0) + 1);
    }
  }

  console.log('\n[TMB] Data quality:');
  console.log(`  With practice address: ${withPracAddress.toLocaleString()} (${((withPracAddress / records.length) * 100).toFixed(1)}%)`);
  console.log(`  TX practice address:   ${txPractice.toLocaleString()} (${((txPractice / records.length) * 100).toFixed(1)}%)`);
  console.log(`  Top statuses:`);
  const sortedStatuses = [...byStatus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [status, count] of sortedStatuses) {
    console.log(`    ${status}: ${count.toLocaleString()}`);
  }
  console.log(`  Unique specialties: ${bySpecialty.size}`);

  // 4. Map to provider_licenses schema
  const rows = records.map((r) => toProviderLicenseRow(r, downloadedAt));

  // 5. Upsert to Supabase
  if (!options.dryRun) {
    console.log(`\n[TMB] Upserting ${rows.length.toLocaleString()} records to provider_licenses...`);
    const upserted = await upsertTmbRecords(rows);
    console.log(`[TMB] Upserted ${upserted.toLocaleString()} records`);
  }

  // 6. Summary
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TMB ORSSP Monthly Sync — Complete');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Records processed:  ${records.length.toLocaleString()}`);
  console.log(`  Active licenses:    ${records.filter((r) => r.is_active).length.toLocaleString()}`);
  console.log(`  Disciplinary flags: ${rows.filter((r) => r.has_disciplinary_action).length.toLocaleString()}`);
  console.log(`  Duration:           ${durationSec}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (options.dryRun) {
    console.log('\n  ⚠ DRY RUN — no data was written to the database');

    console.log('\n  Sample records (first 3):');
    for (const r of records.slice(0, 3)) {
      console.log(`    ${r.full_name} | Lic: ${r.lic} | ${r.reg_status_label} | ${r.specialty1}`);
      console.log(`      Practice: ${r.prac_address_full}`);
      console.log(`      Expires:  ${r.lic_exp_date?.toISOString().split('T')[0] ?? 'unknown'}`);
      console.log('');
    }
  }
}

main().catch((err) => {
  console.error('\n[FATAL] TMB sync failed:', err);
  process.exit(1);
});
