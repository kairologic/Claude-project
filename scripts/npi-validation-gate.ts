// scripts/npi-validation-gate.ts
// ═══ KairoLogic NPI Resolution Validation Gate ═══
// Task 1.9: Runs accuracy validation on a sample of resolved records.
// Gates production deployment if weighted false positive rate > 2%.
//
// Two modes:
//   1. --check: Run the validation gate and report results
//   2. --seed: Pull a random sample of resolved records and mark them for validation
//   3. --mark: Interactively mark records as true/false positives (outputs CSV for review)
//
// Run:
//   npx tsx scripts/npi-validation-gate.ts --check
//   npx tsx scripts/npi-validation-gate.ts --seed --sample-size 500 --states TX,CA
//   npx tsx scripts/npi-validation-gate.ts --export-review --output review.csv

import {
  runValidationGate,
  fetchUnresolvedLicenses,
} from '../lib/nppes/npi-resolver';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function dbRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
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

// ── CLI ──────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const getVal = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  return {
    check: args.includes('--check'),
    seed: args.includes('--seed'),
    exportReview: args.includes('--export-review'),
    stats: args.includes('--stats'),
    sampleSize: parseInt(getVal('--sample-size') || '500', 10),
    states: getVal('--states')?.split(',') || ['TX', 'CA'],
    output: getVal('--output') || 'validation_review.csv',
  };
}

// ── Mode 1: Check Gate ───────────────────────────────────

async function runCheck() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NPI Resolution — Validation Gate Check');
  console.log('═══════════════════════════════════════════════════════\n');

  const result = await runValidationGate();

  if (result.total_sample === 0) {
    console.log('  No validated samples found.');
    console.log('  Run --seed first to create a validation sample,');
    console.log('  then mark records with is_false_positive = true/false.');
    console.log('  Finally run --check again.\n');
    return;
  }

  console.log(`  Sample size:       ${result.total_sample}`);
  console.log('');
  console.log('  PECOS Exact Match:');
  console.log(`    Matches:         ${result.pecos_matches}`);
  console.log(`    False positives: ${result.pecos_false_positives}`);
  console.log(`    FP rate:         ${(result.pecos_fp_rate * 100).toFixed(2)}%  (target: <1%)`);
  console.log('');
  console.log('  NPPES Fuzzy Match:');
  console.log(`    Matches:         ${result.fuzzy_matches}`);
  console.log(`    False positives: ${result.fuzzy_false_positives}`);
  console.log(`    FP rate:         ${(result.fuzzy_fp_rate * 100).toFixed(2)}%  (target: <3%)`);
  console.log('');
  console.log('  Weighted:');
  console.log(`    FP rate:         ${(result.weighted_fp_rate * 100).toFixed(2)}%  (target: <2%)`);
  console.log('');

  if (result.gate_passed) {
    console.log('  ╔═══════════════════════════════════════╗');
    console.log('  ║  VALIDATION GATE: PASSED              ║');
    console.log('  ║  State board findings cleared for      ║');
    console.log('  ║  production deployment.                ║');
    console.log('  ╚═══════════════════════════════════════╝');
  } else {
    console.log('  ╔═══════════════════════════════════════╗');
    console.log('  ║  VALIDATION GATE: FAILED              ║');
    console.log('  ║  State board findings BLOCKED from     ║');
    console.log('  ║  production until FP rate is reduced.  ║');
    console.log('  ╚═══════════════════════════════════════╝');
    console.log('');
    console.log('  Next steps:');
    console.log('  1. Run --export-review to get records for manual review');
    console.log('  2. Mark false positives in provider_npi_resolutions');
    console.log('  3. Adjust matching thresholds in npi-resolver.ts');
    console.log('  4. Re-run resolution on affected records');
    console.log('  5. Run --check again');
  }
}

// ── Mode 2: Seed Validation Sample ───────────────────────

async function seedSample(sampleSize: number, states: string[]) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NPI Resolution — Seed Validation Sample');
  console.log('═══════════════════════════════════════════════════════\n');

  const stateFilter = states.map(s => `"${s}"`).join(',');

  // Fetch resolved records that haven't been validated yet
  const resolved: any[] = await dbRequest(
    `provider_npi_resolutions?resolved_npi=not.is.null&is_validated=eq.false&select=id,method,resolved_npi,input_name,input_state,input_specialty,confidence_score&order=created_at.desc&limit=${sampleSize}`,
  );

  if (resolved.length === 0) {
    console.log('  No unvalidated resolved records found.');
    console.log('  Run the NPI resolution engine first (ca-mb-monthly-sync.ts).');
    return;
  }

  console.log(`  Found ${resolved.length} resolved records to validate.`);
  console.log(`  Marking as is_validated = true (awaiting is_false_positive review)...\n`);

  // Mark them as part of the validation sample
  const ids = resolved.map((r: any) => r.id);
  const BATCH = 200;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const idList = batch.map((id: string) => `"${id}"`).join(',');

    await dbRequest(
      `provider_npi_resolutions?id=in.(${idList})`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_validated: true }),
        headers: { Prefer: 'return=minimal' },
      },
    );
  }

  // Stats
  const byMethod = new Map<string, number>();
  for (const r of resolved) {
    byMethod.set(r.method, (byMethod.get(r.method) || 0) + 1);
  }

  console.log(`  Seeded ${resolved.length} records for validation:`);
  for (const [method, count] of byMethod) {
    console.log(`    ${method}: ${count}`);
  }
  console.log('');
  console.log('  Next step: Run --export-review to get a CSV for manual review,');
  console.log('  or update is_false_positive directly in Supabase dashboard.');
}

// ── Mode 3: Export for Review ────────────────────────────

async function exportReview(output: string) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NPI Resolution — Export Validation Review');
  console.log('═══════════════════════════════════════════════════════\n');

  // Fetch validated but not yet reviewed records
  const records: any[] = await dbRequest(
    `provider_npi_resolutions?is_validated=eq.true&is_false_positive=is.null&select=id,method,resolved_npi,confidence_score,input_name,input_state,input_specialty,input_address,pecos_npi,pecos_name,pecos_specialty,name_similarity&order=confidence_score.asc&limit=1000`,
  );

  if (records.length === 0) {
    console.log('  No records pending review.');
    console.log('  Run --seed first to create a validation sample.');
    return;
  }

  // Build CSV
  const headers = [
    'resolution_id', 'method', 'resolved_npi', 'confidence',
    'input_name', 'input_state', 'input_specialty', 'input_address',
    'pecos_npi', 'pecos_name', 'pecos_specialty', 'name_similarity',
    'is_false_positive',
  ];

  const rows = records.map((r: any) => [
    r.id, r.method, r.resolved_npi, r.confidence_score,
    `"${(r.input_name || '').replace(/"/g, '""')}"`,
    r.input_state, `"${(r.input_specialty || '').replace(/"/g, '""')}"`,
    `"${(r.input_address || '').replace(/"/g, '""')}"`,
    r.pecos_npi, `"${(r.pecos_name || '').replace(/"/g, '""')}"`,
    `"${(r.pecos_specialty || '').replace(/"/g, '""')}"`,
    r.name_similarity,
    '', // is_false_positive — reviewer fills this in
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const { writeFileSync } = require('fs');
  writeFileSync(output, csv);

  console.log(`  Exported ${records.length} records to ${output}`);
  console.log('');
  console.log('  Review instructions:');
  console.log('  1. Open the CSV in a spreadsheet');
  console.log('  2. For each row, check if input_name matches pecos_name');
  console.log('  3. Set is_false_positive to TRUE or FALSE');
  console.log('  4. Import back to provider_npi_resolutions');
  console.log('  5. Run --check to evaluate the gate');
}

// ── Mode 4: Stats ────────────────────────────────────────

async function showStats() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NPI Resolution — Current Statistics');
  console.log('═══════════════════════════════════════════════════════\n');

  const total: any[] = await dbRequest(
    'provider_npi_resolutions?select=method,resolved_npi,is_validated,is_false_positive,needs_review',
  );

  const resolved = total.filter(r => r.resolved_npi);
  const unresolved = total.filter(r => !r.resolved_npi);
  const validated = total.filter(r => r.is_validated);
  const reviewed = validated.filter(r => r.is_false_positive !== null);
  const pendingReview = total.filter(r => r.needs_review && r.is_false_positive === null);

  const byMethod = new Map<string, { total: number; resolved: number }>();
  for (const r of total) {
    const m = byMethod.get(r.method) || { total: 0, resolved: 0 };
    m.total++;
    if (r.resolved_npi) m.resolved++;
    byMethod.set(r.method, m);
  }

  console.log(`  Total resolution attempts: ${total.length}`);
  console.log(`  Resolved:                  ${resolved.length} (${total.length > 0 ? ((resolved.length / total.length) * 100).toFixed(1) : 0}%)`);
  console.log(`  Unresolved:                ${unresolved.length}`);
  console.log(`  Needs review:              ${pendingReview.length}`);
  console.log('');
  console.log(`  Validation sample:         ${validated.length}`);
  console.log(`  Reviewed:                  ${reviewed.length}`);
  console.log(`  Pending review:            ${validated.length - reviewed.length}`);
  console.log('');
  console.log('  By method:');
  for (const [method, stats] of byMethod) {
    console.log(`    ${method}: ${stats.resolved}/${stats.total} resolved (${stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%)`);
  }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  if (opts.check) {
    await runCheck();
  } else if (opts.seed) {
    await seedSample(opts.sampleSize, opts.states);
  } else if (opts.exportReview) {
    await exportReview(opts.output);
  } else if (opts.stats) {
    await showStats();
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/npi-validation-gate.ts --check');
    console.log('  npx tsx scripts/npi-validation-gate.ts --seed --sample-size 500');
    console.log('  npx tsx scripts/npi-validation-gate.ts --export-review --output review.csv');
    console.log('  npx tsx scripts/npi-validation-gate.ts --stats');
  }
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
